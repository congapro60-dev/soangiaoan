// Reads a PDF exam in the browser: the lines of text with their positions (to find the questions) and the pages as
// pictures (to cut one picture per question, because formulas and figures cannot be read reliably from PDF text).
import { groupPdfLines } from "../../lib/exam/parse.js";

export interface PdfLine {
  page: number;
  x: number;
  top: number;
  bottom: number;
  text: string;
  itemContentX?: number;
}
export interface Region {
  page: number;
  top: number;
  bottom: number;
  left?: number;
}

interface PdfPageProxy {
  getViewport(options: { scale: number }): { width: number; height: number };
  getTextContent(): Promise<{ items: Array<{ str?: string; transform: number[]; width: number; height: number }> }>;
  render(options: { canvasContext: CanvasRenderingContext2D; viewport: unknown; canvas?: HTMLCanvasElement }): { promise: Promise<void> };
}
interface PdfDocumentProxy {
  numPages: number;
  getPage(n: number): Promise<PdfPageProxy>;
  destroy(): Promise<void>;
}

const SCALE = 2;

/** Cuts the empty space under the last line or figure, so a question that ends high on the page is not followed by a blank screen. */
function trimBlank(canvas: HTMLCanvasElement) {
  const g = canvas.getContext("2d");
  if (!g) return;
  const { width, height } = canvas;
  const data = g.getImageData(0, 0, width, height).data;
  let last = 0;
  for (let y = height - 1; y >= 0 && last === 0; y--) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      if (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235) {
        last = y;
        break;
      }
    }
  }
  const keep = Math.min(height, last + 14);
  if (keep < height && keep > 20) {
    const copy = g.getImageData(0, 0, width, keep);
    canvas.height = keep;
    g.putImageData(copy, 0, 0);
  }
}

export interface LoadedPdf {
  lines: PdfLine[];
  pages: Array<{ width: number; height: number }>;
  /** Left edge of the text on the page, in points (the right margin is taken to be the same). */
  margin: number;
  ocrPages: number[];
  crop(regions: Region[]): Promise<string>;
  destroy(): void;
}

export async function loadPdf(file: File, onProgress: (done: number, total: number) => void, options: { signal?: AbortSignal; onOcrProgress?: (message: string) => void } = {}): Promise<LoadedPdf> {
  const check = () => { if (options.signal?.aborted) throw new DOMException("Đã hủy đọc đề", "AbortError"); };
  check();
  if (file.size > 10 * 1024 * 1024) throw new Error("File tối đa 10 MB.");
  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const image = /\.(png|jpe?g)$/i.test(file.name);
  let doc: PdfDocumentProxy;
  if (image) {
    if (!(signature[0] === 137 && signature[1] === 80 && signature[2] === 78 && signature[3] === 71) && !(signature[0] === 255 && signature[1] === 216 && signature[2] === 255)) throw new Error("Ảnh PNG/JPG chưa hợp lệ.");
    const bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > 16_000_000) { bitmap.close(); throw new Error("Ảnh vượt 16 triệu pixel. Giảm kích thước rồi thử lại."); }
    doc = { numPages: 1, getPage: async () => ({ getViewport: ({ scale }) => ({ width: bitmap.width * scale / 2, height: bitmap.height * scale / 2 }), getTextContent: async () => ({ items: [] }), render: ({ canvasContext, viewport }) => { const size = viewport as { width: number; height: number }; canvasContext.drawImage(bitmap, 0, 0, size.width, size.height); return { promise: Promise.resolve() }; } }), destroy: async () => bitmap.close() };
  } else {
  if (new TextDecoder().decode(signature.slice(0, 5)) !== "%PDF-") throw new Error("File PDF chưa hợp lệ.");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
  const data = new Uint8Array(await file.arrayBuffer());
  doc = (await pdfjs.getDocument({ data, isEvalSupported: false }).promise) as unknown as PdfDocumentProxy;
  }
  const abortDocument = () => { void doc.destroy(); };
  options.signal?.addEventListener("abort", abortDocument, { once: true });
  let ocr: ReturnType<typeof import("../../lib/exam/ocr-worker.js")["createOcr"]> | undefined;
  const lines: PdfLine[] = [];
  const pages: Array<{ width: number; height: number }> = [];
  const proxies: PdfPageProxy[] = [];
  const ocrPages: number[] = [];
  let ocrPage = 1;
  const paint = async (page: PdfPageProxy, scale: number) => {
    check();
    const viewport = page.getViewport({ scale });
    if (viewport.width * viewport.height > 16_000_000) throw new Error("Trang vượt 16 triệu pixel. Giảm kích thước rồi thử lại.");
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không mở được ảnh đề.");
    context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    check();
    return canvas;
  };
  try {
  check();
  if (doc.numPages > 30) throw new Error("Đề tối đa 30 trang. Chia nhỏ file rồi thử lại.");
  for (let n = 1; n <= doc.numPages; n++) {
    check();
    const page = await doc.getPage(n);
    const view = page.getViewport({ scale: 1 });
    pages.push({ width: view.width, height: view.height });
    proxies.push(page);
    const content = await page.getTextContent();
    const textLines = groupPdfLines(content.items.filter((i) => typeof i.str === "string") as never, view.height, n) as PdfLine[];
    if (textLines.map(l => l.text).join("").trim().length >= 20) lines.push(...textLines);
    else {
      const { createOcr } = await import("../../lib/exam/ocr-worker.js");
      const { ocrLines } = await import("../../lib/exam/ocr-lines.js");
      ocrPage = n;
      ocr ||= createOcr({ signal: options.signal, onProgress: (p: { progress?: number }) => { if (!options.signal?.aborted) options.onOcrProgress?.("Đọc đề scan: trang " + ocrPage + "/" + doc.numPages + " · " + Math.round((p.progress || 0) * 100) + "%"); } });
      const scale = image ? Math.min(2, 2400 / Math.max(view.width, view.height)) : 150 / 72;
      const canvas = await paint(page, scale);
      try {
        const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Không đọc được ảnh đề.")), "image/png"));
        const result = await ocr.recognize(new Uint8Array(await png.arrayBuffer()));
        check();
        lines.push(...ocrLines(result, scale, n, bbox => {
          const x=Math.max(0,Math.floor(bbox.x0)),y=Math.max(0,Math.floor(bbox.y0));
          return canvas.getContext("2d")!.getImageData(x,y,Math.max(1,Math.min(canvas.width-x,Math.ceil(bbox.x1)-x)),Math.max(1,Math.min(canvas.height-y,Math.ceil(bbox.y1)-y)));
        }));
        ocrPages.push(n);
      } finally { canvas.width = canvas.height = 0; }
    }
    check();
    onProgress(n, doc.numPages);
  }
  } catch (error) { options.signal?.removeEventListener("abort", abortDocument); await doc.destroy(); check(); throw error; }
  finally { ocr?.destroy(); }
  const xs = lines.filter((l) => l.text.length > 8).map((l) => l.x);
  const margin = Math.max(8, (xs.length ? Math.min(...xs) : 40) - 10);

  const canvases = new Map<number, HTMLCanvasElement>();
  const render = async (n: number) => {
    const known = canvases.get(n);
    if (known) return known;
    const canvas = await paint(proxies[n - 1], SCALE);
    canvases.set(n, canvas);
    return canvas;
  };
  const clearCanvases = () => { for (const canvas of canvases.values()) canvas.width = canvas.height = 0; canvases.clear(); };

  return {
    lines,
    pages,
    margin,
    ocrPages,
    async crop(regions) {
      clearCanvases();
      try {
      const strips: Array<{ canvas: HTMLCanvasElement; sx: number; sw: number; sy: number; sh: number }> = [];
      for (const r of regions) {
        const canvas = await render(r.page);
        const sy = Math.max(0, Math.floor(r.top * SCALE));
        const sh = Math.min(canvas.height - sy, Math.ceil((r.bottom - r.top) * SCALE));
        const sx = Math.floor((r.left ?? margin) * SCALE);
        const sw = Math.min(canvas.width, Math.floor((pages[r.page - 1].width - margin) * SCALE)) - sx;
        if (!Number.isFinite(sx) || sx < 0 || sw <= 4) throw new Error("Vùng cắt ngang chưa hợp lệ.");
        if (sh > 4) strips.push({ canvas, sx, sw, sy, sh });
      }
      if (!strips.length) return "";
      const width = Math.max(...strips.map((s) => s.sw));
      const height = strips.reduce((sum, s) => sum + s.sh, 0) + 12;
      if (width * height > 16_000_000) throw new Error("Vùng cắt vượt 16 triệu pixel. Chia thành các ảnh nhỏ hơn.");
      for (const quality of [0.86, 0.74, 0.62]) {
        const out = document.createElement("canvas");
        out.width = Math.round(width);
        out.height = height;
        const g = out.getContext("2d");
        if (!g) return "";
        g.fillStyle = "#fff";
        g.fillRect(0, 0, out.width, out.height);
        let y = 6;
        for (const s of strips) {
          g.drawImage(s.canvas, s.sx, s.sy, s.sw, s.sh, 0, y, s.sw, s.sh);
          y += s.sh;
        }
        trimBlank(out);
        const base64 = out.toDataURL("image/jpeg", quality).split(",")[1] || "";
        out.width = out.height = 0;
        if (base64.length <= 690_000) return base64;
      }
      return "";
      } finally { clearCanvases(); }
    },
    destroy() {
      options.signal?.removeEventListener("abort", abortDocument);
      clearCanvases();
      void doc.destroy();
    },
  };
}
