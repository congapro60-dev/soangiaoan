// PDF export using html2canvas-pro (supports Tailwind v4 oklch colors) + jsPDF directly.
// Replaces html2pdf.js because html2pdf.js depends on the original html2canvas
// which fails to parse oklch() color values introduced by Tailwind v4.

export interface PdfExportOptions {
  filename: string;
  marginMm?: [number, number, number, number]; // [top, right, bottom, left]
  scale?: number;
  jpegQuality?: number;
  /** CSS selectors whose matched elements must not be split across pages. Default: question blocks + figures + tables + headings. */
  noBreakSelectors?: string[];
  /** Page orientation. Default: 'portrait' */
  orientation?: 'portrait' | 'landscape';
  /** 'save' (mặc định) tải file về; 'blob' trả file để gói nhiều báo cáo vào một ZIP. */
  output?: 'save' | 'blob';
  /**
   * Trang được "giãn" tối đa bao nhiêu lần chiều cao để không cắt ngang một khối (áp cho mọi lát, kể cả trang bắt đầu giữa khối).
   * Phần giãn lấn vào lề dưới. Bỏ trống: tự tính phần lề còn trống phía trên số trang (tối đa 1.05),
   * và chỗ cắt rơi đúng giới hạn trang (vd. giữa khối cao quá trang) được lùi lên khe trống giữa hai dòng.
   */
  maxStretch?: number;
  /** Khoảng cách từ mép dưới giấy tới chân số trang, mm (mặc định: giữa lề dưới). */
  pageNumberFromBottomMm?: number;
}

interface Zone {
  start: number; // canvas pixel Y (top of element)
  end: number;   // canvas pixel Y (bottom of element)
}

/** Build sorted, merged list of forbidden break zones from DOM element bounding boxes. */
function buildForbiddenZones(
  container: HTMLElement,
  selectors: string[],
  containerTop: number,
  scale: number
): Zone[] {
  const raw: Zone[] = [];

  // Standard zones: each matched element must not be split
  selectors.forEach((sel) => {
    container.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      const rect = el.getBoundingClientRect();
      const start = Math.floor((rect.top - containerTop) * scale);
      const end = Math.ceil((rect.bottom - containerTop) * scale);
      if (end > start + 2) raw.push({ start, end });
    });
  });

  // Orphan protection: for each heading in selectors, extend zone to include the next
  // visible sibling. This prevents a heading being the last thing on a page with its
  // table/paragraph pushed to the next page ("orphaned heading").
  const headingSelectors = selectors.filter((s) => /^h[1-6]$/i.test(s));
  headingSelectors.forEach((sel) => {
    container.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      const rect = el.getBoundingClientRect();
      const start = Math.floor((rect.top - containerTop) * scale);
      let end = Math.ceil((rect.bottom - containerTop) * scale);
      // Walk next siblings until we find one with visible height
      let next = el.nextElementSibling as HTMLElement | null;
      while (next) {
        const nr = next.getBoundingClientRect();
        if (nr.height > 0) {
          end = Math.ceil((nr.bottom - containerTop) * scale);
          break;
        }
        next = next.nextElementSibling as HTMLElement | null;
      }
      if (end > start + 2) raw.push({ start, end });
    });
  });

  return mergeZones(raw);
}

/** Hai khối kề nhau chỉ lệch làm tròn floor/ceil (vài pixel) KHÔNG phải một khối: gộp chúng thì cả đề thành một vùng cấm khổng lồ. */
const ZONE_TOUCH_TOLERANCE_PX = 3;

/** Gộp các vùng lồng/chồng nhau thật (khối con trong khối cha, tiêu đề + khối liền sau); vùng chỉ chạm mép thì giữ riêng. */
export function mergeZones(raw: Zone[]): Zone[] {
  const sorted = [...raw].sort((a, b) => a.start - b.start);
  const merged: Zone[] = [];
  for (const z of sorted) {
    const last = merged[merged.length - 1];
    if (last && z.start < last.end - ZONE_TOUCH_TOLERANCE_PX) {
      last.end = Math.max(last.end, z.end);
    } else {
      merged.push({ ...z });
    }
  }
  return merged;
}

/**
 * Find the best break point near `naturalBreak` that avoids splitting a forbidden zone.
 *
 * Priority order (designed to avoid both broken zones AND wasted whitespace):
 * 1. If zone is small (≤ 40% page) and we can stretch the page slightly to fit it
 *    (extending up to 1.05x page height) → stretch. Avoids leaving big white blocks.
 * 2. If page is already ≥ 60% full → break before the zone (push to next page).
 * 3. If page is < 60% full and stretch isn't viable → accept natural break.
 *    Better to clip a row than to throw away half a page of paper.
 * 4. If zone started before this page (we're mid-zone) → extend to z.end if it fits within maxStretch,
 *    otherwise split inside it (a slice taller than the page would be cropped off the paper).
 * 5. Zone larger than 1.5 pages — can't keep whole, accept natural break.
 */
export function findBreakPoint(
  naturalBreak: number,
  pageStart: number,
  sliceHeightPx: number,
  zones: Zone[],
  maxStretch = 1.05,
): number {
  if (naturalBreak <= 0) return naturalBreak;

  for (const z of zones) {
    // Only care about zones that straddle the break point
    if (z.start >= naturalBreak || z.end <= naturalBreak) continue;

    const zoneHeight = z.end - z.start;

    // Zone is larger than 1.5 pages — can't keep it whole, accept natural break
    if (zoneHeight > sliceHeightPx * 1.5) return naturalBreak;

    if (z.start > pageStart) {
      // Zone starts within the current page
      const pageUsed = z.start - pageStart;
      const extendedEnd = z.end;
      const extendedTotal = extendedEnd - pageStart;

      // Priority 1: Stretch page to fit small zone — avoids whitespace
      if (zoneHeight <= sliceHeightPx * 0.4 && extendedTotal <= sliceHeightPx * maxStretch) {
        return extendedEnd;
      }

      // Priority 2: Page is sufficiently full — break before the zone
      if (pageUsed >= sliceHeightPx * 0.6) {
        return z.start;
      }

      // Priority 3: Page is too empty AND stretch isn't viable — accept natural break
      return naturalBreak;
    } else {
      // Zone started before current page (we're already inside it — pushed here from prev break).
      // Extend to z.end only within maxStretch: một lát cao hơn trang bị vẽ tràn khỏi giấy, mất phần dưới
      // và đè số trang (trước đây cho kéo tới 2 lần trang). Khối cao hơn thế thì đành cắt trong khối.
      if (z.end - pageStart <= sliceHeightPx * maxStretch) {
        return z.end;
      }
      return naturalBreak;
    }
  }

  return naturalBreak;
}

/**
 * Lùi điểm cắt `breakAt` lên giữa khe trống gần nhất (≥ `minRun` hàng pixel giống hệt nhau liên tiếp — khoảng
 * giữa hai dòng chữ; viền dọc của khung/bảng không làm hỏng vì mọi hàng trong khe đều có cùng viền).
 * `rows` là RGBA của các hàng [breakAt − rows.length/(4·width), breakAt). Không có khe → giữ `breakAt`.
 */
export function snapBreakToRowGap(rows: Uint8ClampedArray, width: number, breakAt: number, minRun: number): number {
  const px = new Uint32Array(rows.buffer, rows.byteOffset, rows.byteLength >> 2);
  const height = px.length / width;
  const sameAsBelow = (r: number) => {
    for (let x = 0, a = r * width, b = a + width; x < width; x++) if (px[a + x] !== px[b + x]) return false;
    return true;
  };
  // run = số hàng liên tiếp giống hàng ngay dưới, đếm từ dưới lên; khe gồm run + 1 hàng.
  let run = 0;
  for (let r = height - 2; r >= 0; r--) {
    if (sameAsBelow(r)) run++;
    else {
      if (run + 1 >= minRun) return breakAt - height + r + 1 + Math.floor((run + 1) / 2);
      run = 0;
    }
  }
  return breakAt;
}

/** Trần giãn mặc định: phần lề dưới còn trống phía trên số trang (chữ cỡ 13 cao ~4.5mm + 1.5mm hở), tối đa 1.05. */
export function defaultMaxStretch(usableHeightMm: number, bottomMarginMm: number, pageNumberFromBottomMm: number): number {
  const room = bottomMarginMm - (pageNumberFromBottomMm + 6);
  return Math.min(1.05, 1 + Math.max(0, room) / usableHeightMm);
}

const markExamQuestionBlocks = (element: HTMLElement): (() => void) => {
  const marked: HTMLElement[] = [];
  const candidates = Array.from(element.querySelectorAll<HTMLElement>('p, li, .exam-question, .question-block'));
  candidates.forEach(node => {
    const text = node.textContent?.trim() || '';
    if (/^(Câu\s*\d+[.:]|Câu\s*\d+\b)/i.test(text) || node.classList.contains('exam-question') || node.classList.contains('question-block')) {
      node.classList.add('pdf-no-break-question');
      marked.push(node);
    }
  });

  return () => marked.forEach(node => node.classList.remove('pdf-no-break-question'));
};

export const exportElementToPdf = async (
  element: HTMLElement,
  options: PdfExportOptions
): Promise<Blob | void> => {
  const {
    filename,
    marginMm = [15, 12, 15, 12],
    scale = 2,
    jpegQuality = 0.92,
    // Protect question starts, figures, tables and headings. If a question is longer than a page,
    // the exporter still allows a safe split to avoid infinite blank pages.
    noBreakSelectors = ['.pdf-no-break-question', '.exam-question', '.question-block', '.exam-figure', '.exam-svg', '.variation-table', 'img', 'svg', 'table', 'tr', 'h1', 'h2', 'h3', 'h4'],
    orientation = 'portrait',
    output = 'save',
    maxStretch,
    pageNumberFromBottomMm,
  } = options;

  const cleanupMarkedQuestions = markExamQuestionBlocks(element);

  try {
    // 1. Measure forbidden zones BEFORE html2canvas (DOM layout is stable at this point).
    const containerRect = element.getBoundingClientRect();
    const zones = buildForbiddenZones(element, noBreakSelectors, containerRect.top, scale);

    // 2. Capture the full content as a single high-res canvas.
    const [h2cMod, jsPdfMod] = await Promise.all([
      import('html2canvas-pro'),
      import('jspdf'),
    ]);
    const html2canvas = (h2cMod.default ?? h2cMod) as any;
    const { jsPDF } = jsPdfMod as any;

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (_document: Document, clonedElement: HTMLElement) => {
        clonedElement.style.backgroundColor = '#ffffff';
        clonedElement.querySelectorAll<HTMLElement>('.w-md-editor-toolbar, .w-md-editor-text, button, textarea').forEach(node => {
          node.style.display = 'none';
        });
        // Note: breakInside/pageBreakInside is a no-op in html2canvas (it renders pixels, not pages).
        // Page break logic is handled by findBreakPoint() + zone calculation below.
      },
      // Fix: capture the FULL scrollable content, not just the visible viewport.
      // Without these, html2canvas only renders what's currently in view,
      // producing a single-page PDF that cuts off the rest of the exam.
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const [mTop, mRight, mBottom, mLeft] = marginMm;
    const usableWidth = pageWidth - mLeft - mRight;
    const usableHeight = pageHeight - mTop - mBottom;
    const numberFromBottom = pageNumberFromBottomMm ?? mBottom / 2;
    const stretch = maxStretch ?? defaultMaxStretch(usableHeight, mBottom, numberFromBottom);

    // How many canvas pixels correspond to one PDF page of usable height
    const sliceHeightPx = Math.floor(usableHeight * (canvas.width / usableWidth));

    // Chỗ cắt rơi đúng giới hạn trang (không phải mép một khối) có thể cắt đôi một dòng chữ → lùi lên khe giữa hai dòng.
    // Báo cáo PH tự đặt `maxStretch` và đã nghiệm thu riêng, giữ nguyên cách cắt của nó.
    const snapToLineGap = (breakAt: number): number => {
      if (maxStretch !== undefined || breakAt >= canvas.height) return breakAt;
      const windowPx = Math.floor(sliceHeightPx * 0.15);
      try {
        const rows = canvas.getContext('2d')!.getImageData(0, breakAt - windowPx, canvas.width, windowPx).data;
        return snapBreakToRowGap(rows, canvas.width, breakAt, Math.max(2, Math.round(3 * scale)));
      } catch {
        return breakAt; // canvas bẩn (ảnh khác nguồn) → không đọc được điểm ảnh
      }
    };

    if (canvas.height <= sliceHeightPx) {
      // Everything fits on one page
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', jpegQuality);
      pdf.addImage(imgData, 'JPEG', mLeft, mTop, usableWidth, imgHeight);
    } else {
      // Multi-page: slice canvas with zone-aware break points
      let pageStart = 0;
      let isFirstPage = true;

      while (pageStart < canvas.height) {
        const naturalBreak = pageStart + sliceHeightPx;
        const chosen = findBreakPoint(naturalBreak, pageStart, sliceHeightPx, zones, stretch);
        const breakAt = Math.min(chosen === naturalBreak ? snapToLineGap(chosen) : chosen, canvas.height);

        let sliceHeight = breakAt - pageStart;
        if (sliceHeight <= 0) {
          // Safety valve: avoid infinite loop if zones push break behind pageStart
          pageStart = breakAt + 1;
          continue;
        }
        sliceHeight = Math.min(sliceHeight, canvas.height - pageStart);

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) break;

        ctx.drawImage(
          canvas,
          0, pageStart, canvas.width, sliceHeight,
          0, 0,        canvas.width, sliceHeight
        );

        const sliceData = sliceCanvas.toDataURL('image/jpeg', jpegQuality);
        const sliceHeightMm = (sliceHeight / canvas.width) * usableWidth;

        if (!isFirstPage) pdf.addPage();
        pdf.addImage(sliceData, 'JPEG', mLeft, mTop, usableWidth, sliceHeightMm);

        isFirstPage = false;
        pageStart = breakAt;
      }
    }

    // Đánh số trang: cỡ 13, căn giữa, đặt ở chân trang (lề dưới), không hiện trang 1.
    const totalPages = pdf.getNumberOfPages();
    if (totalPages > 1) {
      pdf.setFont('times', 'normal');
      pdf.setFontSize(13);
      for (let i = 2; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.text(String(i), pageWidth / 2, pageHeight - numberFromBottom, { align: 'center' });
      }
    }

    // Use jsPDF's built-in save() — cross-browser tested. Chrome sometimes ignores
    // the `download` attribute on <a> elements with Blob URLs and falls back to
    // the UUID in the blob URL as filename; pdf.save() avoids that path.
    if (output === 'blob') return pdf.output('blob');
    pdf.save(filename);
  } finally {
    cleanupMarkedQuestions();
  }
};
