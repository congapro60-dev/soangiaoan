import { GoogleAuthProvider, reauthenticateWithPopup, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3/files';
const FILE_FIELDS = 'id, name, mimeType, webViewLink';

/** Người dùng chưa cấp quyền Drive, hoặc token hết hạn giữa chừng. */
export class DriveAuthError extends Error {}

export interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
}

// Access token của Google chỉ sống ~1 giờ và Firebase không tự gia hạn hộ,
// nên giữ trong bộ nhớ phiên rồi xin lại khi hết.
let cachedToken: { value: string; expiresAt: number } | null = null;

export const clearDriveAccessToken = (): void => {
  cachedToken = null;
};

export const getDriveAccessToken = async (): Promise<string> => {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const user = auth.currentUser;
  if (user?.isAnonymous) {
    throw new DriveAuthError(
      'Bạn đang dùng phiên khách. Hãy đăng nhập bằng tài khoản Google trước khi đẩy giáo án lên Drive.',
    );
  }

  const provider = new GoogleAuthProvider();
  provider.addScope(DRIVE_SCOPE);

  const isGoogleUser = user?.providerData.some(p => p.providerId === 'google.com') ?? false;
  const result = user && isGoogleUser
    ? await reauthenticateWithPopup(user, provider)
    : await signInWithPopup(auth, provider);

  const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
  if (!token) {
    throw new DriveAuthError('Google không trả về quyền truy cập Drive. Hãy thử cấp quyền lại.');
  }

  cachedToken = { value: token, expiresAt: Date.now() + 55 * 60 * 1000 };
  return token;
};

const driveError = async (res: Response, fallback: string): Promise<Error> => {
  if (res.status === 401 || res.status === 403) {
    clearDriveAccessToken();
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    return new DriveAuthError(
      body.error?.message
        ? `Google từ chối truy cập Drive: ${body.error.message}`
        : 'Google từ chối truy cập Drive. Hãy cấp lại quyền và thử lại.',
    );
  }
  const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
  return new Error(body.error?.message ?? `${fallback}: ${res.status}`);
};

const driveGet = async (path: string, params: Record<string, string>, token: string): Promise<Response> => {
  const query = new URLSearchParams({ supportsAllDrives: 'true', ...params });
  return fetch(`${API_BASE}${path}?${query}`, { headers: { Authorization: `Bearer ${token}` } });
};

/** Dấu nháy đơn trong tên thư mục sẽ phá cú pháp query của Drive. */
const escapeQuery = (value: string): string => value.replace(/'/g, "\\'");

export const listFiles = async (query: string, token: string, pageSize = 100): Promise<DriveFile[]> => {
  const res = await driveGet('/files', {
    q: query,
    pageSize: String(pageSize),
    includeItemsFromAllDrives: 'true',
    fields: `files(${FILE_FIELDS})`,
  }, token);
  if (!res.ok) throw await driveError(res, 'Lỗi đọc Drive');
  const data = await res.json() as { files?: DriveFile[] };
  return data.files ?? [];
};

export const findChildFolder = async (parentId: string, name: string, token: string): Promise<DriveFile | null> => {
  const files = await listFiles(
    `'${escapeQuery(parentId)}' in parents and mimeType = 'application/vnd.google-apps.folder' ` +
    `and name = '${escapeQuery(name)}' and trashed = false`,
    token,
    10,
  );
  return files[0] ?? null;
};

export const findChildFile = async (parentId: string, name: string, token: string): Promise<DriveFile | null> => {
  const files = await listFiles(
    `'${escapeQuery(parentId)}' in parents and name = '${escapeQuery(name)}' ` +
    `and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
    token,
    10,
  );
  return files[0] ?? null;
};

export const listFolderFiles = (folderId: string, token: string): Promise<DriveFile[]> => listFiles(
  `'${escapeQuery(folderId)}' in parents and trashed = false ` +
  `and mimeType != 'application/vnd.google-apps.folder'`,
  token,
);

export const createFolder = async (name: string, parentId: string, token: string): Promise<DriveFile> => {
  const res = await fetch(`${API_BASE}/files?supportsAllDrives=true&fields=${encodeURIComponent(FILE_FIELDS)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  });
  if (!res.ok) throw await driveError(res, 'Lỗi tạo thư mục Drive');
  return res.json() as Promise<DriveFile>;
};

/** Thư mục tuần trên Drive tồn tại cả hai kiểu đặt tên: "Tuần 01" và "Tuần 1". */
export const findWeekFolder = async (parentId: string, week: number, token: string): Promise<DriveFile | null> => {
  for (const name of [`Tuần ${String(week).padStart(2, '0')}`, `Tuần ${week}`]) {
    const folder = await findChildFolder(parentId, name, token);
    if (folder) return folder;
  }
  return null;
};

export const getOrCreateWeekFolder = async (parentId: string, week: number, token: string): Promise<DriveFile> => {
  const existing = await findWeekFolder(parentId, week, token);
  return existing ?? createFolder(`Tuần ${String(week).padStart(2, '0')}`, parentId, token);
};

export const trashFile = async (fileId: string, token: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/files/${fileId}?supportsAllDrives=true`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  });
  if (!res.ok) throw await driveError(res, 'Lỗi xoá file cũ trên Drive');
};

export const uploadBase64File = async (
  file: { base64: string; filename: string; mimeType: string },
  parentId: string,
  token: string,
): Promise<DriveFile> => {
  const boundary = `smartplan-${Date.now().toString(36)}`;
  const body = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify({ name: file.filename, parents: [parentId] }),
    `\r\n--${boundary}\r\nContent-Type: ${file.mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`,
    file.base64,
    `\r\n--${boundary}--`,
  ].join('');

  const res = await fetch(
    `${UPLOAD_BASE}?uploadType=multipart&supportsAllDrives=true&fields=${encodeURIComponent(FILE_FIELDS)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  if (!res.ok) throw await driveError(res, 'Lỗi upload lên Drive');
  return res.json() as Promise<DriveFile>;
};

export const folderUrl = (folder: DriveFile): string =>
  folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`;

export const fileUrl = (file: DriveFile): string =>
  file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;

/** Nhận cả link thư mục lẫn ID trần — giáo viên thường copy nguyên URL từ thanh địa chỉ. */
export const parseFolderId = (input: string): string => {
  const trimmed = input.trim();
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const idOnly = trimmed.match(/^[a-zA-Z0-9_-]{10,}$/);
  return idOnly ? trimmed : trimmed;
};
