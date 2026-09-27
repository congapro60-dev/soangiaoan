/**
 * Tab mở từ bản deploy CŨ, sau đó app được deploy bản mới.
 *
 * Vite chia code thành nhiều file có tên đổi theo nội dung (`ClassesTab-BgSaY9Qt.js`). Vercel chỉ
 * phục vụ file của bản mới nhất, nên khi người dùng bấm sang một mục chưa tải, tab cũ đi tìm file
 * theo tên cũ → 404 → "Failed to fetch dynamically imported module". Không phải lỗi dữ liệu:
 * tải lại trang là lấy được bản mới và chạy bình thường.
 *
 * Tự tải lại MỘT lần. Nếu vừa tải lại vì chính lỗi này mà vẫn hỏng thì file mất thật — dừng lại
 * cho người dùng thấy nút bấm, không tải lại vô hạn.
 */

const RELOAD_KEY = 'smartplan:stale-chunk-reload-at';
/** Trong khoảng này đã tự tải lại một lần rồi mà vẫn lỗi thì coi là lỗi thật, không tải tiếp. */
export const STALE_RELOAD_GUARD_MS = 30_000;

type ReloadStorage = Pick<Storage, 'getItem' | 'setItem'>;

let reloadInProgress = false;

/** Câu lỗi của Chrome/Edge, Firefox và Safari khi file JS/CSS của bản cũ không còn. */
export const isStaleChunkError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i
    .test(message);
};

export const shouldAutoReload = (nowMs: number, lastReloadAt: number | null): boolean =>
  lastReloadAt === null || nowMs - lastReloadAt > STALE_RELOAD_GUARD_MS;

const sessionStorageOrNull = (): ReloadStorage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

/**
 * Tải lại trang nếu chưa vừa làm việc này. Trả `true` khi đã ra lệnh tải lại.
 *
 * Không đọc được sessionStorage (trình duyệt chặn) thì KHÔNG tự tải: không có chỗ ghi nhớ thì
 * không có gì chặn vòng lặp tải lại vô hạn khi file mất thật.
 */
export const reloadForStaleChunk = (
  storage: ReloadStorage | null = sessionStorageOrNull(),
  nowMs: number = Date.now(),
  reload: () => void = () => window.location.reload(),
): boolean => {
  if (!storage) return false;
  const last = Number(storage.getItem(RELOAD_KEY));
  if (!shouldAutoReload(nowMs, Number.isFinite(last) && last > 0 ? last : null)) return false;
  try {
    storage.setItem(RELOAD_KEY, String(nowMs));
  } catch {
    return false;
  }
  reloadInProgress = true;
  reload();
  return true;
};

/** Đang chờ trình duyệt tải lại vì lỗi này — trang lỗi nên hiện "đang tải bản mới" thay vì câu lỗi khó hiểu. */
export const isStaleReloadInProgress = (): boolean => reloadInProgress;
