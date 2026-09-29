/**
 * Lấy CHỮ THÔ từ tài liệu GV đưa vào (lịch năm học, PPCT…), để AI đọc tiếp.
 * - File: Excel/CSV, Word (.docx), PDF, TXT.
 * - Link Google: Sheet (tab trong link, không có thì tab đầu), Docs, file Drive — đọc bằng quyền
 *   Google của chính GV (file trường chia sẻ nội bộ vẫn đọc được).
 */
import { extractTextFromExcel, extractTextFromPDF, extractTextFromWord } from '../../utils/fileUtils';
import { getDriveAccessToken } from '../googleDrive';
import { readSheetValues, readSpreadsheetInfo } from '../classroom/sheetsApi';
import type { GoogleLink } from './googleLink';

export const readFileText = async (file: File): Promise<string> => {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) return extractTextFromExcel(file);
  if (ext === 'docx') return extractTextFromWord(file);
  if (ext === 'pdf') return extractTextFromPDF(file);
  if (['txt', 'md'].includes(ext)) return file.text();
  throw new Error('Chưa đọc được loại file này — dùng Excel, Word (.docx), PDF, CSV hoặc TXT.');
};

const DRIVE = 'https://www.googleapis.com/drive/v3/files';

const driveGet = async (url: string): Promise<Response> => {
  const token = await getDriveAccessToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 403 || res.status === 404) throw new Error('Tài khoản Google của cô chưa được mở file này — kiểm tra quyền chia sẻ.');
  if (!res.ok) throw new Error(`Google trả lỗi ${res.status}.`);
  return res;
};

/** Đọc chữ từ link Google. Trả kèm tên để hiện cho GV biết đã đọc đúng file/tab. */
export const readGoogleLinkText = async (link: GoogleLink): Promise<{ name: string; text: string }> => {
  if (link.kind === 'sheet') {
    const info = await readSpreadsheetInfo(link.id);
    const tab = info.tabs.find((t) => t.sheetId === link.gid) ?? info.tabs[0];
    if (!tab) throw new Error('File không có tab nào đang hiện.');
    const [rows] = await readSheetValues(link.id, [`'${tab.title.replace(/'/g, "''")}'`]);
    const text = rows.map((r) => r.map((c) => String(c ?? '').replace(/\s*\n\s*/g, ' / ')).join('\t').replace(/\t+$/, '')).join('\n');
    return { name: `${info.title} — ${tab.title}`, text };
  }
  if (link.kind === 'doc') {
    const res = await driveGet(`${DRIVE}/${link.id}/export?mimeType=text%2Fplain`);
    return { name: 'Google Docs', text: await res.text() };
  }
  const meta = await (await driveGet(`${DRIVE}/${link.id}?fields=name,mimeType&supportsAllDrives=true`)).json() as { name?: string; mimeType?: string };
  // Link Drive trỏ tới file Google gốc thì đọc theo đúng loại.
  if (meta.mimeType === 'application/vnd.google-apps.spreadsheet') return readGoogleLinkText({ kind: 'sheet', id: link.id, gid: null });
  if (meta.mimeType === 'application/vnd.google-apps.document') return readGoogleLinkText({ kind: 'doc', id: link.id });
  const blob = await (await driveGet(`${DRIVE}/${link.id}?alt=media&supportsAllDrives=true`)).blob();
  const name = meta.name ?? 'file';
  return { name, text: await readFileText(new File([blob], name)) };
};
