import { DriveAuthError, clearDriveAccessToken, getDriveAccessToken } from '../../googleDrive';
import { COMPETENCY_LEVELS, type CompetencyGrade, type CompetencyLevel } from './framework';

/**
 * Xuất hồ sơ năng lực ra ĐÚNG file mẫu của trường (GĐ4).
 *
 * Cách trường ghi mức KHÔNG phải bằng chữ mà bằng **bôi vàng** ô mức đạt (Xuất sắc/Tốt/Đạt/Chưa đạt)
 * trên từng dòng năng lực — dòng 3 của tab ghi rõ "Học sinh tự bôi vàng…". Nên xuất = tô nền vàng
 * đúng ô, không phải điền giá trị.
 *
 * Luồng (chạy bằng quyền Google của chính giáo viên, dùng lại token của "Đẩy giáo án lên Drive"):
 *  1. Drive copy file mẫu → Google Sheet mới "Sxxxxx - Tên" (giữ nguyên 4 cột mô tả — "y hệt").
 *  2. Đọc lưới tab "Năng lực toán học" để khớp từng năng lực về đúng DÒNG.
 *  3. batchUpdate: điền Mã HS + Họ tên, bôi vàng ô mức của từng năng lực đã có kết luận.
 *
 * KHÔNG đụng file học sinh cũ: mỗi lần xuất tạo một bản sao mới, trả link.
 */

/** File mẫu "Mẫu hồ sơ học sinh Toán THPT Discover 26-27" — tab năng lực. */
export const PORTFOLIO_TEMPLATE_ID = '1BX_mPdtXQkfqffwA5YAIo8S-uIsM5j5H';
export const COMPETENCY_TAB_TITLE = 'Năng lực toán học';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const GSHEET_MIME = 'application/vnd.google-apps.spreadsheet';
/** Vàng "bôi" giống thao tác tay trong file trường. */
const HIGHLIGHT = { red: 1, green: 1, blue: 0 };
/** Cột A "Nội dung", B "Năng lực cần đạt", rồi C..F là 4 mức — khớp COMPETENCY_LEVELS. */
const FIRST_LEVEL_COLUMN = 2;

export interface PortfolioMark {
  /** Chủ đề (cột A "Nội dung") — khoá khớp dòng trong file mẫu. */
  topic: string;
  level: CompetencyLevel;
}

const levelColumn = (level: CompetencyLevel): number => FIRST_LEVEL_COLUMN + COMPETENCY_LEVELS.indexOf(level);

/**
 * Dựng lệnh batchUpdate từ ảnh cột A của tab. THUẦN để test được:
 * chỉ khớp năng lực trong ĐÚNG khối (đi theo mốc "Lớp 10/11/12"), tránh trùng chủ đề giữa các khối.
 */
export const buildPortfolioExportRequests = (input: {
  sheetId: number;
  /** Giá trị cột A theo từng dòng (0-based), đã trim. */
  columnA: readonly string[];
  grade: CompetencyGrade;
  studentCode: string;
  studentName: string;
  marks: readonly PortfolioMark[];
}): { requests: Array<Record<string, unknown>>; matched: string[]; unmatched: string[] } => {
  const { sheetId, columnA, grade, studentCode, studentName, marks } = input;

  // Dòng của từng chủ đề, chỉ trong phần khối đang xuất.
  const rowByTopic = new Map<string, number>();
  let current: number | null = null;
  columnA.forEach((cell, row) => {
    const gradeMatch = /^Lớp\s*(10|11|12)\b/.exec(cell);
    if (gradeMatch) { current = Number(gradeMatch[1]); return; }
    if (current === grade && cell) rowByTopic.set(cell, row);
  });

  const setValue = (row: number, value: string): Record<string, unknown> => ({
    updateCells: {
      range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 1, endColumnIndex: 2 },
      rows: [{ values: [{ userEnteredValue: { stringValue: value } }] }],
      fields: 'userEnteredValue',
    },
  });
  const paint = (row: number, column: number): Record<string, unknown> => ({
    repeatCell: {
      range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: column, endColumnIndex: column + 1 },
      cell: { userEnteredFormat: { backgroundColor: HIGHLIGHT } },
      fields: 'userEnteredFormat.backgroundColor',
    },
  });

  const requests: Array<Record<string, unknown>> = [setValue(0, studentCode), setValue(1, studentName)];
  const matched: string[] = [];
  const unmatched: string[] = [];
  for (const mark of marks) {
    const row = rowByTopic.get(mark.topic);
    if (row === undefined) { unmatched.push(mark.topic); continue; }
    requests.push(paint(row, levelColumn(mark.level)));
    matched.push(mark.topic);
  }
  return { requests, matched, unmatched };
};

// ── Phần gọi mạng (không unit-test; đã tách phần quyết định ra buildPortfolioExportRequests) ──────

const authedFetch = async (url: string, init: RequestInit = {}): Promise<Record<string, unknown>> => {
  const token = await getDriveAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (res.status === 401) {
    clearDriveAccessToken();
    throw new DriveAuthError('Phiên cấp quyền Google đã hết. Bấm lại để cấp quyền rồi thử tiếp.');
  }
  const body = await res.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!res.ok) throw new Error(body?.error?.message || `Google trả lỗi ${res.status}.`);
  return (body ?? {}) as Record<string, unknown>;
};

export interface PortfolioExportResult {
  url: string;
  matched: number;
  unmatched: string[];
}

/** Tạo bản sao file mẫu, bôi vàng mức đạt, trả link. */
export const exportPortfolioToDrive = async (input: {
  grade: CompetencyGrade;
  studentCode: string;
  studentName: string;
  marks: readonly PortfolioMark[];
}): Promise<PortfolioExportResult> => {
  const fileName = `${input.studentCode || 'HS'} - ${input.studentName}`.trim();

  const copied = await authedFetch(`${DRIVE_FILES}/${PORTFOLIO_TEMPLATE_ID}/copy?fields=id&supportsAllDrives=true`, {
    method: 'POST',
    body: JSON.stringify({ name: fileName, mimeType: GSHEET_MIME }),
  }) as { id?: string };
  const spreadsheetId = copied.id;
  if (!spreadsheetId) throw new Error('Không tạo được bản sao file mẫu.');

  const params = new URLSearchParams({
    includeGridData: 'true',
    fields: 'sheets(properties(sheetId,title),data(rowData(values(formattedValue))))',
  });
  params.append('ranges', `'${COMPETENCY_TAB_TITLE}'!A1:A60`);
  const grid = await authedFetch(`${SHEETS_BASE}/${spreadsheetId}?${params.toString()}`) as {
    sheets?: Array<{ properties?: { sheetId?: number; title?: string }; data?: Array<{ rowData?: Array<{ values?: Array<{ formattedValue?: string }> }> }> }>;
  };
  const sheet = (grid.sheets ?? []).find(item => item.properties?.title === COMPETENCY_TAB_TITLE);
  if (!sheet || typeof sheet.properties?.sheetId !== 'number') {
    throw new Error(`Bản sao thiếu tab "${COMPETENCY_TAB_TITLE}".`);
  }
  const columnA = (sheet.data?.[0]?.rowData ?? []).map(row => String(row.values?.[0]?.formattedValue ?? '').trim());

  const { requests, matched, unmatched } = buildPortfolioExportRequests({
    sheetId: sheet.properties.sheetId,
    columnA,
    grade: input.grade,
    studentCode: input.studentCode,
    studentName: input.studentName,
    marks: input.marks,
  });

  await authedFetch(`${SHEETS_BASE}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });

  return { url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, matched: matched.length, unmatched };
};
