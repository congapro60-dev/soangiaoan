import pptxgen from 'pptxgenjs';
import { LessonPlan, AppData } from '../types';
import { downloadBlob } from './fileUtils';
import { callGeminiAI, MODELS } from '../lib/gemini';

export const exportToPDF = (currentPlan: Partial<LessonPlan>, showToast: (msg: string, type?: any) => void) => {
  const element = document.getElementById('lesson-content');
  if (!element) return;

  const style = document.createElement('style');
  style.id = 'pdf-print-style';
  style.innerHTML = `
    @media print {
      table { border-collapse: collapse !important; width: 100% !important; table-layout: fixed !important; }
      tr    { page-break-inside: avoid !important; }
      td, th { word-wrap: break-word !important; }
      h1, h2, h3 { page-break-after: avoid !important; }
      p  { orphans: 3; widows: 3; }
    }
    #lesson-content * { font-family: 'Times New Roman', Times, serif !important; font-size: 12pt !important; line-height: 1.5 !important; }
    #lesson-content h1 { font-size: 16pt !important; }
    #lesson-content h2 { font-size: 14pt !important; }
    #lesson-content h3 { font-size: 13pt !important; }
    #lesson-content tr { page-break-inside: avoid !important; }
    
    #lesson-content table th:nth-child(1), #lesson-content table td:nth-child(1) { width: 12% !important; }
    #lesson-content table th:nth-child(2), #lesson-content table td:nth-child(2) { width: 44% !important; }
    #lesson-content table th:nth-child(3), #lesson-content table td:nth-child(3) { width: 44% !important; }
    
    .katex { padding: 4px 0 !important; display: inline-block !important; }
    .katex-display { margin: 8px 0 !important; }
  `;
  document.head.appendChild(style);
  
  const opt = {
    margin: [15, 12, 15, 12],
    filename: `${currentPlan.title || 'giao-an'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  // @ts-ignore
  window.html2pdf().from(element).set(opt).save().then(() => {
    const injected = document.getElementById('pdf-print-style');
    if (injected) injected.remove();
  });
  showToast('Đang xuất file PDF...');
};

export const exportToWord = (currentPlan: Partial<LessonPlan>, showToast: (msg: string, type?: any) => void) => {
  if (!currentPlan.content) return;
  try {
    const contentEl = document.getElementById('lesson-content');
    if (!contentEl) { showToast('Không tìm thấy nội dung giáo án', 'error'); return; }

    const cloned = contentEl.cloneNode(true) as HTMLElement;

    cloned.querySelectorAll('.katex').forEach(el => {
      const mathmlNode = el.querySelector('.katex-mathml math');
      if (mathmlNode) {
        let mathStr = mathmlNode.outerHTML;
        mathStr = mathStr.replace(/<(\/?)(math|semantics|mrow|mi|mo|mn|ms|mspace|mtext|menclose|merror|mfenced|mfrac|mpadded|mphantom|mroot|msqrt|mstyle|msub|msup|msubsup|mtable|mtr|mtd|maligngroup|malignmark|mlabeledtr)/g, '<$1mml:$2');
        
        const span = document.createElement('span');
        span.innerHTML = mathStr;
        el.replaceWith(span);
      } else {
        const annotation = el.querySelector('annotation');
        el.replaceWith(document.createTextNode(annotation ? annotation.textContent || '' : ''));
      }
    });
    cloned.querySelectorAll('.katex-html').forEach(el => el.remove());

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns:mml="http://www.w3.org/1998/Math/MathML"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><style>
        body    { font-family: 'Times New Roman', Times, serif; font-size: 14pt; line-height: 1.8; margin: 2cm; }
        h1      { font-family: 'Times New Roman', Times, serif; font-size: 20pt; font-weight: bold; color: #1a365d; margin-top: 14pt; margin-bottom: 6pt; text-align: center; }
        h2      { font-family: 'Times New Roman', Times, serif; font-size: 17pt; font-weight: bold; color: #2d3748; margin-top: 12pt; margin-bottom: 4pt; }
        h3      { font-family: 'Times New Roman', Times, serif; font-size: 15pt; font-weight: bold; color: #4a5568; margin-top: 10pt; margin-bottom: 4pt; }
        p       { font-family: 'Times New Roman', Times, serif; font-size: 14pt; margin: 4pt 0; text-align: justify; }
        table   { border-collapse: collapse; width: 100%; margin: 10pt 0; page-break-inside: avoid; }
        th, td  { font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #718096; padding: 6pt 8pt; text-align: left; vertical-align: top; }
        th      { background-color: #e2e8f0; font-weight: bold; }
        ul, ol  { font-family: 'Times New Roman', Times, serif; font-size: 14pt; margin-left: 20pt; }
        li      { margin: 2pt 0; }
        strong  { font-weight: bold; }
        em      { font-style: italic; }
      </style></head>
      <body>${cloned.innerHTML}</body></html>
    `;
    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/vnd.ms-word;charset=utf-8'
    });
    downloadBlob(blob, `${currentPlan.title || 'giao-an'}.doc`);
    showToast('Đã xuất file Word (có Công thức native)!');
  } catch (e) {
    console.error(e);
    showToast('Lỗi khi tải file Word', 'error');
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
  if (!data.settings.geminiApiKey) {
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
    const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
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

export const generatePPTX = async (
  currentPlan: Partial<LessonPlan>,
  data: AppData,
  setIsLoading: (val: boolean) => void,
  showToast: (msg: string, type?: any) => void
) => {
  if (!currentPlan.title || !currentPlan.content) return;
  if (!data.settings.geminiApiKey) {
    showToast('Vui lòng cung cấp API Key AI để tạo slide', 'warning');
    return;
  }
  
  setIsLoading(true);
  showToast('Đang thiết kế slide bài giảng từ giáo án, vui lòng chờ...', 'info');
  
  try {
    const prompt = `
      Dựa vào nội dung giáo án sau, hãy tạo cấu trúc Slide bài giảng PowerPoint.
      Giáo án:
      ${currentPlan.content}

      YÊU CẦU BẮT BUỘC:
      1. Trả về ĐÚNG định dạng chuỗi JSON thuần tuý là một mảng object: [{"title": "Tiêu đề Slide 1", "points": ["Ý 1", "Ý 2"]}, ...]
      2. Tóm tắt súc tích, mỗi slide không vượt quá 5 ý.
      3. TUYỆT ĐỐI KHÔNG DÙNG LaTeX ($...$) CHO CÔNG THỨC TOÁN HỌC. Bạn bắt buộc dùng Unicode thuần túy (VD: x², √, ∫) để hiển thị công thức ngay ở text (equation format mode).
      4. Tối đa 12 slides.
      Chỉ trả về JSON, không kèm giải thích hay markdown code block chứa json.
    `;
    
    const response = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
    if (!response) throw new Error("No response");
    
    const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
    const slidesData = JSON.parse(jsonStr);
    
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    
    const slideTitle = pptx.addSlide();
    slideTitle.background = { color: "0B2447" };
    slideTitle.addText(currentPlan.title, {
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
    });
    
    pptx.writeFile({ fileName: `${currentPlan.title || 'baigiang'}.pptx` });
    showToast('Đã tải xuống file trình chiếu PPTX thành công!');
  } catch (e) {
    console.error(e);
    showToast('Lỗi cấu trúc hoặc kết nối AI, vui lòng thử lại', 'error');
  } finally {
    setIsLoading(false);
  }
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
