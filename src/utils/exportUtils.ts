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
  const original = document.getElementById('lesson-content');
  if (!original) return;

  showToast('Đang tạo PDF, vui lòng chờ...');

  // Theo Nghị định 30/2020/NĐ-CP: A4 (210×297mm), lề trên/dưới 20mm, lề trái 30mm, lề phải 18mm.
  // Usable width = 210 - 30 - 18 = 162mm (dọc) hoặc 297 - 30 - 18 = 249mm (ngang).
  // Render width = usableWidth * 96/25.4 (px @ 96dpi).
  const isLandscape = orientation === 'landscape';
  const renderWidthPx = isLandscape ? 941 : 612; // 249mm hoặc 162mm @ 96dpi
  const marginMm: [number, number, number, number] = [20, 18, 20, 30]; // top, right, bottom, left

  // Clone content into an offscreen container with EXACT A4 usable width.
  // This way html2canvas captures at the same width that jsPDF will place on the page,
  // so 14pt in DOM renders as 14pt in PDF (no shrinking).
  const clone = original.cloneNode(true) as HTMLElement;
  // Remove the floating "Chỉnh sửa" toggle button that lives inside #lesson-content
  clone.querySelectorAll('button').forEach((b) => b.remove());

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
  container.appendChild(clone);

  const style = document.createElement('style');
  style.id = 'pdf-print-style';
  // CSS chuẩn Nghị định 30/2020/NĐ-CP: Times New Roman 14pt, line-height ≤ 1.5,
  // spacing đoạn ≥ 6pt, đầu dòng thụt 1cm, justify.
  style.innerHTML = `
    #pdf-render-container, #pdf-render-container * {
      font-family: 'Times New Roman', Times, serif !important;
      color: #000 !important;
      box-sizing: border-box;
    }
    #pdf-render-container { font-size: 14pt !important; line-height: 1.5 !important; }
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

  try {
    const { exportElementToPdf } = await import('./pdfExport');
    await exportElementToPdf(container, {
      filename: `${safeFilename(currentPlan.title)}.pdf`,
      scale: 2, // higher resolution for crisp text
      marginMm,
      orientation,
    });
    showToast('Đã tải xuống file PDF!', 'success');
  } catch (e) {
    console.error(e);
    showToast('Lỗi khi xuất PDF, vui lòng thử lại.', 'error');
  } finally {
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
      BẠN LÀ CHUYÊN GIA THIẾT KẾ BÀI TRÌNH CHIẾU SƯ PHẠM (SLIDE) ĐẲNG CẤP QUỐC TẾ.
      Dựa vào nội dung giáo án sau, hãy tạo cấu trúc Slide bài giảng thuyết trình theo phong cách NotebookLM/TED Talk: Súc tích, hình ảnh hóa và truyền cảm hứng.
      Giáo án:
      ---
      ${currentPlan.content}
      ---

      YÊU CẦU BẮT BUỘC:
      1. Trả về ĐÚNG định dạng chuỗi JSON thuần tuý là một mảng object: 
      [
        {
          "title": "TIÊU ĐỀ SLIDE (Viết hoa, gây ấn tượng)", 
          "points": ["Ý chính 1 (Ngắn gọn)", "Ý chính 2 (Cụm từ then chốt)"], 
          "speakerNotes": "LỜI DẪN CỦA GIÁO VIÊN: Gợi ý cách đặt câu hỏi tương tác hoặc câu chuyện dẫn dắt cho slide này...", 
          "visualSuggestion": "HÌNH ẢNH MINH HỌA: Mô tả một hình ảnh ẩn dụ hoặc sơ đồ cụ thể để giáo viên tìm kiếm (Ví dụ: Một chiếc đồng hồ cát đang chảy để nói về thời gian...)"
        }
      ]
      2. Cấu trúc slide: Ổn định tâm lý -> Kích thích tò mò -> Chiếm lĩnh kiến thức -> Thực hành -> Đúc rút.
      3. TUYỆT ĐỐI KHÔNG DÙNG LaTeX ($...$) . Bạn bắt buộc dùng Unicode thuần túy (x², √, ∫).
      4. Tối đa 10 slides để đảm bảo sự tinh gọn.
      CHỈ TRẢ VỀ JSON KHÔNG BỌC BỞI \`\`\`json.
    `;
    
    // We use a high temperature for creativity, but let's stick to the selected model
    const response = await callAI(prompt, data.settings);
    if (!response) throw new Error("No response");
    
    // An toàn hơn: Tìm chính xác đoạn text bắt đầu bằng [ và kết thúc bằng ]
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

export const downloadPPTX = (slidesData: any[], title: string) => {
  if (!slidesData || slidesData.length === 0) return;
  
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  
  const slideTitle = pptx.addSlide();
  slideTitle.background = { color: "0B2447" };
  slideTitle.addText(title, {
    x: 1, y: 2.2, w: '80%', h: 1.5,
    fontSize: 40, color: "FFFFFF", bold: true, align: "center",
    fontFace: "Times New Roman"
  });
  
  slidesData.forEach((s: any) => {
    const pSlide = pptx.addSlide();
    pSlide.background = { color: "F8F9FA" };
    pSlide.addText(s.title, {
      x: 0.5, y: 0.3, w: '90%', h: 0.9,
      fontSize: 28, bold: true, color: "19376D",
      fontFace: "Times New Roman"
    });
    const bulletPoints = s.points.map((p: string) => ({
      text: p,
      options: { bullet: true, fontSize: 18, fontFace: "Times New Roman", color: "333333" }
    }));
    pSlide.addText(bulletPoints, {
      x: 0.5, y: 1.4, w: '90%', h: 4.8,
      valign: 'top', fontFace: "Times New Roman", fontSize: 18
    });
    if (s.speakerNotes) {
      pSlide.addNotes(s.speakerNotes);
    }
  });
  
  pptx.writeFile({ fileName: `${title || 'baigiang'}.pptx` });
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
