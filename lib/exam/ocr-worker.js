// ponytail: pinned protocol review on upgrade / portable core SIMD only measured need.

/** @param {{ WorkerCtor?: typeof Worker | null, origin?: string, signal?: AbortSignal, onProgress?: (data: { progress?: number, status?: string }) => void }} options */
export function createOcr({
  WorkerCtor = (typeof Worker !== 'undefined' ? Worker : null),
  origin = (typeof location !== 'undefined' ? location.origin : ''),
  signal,
  onProgress
} = {}) {
  let worker = null;
  let initPromise = null;
  let destroyed = false;
  let nextId = 1;
  const pending = new Map();

  function failPending(err) {
    for (const [id, req] of pending) {
      clearTimeout(req.timer);
      pending.delete(id);
      req.reject(err);
    }
  }

  function terminate() {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  }

  function destroy(err = new DOMException('The operation was aborted', 'AbortError')) {
    if (destroyed) return;
    destroyed = true;
    if (signal && onAbort) signal.removeEventListener('abort', onAbort);
    failPending(err);
    terminate();
  }

  const onAbort = () => destroy();
  if (signal) {
    if (signal.aborted) destroyed = true;
    else signal.addEventListener('abort', onAbort, { once: true });
  }

  function post(action, payload) {
    return new Promise((resolve, reject) => {
      if (destroyed) return reject(new DOMException('The operation was aborted', 'AbortError'));
      const id = String(nextId++);
      const timer = setTimeout(() => {
        if (pending.has(id)) {
          destroy(new Error('OCR quá lâu. Thử lại với ít trang hơn.')); 
        }
      }, 30000);

      pending.set(id, { resolve, reject, timer });
      try { worker.postMessage({ workerId: 'exam-ocr', jobId: id, action, payload }); } catch { destroy(new Error('Không gửi được ảnh tới OCR.')); }
    });
  }

  async function init() {
    worker = new WorkerCtor(`${origin}/vendor/tesseract/worker.min.js`);
    worker.onerror = () => destroy(new Error('Chưa đọc được đề scan. Thử lại hoặc dùng PDF có chữ.'));
    worker.onmessage = (e) => {
      const { workerId, jobId, status, data } = e.data || {};
      if (workerId !== 'exam-ocr' || !pending.has(jobId)) return;
      if (status === 'progress') {
        onProgress?.(data);
        return;
      }
      const { resolve, reject, timer } = pending.get(jobId);
      clearTimeout(timer);
      pending.delete(jobId);
      if (status === 'resolve') resolve(data);
      else reject(new Error('Chưa đọc được đề scan. Thử lại hoặc dùng PDF có chữ.'));
    };

    await post('load', {
      options: { lstmOnly: true, corePath: `${origin}/vendor/tesseract/tesseract-core-lstm.wasm.js`, logging: false }
    });
    await post('loadLanguage', {
      langs: 'vie+eng',
      options: { langPath: `${origin}/vendor/tesseract/lang`, gzip: false, cacheMethod: 'none', lstmOnly: true }
    });
    await post('initialize', {
      langs: 'vie+eng',
      oem: 1,
      config: { tessedit_pageseg_mode: 3 }
    });
  }

  return {
    async recognize(bytes) {
      if (destroyed || signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');
      if (!initPromise) {
        initPromise = init().catch(err => {
          const outErr = signal?.aborted || err?.name === 'AbortError' ? new DOMException('The operation was aborted', 'AbortError') : new Error('Chưa đọc được đề scan. Thử lại hoặc dùng PDF có chữ.');
          destroy(outErr);
          throw outErr;
        });
      }
      await initPromise;
      if (destroyed || signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');
      return post('recognize', {
        image: bytes,
        options: {},
        output: { text: true, blocks: true, tsv: true }
      });
    },
    destroy
  };
}

