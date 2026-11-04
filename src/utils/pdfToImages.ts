import { applyCleanFilterToCanvas } from './imageCleanup';

/**
 * Cạnh dài tối đa (px) cho ảnh trang PDF của BÀI LÀM.
 *
 * 1536 px tương ứng 1,82 lần bản render scale 1 (72 DPI): chữ thân bài 12 pt lên ≈ 22 px và chỉ
 * số dưới 7 pt lên ≈ 13 px — đủ để đọc công thức, dấu mũ, ngoặc nhọn. Vẫn nằm trong mốc 768×2 của
 * Gemini nên tốn đúng 4 ô ảnh như bản 1536 cũ, không thêm token.
 */
export const BAI_LAM_MAX_CANH = 1536;
/** Chất lượng JPEG cho bài làm: 0,4 của luồng import đề làm nhoè nét bút/highlight. */
export const BAI_LAM_JPEG_QUALITY = 0.72;

/** Không phóng quá 3 lần: trang A5/A6 phóng quá tay chỉ tốn bộ nhớ mà không thêm chi tiết. */
const PHONG_TOI_DA = 3;

/** Pure browser rendering; no auth, uploads or AI. Existing import path keeps its six-page default. */
export const pdfToImages = async (
  file: File,
  onProgress?: (p: number) => void,
  autoClean?: boolean,
  pages?: readonly number[],
  options: { maxPages?: number; rejectOverflow?: boolean; maxCanh?: number; quality?: number } = {},
): Promise<string[]> => {
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
      const goc = page.getViewport({ scale: 1 });
      // maxCanh: phóng to trang cho tới khi cạnh dài chạm mốc, thay vì luôn luôn 72 DPI.
      const tiLe = options.maxCanh ? Math.min(PHONG_TOI_DA, options.maxCanh / Math.max(goc.width, goc.height)) : 1;
      const viewport = tiLe > 1 ? page.getViewport({ scale: tiLe }) : goc;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Trình duyệt chưa hỗ trợ xử lý trang PDF. Thử trình duyệt khác.');
      canvas.height = viewport.height; canvas.width = viewport.width;
      try {
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        if (autoClean) applyCleanFilterToCanvas(canvas, ctx);
        images.push(canvas.toDataURL('image/jpeg', options.quality ?? .4));
      } finally { canvas.width = 0; canvas.height = 0; }
      onProgress?.(Math.round((index + 1) / wanted.length * 100));
    }
    return images;
  } finally { await pdf.destroy(); }
};
