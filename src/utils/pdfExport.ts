// PDF export using html2canvas-pro (supports Tailwind v4 oklch colors) + jsPDF directly.
// Replaces html2pdf.js because html2pdf.js depends on the original html2canvas
// which fails to parse oklch() color values introduced by Tailwind v4.

export interface PdfExportOptions {
  filename: string;
  marginMm?: [number, number, number, number]; // [top, right, bottom, left]
  scale?: number;
  jpegQuality?: number;
  /** CSS selectors whose matched elements must not be split across pages. Default: table rows + headings. */
  noBreakSelectors?: string[];
  /** Page orientation. Default: 'portrait' */
  orientation?: 'portrait' | 'landscape';
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

  raw.sort((a, b) => a.start - b.start);

  // Merge overlapping/adjacent zones
  const merged: Zone[] = [];
  for (const z of raw) {
    if (merged.length && z.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, z.end);
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
 * 4. If zone started before this page (we're mid-zone) → extend to z.end if reasonable.
 * 5. Zone larger than 1.5 pages — can't keep whole, accept natural break.
 */
function findBreakPoint(
  naturalBreak: number,
  pageStart: number,
  sliceHeightPx: number,
  zones: Zone[]
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
      if (zoneHeight <= sliceHeightPx * 0.4 && extendedTotal <= sliceHeightPx * 1.05) {
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
      // Extend to z.end to avoid splitting a row mid-content.
      // Allow up to 2x page height so tall multi-paragraph rows are not cut.
      if (z.end - pageStart <= sliceHeightPx * 2.0) {
        return z.end;
      }
      return naturalBreak;
    }
  }

  return naturalBreak;
}

export const exportElementToPdf = async (
  element: HTMLElement,
  options: PdfExportOptions
): Promise<void> => {
  const {
    filename,
    marginMm = [15, 12, 15, 12],
    scale = 2,
    jpegQuality = 0.92,
    // Protect: each table row (tr) and headings — keeps header rows intact; large tables still
    // get broken between rows, but never inside a row or heading.
    noBreakSelectors = ['tr', 'h1', 'h2', 'h3', 'h4'],
    orientation = 'portrait',
  } = options;

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

  // How many canvas pixels correspond to one PDF page of usable height
  const sliceHeightPx = Math.floor(usableHeight * (canvas.width / usableWidth));

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
      const breakAt = Math.min(
        findBreakPoint(naturalBreak, pageStart, sliceHeightPx, zones),
        canvas.height
      );

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
      pdf.text(String(i), pageWidth / 2, pageHeight - mBottom / 2, { align: 'center' });
    }
  }

  // Use jsPDF's built-in save() — cross-browser tested. Chrome sometimes ignores
  // the `download` attribute on <a> elements with Blob URLs and falls back to
  // the UUID in the blob URL as filename; pdf.save() avoids that path.
  pdf.save(filename);
};
