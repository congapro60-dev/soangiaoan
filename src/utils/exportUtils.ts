import pptxgen from 'pptxgenjs';
import { LessonPlan, AppData } from '../types';
import { callAI, getActiveApiKey } from '../lib/aiProviders';
import { safeFilename } from './fileUtils';

export type PdfOrientation = 'portrait' | 'landscape';

export const exportToPDF = async (
  currentPlan: Partial<LessonPlan>,
  showToast: (msg: string, type?: any) => void,
  orientation: PdfOrientation = 'portrait'
) => {
  if (!currentPlan.content) {
    showToast('Không có nội dung giáo án để xuất', 'warning');
    return;
  }

  showToast('Đang tạo PDF, vui lòng chờ...');

  // Theo Nghị định 30/2020/NĐ-CP: A4 (210×297mm), lề trên/dưới 20mm, lề trái 30mm, lề phải 18mm.
  const isLandscape = orientation === 'landscape';
  const renderWidthPx = isLandscape ? 941 : 612; // 249mm hoặc 162mm @ 96dpi
  const marginMm: [number, number, number, number] = [20, 18, 20, 30];

  // Load React rendering stack. These modules are already in the bundle (used by
  // LessonContentBoard) so this is just reference resolution, not extra download.
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
  container.id = 'pdf-render-container';
  container.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: -10000px',
    `width: ${renderWidthPx}px`,
    'background: #ffffff',
    'padding: 0',
    'margin: 0',
    'z-index: -1',
    'box-sizing: border-box',
  ].join(';');

  const style = document.createElement('style');
  style.id = 'pdf-print-style';
  // CSS chuẩn Nghị định 30/2020/NĐ-CP: Times New Roman 14pt, line-height ≤ 1.5,
  // spacing đoạn ≥ 6pt, đầu dòng thụt 1cm, justify.
  style.innerHTML = `
    #pdf-render-container {
      font-family: 'Times New Roman', Times, serif;
      color: #000;
      font-size: 14pt;
      line-height: 1.5;
      box-sizing: border-box;
    }
    #pdf-render-container * { box-sizing: border-box; }
    /* Do NOT set font-family with !important — it would break KaTeX's own inline
       font-family declarations (KaTeX_Math, KaTeX_Main, etc.) causing math blanks. */
    #pdf-render-container h1 {
      font-size: 18pt !important; font-weight: bold !important;
      text-align: center !important; margin: 10pt 0 6pt !important;
      text-transform: uppercase;
    }
    #pdf-render-container h2 {
      font-size: 15pt !important; font-weight: bold !important;
      margin: 8pt 0 4pt !important; color: #1a365d !important;
    }
    #pdf-render-container h3 {
      font-size: 14pt !important; font-weight: bold !important;
      margin: 6pt 0 3pt !important;
    }
    #pdf-render-container h4, #pdf-render-container h5, #pdf-render-container h6 {
      font-size: 14pt !important; font-weight: bold !important;
      margin: 5pt 0 3pt !important;
    }
    #pdf-render-container p {
      font-size: 14pt !important; margin: 6pt 0 !important;
      text-align: justify !important;
      text-indent: 1cm !important;
    }
    #pdf-render-container td p,
    #pdf-render-container th p,
    #pdf-render-container li p { text-indent: 0 !important; }
    #pdf-render-container ul, #pdf-render-container ol {
      margin: 6pt 0 6pt 22pt !important; padding: 0 !important;
    }
    #pdf-render-container li { font-size: 14pt !important; margin: 2pt 0 !important; }
    #pdf-render-container strong { font-weight: bold !important; }
    #pdf-render-container em { font-style: italic !important; }
    #pdf-render-container table {
      border-collapse: collapse !important;
      width: 100% !important;
      table-layout: fixed !important;
      margin: 6pt 0 !important;
    }
    #pdf-render-container table th,
    #pdf-render-container table td {
      border: 1px solid #555 !important;
      padding: 5pt 7pt !important;
      vertical-align: top !important;
      text-align: left !important;
      font-size: 13pt !important;
      line-height: 1.4 !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
    }
    #pdf-render-container table th {
      background: #e2e8f0 !important; font-weight: bold !important;
    }
    #pdf-render-container blockquote {
      border-left: 3px solid #94a3b8 !important;
      padding-left: 12pt !important; margin: 6pt 0 !important;
      font-style: italic !important;
    }
    #pdf-render-container code {
      font-family: 'Courier New', monospace !important;
      background: #f1f5f9 !important;
      padding: 1pt 4pt !important;
      border-radius: 3px;
      font-size: 13pt !important;
    }
    #pdf-render-container pre {
      background: #f8fafc !important;
      padding: 6pt !important;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12pt !important;
      line-height: 1.4 !important;
    }
    #pdf-render-container .katex { font-size: 1em !important; padding: 1pt 0 !important; }
    #pdf-render-container .katex-display { margin: 4pt 0 !important; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(container);

  const root = createRoot(container);
  try {
    // Render markdown through the same ReactMarkdown pipeline used in LessonContentBoard
    // so the PDF always shows the formatted view (tables, bold, math) regardless of
    // which editor mode the user has open.
    flushSync(() => {
      root.render(
        React.createElement(
          React.Fragment,
          null,
          currentPlan.title &&
            React.createElement('h1', null, currentPlan.title),
          React.createElement(
            ReactMarkdown as any,
            {
              remarkPlugins: [remarkGfm, remarkMath],
              rehypePlugins: [rehypeRaw, rehypeKatex],
              children: currentPlan.content,
            }
          )
        )
      );
    });

    // Wait for KaTeX web fonts (@font-face) to finish loading before html2canvas
    // captures. Without this, math glyphs render as blank rectangles in the PDF.
    await document.fonts.ready;

    const { exportElementToPdf } = await import('./pdfExport');
    await exportElementToPdf(container, {
      filename: `${safeFilename(currentPlan.title)}.pdf`,
      scale: 2,
      marginMm,
      orientation,
    });
    showToast('Đã tải xuống file PDF!', 'success');
  } catch (e) {
    console.error(e);
    showToast('Lỗi khi xuất PDF, vui lòng thử lại.', 'error');
  } finally {
    root.unmount();
    if (style.parentNode) style.remove();
    if (container.parentNode) container.remove();
  }
};

export const exportToLaTeX = async (
  currentPlan: Partial<LessonPlan>,
  data: AppData,
  setIsLoading: (val: boolean) => void,
  setIsSettingsOpen: (val: boolean) => void,
  showToast: (msg: string, type?: any) => void,
  setLatexContent: (val: string) => void,
  setIsLatexModalOpen: (val: boolean) => void
) => {
  if (!currentPlan.content) return;
  if (!getActiveApiKey(data.settings)) {
    setIsSettingsOpen(true);
    showToast('Vui lòng nhập API Key!', 'warning');
    return;
  }
  setIsLoading(true);
  showToast('Đang chuyển đổi giáo án sang LaTeX...', 'info');
  try {
    const prompt = `
Bạn là chuyên gia LaTeX. Hãy chuyển đổi CHÍNH XÁC nội dung giáo án Markdown sau sang mã nguồn LaTeX (.tex) hoàn chỉnh, có thể biên dịch trực tiếp trên Overleaf.

NỘI DUNG GIÁO ÁN:
---
${currentPlan.content}
---

YÊU CẦU BẮT BUỘC:
1. TUYỆT ĐỐI KHÔNG ĐƯỢC TÓM TẮT MỘT TỪ NÀO. Bắt buộc giữ nguyên 100% nội dung chữ, độ dài, toàn bộ các luồng hội thoại của GV/HS và bảng biểu.
2. Tạo file .tex hoàn chỉnh với \\documentclass{article}, sử dụng \\usepackage{longtable} vì bảng giáo án rất dài và cần ngắt trang tự động.
3. Mọi BẢNG BIỔU phải dùng môi trường \\begin{longtable} với đầy đủ cột, hàng, đường kẻ (\\hline).
4. Công thức Toán phải bọc trong $ hoặc \\[ \\].
4. Tiêu đề sử dụng \\section, \\subsection, \\subsubsection.
5. Danh sách dùng \\begin{itemize} hoặc \\begin{enumerate}.
6. Hình ảnh (nếu có URL) dùng \\includegraphics hoặc ghi chú URL.
7. Sử dụng tiếng Việt với \\usepackage[vietnamese]{babel} hoặc \\usepackage{fontspec} nếu cần.
8. CHỈ TRẢ VỀ MÃ NGUỒN LATEX THUẦN TÚY, không bọc trong markdown code block, không kèm giải thích.
    `;
    const result = await callAI(prompt, data.settings);
    if (result) {
      const cleanLatex = result.replace(/^```(?:latex|tex)?\n?/i, '').replace(/\n?```$/i, '').trim();
      setLatexContent(cleanLatex);
      setIsLatexModalOpen(true);
      showToast('Đã chuyển đổi sang LaTeX thành công!');
    }
  } catch (error) {
    console.error(error);
    showToast('Lỗi khi chuyển đổi sang LaTeX', 'error');
  } finally {
    setIsLoading(false);
  }
};

export const generateSlideData = async (
  currentPlan: Partial<LessonPlan>,
  data: AppData,
  setIsLoading: (val: boolean) => void,
  showToast: (msg: string, type?: any) => void
): Promise<any[] | null> => {
  if (!currentPlan.title || !currentPlan.content) return null;
  if (!getActiveApiKey(data.settings)) {
    showToast('Vui lòng cung cấp API Key AI để tạo slide', 'warning');
    return null;
  }

  setIsLoading(true);
  showToast('AI đang thiết kế khung slide bài giảng, vui lòng chờ...', 'info');

  try {
    const prompt = `
BẠN LÀ CHUYÊN GIA THIẾT KẾ BÀI TRÌNH CHIẾU SƯ PHẠM ĐẲNG CẤP QUỐC TẾ.
Dựa vào nội dung giáo án sau, hãy tạo cấu trúc Slide bài giảng theo phong cách TED Talk: Súc tích, hình ảnh hóa và truyền cảm hứng.

Giáo án:
---
${currentPlan.content}
---

YÊU CẦU BẮT BUỘC:
1. Trả về JSON thuần tuý là một mảng object theo đúng schema sau:
[
  {
    "type": "walt",
    "title": "MỤC TIÊU BÀI HỌC",
    "icon": "🎯",
    "points": ["Sau bài này, HS sẽ hiểu được...", "HS sẽ vận dụng được..."],
    "formulas": [],
    "speakerNotes": "Lời dẫn mở đầu...",
    "visualSuggestion": "Mô tả hình ảnh cụ thể để GV tìm kiếm (vd: sơ đồ tư duy hình cây...)"
  },
  {
    "type": "content",
    "title": "TIÊU ĐỀ SLIDE (VIẾT HOA)",
    "icon": "📐",
    "points": ["Ý chính 1 — ngắn gọn", "Ý chính 2 — cụm từ then chốt"],
    "formulas": ["\\\\frac{a+b}{2}", "\\\\sum_{k=0}^{n} C_n^k a^{n-k} b^k"],
    "speakerNotes": "Lời dẫn chi tiết cho GV...",
    "visualSuggestion": "Mô tả hình ảnh minh họa cụ thể..."
  },
  {
    "type": "wrapup",
    "title": "TỔNG KẾT & BÀI TẬP VỀ NHÀ",
    "icon": "✅",
    "points": ["Kiến thức trọng tâm cần nhớ...", "Bài tập: ..."],
    "formulas": [],
    "speakerNotes": "Tổng kết bài...",
    "visualSuggestion": "Hình ảnh tổng kết..."
  }
]

2. TRÌNH TỰ BẮT BUỘC: slide đầu là "type":"walt", slide cuối là "type":"wrapup", các slide giữa là "type":"content".
3. Tối đa 10 slides (1 walt + tối đa 8 content + 1 wrapup).
4. Trường "formulas": Nếu slide có công thức Toán, hãy viết LATEX THUẦN TÚY (không bao $, không dùng \\( \\)). Ví dụ: "\\\\frac{a}{b}", "x^2 + y^2 = r^2". Nếu không có công thức thì để mảng rỗng [].
5. Trường "points": Viết UNICODE thuần túy (x², √2, ∞), KHÔNG viết LaTeX trong points.
6. Trường "icon": Một emoji phù hợp với nội dung slide.
CHỈ TRẢ VỀ JSON, KHÔNG BỌC BỞI \`\`\`json.
    `;

    const response = await callAI(prompt, data.settings);
    if (!response) throw new Error("No response");

    const match = response.match(/\[[\s\S]*\]/);
    const jsonStr = match ? match[0] : response.replace(/```json/g, '').replace(/```/g, '').trim();

    const slidesData = JSON.parse(jsonStr);

    showToast('Đã thiết kế xong cấu trúc Slide!');
    return slidesData;
  } catch (e) {
    console.error(e);
    showToast('Lỗi cấu trúc hoặc kết nối AI, vui lòng thử lại', 'error');
    return null;
  } finally {
    setIsLoading(false);
  }
};

const PALETTE = {
  primary:   '1B4F72',
  accent:    '2E86AB',
  light:     'D6EAF8',
  white:     'FFFFFF',
  dark:      '17202A',
  gray:      '85929E',
  green:     '1A5276',
  orange:    '784212',
  lightGray: 'F2F3F4',
};
const FONT = 'Times New Roman';

// Renders a LaTeX string to a base64 PNG using KaTeX + html2canvas-pro.
// Returns null on failure — callers fall back to plain text.
const renderFormulaToBase64 = async (latex: string): Promise<{ data: string; aspect: number } | null> => {
  try {
    const [{ default: katex }, { default: html2canvas }] = await Promise.all([
      import('katex'),
      import('html2canvas-pro'),
    ]);

    const div = document.createElement('div');
    div.style.cssText = [
      'position:fixed', 'left:-9999px', 'top:0',
      'background:white', 'padding:12px 20px',
      'font-size:26px', 'display:inline-block',
    ].join(';');
    div.innerHTML = katex.renderToString(latex, { throwOnError: false, displayMode: true });
    document.body.appendChild(div);

    await document.fonts.ready;

    const canvas = await (html2canvas as any)(div, {
      scale: 3, backgroundColor: '#ffffff', logging: false, useCORS: true,
    });
    document.body.removeChild(div);

    return { data: canvas.toDataURL('image/png'), aspect: canvas.width / canvas.height };
  } catch {
    return null;
  }
};

export const downloadPPTX = async (slidesData: any[], title: string) => {
  if (!slidesData || slidesData.length === 0) return;

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  // Slide size: 10 × 5.625 inches

  // ── Title slide ──────────────────────────────────────────────────────────
  const tSlide = pptx.addSlide();
  tSlide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: '100%', fill: { color: PALETTE.primary },
  });
  // Accent strip bottom
  tSlide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 4.9, w: '100%', h: 0.725, fill: { color: PALETTE.accent },
  });
  tSlide.addText(title, {
    x: 1, y: 1.2, w: 8, h: 2.4,
    fontSize: 38, color: PALETTE.white, bold: true,
    align: 'center', valign: 'middle', fontFace: FONT,
  });
  tSlide.addText('SmartPlan AI', {
    x: 1, y: 4.9, w: 8, h: 0.5,
    fontSize: 16, color: PALETTE.light, align: 'center', fontFace: FONT,
  });

  // ── Content slides ────────────────────────────────────────────────────────
  for (let i = 0; i < slidesData.length; i++) {
    const s = slidesData[i];
    const pSlide = pptx.addSlide();
    pSlide.background = { color: PALETTE.white };

    // Header bar color by slide type
    const headerColor =
      s.type === 'walt'   ? '1A5276' :
      s.type === 'wrapup' ? '4A235A' :
                            PALETTE.primary;

    pSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 1.05, fill: { color: headerColor },
    });

    // Icon + title in header
    const headerText = s.icon ? `${s.icon}  ${s.title}` : s.title;
    pSlide.addText(headerText, {
      x: 0.35, y: 0.1, w: 9.3, h: 0.85,
      fontSize: 24, color: PALETTE.white, bold: true,
      valign: 'middle', fontFace: FONT,
    });

    // Slide counter
    pSlide.addText(`${i + 1} / ${slidesData.length}`, {
      x: 8.8, y: 5.3, w: 0.9, h: 0.2,
      fontSize: 10, color: PALETTE.gray, align: 'right', fontFace: FONT,
    });

    // Render formulas → base64 PNGs (parallel)
    const rawFormulas: string[] = Array.isArray(s.formulas) ? s.formulas.filter(Boolean) : [];
    const formulaImages = rawFormulas.length > 0
      ? await Promise.all(rawFormulas.map(renderFormulaToBase64))
      : [];
    const hasFormulas = formulaImages.some(Boolean);

    // Layout widths
    const contentX = 0.35;
    const contentW = hasFormulas ? 5.5 : 9.3;
    const panelX   = 6.05;
    const panelW   = 3.6;
    const contentY = 1.15;
    const contentH = 4.25;

    // Bullet points
    if (Array.isArray(s.points) && s.points.length > 0) {
      const items = s.points.map((p: string) => ({
        text: p,
        options: { bullet: { indent: 18 }, fontSize: 17, color: PALETTE.dark, fontFace: FONT },
      }));
      pSlide.addText(items, {
        x: contentX, y: contentY, w: contentW, h: contentH, valign: 'top',
      });
    }

    // Formula panel (right side)
    if (hasFormulas) {
      // Light panel background
      pSlide.addShape(pptx.ShapeType.rect, {
        x: panelX, y: contentY, w: panelW, h: contentH,
        fill: { color: PALETTE.light },
        line: { color: PALETTE.accent, width: 1 },
      });

      let imgY = contentY + 0.15;
      const maxImgW = panelW - 0.2;
      const maxImgH = 1.5;
      const gap     = 0.18;

      for (const img of formulaImages) {
        if (!img) continue;
        const imgH = Math.min(maxImgW / img.aspect, maxImgH);
        if (imgY + imgH > contentY + contentH - 0.1) break;
        try {
          pSlide.addImage({ data: img.data, x: panelX + 0.1, y: imgY, w: maxImgW, h: imgH });
        } catch {
          // skip unrenderable formula
        }
        imgY += imgH + gap;
      }
    }

    // Visual suggestion hint (small footer, only when no formula panel)
    if (!hasFormulas && s.visualSuggestion) {
      pSlide.addText(`💡 ${s.visualSuggestion}`, {
        x: contentX, y: 5.25, w: 9.3, h: 0.3,
        fontSize: 9, color: PALETTE.gray, italic: true, fontFace: FONT,
      });
    }

    if (s.speakerNotes) pSlide.addNotes(s.speakerNotes);
  }

  pptx.writeFile({ fileName: `${safeFilename(title, 'baigiang')}.pptx` });
};

export const openInOverleaf = (latexContent: string, currentPlan: Partial<LessonPlan>, showToast: (msg: string) => void) => {
  if (!latexContent) return;
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://www.overleaf.com/docs';
  form.target = '_blank';
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'snip_uri';
  input.value = 'data:application/x-tex;base64,' + btoa(unescape(encodeURIComponent(latexContent)));
  form.appendChild(input);
  const nameInput = document.createElement('input');
  nameInput.type = 'hidden';
  nameInput.name = 'snip_name';
  nameInput.value = `${currentPlan.title || 'giao-an'}.tex`;
  form.appendChild(nameInput);
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
  showToast('Đang mở Overleaf...');
};
