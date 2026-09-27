/**
 * Lấy điểm thi định kì từ file điểm của lớp (Google Sheet đã nối cho lớp).
 * Đọc bằng quyền Google của giáo viên (như đồng bộ BTVN), chỉ ĐỌC 2 tab MOET/TDS, không ghi gì.
 * Tab nào không có thì bỏ qua; không có tab nào thì trả rỗng.
 */
import { readSheetValues, readSpreadsheetInfo } from './sheetsApi';
import { MOET_TAB, TDS_TAB, parseStudentExamScores, type StudentExamScores } from './examScores';

const quote = (title: string): string => `'${title.replace(/'/g, "''")}'`;

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
): Promise<{ title: string; scores: Record<string, StudentExamScores>; unmatched: string[] }> => {
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
  return { title: tabs.title, scores, unmatched };
};
