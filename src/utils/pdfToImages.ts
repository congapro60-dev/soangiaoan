import { applyCleanFilterToCanvas } from './imageCleanup';


/** Pure browser rendering; no auth, uploads or AI. Existing import path keeps its six-page default. */
export const pdfToImages = async (file: File, onProgress?: (p: number) => void, autoClean?: boolean, pages?: readonly number[], options: { maxPages?: number; rejectOverflow?: boolean } = {}): Promise<string[]> => {
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  try {
    const maxPages = options.maxPages ?? 6;
    const requested = pages?.length ? pages.filter(n => Number.isInteger(n) && n >= 1 && n <= pdf.numPages) : Array.from({ length: pdf.numPages }, (_, k) => k + 1);
    if (options.rejectOverflow && requested.length > maxPages) throw new Error(`${file.name} có ${requested.length} trang. Lượt nộp này chỉ còn chỗ cho ${maxPages} trang và PDF gốc; tách PDF thành các phần rồi nộp tiếp.`);
    const wanted = requested.slice(0, maxPages);
    const images: string[] = [];
    for (const [index, number] of wanted.entries()) {
      const page = await pdf.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Trình duyệt chưa hỗ trợ xử lý trang PDF. Thử trình duyệt khác.');
      canvas.height = viewport.height; canvas.width = viewport.width;
      try {
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        if (autoClean) applyCleanFilterToCanvas(canvas, ctx);
        images.push(canvas.toDataURL('image/jpeg', .4));
      } finally { canvas.width = 0; canvas.height = 0; }
      onProgress?.(Math.round((index + 1) / wanted.length * 100));
    }
    return images;
  } finally { await pdf.destroy(); }
};
