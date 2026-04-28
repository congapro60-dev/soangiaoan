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
  selectors.forEach((sel) => {
    container.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      const rect = el.getBoundingClientRect();
      const start = Math.floor((rect.top - containerTop) * scale);
      const end = Math.ceil((rect.bottom - containerTop) * scale);
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
 * Rules (in priority order):
 * 1. If the break falls inside a zone AND the zone started within this page (z.start > pageStart):
 *    → move break to z.start (push zone to next page). Acceptable when z.start fills ≥ 25% of page.
 * 2. If the zone started before this page (already mid-zone) OR moving before is too wasteful:
 *    → move break to z.end (include the whole zone in this page, even if it extends past natural boundary).
 * 3. If the zone is larger than 1.5x a page: give up — accept the natural break.
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
      if (pageUsed >= sliceHeightPx * 0.25) {
        // Current page is ≥ 25% full before the zone → break before zone
        return z.start;
      }
      // Current page would be nearly empty — better to extend page to include whole zone
      const extendedEnd = z.end;
      if (extendedEnd - pageStart <= sliceHeightPx * 1.8) {
        return extendedEnd;
      }
      // Zone pushes page to > 1.8x height — accept natural break
      return naturalBreak;
    } else {
      // Zone started before current page (we're already inside it)
      // Move break to end of zone if it's not too far
      if (z.end - pageStart <= sliceHeightPx * 1.5) {
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
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
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

  pdf.save(filename);
};
