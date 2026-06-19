import pptxgen from 'pptxgenjs';
import { LessonPlan, AppData } from '../types';
import { callAI, getActiveApiKey } from '../lib/aiProviders';
import { safeFilename } from './fileUtils';

export type PdfOrientation = 'portrait' | 'landscape';

// API Server exports have been removed. All exports are now Local-first.

export const exportToPDF = async (
  currentPlan: Partial<LessonPlan>,
  showToast: (msg: string, type?: any) => void,
  orientation: PdfOrientation = 'portrait'
) => {
  try {
    const selector = '.wmde-markdown, .markdown-body';
    const element = document.querySelector(selector);
    
    if (!element) {
      throw new Error('Vui lòng mở giáo án (bấm Xem) trước khi xuất file PDF.');
    }

    showToast('Đang chuẩn bị file PDF... Vui lòng chọn "Save as PDF" trong hộp thoại in.', 'info');
    
    // Add specific style for landscape if requested
    let landscapeStyle: HTMLStyleElement | null = null;
    if (orientation === 'landscape') {
      landscapeStyle = document.createElement('style');
      landscapeStyle.textContent = `@page { size: A4 landscape !important; }`;
      document.head.appendChild(landscapeStyle);
    }

    // Create a temporary clone for printing
    const clone = element.cloneNode(true) as HTMLElement;
    clone.id = 'print-temp-container';
    clone.className = 'markdown-body report-paper'; // Ensure styling
    
    // Hide original content and show clone
    document.body.classList.add('is-printing-temp');
    document.body.appendChild(clone);

    // Wait for any async rendering
    setTimeout(() => {
      window.print();
      
      // Cleanup
      document.body.classList.remove('is-printing-temp');
      document.body.removeChild(clone);
      if (landscapeStyle) {
        document.head.removeChild(landscapeStyle);
      }
      showToast('Đã hoàn tất hộp thoại in PDF.', 'success');
    }, 500);
    
  } catch (err: any) {
    console.error(err);
    showToast(err.message || 'Lỗi xuất PDF. Vui lòng thử lại.', 'error');
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
) => {
  try {
    setIsLoading(true);
    showToast('Đang thiết kế bản thảo Slide bằng AI, vui lòng đợi...', 'info');
    const prompt = `
BẠN LÀ CHUYÊN GIA THIẾT KẾ BÀI TRÌNH CHIẾU SƯ PHẠM ĐẲNG CẤP QUỐC TẾ.
Dựa vào nội dung giáo án sau, hãy tạo cấu trúc Slide bài giảng từ 12–18 slides. Nội dung Slide cần phản ánh đúng dữ kiện, công thức, ví dụ và hoạt động học sinh (kể cả worked example và sai lầm thường gặp) từ giáo án nguồn, nhưng súc tích, hình ảnh hóa và truyền cảm hứng.

Giáo án:
---
\${currentPlan.content}
---

YÊU CẦU BẮT BUỘC:
1. Phân tích BẢNG 3 CỘT trong giáo án (nếu có): 
   - Biến cột "Hoạt động GV" và "Hoạt động HS" thành "speakerNotes" (Ghi chú diễn giả).
   - Biến cột "Nội dung ghi bảng / Sản phẩm dự kiến" thành nội dung hiển thị chính trên Slide (nằm trong mảng "points").
2. GIỮ NGUYÊN các ký hiệu phân hóa như 🌶️, 🌶️🌶️, 🌶️🌶️🌶️ trong mảng "points" nếu bài tập có phân hóa.
3. Trả về JSON thuần tuý là một mảng object theo đúng schema sau:
[
  {
    "type": "walt",
    "title": "MỤC TIÊU BÀI HỌC",
    "icon": "🎯",
    "points": ["Sau bài này, HS sẽ hiểu được...", "HS sẽ vận dụng được..."],
    "imageUrls": [],
    "speakerNotes": "Lời dẫn mở đầu...",
    "visualSuggestion": "Gợi ý ảnh..."
  },
  {
    "type": "content",
    "title": "HĐ1: KHÁM PHÁ (VIẾT HOA)",
    "icon": "📐",
    "points": ["Hỏi: Xác suất là gì?", "Trả lời: Là tỉ lệ..."],
    "imageUrls": ["https://link-anh-co-trong-giao-an.jpg"],
    "speakerNotes": "Lời dẫn chi tiết cho GV...",
    "visualSuggestion": ""
  }
]

4. CÔNG THỨC TOÁN HỌC: PPTX KHÔNG HỖ TRỢ LATEX. BẮT BUỘC dùng ký hiệu text thường dễ đọc (Ví dụ: P(A|B) thay vì $P(A|B)$, phân số dùng a/b thay vì \\frac{a}{b}, góc dùng ^ thay vì \\angle). HẠN CHẾ TỐI ĐA MÃ LATEX PHỨC TẠP để tránh lỗi hiển thị.
5. HÌNH ẢNH MINH HỌA: Trích xuất đường link ảnh định dạng Markdown (Ví dụ: ![Hình 1](https://link...)) thành mảng "imageUrls".
6. CẤU TRÚC: slide đầu là "walt", slide cuối là "wrapup", các slide giữa là "content". Tối đa 15 slides.
7. QUAN TRỌNG: TUYỆT ĐỐI KHÔNG ĐƯA "GỢI Ý HÌNH ẢNH" hay "GỢI Ý LỜI THOẠI" VÀO MẢNG "points". Phải tách riêng vào trường "visualSuggestion" (viết bằng tiếng Việt) và "speakerNotes". Mảng "points" CHỈ CHỨA NỘI DUNG CHÍNH CHO HỌC SINH ĐỌC.
CHỈ TRẢ VỀ JSON, KHÔNG BỌC BỞI \`\`\`json.
    `;

    const response = await callAI(prompt, data.settings);
    if (!response) throw new Error("No response");

    const match = response.match(/\[[\s\S]*\]/);
    const jsonStr = match ? match[0] : response.replace(/```json/g, '').replace(/```/g, '').trim();

    const slidesData = JSON.parse(jsonStr);
    if (!Array.isArray(slidesData) || slidesData.length === 0 || slidesData[0]?.type !== 'walt') {
      throw new Error('AI chưa trả về cấu trúc slide hợp lệ. Vui lòng thử tạo lại bài trình chiếu.');
    }

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

export const generateTextToSlideData = async (
  rawText: string,
  data: AppData,
  setIsLoading: (val: boolean) => void,
  showToast: (msg: string, type?: any) => void
) => {
  try {
    setIsLoading(true);
    showToast('Đang phân tích văn bản và thiết kế Slide bằng AI, vui lòng đợi...', 'info');
    const prompt = `
BẠN LÀ CHUYÊN GIA THIẾT KẾ BÀI TRÌNH CHIẾU SƯ PHẠM ĐẲNG CẤP QUỐC TẾ.
Dựa vào đoạn văn bản thô sau đây, hãy tóm tắt và tạo cấu trúc Slide bài giảng từ 5–15 slides. Nội dung Slide cần ngắn gọn, súc tích (dạng bullet points), giữ nguyên các ý chính quan trọng.

Văn bản thô:
---
${rawText}
---

YÊU CẦU BẮT BUỘC:
1. Trích xuất các ý chính để đưa vào mảng "points" (tối đa 3-4 ý mỗi slide).
2. Viết lời dẫn chi tiết vào trường "speakerNotes" (Ghi chú diễn giả) để người thuyết trình đọc.
3. Đề xuất hình ảnh minh họa bằng tiếng Việt vào trường "visualSuggestion".
4. Trả về JSON thuần tuý là một mảng object theo đúng schema sau:
[
  {
    "type": "walt",
    "title": "TIÊU ĐỀ / MỤC TIÊU BÀI HỌC",
    "icon": "🎯",
    "points": ["Điểm chính 1", "Điểm chính 2"],
    "imageUrls": [],
    "speakerNotes": "Lời dẫn mở đầu...",
    "visualSuggestion": "Gợi ý ảnh minh họa..."
  },
  {
    "type": "content",
    "title": "PHẦN 1: NỘI DUNG...",
    "icon": "📌",
    "points": ["Ý 1", "Ý 2"],
    "imageUrls": [],
    "speakerNotes": "Lời diễn giải chi tiết...",
    "visualSuggestion": "Gợi ý ảnh..."
  }
]

5. CÔNG THỨC TOÁN HỌC: PPTX KHÔNG HỖ TRỢ LATEX. BẮT BUỘC dùng ký hiệu text thường dễ đọc. HẠN CHẾ TỐI ĐA MÃ LATEX PHỨC TẠP.
6. CẤU TRÚC: slide đầu là "walt", slide cuối là "wrapup" (kết luận), các slide giữa là "content".
7. QUAN TRỌNG: TUYỆT ĐỐI KHÔNG ĐƯA "GỢI Ý HÌNH ẢNH" hay "GỢI Ý LỜI THOẠI" VÀO MẢNG "points".
CHỈ TRẢ VỀ JSON, KHÔNG BỌC BỞI \`\`\`json.
    `;

    const response = await callAI(prompt, data.settings);
    if (!response) throw new Error("No response");

    const match = response.match(/\[[\s\S]*\]/);
    const jsonStr = match ? match[0] : response.replace(/```json/g, '').replace(/```/g, '').trim();

    const slidesData = JSON.parse(jsonStr);
    if (!Array.isArray(slidesData) || slidesData.length === 0 || slidesData[0]?.type !== 'walt') {
      throw new Error('AI chưa trả về cấu trúc slide hợp lệ. Vui lòng thử tạo lại bài trình chiếu.');
    }

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
  primary:   '4A4A4A', // Dark Slate
  accent:    'D97757', // Terracotta (Claude accent)
  light:     'F9F6F0', // Cream background
  white:     'FFFFFF',
  dark:      '2C2C2C',
  gray:      '7A7A7A',
  green:     '3B6B5E',
  orange:    'D97757',
  lightGray: 'E5E5E5',
};
const FONT = 'Times New Roman';


export const downloadPPTX = async (slidesData: any[], title: string) => {
  if (!slidesData || slidesData.length === 0) return;

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  // ── Title slide ──────────────────────────────────────────────────────────
  const tSlide = pptx.addSlide();
  tSlide.background = { color: 'F8FAFC' };
  tSlide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 2.2, w: '100%', h: 1.6, fill: { color: '1A237E' },
  });
  tSlide.addText(title, {
    x: 0.5, y: 2.4, w: 9, h: 1.2,
    fontSize: 40, color: 'FFFFFF', bold: true,
    align: 'center', valign: 'middle', fontFace: 'Arial',
  });
  tSlide.addText('SmartPlan AI Educational Design', {
    x: 0.5, y: 5.0, w: 9, h: 0.5,
    fontSize: 16, color: '64748B', align: 'center', fontFace: 'Arial', bold: true
  });

  const MAX_POINTS = 4;
  const processedSlides: any[] = [];
  slidesData.forEach(s => {
    const pCount = Array.isArray(s.points) ? s.points.length : 0;
    if (s.type === 'walt' || s.type === 'wrapup') {
      processedSlides.push(s);
      return;
    }
    const partsCount = Math.max(Math.ceil(pCount / MAX_POINTS), 1);
    if (partsCount > 1) {
      for (let j = 0; j < partsCount; j++) {
        processedSlides.push({
          ...s,
          title: `${s.title} (Phần ${j + 1})`,
          points: pCount > 0 ? s.points.slice(j * MAX_POINTS, (j + 1) * MAX_POINTS) : [],
          imageUrls: j === 0 ? s.imageUrls : []
        });
      }
    } else {
      processedSlides.push(s);
    }
  });

  // ── Content slides ────────────────────────────────────────────────────────
  for (let i = 0; i < processedSlides.length; i++) {
    const s = processedSlides[i];
    const pSlide = pptx.addSlide();
    pSlide.background = { color: 'FFFFFF' };

    pSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 0.9, fill: { color: '1A237E' }
    });
    
    const headerText = s.icon ? `${s.icon} ${s.title}` : s.title;
    pSlide.addText(headerText, {
      x: 0.4, y: 0.15, w: 9, h: 0.6,
      fontSize: 32, color: 'FFFFFF', bold: true,
      valign: 'middle', fontFace: 'Arial',
    });

    pSlide.addText(`${i + 1} / ${processedSlides.length}`, {
      x: 8.8, y: 5.2, w: 0.9, h: 0.3,
      fontSize: 12, color: '94A3B8', align: 'right', fontFace: 'Arial',
    });

    const images: string[] = Array.isArray(s.imageUrls) ? s.imageUrls.filter(Boolean) : [];
    const hasImages = images.length > 0;
    const contentX = 0.4;
    const contentW = hasImages ? 5.5 : 9.2;
    const contentY = 1.3;

    if (Array.isArray(s.points) && s.points.length > 0) {
      const textObjects = s.points.map((p: string) => ({
        text: p,
        options: { 
          bullet: { color: 'F97316' }, 
          fontSize: 24, 
          color: '334155', 
          fontFace: 'Arial', 
          breakLine: true 
        }
      }));

      pSlide.addText(textObjects, {
        x: contentX, y: contentY, w: contentW, h: 3.8,
        valign: 'top',
        autoFit: true,
        lineSpacing: 32
      });
    }

    if (hasImages) {
      const panelX = 6.2;
      const panelW = 3.4;
      let imgY = contentY;

      for (const url of images) {
        try {
          pSlide.addImage({ 
            path: url, 
            x: panelX, y: imgY, w: panelW, h: 2.5,
            sizing: { type: 'contain', w: panelW, h: 2.5 }
          });
          imgY += 2.6;
        } catch {
          // skip
        }
      }
    }

    let notes = '';
    if (s.visualSuggestion) notes += `[GỢI Ý HÌNH ẢNH]\n${s.visualSuggestion}\n\n`;
    if (s.speakerNotes) notes += `[GỢI Ý LỜI THOẠI]\n${s.speakerNotes}`;
    if (notes) pSlide.addNotes(notes);
  }

  await pptx.writeFile({ fileName: `${safeFilename(title, 'baigiang')}.pptx` });
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
