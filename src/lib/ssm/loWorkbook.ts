/**
 * Điền cả file Excel mẫu SSM: đọc bytes → tìm sheet dữ liệu → điền ô điểm → trả bytes mới.
 * Dùng JSZip (chạy trong trình duyệt của giáo viên). Giữ nguyên mọi thứ trừ ô điểm.
 */
import JSZip from 'jszip';
import type { LoMark } from './loScore';
import { readSharedStrings, parseLoColumns, fillSheet, type FillResult } from './loTemplate';

const SHEETS_GLOB = /^xl\/worksheets\/sheet\d+\.xml$/;

export interface FillWorkbookResult extends FillResult {
  bytes: Uint8Array;
  /** Các LO đọc được từ file (mã), để giao diện dựng cột. */
  loCodes: string[];
}

/** Trả sheet chứa bảng điểm (sheet có ít nhất một cột mã LO ở dòng 6). */
const findDataSheet = async (zip: JSZip, ss: readonly string[]): Promise<{ path: string; xml: string } | null> => {
  const paths = Object.keys(zip.files).filter((p) => SHEETS_GLOB.test(p)).sort();
  for (const path of paths) {
    const xml = await zip.file(path)!.async('string');
    if (parseLoColumns(xml, ss).length > 0) return { path, xml };
  }
  return null;
};

/**
 * `marks`: Mã HS → (mã LO → mức). Chỉ ghi ô khớp cả HS lẫn LO; báo lại phần lệch.
 * Ném lỗi tiếng Việt nếu file không phải file mẫu điểm LO của SSM.
 */
export const fillLoWorkbook = async (
  input: ArrayBuffer | Uint8Array,
  marks: ReadonlyMap<string, ReadonlyMap<string, LoMark>>,
): Promise<FillWorkbookResult> => {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(input);
  } catch {
    throw new Error('Không đọc được file — hãy chọn đúng file Excel tải từ SSM.');
  }
  const sharedFile = zip.file('xl/sharedStrings.xml');
  const ss = sharedFile ? readSharedStrings(await sharedFile.async('string')) : [];
  const sheet = await findDataSheet(zip, ss);
  if (!sheet) throw new Error('File này không có cột LO — hãy tải đúng file mẫu điểm LO từ SSM.');

  const filled = fillSheet(sheet.xml, ss, marks);
  zip.file(sheet.path, filled.sheetXml);
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return { ...filled, bytes, loCodes: parseLoColumns(sheet.xml, ss).map((c) => c.loCode) };
};

/** Chỉ đọc danh sách LO + Mã HS từ file, không điền — để giao diện dựng lưới trước khi có điểm. */
export const readLoWorkbook = async (
  input: ArrayBuffer | Uint8Array,
): Promise<{ loCodes: string[]; loHeaders: string[]; maHSList: string[] }> => {
  const zip = await JSZip.loadAsync(input);
  const sharedFile = zip.file('xl/sharedStrings.xml');
  const ss = sharedFile ? readSharedStrings(await sharedFile.async('string')) : [];
  const sheet = await findDataSheet(zip, ss);
  if (!sheet) throw new Error('File này không có cột LO — hãy tải đúng file mẫu điểm LO từ SSM.');
  const cols = parseLoColumns(sheet.xml, ss);
  const { parseStudents } = await import('./loTemplate');
  return {
    loCodes: cols.map((c) => c.loCode),
    loHeaders: cols.map((c) => {
      const idx = ss.findIndex((s) => s.startsWith(`${c.loCode}:`));
      return idx >= 0 ? ss[idx] : c.loCode;
    }),
    maHSList: parseStudents(sheet.xml, ss).map((s) => s.maHS),
  };
};
