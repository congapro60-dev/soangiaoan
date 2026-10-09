// Reads a PDF exam in the browser: the lines of text with their positions (to find the questions) and the pages as
// pictures (to cut one picture per question, because formulas and figures cannot be read reliably from PDF text).
import { groupPdfLines } from "../../lib/exam/parse.js";

export interface PdfLine {
  page: number;
  x: number;
  top: number;
  bottom: number;
  text: string;
}
export interface Region {
  page: number;
  top: number;
  bottom: number;
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
  crop(regions: Region[]): Promise<string>;
  destroy(): void;
}

export async function loadPdf(file: File, onProgress: (done: number, total: number) => void): Promise<LoadedPdf> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = (await pdfjs.getDocument({ data, isEvalSupported: false }).promise) as unknown as PdfDocumentProxy;
  const lines: PdfLine[] = [];
  const pages: Array<{ width: number; height: number }> = [];
  const proxies: PdfPageProxy[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const view = page.getViewport({ scale: 1 });
    pages.push({ width: view.width, height: view.height });
    proxies.push(page);
    const content = await page.getTextContent();
    lines.push(...(groupPdfLines(content.items.filter((i) => typeof i.str === "string") as never, view.height, n) as PdfLine[]));
    onProgress(n, doc.numPages);
  }
  const xs = lines.filter((l) => l.text.length > 8).map((l) => l.x);
  const margin = Math.max(8, (xs.length ? Math.min(...xs) : 40) - 10);

  const canvases = new Map<number, HTMLCanvasElement>();
  const render = async (n: number) => {
    const known = canvases.get(n);
    if (known) return known;
    const page = proxies[n - 1];
    const viewport = page.getViewport({ scale: SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    canvases.set(n, canvas);
    return canvas;
  };

  return {
    lines,
    pages,
    margin,
    async crop(regions) {
      const strips: Array<{ canvas: HTMLCanvasElement; sy: number; sh: number }> = [];
      for (const r of regions) {
        const canvas = await render(r.page);
        const sy = Math.max(0, Math.floor(r.top * SCALE));
        const sh = Math.min(canvas.height - sy, Math.ceil((r.bottom - r.top) * SCALE));
        if (sh > 4) strips.push({ canvas, sy, sh });
      }
      if (!strips.length) return "";
      const sx = Math.floor(margin * SCALE);
      const width = pages[regions[0].page - 1].width * SCALE - sx * 2;
      const height = strips.reduce((sum, s) => sum + s.sh, 0) + 12;
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
          g.drawImage(s.canvas, sx, s.sy, out.width, s.sh, 0, y, out.width, s.sh);
          y += s.sh;
        }
        trimBlank(out);
        const base64 = out.toDataURL("image/jpeg", quality).split(",")[1] || "";
        if (base64.length <= 690_000) return base64;
      }
      return "";
    },
    destroy() {
      canvases.clear();
      void doc.destroy();
    },
  };
}
