import { onIdTokenChanged } from 'firebase/auth';
import { auth } from '../firebase';

/** Một stream + một lượt đọc tại một thời điểm. Callback kiểm guard trước khi cập nhật React. */
export const watchScoreBook = (options: {
  classId?: string;
  onInvalidate: (current: () => boolean) => Promise<void>;
  onError?: (error: Error) => void;
}): (() => void) => {
  let stopped = false; let generation = 0; let failures = 0;
  let controller: AbortController | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let refreshing = false; let dirty = false;
  const current = (version: number, uid: string) => !stopped && version === generation && uid === auth.currentUser?.uid && document.visibilityState === 'visible';
  const refresh = async () => {
    dirty = true;
    if (refreshing) return;
    refreshing = true;
    try {
      while (dirty && !stopped && document.visibilityState === 'visible') {
        dirty = false;
        const version = generation; const uid = auth.currentUser?.uid;
        if (!uid) break;
        try { await options.onInvalidate(() => current(version, uid)); }
        catch (error) { if (current(version, uid)) options.onError?.(error instanceof Error ? error : new Error('Chưa tải được bảng điểm.')); }
      }
    } finally { refreshing = false; }
  };
  const cancel = () => {
    generation += 1;
    controller?.abort(); controller = undefined;
    clearTimeout(retry); retry = undefined;
    dirty = false;
  };
  const connect = async () => {
    const user = auth.currentUser;
    if (stopped || document.visibilityState !== 'visible' || !user || (options.classId && user.isAnonymous)) return;
    const version = generation; const request = new AbortController(); controller = request;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let reconnect = true; let delay = 250;
    try {
      const idToken = await user.getIdToken();
      if (!current(version, user.uid)) return;
      const response = await fetch('/api/classroom', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: request.signal,
        body: JSON.stringify({ action: options.classId ? 'teacherScoreBookStream' : 'studentScoreBookStream', ...(options.classId ? { classId: options.classId } : {}), idToken }),
      });
      if (!current(version, user.uid)) return;
      if (!response.ok) {
        reconnect = response.status !== 401 && response.status !== 403;
        throw new Error('Chưa kết nối được cập nhật bảng điểm.');
      }
      if (!response.body) throw new Error('Trình duyệt chưa hỗ trợ cập nhật bảng điểm.');
      reader = response.body.getReader();
      const decoder = new TextDecoder(); let buffer = '';
      while (current(version, user.uid)) {
        const chunk = await reader.read();
        if (!current(version, user.uid) || chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        if (buffer.length > 4096) throw new Error('Dữ liệu cập nhật bảng điểm không hợp lệ.');
        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
          if (!line.trim()) continue;
          const event = JSON.parse(line) as { type?: unknown };
          if (event.type === 'invalidate') { failures = 0; void refresh(); }
        }
      }
    } catch (error) {
      if (!current(version, user.uid) || request.signal.aborted) return;
      delay = Math.min(30_000, 1000 * 2 ** Math.min(failures++, 5));
      options.onError?.(error instanceof Error ? error : new Error('Mất kết nối bảng điểm.'));
    } finally {
      void reader?.cancel().catch(() => {});
      if (current(version, user.uid) && !request.signal.aborted && reconnect) retry = setTimeout(() => { retry = undefined; void connect(); }, delay);
    }
  };
  const restart = () => { cancel(); failures = 0; void connect(); };
  const unsubscribe = onIdTokenChanged(auth, restart);
  document.addEventListener('visibilitychange', restart);
  return () => { stopped = true; cancel(); unsubscribe(); document.removeEventListener('visibilitychange', restart); };
};
