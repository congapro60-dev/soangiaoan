/**
 * Lấy điểm thi định kì từ file điểm của lớp (Google Sheet đã nối cho lớp).
 * Đọc bằng quyền Google của giáo viên (như đồng bộ BTVN), chỉ ĐỌC 2 tab MOET/TDS, không ghi gì.
 * Tab nào không có thì bỏ qua; không có tab nào thì trả rỗng.
 */
import { readSheetValues, readSpreadsheetInfo, writeSheetValues } from './sheetsApi';
import { MOET_TAB, TDS_TAB, examLabelKey, parseExamColumns, parseStudentExamScores, type StudentExamScores } from './examScores';

const quote = (title: string): string => `'${title.replace(/'/g, "''")}'`;
const columnLetter = (index: number): string => {
  let n = index + 1;
  let out = '';
  while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); }
  return out;
};

/** Kiểm file giáo viên dán vào có đúng là file điểm (có tab MOET hoặc TDS) trước khi lưu. */
export const inspectExamSheet = async (spreadsheetId: string): Promise<{ title: string; hasMoet: boolean; hasTds: boolean }> => {
  const info = await readSpreadsheetInfo(spreadsheetId);
  const has = (name: string) => info.tabs.some(tab => tab.title.trim().toUpperCase() === name);
  return { title: info.title, hasMoet: has(MOET_TAB), hasTds: has(TDS_TAB) };
};

/** Đọc ô thô của 2 tab MOET/TDS trong một lượt gọi. */
const readExamTabs = async (spreadsheetId: string): Promise<{ title: string; moetRows: unknown[][]; tdsRows: unknown[][] } | null> => {
  const info = await readSpreadsheetInfo(spreadsheetId);
  const findTab = (name: string) => info.tabs.find(tab => tab.title.trim().toUpperCase() === name);
  const moetTab = findTab(MOET_TAB);
  const tdsTab = findTab(TDS_TAB);

  const ranges: string[] = [];
  if (moetTab) ranges.push(`${quote(moetTab.title)}!A1:BZ300`);
  if (tdsTab) ranges.push(`${quote(tdsTab.title)}!A1:R300`);
  if (ranges.length === 0) return null;

  const values = await readSheetValues(spreadsheetId, ranges);
  let index = 0;
  const moetRows = moetTab ? values[index++] : [];
  const tdsRows = tdsTab ? values[index++] : [];
  return { title: info.title, moetRows, tdsRows };
};

/**
 * Điểm thi của CẢ LỚP từ một lượt đọc file: khớp từng học sinh theo Mã HS.
 * Chỉ trả những em có ít nhất một điểm; `unmatched` là các em có Mã HS nhưng không tìm thấy điểm nào.
 */
export const fetchClassExamScores = async (
  spreadsheetId: string,
  students: ReadonlyArray<{ id: string; code?: string }>,
): Promise<{ title: string; scores: Record<string, StudentExamScores>; unmatched: string[]; columns: { moet: string[]; tds: string[] } }> => {
  const tabs = await readExamTabs(spreadsheetId);
  if (!tabs) throw new Error('File điểm không có tab MOET hay TDS.');
  const scores: Record<string, StudentExamScores> = {};
  const unmatched: string[] = [];
  for (const student of students) {
    const code = (student.code ?? '').trim();
    if (!code) { unmatched.push(student.id); continue; }
    const parsed = parseStudentExamScores(tabs.moetRows, tabs.tdsRows, code);
    if (parsed.moet.length > 0 || parsed.tds.length > 0) scores[student.id] = parsed;
    else unmatched.push(student.id);
  }
  return { title: tabs.title, scores, unmatched, columns: parseExamColumns(tabs.moetRows, tabs.tdsRows) };
};

export interface ExamSheetWrite {
  range: string;
  studentId: string;
  studentCode: string;
  tab: 'MOET' | 'TDS';
  label: string;
  previous: unknown;
  value: number;
}

/** Lập kế hoạch ghi điểm vào đúng hàng Mã HS + đúng cột tiêu đề, chưa gửi lệnh ghi. */
export const planExamSheetWrites = async (
  spreadsheetId: string,
  tab: 'MOET' | 'TDS',
  label: string,
  students: ReadonlyArray<{ id: string; code?: string }>,
  scores: Record<string, number>,
): Promise<{ writes: ExamSheetWrite[]; unmatched: string[] }> => {
  const info = await readSpreadsheetInfo(spreadsheetId);
  const sheet = info.tabs.find(item => item.title.trim().toUpperCase() === tab);
  if (!sheet) throw new Error(`File không có tab ${tab}.`);
  const rows = (await readSheetValues(spreadsheetId, [`${quote(sheet.title)}!A1:BZ300`]))[0] ?? [];
  const headerIndex = rows.findIndex(row => /^m[ãa]\s*hs$/i.test(String(row?.[0] ?? '').normalize('NFC').trim()));
  const header = rows[headerIndex >= 0 ? headerIndex : 2] ?? [];
  const targetKey = examLabelKey(label);
  const col = header.findIndex(cell => {
    const h = String(cell ?? '').normalize('NFC').trim();
    if (tab === 'MOET' && !/^đi[eể]m\s*t\s*\d/i.test(h)) return false;
    if (tab === 'TDS' && !/^đi[eể]m\s*qu[ýy]/i.test(h)) return false;
    const comparable = tab === 'TDS' ? h.replace(/^đi[eể]m\s*/i, '') : h;
    return examLabelKey(comparable) === targetKey || examLabelKey(h) === targetKey;
  });
  if (col < 0) throw new Error(`Không tìm thấy cột ${label} trong tab ${tab}.`);
  const writes: ExamSheetWrite[] = [];
  const unmatched: string[] = [];
  for (const student of students) {
    const code = String(student.code ?? '').trim();
    const value = scores[student.id];
    if (!code || !Number.isFinite(value)) continue;
    const rowIndex = rows.findIndex((row, index) => index > (headerIndex >= 0 ? headerIndex : 2) && String(row?.[0] ?? '').trim() === code);
    if (rowIndex < 0) { unmatched.push(student.id); continue; }
    writes.push({ range: `${quote(sheet.title)}!${columnLetter(col)}${rowIndex + 1}`, studentId: student.id, studentCode: code, tab, label, previous: rows[rowIndex]?.[col] ?? '', value });
  }
  return { writes, unmatched };
};

export const writeExamSheetValues = async (spreadsheetId: string, writes: readonly ExamSheetWrite[]): Promise<void> => {
  await writeSheetValues(spreadsheetId, writes.map(write => ({ range: write.range, value: write.value })));
};
