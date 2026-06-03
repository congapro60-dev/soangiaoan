import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { downloadBlob, safeFilename } from './fileUtils';

type DocxChild = Paragraph | Table;

const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const serializeSvgToPngDataUrl = async (svg: SVGSVGElement): Promise<string | null> => {
  const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

  if (!clonedSvg.getAttribute('xmlns')) {
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  const rect = svg.getBoundingClientRect();
  const viewBox = clonedSvg.getAttribute('viewBox');
  let width = Number.parseFloat(clonedSvg.getAttribute('width') || '') || rect.width || 600;
  let height = Number.parseFloat(clonedSvg.getAttribute('height') || '') || rect.height || 300;

  if ((!width || !height) && viewBox) {
    const [, , vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number);
    width = width || vbWidth || 600;
    height = height || vbHeight || 300;
  }

  clonedSvg.setAttribute('width', String(width));
  clonedSvg.setAttribute('height', String(height));

  const svgText = new XMLSerializer().serializeToString(clonedSvg);
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.decoding = 'async';
    image.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Không thể rasterize SVG khi xuất Word'));
      image.src = url;
    });

    const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
};

const getMathText = (element: Element): string | null => {
  const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
  if (annotation?.textContent?.trim()) return annotation.textContent.trim();

  const mathml = element.querySelector('.katex-mathml math, math');
  if (mathml?.textContent?.trim()) return mathml.textContent.trim();

  const fallback = element.textContent?.trim();
  return fallback || null;
};

const textRunsFromInline = (node: Node, inherited: { bold?: boolean; italics?: boolean } = {}): TextRun[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.replace(/\s+/g, ' ') || '';
    return text ? [new TextRun({ text, ...inherited })] : [];
  }

  if (!(node instanceof Element)) return [];

  if (node.classList.contains('katex')) {
    const math = getMathText(node);
    return math ? [new TextRun({ text: math, font: 'Cambria Math', ...inherited })] : [];
  }

  if (node.tagName.toLowerCase() === 'br') return [new TextRun({ text: '\n' })];

  const next = {
    bold: inherited.bold || ['strong', 'b'].includes(node.tagName.toLowerCase()),
    italics: inherited.italics || ['em', 'i'].includes(node.tagName.toLowerCase()),
  };

  return Array.from(node.childNodes).flatMap(child => textRunsFromInline(child, next));
};

const paragraphFromElement = (element: Element, options: { bullet?: boolean; heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel] } = {}): Paragraph => {
  const textRuns = Array.from(element.childNodes).flatMap(child => textRunsFromInline(child));
  const text = element.textContent?.trim() || '';
  const isOption = /^\s*[A-D]\.\s+/.test(text.replace(/^[-•]\s*/, ''));

  return new Paragraph({
    children: textRuns.length ? textRuns : [new TextRun('')],
    heading: options.heading,
    bullet: options.bullet && !isOption ? { level: 0 } : undefined,
    spacing: { before: isOption ? 60 : 90, after: isOption ? 60 : 120, line: 330 },
    indent: isOption ? { left: 360 } : options.bullet ? { left: 360, hanging: 180 } : undefined,
  });
};

const tableFromElement = (table: HTMLTableElement): Table => {
  const rows = Array.from(table.rows).map(row => new TableRow({
    children: Array.from(row.cells).map(cell => new TableCell({
      children: domToDocxChildren(cell).filter((child): child is Paragraph => child instanceof Paragraph),
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: '888888' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '888888' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '888888' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '888888' },
      },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
    })),
  }));

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
};

const imageParagraphFromElement = (img: HTMLImageElement): Paragraph | null => {
  if (!img.src.startsWith('data:image/')) return null;
  const width = Math.min(Number.parseFloat(img.getAttribute('width') || '') || img.naturalWidth || 520, 520);
  const height = Math.min(Number.parseFloat(img.getAttribute('height') || '') || img.naturalHeight || 300, 360);

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
    children: [
      new ImageRun({
        data: dataUrlToUint8Array(img.src),
        transformation: { width, height },
        type: img.src.includes('image/jpeg') ? 'jpg' : 'png',
      }),
    ],
  });
};

const domToDocxChildren = (root: Element): DocxChild[] => {
  const children: DocxChild[] = [];

  Array.from(root.children).forEach(element => {
    const tag = element.tagName.toLowerCase();

    if (element.classList.contains('katex-html')) return;

    if (tag === 'table') {
      children.push(tableFromElement(element as HTMLTableElement));
      return;
    }

    if (tag === 'img') {
      const imageParagraph = imageParagraphFromElement(element as HTMLImageElement);
      if (imageParagraph) children.push(imageParagraph);
      return;
    }

    if (['h1', 'h2'].includes(tag)) {
      children.push(paragraphFromElement(element, { heading: HeadingLevel.HEADING_1 }));
      return;
    }

    if (['h3', 'h4'].includes(tag)) {
      children.push(paragraphFromElement(element, { heading: HeadingLevel.HEADING_2 }));
      return;
    }

    if (tag === 'li') {
      children.push(paragraphFromElement(element, { bullet: !/^\s*[A-D]\.\s+/.test(element.textContent || '') }));
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      children.push(...domToDocxChildren(element));
      return;
    }

    if (['p', 'blockquote', 'pre'].includes(tag) || element.classList.contains('exam-question')) {
      children.push(paragraphFromElement(element));
      return;
    }

    const nested = domToDocxChildren(element);
    if (nested.length > 0) {
      children.push(...nested);
    } else if (element.textContent?.trim()) {
      children.push(paragraphFromElement(element));
    }
  });

  if (children.length === 0 && root.textContent?.trim()) {
    children.push(paragraphFromElement(root));
  }

  return children;
};

const prepareRenderedExamElement = async (selector = '.exam-container, .exam-renderer'): Promise<HTMLElement> => {
  const source = document.querySelector<HTMLElement>(selector);
  if (!source) {
    throw new Error('Không tìm thấy vùng đề thi đã render để xuất Word');
  }

  const clonedDOM = source.cloneNode(true) as HTMLElement;
  clonedDOM.querySelectorAll('script, style, textarea, button, input').forEach(node => node.remove());

  clonedDOM.querySelectorAll<HTMLElement>('.katex').forEach(katexElement => {
    const mathMlNode = katexElement.querySelector<HTMLElement>('.katex-mathml');
    if (!mathMlNode) return;

    const mathMlOnly = mathMlNode.cloneNode(true) as HTMLElement;
    mathMlOnly.removeAttribute('aria-hidden');
    mathMlOnly.querySelectorAll('[aria-hidden="true"]').forEach(node => node.removeAttribute('aria-hidden'));
    katexElement.replaceWith(mathMlOnly);
  });

  const svgs = Array.from(clonedDOM.querySelectorAll<SVGSVGElement>('svg'));
  for (const svg of svgs) {
    const dataUrl = await serializeSvgToPngDataUrl(svg);
    if (!dataUrl) continue;
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = svg.getAttribute('aria-label') || 'Hình minh họa';
    img.width = Math.min(svg.getBoundingClientRect().width || 520, 520);
    img.height = Math.min(svg.getBoundingClientRect().height || 300, 360);
    svg.replaceWith(img);
  }

  return clonedDOM;
};

export const exportExamToDocx = async (
  _rawMarkdown: string,
  title = 'De_thi_kiem_tra',
  selector = '.exam-container, .exam-renderer'
): Promise<void> => {
  const renderedExam = await prepareRenderedExamElement(selector);
  const children = domToDocxChildren(renderedExam);

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Times New Roman', size: 26 } },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: { font: 'Times New Roman', size: 32, bold: true },
          paragraph: { spacing: { before: 180, after: 120 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: { font: 'Times New Roman', size: 28, bold: true },
          paragraph: { spacing: { before: 150, after: 100 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: children.length ? children : [new Paragraph('')],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${safeFilename(title || 'De_thi_kiem_tra', 'De_thi_kiem_tra')}.docx`);
};
