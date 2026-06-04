import htmlToDocx from 'html-to-docx';
import { LessonPlan } from '../types';
import { downloadBlob, safeFilename } from './fileUtils';

export type WordOrientation = 'portrait' | 'landscape';

const WORD_EXPORT_STYLE = `
  body{font-family:'Times New Roman',serif;font-size:14pt;line-height:1.5;color:#000;}
  h1{text-align:center;text-transform:uppercase;font-size:18pt;font-weight:bold;margin:10pt 0 8pt;}
  h2{font-size:15pt;font-weight:bold;margin:8pt 0 4pt;color:#1a365d;}
  h3,h4,h5,h6{font-size:14pt;font-weight:bold;margin:6pt 0 3pt;}
  p{margin:6pt 0;text-align:justify;}
  table{border-collapse:collapse;width:100%;table-layout:fixed;margin:6pt 0;}
  td,th{border:1px solid black;padding:5px;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;vertical-align:top;}
  th{font-weight:bold;background:#e2e8f0;}
  img{max-width:100%;height:auto;}
  ul,ol{margin:6pt 0 6pt 22pt;padding:0;}
  li{margin:2pt 0;}
  blockquote{border-left:3px solid #94a3b8;margin:6pt 0;padding-left:12pt;font-style:italic;}
  math{font-family:'Cambria Math','Times New Roman',serif;}
`;

const isVisibleEnough = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
};

const findActiveMarkdownPreview = (): HTMLElement | null => {
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
    const visibleCandidate = candidates.find(candidate => isVisibleEnough(candidate) && candidate.textContent?.trim());
    if (visibleCandidate) return visibleCandidate;
  }

  return null;
};

const renderHiddenMarkdownPreview = async (
  content: string,
  title?: string,
): Promise<{ element: HTMLElement; cleanup: () => void }> => {
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
    "font-family: 'Times New Roman', Times, serif",
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
        }),
      ),
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

const getSvgDimensions = (svg: SVGSVGElement): { width: number; height: number } => {
  const rect = svg.getBoundingClientRect();
  const viewBox = svg.getAttribute('viewBox');
  let width = Number.parseFloat(svg.getAttribute('width') || '') || rect.width || 600;
  let height = Number.parseFloat(svg.getAttribute('height') || '') || rect.height || 300;

  if ((!width || !height) && viewBox) {
    const [, , vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number);
    width = width || vbWidth || 600;
    height = height || vbHeight || 300;
  }

  return { width, height };
};

const convertSvgToBase64Image = async (svg: SVGSVGElement): Promise<HTMLImageElement | null> => {
  const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
  if (!clonedSvg.getAttribute('xmlns')) {
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  const { width, height } = getSvgDimensions(svg);
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
      image.onerror = () => reject(new Error('Không thể chuyển SVG sang ảnh khi xuất Word'));
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

    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.alt = svg.getAttribute('aria-label') || svg.getAttribute('alt') || 'Hình minh họa';
    img.width = Math.min(width, 720);
    img.height = Math.round((img.width / width) * height);
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const replaceSvgsWithBase64Images = async (root: HTMLElement): Promise<void> => {
  const svgs = Array.from(root.querySelectorAll<SVGSVGElement>('svg'));

  for (const svg of svgs) {
    try {
      const img = await convertSvgToBase64Image(svg);
      if (img) svg.replaceWith(img);
    } catch (error) {
      console.warn('Bỏ qua SVG không thể chuyển sang ảnh khi xuất Word:', error);
      svg.remove();
    }
  }
};

const replaceKatexWithMathMl = (root: HTMLElement): void => {
  const katexNodes = Array.from(root.querySelectorAll<HTMLElement>('.katex'));

  for (const katexNode of katexNodes) {
    if (!katexNode.isConnected) continue;

    const mathMlNode = katexNode.querySelector<HTMLElement>('.katex-mathml');
    if (!mathMlNode) continue;

    const mathMlOnly = mathMlNode.cloneNode(true) as HTMLElement;
    mathMlOnly.removeAttribute('aria-hidden');
    mathMlOnly.querySelectorAll('[aria-hidden="true"]').forEach(node => node.removeAttribute('aria-hidden'));

    const math = mathMlOnly.tagName.toLowerCase() === 'math'
      ? mathMlOnly
      : mathMlOnly.querySelector<HTMLElement>('math');
    if (math && !math.getAttribute('xmlns')) {
      math.setAttribute('xmlns', 'http://www.w3.org/1998/Math/MathML');
    }

    katexNode.replaceWith(mathMlOnly);
  }
};

const sanitizeCloneForWord = async (source: HTMLElement): Promise<HTMLElement> => {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('script, style, textarea, button, input, select, .w-md-editor-toolbar').forEach(node => node.remove());
  await replaceSvgsWithBase64Images(clone);
  replaceKatexWithMathMl(clone);
  return clone;
};

const buildWordHtml = (sanitizedHtml: string): string => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${WORD_EXPORT_STYLE}</style></head><body>${sanitizedHtml}</body></html>`;

export const exportToWordA4 = async (
  currentPlan: Partial<LessonPlan>,
  showToast: (msg: string, type?: any) => void,
  orientation: WordOrientation = 'portrait',
) => {
  if (!currentPlan.content) {
    showToast('Không có nội dung giáo án để xuất', 'warning');
    return;
  }

  showToast('Đang tạo file Word chuẩn A4...', 'info');

  let hiddenPreviewCleanup: (() => void) | undefined;

  try {
    const activePreview = findActiveMarkdownPreview();
    const source = activePreview
      ? activePreview
      : await renderHiddenMarkdownPreview(currentPlan.content || '', currentPlan.title);

    const sourceElement = source instanceof HTMLElement ? source : source.element;
    if (!(source instanceof HTMLElement)) hiddenPreviewCleanup = source.cleanup;

    const clonedDOM = await sanitizeCloneForWord(sourceElement);

    if (currentPlan.title && !clonedDOM.querySelector('h1')) {
      clonedDOM.insertAdjacentHTML('afterbegin', `<h1>${currentPlan.title}</h1>`);
    }

    const htmlString = buildWordHtml(clonedDOM.innerHTML);
    const generated = await htmlToDocx(htmlString, {
      margins: { top: 1134, right: 1021, bottom: 1134, left: 1701 },
      orientation,
    });

    const blob = generated instanceof Blob
      ? generated
      : new Blob([generated], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    downloadBlob(blob, `${safeFilename(currentPlan.title)}_A4.docx`);
    showToast('Đã tải xuống file Word chuẩn A4 thành công!', 'success');
  } catch (err) {
    console.error('Lỗi xuất Word A4:', err);
    const msg = err instanceof Error ? err.message : String(err);
    showToast(`Có lỗi khi tạo file Word A4: ${msg}`, 'error');
  } finally {
    hiddenPreviewCleanup?.();
  }
};
