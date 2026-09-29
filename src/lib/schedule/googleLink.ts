/** Link tài liệu Google GV dán vào (thuần, không gọi mạng — phần đọc nằm ở `sourceText.ts`). */

export type GoogleLink =
  | { kind: 'sheet'; id: string; gid: number | null }
  | { kind: 'doc'; id: string }
  | { kind: 'file'; id: string };

/** Nhận dạng link Google Sheet / Docs / Drive. Không phải link Google thì null. */
export const parseGoogleLink = (input: string): GoogleLink | null => {
  let url: URL;
  try { url = new URL(input.trim()); } catch { return null; }
  if (url.protocol !== 'https:' || !/(^|\.)google\.com$/.test(url.hostname)) return null;
  if (url.pathname.includes('/spreadsheets/d/')) {
    const id = /\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/.exec(url.pathname)?.[1];
    const gid = /gid=(\d+)/.exec(url.hash + url.search)?.[1];
    return id ? { kind: 'sheet', id, gid: gid ? Number(gid) : null } : null;
  }
  const doc = /\/document\/d\/([A-Za-z0-9_-]{20,})/.exec(url.pathname)?.[1];
  if (doc) return { kind: 'doc', id: doc };
  const file = /\/file\/d\/([A-Za-z0-9_-]{20,})/.exec(url.pathname)?.[1] ?? (url.pathname === '/open' ? url.searchParams.get('id') : null);
  return file && /^[A-Za-z0-9_-]{20,}$/.test(file) ? { kind: 'file', id: file } : null;
};

