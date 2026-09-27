/**
 * Các hàm thuần để lấy object path từ URL Firebase Storage.
 * File bắt đầu bằng "_" nên Vercel không tạo thêm Serverless Function.
 */

const decode = (value: string): string | null => {
  try {
    const decoded = decodeURIComponent(value);
    return decoded || null;
  } catch {
    return null;
  }
};

/**
 * Chỉ chấp nhận URL trỏ vào đúng bucket đang dọn. Không lấy path từ URL ngoài
 * bucket, nếu không một dữ liệu lỗi có thể khiến Admin xoá nhầm object khác.
 */
export const storagePathFromUrl = (value: unknown, expectedBucket: string): string | null => {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || !expectedBucket) return null;

  if (raw.startsWith('gs://')) {
    const slash = raw.indexOf('/', 5);
    if (slash < 0 || raw.slice(5, slash) !== expectedBucket) return null;
    return decode(raw.slice(slash + 1));
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.hostname !== 'firebasestorage.googleapis.com' && parsed.hostname !== 'storage.googleapis.com') return null;

    // getDownloadURL() của Firebase Web SDK dùng dạng:
    // /v0/b/{bucket}/o/{encoded object path}
    const firebaseMatch = /^\/v0\/b\/([^/]+)\/o\/(.+)$/.exec(parsed.pathname);
    if (firebaseMatch && decode(firebaseMatch[1]) === expectedBucket) {
      return decode(firebaseMatch[2]);
    }

    // Hỗ trợ URL Storage API nếu dữ liệu cũ được tạo bằng API khác.
    const storageApiMatch = /^\/(?:download\/)?storage\/v1\/b\/([^/]+)\/o\/(.+)$/.exec(parsed.pathname);
    if (storageApiMatch && decode(storageApiMatch[1]) === expectedBucket) {
      return decode(storageApiMatch[2]);
    }
  } catch {
    return null;
  }

  return null;
};

export const uniqueStoragePaths = (urls: readonly unknown[], expectedBucket: string): string[] =>
  [...new Set(urls
    .map(value => storagePathFromUrl(value, expectedBucket))
    .filter((path): path is string => Boolean(path)))];
