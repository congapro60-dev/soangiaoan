/**
 * Gọi Google Sheets API bằng quyền Google của CHÍNH giáo viên đang đăng nhập.
 *
 * Dùng lại luồng cấp quyền của tính năng "Đẩy giáo án lên Drive" (`googleDrive.ts`), nên không mở
 * rộng thêm quyền nào và không có email robot nào được chia sẻ file. App chỉ chạm được những file
 * mà tài khoản của giáo viên đó vốn đã sửa được.
 *
 * File này chỉ ĐỌC ảnh chụp tab và GỬI lệnh đã dựng sẵn. Mọi quyết định ghi gì, ghi vào đâu nằm ở
 * `sheetSync.ts` và đã qua cổng chặn vùng ghi trước khi tới đây.
 */
import { DriveAuthError, clearDriveAccessToken, getDriveAccessToken } from '../googleDrive';
import { SHEET_LAYOUT, type SheetCell, type SheetColumnHeader, type SheetSnapshot } from './sheetSync';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
/** Đọc tới dòng 91 — dư cho mọi lớp, tab dài hơn thì học sinh ngoài vùng này bị báo không khớp. */
const MAX_STUDENT_ROWS = 80;
/** Khuôn hiện có định dạng sẵn tới cột BJ. */
const MAX_COLUMN_LETTER = 'BJ';

export interface SpreadsheetTab {
  sheetId: number;
  title: string;
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  timeZone: string;
  tabs: SpreadsheetTab[];
}

/** Nhận link Google Sheet đầy đủ hoặc mã file trơn. */
export const spreadsheetIdFromUrl = (input: string): string | null => {
  const text = String(input || '').trim();
  const fromUrl = /\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/.exec(text)?.[1];
  if (fromUrl) return fromUrl;
  return /^[A-Za-z0-9_-]{25,}$/.test(text) ? text : null;
};

const quoteTitle = (title: string): string => `'${title.replace(/'/g, "''")}'`;

const sheetsFetch = async (url: string, init: RequestInit = {}): Promise<Record<string, unknown>> => {
  const token = await getDriveAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const body = await res.json().catch(() => null) as { error?: { message?: string } } | null;
  if (res.status === 401) {
    clearDriveAccessToken();
    throw new DriveAuthError('Phiên cấp quyền Google đã hết. Bấm lại để cấp quyền rồi thử tiếp.');
  }
  if (!res.ok) {
    const detail = body?.error?.message ? ` (${body.error.message})` : '';
    if (res.status === 403) throw new Error(`Tài khoản Google của bạn chưa có quyền sửa file này${detail}.`);
    if (res.status === 404) throw new Error('Không tìm thấy file. Kiểm tra lại link Google Sheet.');
    throw new Error(`Google Sheets trả lỗi ${res.status}${detail}.`);
  }
  return (body ?? {}) as Record<string, unknown>;
};

/** Tên file và các tab ĐANG HIỆN. Tab ẩn (liên lạc phụ huynh, ghi chú học sinh…) không đưa ra để chọn. */
export const readSpreadsheetInfo = async (spreadsheetId: string): Promise<SpreadsheetInfo> => {
  const fields = encodeURIComponent('properties(title,timeZone),sheets(properties(sheetId,title,hidden))');
  const data = await sheetsFetch(`${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}?fields=${fields}`) as {
    properties?: { title?: string; timeZone?: string };
    sheets?: Array<{ properties?: { sheetId?: number; title?: string; hidden?: boolean } }>;
  };
  return {
    spreadsheetId,
    title: data.properties?.title ?? '',
    timeZone: data.properties?.timeZone || 'Asia/Ho_Chi_Minh',
    tabs: (data.sheets ?? [])
      .map(sheet => sheet.properties ?? {})
      .filter(properties => !properties.hidden && typeof properties.sheetId === 'number' && properties.title)
      .map(properties => ({ sheetId: properties.sheetId as number, title: properties.title as string })),
  };
};

interface GridValue {
  userEnteredValue?: { formulaValue?: string };
  effectiveValue?: { stringValue?: string; numberValue?: number; boolValue?: boolean };
  formattedValue?: string;
  note?: string;
  dataValidation?: { condition?: { type?: string; values?: Array<{ userEnteredValue?: string }> } };
}

interface GridRange {
  startRow?: number;
  startColumn?: number;
  rowData?: Array<{ values?: GridValue[] }>;
}

const toCell = (value: GridValue | undefined): SheetCell | undefined => {
  if (!value) return undefined;
  const effective = value.effectiveValue ?? {};
  const raw = effective.stringValue ?? effective.numberValue ?? effective.boolValue ?? value.formattedValue ?? null;
  return {
    value: raw ?? null,
    ...(value.userEnteredValue?.formulaValue ? { formula: value.userEnteredValue.formulaValue } : {}),
    ...(value.note ? { note: value.note } : {}),
  };
};

/** Duyệt từng ô của một vùng đã đọc, trả toạ độ 1-based. */
const eachCell = (range: GridRange | undefined, visit: (row: number, column: number, value: GridValue) => void): void => {
  const top = (range?.startRow ?? 0) + 1;
  const left = (range?.startColumn ?? 0) + 1;
  (range?.rowData ?? []).forEach((rowData, rowOffset) => {
    (rowData.values ?? []).forEach((value, columnOffset) => visit(top + rowOffset, left + columnOffset, value));
  });
};

/**
 * Chụp đúng MỘT tab đã nối, và chỉ những vùng BTVN: nhãn cột A dòng 1–11, tên học sinh ở cột B,
 * tiêu đề cột bài dòng 3–6, công thức đếm dòng 8, ô trạng thái. Không đọc tab nào khác.
 */
export const readTabSnapshot = async (
  spreadsheetId: string,
  tab: SpreadsheetTab,
  timeZone: string,
): Promise<SheetSnapshot> => {
  const lastRow = SHEET_LAYOUT.firstStudentRow + MAX_STUDENT_ROWS - 1;
  const title = quoteTitle(tab.title);
  const ranges = [
    `${title}!A1:A11`,
    `${title}!B${SHEET_LAYOUT.firstStudentRow}:B${lastRow}`,
    `${title}!C${SHEET_LAYOUT.subjectRow}:${MAX_COLUMN_LETTER}${SHEET_LAYOUT.linkRow}`,
    `${title}!C${SHEET_LAYOUT.countRow}:${MAX_COLUMN_LETTER}${SHEET_LAYOUT.countRow}`,
    `${title}!C${SHEET_LAYOUT.firstStudentRow}:${MAX_COLUMN_LETTER}${lastRow}`,
  ];
  const params = new URLSearchParams({
    includeGridData: 'true',
    fields: 'sheets(properties(sheetId,title),data(startRow,startColumn,rowData(values(userEnteredValue,effectiveValue,formattedValue,note,dataValidation))))',
  });
  for (const range of ranges) params.append('ranges', range);
  const data = await sheetsFetch(`${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}?${params.toString()}`) as {
    sheets?: Array<{ properties?: { sheetId?: number }; data?: GridRange[] }>;
  };
  const sheet = (data.sheets ?? []).find(item => item.properties?.sheetId === tab.sheetId);
  if (!sheet) throw new Error(`Không đọc được tab "${tab.title}". Tab có thể vừa bị đổi tên hoặc xoá.`);
  const [labelsRange, namesRange, headerRange, countRange, statusRange] = sheet.data ?? [];

  const labels: SheetCell[] = [];
  eachCell(labelsRange, (row, _column, value) => { labels[row - 1] = toCell(value) ?? { value: null }; });

  const students: Array<{ row: number; name: string }> = [];
  eachCell(namesRange, (row, _column, value) => {
    const name = String(toCell(value)?.value ?? '').trim();
    if (name) students.push({ row, name });
  });

  const headerByColumn = new Map<number, SheetColumnHeader>();
  eachCell(headerRange, (row, column, value) => {
    const header = headerByColumn.get(column) ?? { column };
    const cell = toCell(value);
    if (row === SHEET_LAYOUT.subjectRow) header.subject = cell;
    if (row === SHEET_LAYOUT.contentRow) header.content = cell;
    if (row === SHEET_LAYOUT.deadlineRow) header.deadline = cell;
    if (row === SHEET_LAYOUT.linkRow) header.link = cell;
    headerByColumn.set(column, header);
  });

  const countFormulas: Record<number, string> = {};
  eachCell(countRange, (_row, column, value) => {
    if (value.userEnteredValue?.formulaValue) countFormulas[column] = value.userEnteredValue.formulaValue;
  });

  const statusCells: Record<string, SheetCell> = {};
  let lastColumn = SHEET_LAYOUT.firstColumn - 1;
  let statusOptions: string[] = [];
  eachCell(statusRange, (row, column, value) => {
    const cell = toCell(value);
    if (cell) statusCells[`${row}:${column}`] = cell;
    // Cột giáo viên đã định dạng sẵn là cột có danh sách chọn ở dòng học sinh đầu tiên.
    if (row === SHEET_LAYOUT.firstStudentRow && value.dataValidation?.condition?.type === 'ONE_OF_LIST') {
      lastColumn = Math.max(lastColumn, column);
      if (statusOptions.length === 0) {
        statusOptions = (value.dataValidation.condition.values ?? [])
          .map(option => String(option.userEnteredValue ?? '').trim())
          .filter(Boolean);
      }
    }
  });

  const headers: SheetColumnHeader[] = [];
  for (let column = SHEET_LAYOUT.firstColumn; column <= lastColumn; column += 1) {
    headers.push(headerByColumn.get(column) ?? { column });
  }

  return {
    sheetId: tab.sheetId,
    sheetTitle: tab.title,
    timeZone,
    labels,
    students,
    headers,
    statusCells,
    statusOptions,
    lastColumn,
    countFormulas,
  };
};

/**
 * Gửi một lượt `batchUpdate` (Google áp dụng cả lượt hoặc không áp dụng gì).
 * Kiểm lại lần cuối: lệnh nào nhắm sang tab khác thì dừng toàn bộ, không gửi dở dang.
 */
export const applySheetRequests = async (
  spreadsheetId: string,
  sheetId: number,
  requests: Array<Record<string, unknown>>,
): Promise<void> => {
  if (requests.length === 0) return;
  for (const request of requests) {
    const body = Object.values(request)[0] as { range?: { sheetId?: number } } | undefined;
    if (body?.range?.sheetId !== sheetId) {
      throw new Error('Chặn gửi: có lệnh nhắm ra ngoài tab đã nối. Không có ô nào bị ghi.');
    }
  }
  await sheetsFetch(`${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });
};
