import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  ImportedXmlComponent,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { mml2omml } from 'mathml2omml';
import { LessonPlan } from '../types';
import { downloadBlob, safeFilename } from './fileUtils';

export type WordOrientation = 'portrait' | 'landscape';

type DocxInline = TextRun | ImportedXmlComponent;
type DocxChild = Paragraph | Table;

const FONT = 'Times New Roman';
const SIZE_14PT = 28; // docx size = half-points

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

const isVisibleEnough = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
};

const sanitizeKatexToMathMl = (root: HTMLElement): void => {
  root.querySelectorAll<HTMLElement>('.katex').forEach(katexElement => {
    const mathMlNode = katexElement.querySelector<HTMLElement>('.katex-mathml');
    if (!mathMlNode) return;

    // Keep only the MathML branch. KaTeX's visual HTML branch is intentionally removed:
    // Word can consume MathML/OMML, but the .katex-html spans flatten into broken text.
    const mathMlOnly = mathMlNode.cloneNode(true) as HTMLElement;
    mathMlOnly.removeAttribute('aria-hidden');
    mathMlOnly.querySelectorAll('[aria-hidden="true"]').forEach(node => node.removeAttribute('aria-hidden'));
    katexElement.replaceWith(mathMlOnly);
  });
};

const stripRawCodeBlocks = (root: HTMLElement): void => {
  root.querySelectorAll<HTMLPreElement>('pre').forEach(pre => {
    const rawText = pre.textContent || '';
    const isTikzCode = rawText.includes('\\begin{tikzpicture}');
    const isSvgCode = rawText.includes('<svg') || rawText.includes('xmlns="http://www.w3.org/2000/svg"');

    if (!isTikzCode && !isSvgCode) return;

    const placeholder = document.createElement('p');
    placeholder.textContent = isTikzCode
      ? '[Hình minh họa (TikZ/LaTeX) — xem bản PDF hoặc xuất LaTeX]'
      : '[Hình minh họa (SVG) — xem bản PDF để thấy hình đầy đủ]';
    pre.replaceWith(placeholder);
  });
};

const rasterizeSvgs = async (root: HTMLElement): Promise<void> => {
  const svgs = Array.from(root.querySelectorAll<SVGSVGElement>('svg'));
  for (const svg of svgs) {
    const dataUrl = await serializeSvgToPngDataUrl(svg);
    if (!dataUrl) continue;

    const rect = svg.getBoundingClientRect();
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = svg.getAttribute('aria-label') || 'Hình minh họa';
    img.width = Math.min(rect.width || Number.parseFloat(svg.getAttribute('width') || '') || 520, 520);
    img.height = Math.min(rect.height || Number.parseFloat(svg.getAttribute('height') || '') || 300, 360);
    svg.replaceWith(img);
  }
};

const findRenderedLessonSource = (): HTMLElement | null => {
  const selectors = [
    '#lesson-content .w-md-editor-preview',
    '#lesson-content .wmde-markdown',
    '#lesson-content .markdown-body',
    '.w-md-editor-preview',
    '.wmde-markdown',
    '.markdown-body',
  ];

  for (const selector of selectors) {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const source = candidates.find(candidate => isVisibleEnough(candidate) && candidate.textContent?.trim());
    if (source) return source;
  }

  return null;
};

const renderHiddenLessonPreview = async (content: string, title?: string): Promise<{ element: HTMLElement; cleanup: () => void }> => {
  const [
    { createRoot },
    { flushSync },
    { default: React },
    { default: ReactMarkdown },
    { default: remarkGfm },
    { default: remarkMath },
    { default: rehypeKatex },
    { default: rehypeRaw },
  ] = await Promise.all([
    import('react-dom/client'),
    import('react-dom'),
    import('react'),
    import('react-markdown'),
    import('remark-gfm'),
    import('remark-math'),
    import('rehype-katex'),
    import('rehype-raw'),
  ]);

  const container = document.createElement('div');
  container.id = 'word-render-container';
  container.className = 'markdown-body wmde-markdown';
  container.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: -10000px',
    'width: 720px',
    'background: #ffffff',
    'color: #000000',
    `font-family: ${FONT}, Times, serif`,
    'font-size: 14pt',
    'line-height: 1.5',
    'z-index: -1',
  ].join(';');
  document.body.appendChild(container);

  const root = createRoot(container);
  flushSync(() => {
    root.render(
      React.createElement(
        React.Fragment,
        null,
        title && React.createElement('h1', null, title),
        React.createElement(ReactMarkdown as any, {
          remarkPlugins: [remarkGfm, remarkMath],
          rehypePlugins: [rehypeRaw, rehypeKatex],
          children: content,
        })
      )
    );
  });

  await document.fonts.ready;
  await new Promise(resolve => window.requestAnimationFrame(resolve));

  return {
    element: container,
    cleanup: () => {
      root.unmount();
      container.remove();
    },
  };
};

const prepareRenderedLessonElement = async (currentPlan: Partial<LessonPlan>): Promise<{ element: HTMLElement; cleanup: () => void }> => {
  const visibleSource = findRenderedLessonSource();
  const rendered = visibleSource
    ? { element: visibleSource, cleanup: () => undefined }
    : await renderHiddenLessonPreview(currentPlan.content || '', currentPlan.title);

  const clonedDOM = rendered.element.cloneNode(true) as HTMLElement;
  clonedDOM.querySelectorAll('script, style, textarea, button, input, .w-md-editor-toolbar').forEach(node => node.remove());

  stripRawCodeBlocks(clonedDOM);
  sanitizeKatexToMathMl(clonedDOM);
  await rasterizeSvgs(clonedDOM);
  rendered.cleanup();

  return { element: clonedDOM, cleanup: () => undefined };
};

const mathMlToOmml = (element: Element): ImportedXmlComponent | null => {
  const math = element.tagName.toLowerCase() === 'math'
    ? element
    : element.querySelector('math');
  if (!math) return null;

  try {
    if (!math.getAttribute('xmlns')) {
      math.setAttribute('xmlns', 'http://www.w3.org/1998/Math/MathML');
    }
    const mathMl = new XMLSerializer().serializeToString(math);
    const omml = mml2omml(mathMl);

    // ImportedXmlComponent.fromXmlString wraps content in <undefined> tags
    // which corrupts the docx. Instead, parse OMML and build a proper
    // m:oMathPara > m:oMath structure that Word accepts.
    // Strip outer <m:oMath>...</m:oMath> wrapper if present — docx library
    // adds its own wrapper via the paragraph math run.
    const stripped = omml
      .replace(/^\s*<m:oMath[^>]*>/, '')
      .replace(/<\/m:oMath>\s*$/, '')
      .trim();

    // Use fromXmlString only on the inner content, wrapped in a known-good
    // root element that the docx library can serialize correctly.
    return ImportedXmlComponent.fromXmlString(
      `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${stripped}</m:oMath>`
    );
  } catch (error) {
    console.warn('Không thể chuyển MathML sang OMML, dùng text fallback:', error);
    return null;
  }
};

const textFallbackFromMath = (element: Element): string => {
  const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
  if (annotation?.textContent?.trim()) return annotation.textContent.trim();

  const katexElement = element.closest('.katex');
  const katexHtml = katexElement?.querySelector<HTMLElement>('.katex-html');
  if (katexHtml) {
    const visualClone = katexHtml.cloneNode(true) as HTMLElement;
    visualClone.querySelectorAll('[aria-hidden="true"], .vlist-r .vlist-s').forEach(node => node.remove());
    const visualText = visualClone.textContent?.replace(/\s+/g, ' ').trim();
    if (visualText) return visualText;
  }

  return element.textContent?.replace(/\s+/g, ' ').trim() || '';
};

const textRunsFromInline = (
  node: Node,
  inherited: { bold?: boolean; italics?: boolean } = {}
): DocxInline[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.replace(/\s+/g, ' ') || '';
    return text ? [new TextRun({ text, font: FONT, size: SIZE_14PT, ...inherited })] : [];
  }

  if (!(node instanceof Element)) return [];

  const tag = node.tagName.toLowerCase();

  if (tag === 'math' || node.classList.contains('katex-mathml')) {
    const omml = mathMlToOmml(node);
    if (omml) return [omml];

    const fallback = textFallbackFromMath(node);
    return fallback ? [new TextRun({ text: fallback, font: 'Cambria Math', size: SIZE_14PT, ...inherited })] : [];
  }

  if (node.classList.contains('katex-html')) return [];
  if (tag === 'br') return [new TextRun({ break: 1 })];

  const next = {
    bold: inherited.bold || ['strong', 'b'].includes(tag),
    italics: inherited.italics || ['em', 'i'].includes(tag),
  };

  return Array.from(node.childNodes).flatMap(child => textRunsFromInline(child, next));
};

const headingLevelForTag = (tag: string): (typeof HeadingLevel)[keyof typeof HeadingLevel] => {
  switch (tag) {
    case 'h1': return HeadingLevel.HEADING_1;
    case 'h2': return HeadingLevel.HEADING_2;
    case 'h3': return HeadingLevel.HEADING_3;
    case 'h4': return HeadingLevel.HEADING_4;
    case 'h5': return HeadingLevel.HEADING_5;
    default: return HeadingLevel.HEADING_6;
  }
};

const paragraphFromElement = (
  element: Element,
  options: {
    bullet?: boolean;
    heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  } = {}
): Paragraph => {
  const children = Array.from(element.childNodes).flatMap(child => textRunsFromInline(child));

  return new Paragraph({
    children: (children.length ? children : [new TextRun({ text: '', font: FONT, size: SIZE_14PT })]) as any,
    heading: options.heading,
    bullet: options.bullet ? { level: 0 } : undefined,
    alignment: options.alignment,
    spacing: { before: options.heading ? 160 : 90, after: options.heading ? 120 : 90, line: 360 },
    indent: options.bullet ? { left: 360, hanging: 180 } : undefined,
  });
};

const paragraphFromText = (text: string, options: Parameters<typeof paragraphFromElement>[1] = {}): Paragraph => (
  new Paragraph({
    children: [new TextRun({ text, font: FONT, size: SIZE_14PT, bold: Boolean(options?.heading) })],
    heading: options?.heading,
    alignment: options?.alignment,
    spacing: { before: options?.heading ? 160 : 90, after: options?.heading ? 120 : 90, line: 360 },
  })
);

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

const cellWidthFor = (idx: number, total: number): number => {
  if (total === 3) return idx === 2 ? 40 : 30;
  return total > 0 ? Math.floor(100 / total) : 100;
};

const tableFromElement = (table: HTMLTableElement): Table => {
  const rows = Array.from(table.rows).map(row => {
    const colCount = row.cells.length || 1;
    return new TableRow({
      tableHeader: row.parentElement?.tagName.toLowerCase() === 'thead' || row.rowIndex === 0,
      children: Array.from(row.cells).map((cell, idx) => {
        const children = domToDocxChildren(cell).filter((child): child is Paragraph => child instanceof Paragraph);
        return new TableCell({
          children: children.length ? children : [paragraphFromText(cell.textContent?.trim() || '')],
          shading: cell.tagName.toLowerCase() === 'th' ? { fill: 'E2E8F0', type: 'clear' } : undefined,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: '718096' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: '718096' },
            left: { style: BorderStyle.SINGLE, size: 1, color: '718096' },
            right: { style: BorderStyle.SINGLE, size: 1, color: '718096' },
          },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          width: { size: cellWidthFor(idx, colCount), type: WidthType.PERCENTAGE },
        });
      }),
    });
  });

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
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

    if (/^h[1-6]$/.test(tag)) {
      children.push(paragraphFromElement(element, {
        heading: headingLevelForTag(tag),
        alignment: tag === 'h1' ? AlignmentType.CENTER : undefined,
      }));
      return;
    }

    if (tag === 'li') {
      children.push(paragraphFromElement(element, { bullet: true }));
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      children.push(...domToDocxChildren(element));
      return;
    }

    if (['p', 'blockquote', 'pre'].includes(tag) || tag === 'math' || element.classList.contains('katex-mathml')) {
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

export const exportToWordA4 = async (
  currentPlan: Partial<LessonPlan>,
  showToast: (msg: string, type?: any) => void,
  orientation: WordOrientation = 'portrait'
) => {
  if (!currentPlan.content) {
    showToast('Không có nội dung giáo án để xuất', 'warning');
    return;
  }

  showToast('Đang tạo file Word chuẩn A4 với công thức MathML...', 'info');

  try {
    const { element: renderedLesson } = await prepareRenderedLessonElement(currentPlan);
    const docElements = domToDocxChildren(renderedLesson);

    const needsTitle = currentPlan.title && !docElements.some(child => {
      if (!(child instanceof Paragraph)) return false;
      return renderedLesson.querySelector('h1')?.textContent?.trim() === currentPlan.title?.trim();
    });

    if (needsTitle) {
      docElements.unshift(
        paragraphFromText(currentPlan.title!.toUpperCase(), {
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        })
      );
    }

    // Lề chuẩn Nghị định 30/2020/NĐ-CP (twips, 1cm = 567 twips):
    // Trên/dưới 20mm = 1134, trái 30mm = 1701, phải 18mm = 1021.
    const isLandscape = orientation === 'landscape';
    const doc = new Document({
      creator: 'SmartPlan AI',
      title: currentPlan.title || 'Giao an',
      styles: {
        default: {
          document: {
            run: { size: SIZE_14PT, font: FONT },
            paragraph: { spacing: { line: 360 } },
          },
        },
        paragraphStyles: [
          {
            id: 'Heading1',
            name: 'Heading 1',
            basedOn: 'Normal',
            next: 'Normal',
            run: { font: FONT, size: 32, bold: true },
            paragraph: { spacing: { before: 240, after: 180 } },
          },
          {
            id: 'Heading2',
            name: 'Heading 2',
            basedOn: 'Normal',
            next: 'Normal',
            run: { font: FONT, size: 30, bold: true },
            paragraph: { spacing: { before: 180, after: 120 } },
          },
          {
            id: 'Heading3',
            name: 'Heading 3',
            basedOn: 'Normal',
            next: 'Normal',
            run: { font: FONT, size: 28, bold: true },
            paragraph: { spacing: { before: 160, after: 100 } },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: isLandscape
                ? { width: 16838, height: 11906, orientation: PageOrientation.LANDSCAPE }
                : { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
              margin: { top: 1134, right: 1021, bottom: 1134, left: 1701 },
            },
          },
          children: docElements.length ? docElements : [new Paragraph('')],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, `${safeFilename(currentPlan.title)}_A4.docx`);
    showToast('Đã tải xuống file Word chuẩn A4 thành công!', 'success');
  } catch (err) {
    console.error('Lỗi xuất Word A4:', err);
    const msg = err instanceof Error ? err.message : String(err);
    showToast(`Có lỗi khi tạo file Word A4: ${msg}`, 'error');
  }
};
