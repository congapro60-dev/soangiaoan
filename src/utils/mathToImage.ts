import katex from 'katex';

export interface RenderedFormula {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Render một công thức LaTeX thành ảnh PNG (data URL) để nhúng vào nơi không hỗ trợ
 * LaTeX trực tiếp (PPTX). Dùng KaTeX output 'mathml' + SVG foreignObject để trình duyệt
 * tự dựng hình bằng font Math hệ thống — không cần nạp font ngoài qua data URI (không tin
 * cậy được vì data: URI không resolve được relative @font-face). Kỹ thuật giống
 * src/utils/handwritingCanvas.ts (đã chạy ổn định cho tính năng xuất lời giải viết tay).
 */
export const renderLatexToPng = (
  latex: string,
  options: { displayMode?: boolean; scale?: number; color?: string; fontSizePx?: number } = {}
): Promise<RenderedFormula | null> => {
  const { displayMode = false, scale = 3, color = '#1e293b', fontSizePx = 28 } = options;

  return new Promise(resolve => {
    try {
      const html = katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        output: 'mathml',
      });

      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      wrapper.style.cssText = `position:absolute; left:-9999px; top:-9999px; visibility:hidden; display:inline-block; white-space:nowrap; font-size:${fontSizePx}px; color:${color};`;
      document.body.appendChild(wrapper);
      const rect = wrapper.getBoundingClientRect();
      const width = Math.max(1, Math.ceil(rect.width)) + 12;
      const height = Math.max(1, Math.ceil(rect.height)) + 12;
      document.body.removeChild(wrapper);

      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:${fontSizePx}px; color:${color}; display:inline-block; padding:6px; white-space:nowrap;">${html}</div>
        </foreignObject>
      </svg>`;

      const img = new Image();
      const svg64 = btoa(unescape(encodeURIComponent(svgString)));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
      };
      img.onerror = () => resolve(null);
      img.src = 'data:image/svg+xml;base64,' + svg64;
    } catch (e) {
      console.error('renderLatexToPng failed', e);
      resolve(null);
    }
  });
};

/** Chuyển các mẫu LaTeX phổ biến sang ký tự Unicode gần đúng — dùng cho công thức
 *  INLINE ngắn ($...$) khi giữ nguyên dạng text (không rasterize) vẫn đọc được, thay vì
 *  hiện nguyên backslash gãy như "\frac{1}{2}" trên slide. */
export const latexToPlainTextApprox = (latex: string): string => {
  let s = latex;
  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2');
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');
  s = s.replace(/\\left|\\right/g, '');
  s = s.replace(/\\times/g, '×').replace(/\\cdot/g, '·').replace(/\\div/g, '÷');
  s = s.replace(/\\le(q)?/g, '≤').replace(/\\ge(q)?/g, '≥').replace(/\\neq/g, '≠');
  s = s.replace(/\\pi/g, 'π').replace(/\\infty/g, '∞').replace(/\\pm/g, '±');
  s = s.replace(/\\rightarrow|\\to/g, '→');
  s = s.replace(/\\overline\{([^{}]*)\}/g, '$1̄');
  s = s.replace(/\^\{?2\}?/g, '²').replace(/\^\{?3\}?/g, '³');
  s = s.replace(/[{}\\]/g, '');
  return s.trim();
};

/** Tách các khối công thức display ($$...$$) khỏi văn bản, trả về text còn lại (đã bỏ
 *  khối display) và danh sách LaTeX cần render thành ảnh riêng. */
export const extractDisplayFormulas = (text: string): { remainingText: string; formulas: string[] } => {
  const formulas: string[] = [];
  const remainingText = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_match, expr) => {
      const trimmed = String(expr).trim();
      if (trimmed) formulas.push(trimmed);
      return '';
    })
    .trim();
  return { remainingText, formulas };
};

/** Thay các công thức inline ($...$) còn lại bằng xấp xỉ text (an toàn để hiện trực tiếp). */
export const replaceInlineFormulasWithText = (text: string): string =>
  text.replace(/\$([^$\n]+?)\$/g, (_match, expr) => latexToPlainTextApprox(String(expr)));
