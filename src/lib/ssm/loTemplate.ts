/**
 * Đọc & điền file mẫu Excel "Điểm LO" mà SSM xuất ra (Template_Export_Score_…xlsx).
 * Thuần, thao tác trên XML của sheet — KHÔNG dùng thư viện dựng lại file, để GIỮ NGUYÊN
 * danh sách xổ xuống (data validation "N,4,3.5,…,0"), style, và mọi thứ SSM cần khi nhập lại.
 * App chỉ ghi giá trị vào các ô điểm; phần còn lại của file y hệt bản SSM xuất.
 *
 * Bố cục file (khảo sát thật 2026-09-24, Template_Export_Score IA1):
 *  - Dòng 1–3: tên bài / môn / lớp.  Dòng 4: FP.  Dòng 5: PS.  Dòng 6: mã LO (mỗi cột một LO).
 *  - Cột A = Mã học sinh, B = họ tên, C = giới tính; các cột LO bắt đầu từ D.
 *  - Học sinh từ dòng 7; ô điểm để trống, nhận CHỮ "N"/"4"/"3.5"/…/"0".
 */
import type { LoMark } from './loScore';
import { loMarkLabel } from './loScore';

export interface LoColumn {
  /** Chữ cột Excel, vd "D". */
  col: string;
  /** Mã LO, vd "LO_DIS_TO_34383". */
  loCode: string;
}

export interface TemplateStudent {
  maHS: string;
  /** Số dòng Excel (1-based). */
  row: number;
}

const LO_HEADER_ROW = 6;
const FIRST_STUDENT_ROW = 7;

/** Đọc bảng sharedStrings thành mảng theo chỉ số. */
export const readSharedStrings = (sharedStringsXml: string): string[] =>
  [...sharedStringsXml.matchAll(/<si>(.*?)<\/si>/gs)].map((m) =>
    [...m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((t) => t[1]).join(''),
  );

const colOf = (ref: string): string => ref.replace(/\d+$/, '');
const rowOf = (ref: string): number => Number(ref.replace(/^[A-Z]+/, ''));

/** Giá trị một ô: gộp sharedString / inlineStr / str / số. */
const cellValue = (cellXml: string, ss: readonly string[]): string => {
  const typeMatch = cellXml.match(/\st="([^"]+)"/);
  const type = typeMatch?.[1];
  if (type === 's') {
    const idx = cellXml.match(/<v>(\d+)<\/v>/);
    return idx ? ss[Number(idx[1])] ?? '' : '';
  }
  const inline = cellXml.match(/<t[^>]*>([^<]*)<\/t>/);
  if (inline) return inline[1];
  const v = cellXml.match(/<v>([^<]*)<\/v>/);
  return v ? v[1] : '';
};

// Ô tự đóng (`<c r="D7" s="9"/>`) phải khớp nhánh `/>` TRƯỚC, nếu không `.*?</c>` sẽ nuốt sang
// ô/dòng kế tiếp (ô điểm để trống đều tự đóng và không có `</c>` theo sau).
const CELL_RE = /<c\s+r="([A-Z]+\d+)"(?:[^>]*\/>|[^>]*>.*?<\/c>)/gs;

/** Duyệt các ô <c …/> hoặc <c …>…</c> trong toàn sheet. */
const eachCell = function* (sheetXml: string): Generator<{ ref: string; xml: string }> {
  for (const m of sheetXml.matchAll(CELL_RE)) {
    yield { ref: m[1], xml: m[0] };
  }
};

/** Các cột LO ở dòng 6, theo thứ tự trái→phải. */
export const parseLoColumns = (sheetXml: string, ss: readonly string[]): LoColumn[] => {
  const cols: LoColumn[] = [];
  for (const { ref, xml } of eachCell(sheetXml)) {
    if (rowOf(ref) !== LO_HEADER_ROW) continue;
    const code = cellValue(xml, ss).match(/^(LO_[A-Za-z0-9_]+?)\s*:/);
    if (code) cols.push({ col: colOf(ref), loCode: code[1] });
  }
  return cols;
};

/** Học sinh: cột A từ dòng 7 trở đi, ô có mã. */
export const parseStudents = (sheetXml: string, ss: readonly string[]): TemplateStudent[] => {
  const students: TemplateStudent[] = [];
  for (const { ref, xml } of eachCell(sheetXml)) {
    if (colOf(ref) !== 'A' || rowOf(ref) < FIRST_STUDENT_ROW) continue;
    const maHS = cellValue(xml, ss).trim();
    if (maHS) students.push({ maHS, row: rowOf(ref) });
  }
  return students.sort((a, b) => a.row - b.row);
};

/** Ghi một chuỗi vào ô `ref`, giữ nguyên style. Ô phải có sẵn trong file (SSM luôn tạo sẵn ô trống). */
export const setCellString = (sheetXml: string, ref: string, value: string): string => {
  const style = sheetXml.match(new RegExp(`<c\\s+r="${ref}"[^>]*?\\ss="(\\d+)"`))?.[1];
  const styleAttr = style ? ` s="${style}"` : '';
  const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cell = `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${escaped}</t></is></c>`;
  // Nhánh ô tự đóng `/>` phải đứng trước để không nuốt sang ô kế (xem CELL_RE).
  const re = new RegExp(`<c\\s+r="${ref}"(?:[^>]*/>|[^>]*>.*?</c>)`, 's');
  return re.test(sheetXml) ? sheetXml.replace(re, cell) : sheetXml;
};

export interface FillResult {
  sheetXml: string;
  /** Số ô đã ghi. */
  written: number;
  /** Mã HS có trong bảng điểm nhưng không thấy trong file (không ghi được). */
  unmatchedStudents: string[];
  /** Mã LO có trong bảng điểm nhưng file không có cột (bỏ qua). */
  unmatchedLos: string[];
}

/**
 * Điền điểm vào sheet. `marks`: Mã HS → (Mã LO → mức). Chỉ ghi ô có cả học sinh lẫn LO khớp;
 * không đụng ô nào khác. Trả cả danh sách lệch để báo cho giáo viên.
 */
export const fillSheet = (
  sheetXml: string,
  ss: readonly string[],
  marks: ReadonlyMap<string, ReadonlyMap<string, LoMark>>,
): FillResult => {
  const loCols = parseLoColumns(sheetXml, ss);
  const students = parseStudents(sheetXml, ss);
  const byCode = new Map(loCols.map((c) => [c.loCode, c.col]));
  const studentByMa = new Map(students.map((s) => [s.maHS, s.row]));

  let xml = sheetXml;
  let written = 0;
  const unmatchedLos = new Set<string>();

  for (const [maHS, loMarks] of marks) {
    const row = studentByMa.get(maHS);
    if (!row) continue;
    for (const [loCode, mark] of loMarks) {
      const col = byCode.get(loCode);
      if (!col) {
        unmatchedLos.add(loCode);
        continue;
      }
      xml = setCellString(xml, `${col}${row}`, loMarkLabel(mark));
      written += 1;
    }
  }

  const unmatchedStudents = [...marks.keys()].filter((ma) => !studentByMa.has(ma));
  return { sheetXml: xml, written, unmatchedStudents, unmatchedLos: [...unmatchedLos] };
};
