/**
 * Lấy điểm thi định kì của một học sinh từ file điểm của lớp (Google Sheet đã nối cho lớp).
 * Đọc bằng quyền Google của giáo viên (như đồng bộ BTVN), chỉ ĐỌC 2 tab MOET/TDS, không ghi gì.
 * Tab nào không có thì bỏ qua; không có tab nào thì trả rỗng.
 */
import { readSheetValues, readSpreadsheetInfo } from './sheetsApi';
import { MOET_TAB, TDS_TAB, parseStudentExamScores, type StudentExamScores } from './examScores';

const EMPTY: StudentExamScores = { moet: [], tds: [] };

const quote = (title: string): string => `'${title.replace(/'/g, "''")}'`;

export const fetchStudentExamScores = async (
  spreadsheetId: string,
  studentCode: string,
): Promise<StudentExamScores> => {
  if (!spreadsheetId || !studentCode) return EMPTY;

  const info = await readSpreadsheetInfo(spreadsheetId);
  const findTab = (name: string) => info.tabs.find(tab => tab.title.trim().toUpperCase() === name);
  const moetTab = findTab(MOET_TAB);
  const tdsTab = findTab(TDS_TAB);

  const ranges: string[] = [];
  if (moetTab) ranges.push(`${quote(moetTab.title)}!A1:BZ300`);
  if (tdsTab) ranges.push(`${quote(tdsTab.title)}!A1:R300`);
  if (ranges.length === 0) return EMPTY;

  const values = await readSheetValues(spreadsheetId, ranges);
  let index = 0;
  const moetRows = moetTab ? values[index++] : [];
  const tdsRows = tdsTab ? values[index++] : [];
  return parseStudentExamScores(moetRows, tdsRows, studentCode);
};
