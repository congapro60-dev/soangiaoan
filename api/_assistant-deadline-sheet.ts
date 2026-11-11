import { createPrivateKey, sign } from 'node:crypto';
import type { DeadlineCell, DeadlineConfig } from './_assistant-deadline.js';

const MAX_BYTES = 2_000_000;
export async function boundedSheetJson(response: Response): Promise<any> {
  if (Number(response.headers.get('content-length') || 0) > MAX_BYTES) throw new Error('Dữ liệu Sheet quá lớn.');
  if (!response.body) throw new Error('Sheet không trả dữ liệu.');
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_BYTES) throw new Error('Dữ liệu Sheet vượt giới hạn.'); chunks.push(value); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => undefined); }
}
const cached = new Map<string, { token: string; until: number }>();
const pending = new Map<string, Promise<string>>();
/** Reuses the existing project service account; requests ONLY Sheets read-only scope. Creates no credential. */
export async function deadlineReadToken(): Promise<string> {
  return serviceAccountSheetsToken('readonly');
}
/** Only the dedicated, server-approved mirror writer calls this; deadline readers stay read-only. */
export async function homeworkWriteToken(): Promise<string> {
  return serviceAccountSheetsToken('write');
}
async function serviceAccountSheetsToken(scope: 'readonly' | 'write'): Promise<string> {
  let account: Record<string, string>;
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8') : '');
    if (raw) {
      try { account = JSON.parse(raw); } catch { account = JSON.parse(raw.replace(/\r?\n/g, '\\n')); }
      account = { client_email: account.client_email || account.clientEmail, private_key: account.private_key || account.privateKey };
    } else account = { client_email: process.env.FIREBASE_CLIENT_EMAIL!, private_key: process.env.FIREBASE_PRIVATE_KEY! };
    if (!account?.client_email || !account?.private_key) throw new Error();
  } catch { throw new Error('Chưa cấu hình tài khoản dịch vụ sẵn có để đọc Sheet.'); }
  const key = account.private_key.replace(/\\n/g, '\n'), fingerprint = account.client_email + key + scope;
  const previous = cached.get(fingerprint);
  if (previous && previous.until > Date.now()) return previous.token;
  if (pending.has(fingerprint)) return pending.get(fingerprint)!;
  const request = (async () => {
    const now = Math.floor(Date.now() / 1000), encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
    const data = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: account.client_email, scope: `https://www.googleapis.com/auth/spreadsheets${scope === 'readonly' ? '.readonly' : ''}`, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
    const assertion = `${data}.${sign('RSA-SHA256', Buffer.from(data), createPrivateKey(key)).toString('base64url')}`;
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', redirect: 'error', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(15_000) });
    const result = await boundedSheetJson(response);
    if (!response.ok || typeof result.access_token !== 'string') throw new Error('Không cấp được quyền đọc Sheet; cần kiểm tra cấu hình tài khoản dịch vụ.');
    cached.set(fingerprint, { token: result.access_token, until: Date.now() + Math.min(Number(result.expires_in) || 0, 3600) * 1000 - 60_000 });
    return result.access_token as string;
  })();
  pending.set(fingerprint, request);
  try { return await request; } catch { throw new Error('Không xác thực được nguồn Sheet.'); } finally { pending.delete(fingerprint); }
}

export async function readDeadlineSheet(config: Pick<DeadlineConfig, 'spreadsheetId' | 'sheetTitle' | 'sheetId'>, token = deadlineReadToken): Promise<{ grid: DeadlineCell[][]; studentNames: string[]; headers: string[]; sheetId: number }> {
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(config.spreadsheetId) || config.sheetTitle !== '01. DEADLINE' || !Number.isSafeInteger(config.sheetId) || config.sheetId < -1) {
    throw new Error('Cấu hình tab Sheet deadline không hợp lệ.');
  }
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}`);
  url.searchParams.set('ranges', "'01. DEADLINE'!A1:GR200");
  url.searchParams.set('includeGridData', 'true');
  url.searchParams.set('fields', 'sheets(properties(sheetId,title),data(startRow,startColumn,rowData(values(formattedValue,hyperlink,effectiveValue))))');
  const response = await fetch(url, { method: 'GET', redirect: 'error', headers: { authorization: `Bearer ${await token()}` }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Không đọc được Sheet (HTTP ${response.status}); kiểm tra quyền Xem của tài khoản dịch vụ.`);
  const result = await boundedSheetJson(response);
  const sheets = Array.isArray(result?.sheets) ? result.sheets.filter((sheet: any) => sheet.properties?.title === config.sheetTitle && (config.sheetId === -1 || sheet.properties?.sheetId === config.sheetId)) : [];
  if (sheets.length !== 1 || !Number.isSafeInteger(sheets[0]?.properties?.sheetId) || sheets[0]?.data?.length !== 1
    || sheets[0].data[0].startRow || sheets[0].data[0].startColumn) throw new Error('Tab Sheet không khớp cấu hình đã chọn.');
  const rows = sheets[0].data[0].rowData;
  if (!Array.isArray(rows) || rows.length > 200) throw new Error('Sheet deadline không có vùng dữ liệu hợp lệ.');
  const grid: DeadlineCell[][] = rows.map((row: any) => Array.isArray(row?.values) && row.values.length <= 200 ? row.values : []);
  return { grid, sheetId: sheets[0].properties.sheetId, studentNames: grid.slice(9).map(row => String(row[1]?.formattedValue || '').trim()).filter(Boolean), headers: (grid[1] || []).slice(2).map(cell => String(cell?.formattedValue || '').trim()).filter(Boolean) };
}
