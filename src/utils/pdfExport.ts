// PDF export using html2canvas-pro (supports Tailwind v4 oklch colors) + jsPDF directly.
// Replaces html2pdf.js because html2pdf.js depends on the original html2canvas
// which fails to parse oklch() color values introduced by Tailwind v4.

export interface PdfExportOptions {
  filename: string;
  marginMm?: [number, number, number, number]; // [top, right, bottom, left]
  scale?: number;
  jpegQuality?: number;
}

export const exportElementToPdf = async (
  element: HTMLElement,
  options: PdfExportOptions
): Promise<void> => {
  const {
    filename,
    marginMm = [15, 12, 15, 12],
    scale = 1.5,
    jpegQuality = 0.92,
  } = options;

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

  const imgWidth = usableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= usableHeight) {
    const imgData = canvas.toDataURL('image/jpeg', jpegQuality);
    pdf.addImage(imgData, 'JPEG', mLeft, mTop, imgWidth, imgHeight);
  } else {
    // Slice canvas into pages
    const pxPerMm = canvas.width / usableWidth;
    const sliceHeightPx = Math.floor(usableHeight * pxPerMm);
    let renderedPx = 0;

    while (renderedPx < canvas.height) {
      const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - renderedPx);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = currentSliceHeight;
      const ctx = sliceCanvas.getContext('2d');
      if (!ctx) break;
      ctx.drawImage(
        canvas,
        0, renderedPx, canvas.width, currentSliceHeight,
        0, 0, canvas.width, currentSliceHeight
      );
      const sliceData = sliceCanvas.toDataURL('image/jpeg', jpegQuality);
      const sliceHeightMm = currentSliceHeight / pxPerMm;
      if (renderedPx > 0) pdf.addPage();
      pdf.addImage(sliceData, 'JPEG', mLeft, mTop, imgWidth, sliceHeightMm);
      renderedPx += currentSliceHeight;
    }
  }

  pdf.save(filename);
};
