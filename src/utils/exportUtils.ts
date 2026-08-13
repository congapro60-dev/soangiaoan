import pptxgen from 'pptxgenjs';
import { LessonPlan, AppData } from '../types';
import { callAI, getActiveApiKey, isMissingApiKeyError } from '../lib/aiProviders';
import { safeFilename } from './fileUtils';
import { parseLooseJson } from './jsonRepair';
import { renderLatexToPng, extractDisplayFormulas, replaceInlineFormulasWithText } from './mathToImage';
import { auditSlides, buildSlideRepairBrief } from '../lib/slideQuality';

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

    const pdfName = safeFilename(currentPlan.title);
    showToast(`Đang chuẩn bị "${pdfName}.pdf"... Vui lòng chọn "Save as PDF" trong hộp thoại in.`, 'info');

    // KHỔ GIẤY DO NGƯỜI DÙNG CHỌN TRONG HỘP THOẠI IN.
    // `@page { size: A4 }` ở index.css khoá cứng khổ giấy — Chrome khoá luôn ô "Paper size"
    // nên giáo viên không đổi sang Letter/A3 được. Ở đây chỉ khai HƯỚNG giấy (khớp nút chọn
    // trên thanh công cụ) và bỏ trống khổ, để ô chọn khổ trong hộp thoại in hoạt động lại.
    // Không dùng !important trong @page — một số bản Chromium loại bỏ cả khai báo khi gặp
    // !important. Rule này chèn sau index.css nên đã thắng theo thứ tự cascade.
    const pageStyle = document.createElement('style');
    pageStyle.textContent = `@page { size: ${orientation}; margin: 20mm; }`;
    document.head.appendChild(pageStyle);

    // Create a temporary clone for printing
    const clone = element.cloneNode(true) as HTMLElement;
    clone.id = 'print-temp-container';
    clone.className = 'markdown-body report-paper'; // Ensure styling

    // Hide original content and show clone
    document.body.classList.add('is-printing-temp');
    document.body.appendChild(clone);

    // Chrome/Edge/Firefox lấy TÊN FILE PDF từ `document.title` tại lúc mở hộp thoại in.
    // Không đổi thì mọi giáo án đều lưu thành "Smart Lesson Plan AI.pdf" (tiêu đề trang web).
    // Dùng đúng `safeFilename` mà đường xuất Word dùng để hai file trùng tên nhau.
    const previousTitle = document.title;
    document.title = pdfName;

    // Wait for any async rendering
    setTimeout(() => {
      try {
        // window.print() chặn luồng JS tới khi người dùng đóng hộp thoại, nên tới lúc trả
        // tiêu đề về thì trình duyệt đã lấy xong tên file.
        window.print();
      } finally {
        document.title = previousTitle;
        document.body.classList.remove('is-printing-temp');
        document.body.removeChild(clone);
        document.head.removeChild(pageStyle);
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

// ── Sinh slide 2 lượt: DÀN Ý (1 call nhẹ) → CHI TIẾT từng phần (nhiều call nhỏ) ───────
// Sinh toàn bộ trong 1 lần gọi từng bị trần output token của model bó hẹp, ra chỉ 9-10
// slide dù prompt xin 12-18 (quan sát thực tế). Tách dàn ý trước rồi sinh CHI TIẾT từng
// phần riêng (mỗi call chỉ cần trả vài slide) để không đụng trần token — ra 16-24 slide
// bám đúng 5 hoạt động của giáo án thay vì gộp chung chung.

interface SlideOutlineSection {
  id: string;
  type: 'walt' | 'content' | 'wrapup';
  title: string;
  contentBrief: string;
  slideCount: number;
}

const DEFAULT_SLIDE_OUTLINE: SlideOutlineSection[] = [
  { id: 'walt', type: 'walt', title: 'MỤC TIÊU BÀI HỌC', contentBrief: 'Mục tiêu, WALT/WILF của bài học', slideCount: 1 },
  { id: 'hd1', type: 'content', title: 'HĐ1: MỞ ĐẦU', contentBrief: 'Phần khởi động, đặt vấn đề trong giáo án', slideCount: 2 },
  { id: 'hd2', type: 'content', title: 'HĐ2: HÌNH THÀNH KIẾN THỨC', contentBrief: 'Toàn bộ kiến thức mới, định nghĩa, định lý, công thức, ví dụ mẫu trong giáo án', slideCount: 6 },
  { id: 'hd3', type: 'content', title: 'HĐ3: LUYỆN TẬP', contentBrief: 'Bài tập luyện tập phân hóa 3 mức độ trong giáo án', slideCount: 4 },
  { id: 'hd4', type: 'content', title: 'HĐ4: VẬN DỤNG', contentBrief: 'Bài toán vận dụng thực tế trong giáo án', slideCount: 3 },
  { id: 'hd5', type: 'content', title: 'HĐ5: TỔNG KẾT', contentBrief: 'Tóm tắt kiến thức trọng tâm, dặn dò bài tập về nhà', slideCount: 2 },
  { id: 'wrapup', type: 'wrapup', title: 'GHI NHỚ & BÀI TẬP VỀ NHÀ', contentBrief: 'Tổng kết bài học và bài tập về nhà', slideCount: 1 },
];

const clampSectionCount = (section: SlideOutlineSection): SlideOutlineSection => ({
  ...section,
  slideCount: section.type === 'content'
    ? Math.min(6, Math.max(2, Math.round(Number(section.slideCount)) || 3))
    : 1,
});

const buildSlideOutlinePrompt = (content: string): string => `
BẠN LÀ GIÁO VIÊN TOÁN THPT DÀY DẠN KINH NGHIỆM, đang lập DÀN Ý cho bài trình chiếu PowerPoint từ giáo án dưới đây — TRƯỚC KHI soạn chi tiết từng slide.

GIÁO ÁN:
---
${content}
---

NHIỆM VỤ: Chia bài trình chiếu thành các PHẦN bám sát ĐÚNG cấu trúc hoạt động thật của giáo án này (Mở đầu, Hình thành kiến thức — có thể chia nhiều phần con nếu bài có nhiều đơn vị kiến thức, Luyện tập, Vận dụng, Tổng kết). Với MỖI PHẦN, xác định số lượng slide CẦN THIẾT để trình bày ĐẦY ĐỦ, KHÔNG rút gọn, KHÔNG bỏ sót ví dụ mẫu/công thức/bài tập.

QUY TẮC BẮT BUỘC:
1. Tổng số slide NỘI DUNG (không tính slide Mục tiêu đầu và slide Tổng kết cuối) phải trong khoảng 14-22 slide.
2. Phần Hình thành kiến thức: MỖI ví dụ mẫu (worked example) trong giáo án phải được tính là 2 slide riêng (1 slide "Đề bài", 1 slide "Lời giải từng bước") — không gộp chung.
3. Phần Luyện tập: tối thiểu 3 slide tương ứng 3 mức độ 🌶️ Cơ bản / 🌶️🌶️ Nâng cao / 🌶️🌶️🌶️ Thách thức nếu giáo án có phân hóa; cộng 1 slide "⚠️ Sai lầm thường gặp" nếu giáo án có dữ liệu về lỗi học sinh hay mắc.
4. contentBrief PHẢI cụ thể — trích tên hoạt động, số liệu, tên công thức/định lý THẬT có trong giáo án. TUYỆT ĐỐI KHÔNG viết chung chung kiểu "nội dung bài học".
5. Phần đầu tiên LUÔN là type "walt", phần cuối cùng LUÔN là type "wrapup".

CHỈ TRẢ VỀ JSON MẢNG theo đúng schema sau, KHÔNG bọc \`\`\`json, KHÔNG giải thích thêm:
[
  {"id":"walt","type":"walt","title":"MỤC TIÊU BÀI HỌC","contentBrief":"...","slideCount":1},
  {"id":"hd1","type":"content","title":"HĐ1: [tên hoạt động thật]","contentBrief":"[mô tả cụ thể lấy từ giáo án]","slideCount":2},
  {"id":"wrapup","type":"wrapup","title":"GHI NHỚ & BÀI TẬP VỀ NHÀ","contentBrief":"...","slideCount":1}
]
`.trim();

const buildSlideSectionPrompt = (
  content: string,
  section: SlideOutlineSection,
  isFirst: boolean,
  isLast: boolean
): string => `
BẠN LÀ GIÁO VIÊN TOÁN THPT DÀY DẠN KINH NGHIỆM, đang soạn CHI TIẾT một phần của bài trình chiếu PowerPoint bám sát giáo án dưới đây. Đây CHỈ LÀ MỘT PHẦN của bài trình chiếu lớn hơn — chỉ soạn đúng phần được giao, không lặp lại phần khác.

GIÁO ÁN (đầy đủ, dùng để lấy dữ kiện/công thức chính xác):
---
${content}
---

PHẦN CẦN SOẠN: "${section.title}"
NỘI DUNG PHẦN NÀY (bám sát, không lệch sang phần khác): ${section.contentBrief}
SỐ SLIDE CẦN TẠO CHO PHẦN NÀY: ĐÚNG ${section.slideCount} slide.

QUAN ĐIỂM GIÁO VIÊN TOÁN — BẮT BUỘC:
- Ví dụ mẫu (worked example): nếu phần này có ví dụ mẫu, TÁCH thành slide "Đề bài" riêng và slide "Lời giải từng bước" riêng (từng bước một, không dồn cục).
- Bài tập luyện tập: ghi RÕ mức độ 🌶️/🌶️🌶️/🌶️🌶️🌶️ trong tiêu đề hoặc points nếu có phân hóa.
- Nếu có slide "Sai lầm thường gặp": nêu CỤ THỂ lỗi sai + vì sao sai + cách sửa, không viết chung chung.
- CÔNG THỨC TOÁN HỌC: ĐƯỢC PHÉP và BẮT BUỘC giữ nguyên LaTeX chuẩn trong "points" — công thức ngắn dùng $...$ (inline), công thức chính/quan trọng dùng $$...$$ (hệ thống sẽ tự render thành ảnh sắc nét khi xuất PPTX). KHÔNG viết công thức bằng ký tự thường thay cho LaTeX.
- Mỗi slide tối đa 4-5 points, ngắn gọn, KHÔNG chép nguyên văn cả đoạn dài.

${isFirst ? 'Đây là phần ĐẦU của bài trình chiếu.' : ''}${isLast ? 'Đây là phần CUỐI của bài trình chiếu.' : ''}

CHỈ TRẢ VỀ JSON MẢNG ĐÚNG ${section.slideCount} PHẦN TỬ theo schema sau, KHÔNG bọc \`\`\`json:
[
  {
    "type": "${section.type}",
    "title": "TIÊU ĐỀ SLIDE (VIẾT HOA)",
    "icon": "📐",
    "points": ["Nội dung chính 1 (có thể chứa $...$ hoặc $$...$$)", "Nội dung chính 2"],
    "imageUrls": ["https://link-anh-neu-co-trong-giao-an.jpg"],
    "speakerNotes": "Lời dẫn chi tiết cho GV...",
    "visualSuggestion": "Gợi ý ảnh minh họa bằng tiếng Việt..."
  }
]

QUAN TRỌNG: TUYỆT ĐỐI KHÔNG đưa "gợi ý hình ảnh"/"gợi ý lời thoại" vào "points" — tách riêng vào "visualSuggestion"/"speakerNotes".
`.trim();

const parseSlideArrayResponse = (response: string): any[] => {
  const match = response.match(/\[[\s\S]*\]/);
  const jsonStr = match ? match[0] : response.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = parseLooseJson(jsonStr);
  if (!Array.isArray(parsed)) throw new Error('Không phải mảng JSON hợp lệ');
  return parsed;
};

/** Chạy các task bất đồng bộ với giới hạn số luồng song song (an toàn rate-limit AI). */
async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (cursor < tasks.length) {
      const i = cursor++;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Cổng chất lượng slide: chấm deterministic, nếu có lỗi blocking thì gọi AI sửa ĐÚNG các slide
 * lỗi một lượt (audit → repair → audit lại). Chỉ nhận bản sửa khi JSON hợp lệ và giữ đúng số
 * lượng slide; ngược lại trả bản gốc. Không fatal — mọi lỗi đều nuốt và giữ nguyên bản thảo.
 */
const applySlideQualityGate = async (
  slidesData: any[],
  data: AppData,
  showToast: (msg: string, type?: any) => void
): Promise<any[]> => {
  try {
    const { blocking } = auditSlides(slidesData);
    if (blocking.length === 0) return slidesData;

    const slidesWithIssues = new Set(blocking.map((f) => f.slideIndex)).size;
    showToast(`Đang tự rà soát & tinh chỉnh bố cục ${slidesWithIssues} slide...`, 'info');

    const repaired = await callAI(buildSlideRepairBrief(slidesData, blocking), data.settings);
    if (!repaired) return slidesData;

    const parsed = parseSlideArrayResponse(repaired);
    // Chỉ nhận bản sửa nếu giữ đúng số lượng slide (tránh AI cắt/nhân bản).
    if (parsed.length !== slidesData.length) return slidesData;

    const after = auditSlides(parsed).blocking.length;
    if (after < blocking.length) {
      showToast('Đã tinh chỉnh bố cục slide theo chuẩn thiết kế.', 'success');
      return parsed;
    }
    return slidesData;
  } catch (err) {
    console.warn('Bỏ qua cổng chất lượng slide:', err);
    return slidesData;
  }
};

export const generateSlideData = async (
  currentPlan: Partial<LessonPlan>,
  data: AppData,
  setIsLoading: (val: boolean) => void,
  showToast: (msg: string, type?: any) => void,
  onProgress?: (status: string) => void
) => {
  const content = currentPlan.content || '';
  try {
    setIsLoading(true);
    onProgress?.('Đang phân tích giáo án và lập dàn ý bài trình chiếu...');
    showToast('Đang thiết kế bản thảo Slide bằng AI, vui lòng đợi...', 'info');

    let outline: SlideOutlineSection[];
    try {
      const outlineResponse = await callAI(buildSlideOutlinePrompt(content), data.settings);
      if (!outlineResponse) throw new Error('Không có phản hồi');
      const rawOutline = parseSlideArrayResponse(outlineResponse) as SlideOutlineSection[];
      if (!Array.isArray(rawOutline) || rawOutline.length < 3) throw new Error('Dàn ý quá ngắn');
      outline = rawOutline.map(clampSectionCount);
      if (outline[0]?.type !== 'walt') {
        outline.unshift(clampSectionCount({ id: 'walt', type: 'walt', title: 'MỤC TIÊU BÀI HỌC', contentBrief: 'Mục tiêu bài học', slideCount: 1 }));
      }
      if (outline[outline.length - 1]?.type !== 'wrapup') {
        outline.push(clampSectionCount({ id: 'wrapup', type: 'wrapup', title: 'GHI NHỚ & BÀI TẬP VỀ NHÀ', contentBrief: 'Tổng kết và bài tập về nhà', slideCount: 1 }));
      }
    } catch (outlineError) {
      console.warn('Lập dàn ý slide thất bại, dùng cấu trúc mặc định 5 hoạt động', outlineError);
      outline = DEFAULT_SLIDE_OUTLINE.map(clampSectionCount);
    }

    const totalPlanned = outline.reduce((sum, s) => sum + s.slideCount, 0);
    let completedSections = 0;

    const tasks = outline.map((section, idx) => async () => {
      try {
        const prompt = buildSlideSectionPrompt(content, section, idx === 0, idx === outline.length - 1);
        const response = await callAI(prompt, data.settings);
        if (!response) throw new Error('Không có phản hồi');
        const slides = parseSlideArrayResponse(response);
        completedSections++;
        onProgress?.(`Đã soạn xong phần ${completedSections}/${outline.length}: ${section.title}`);
        return slides.length > 0 ? slides : null;
      } catch (sectionError) {
        console.error(`Lỗi soạn phần "${section.title}":`, sectionError);
        completedSections++;
        onProgress?.(`Phần ${completedSections}/${outline.length} gặp lỗi, đang tiếp tục các phần còn lại...`);
        return null;
      }
    });

    const sectionResults = await runWithConcurrency(tasks, 2);
    const slidesData = sectionResults.flat().filter(Boolean);

    if (slidesData.length === 0) {
      throw new Error('AI chưa trả về cấu trúc slide hợp lệ. Vui lòng thử tạo lại bài trình chiếu.');
    }
    if (slidesData[0]?.type !== 'walt') {
      slidesData.unshift({ type: 'walt', title: currentPlan.title || 'MỤC TIÊU BÀI HỌC', icon: '🎯', points: [], imageUrls: [], speakerNotes: '', visualSuggestion: '' });
    }

    const gated = await applySlideQualityGate(slidesData, data, showToast);
    showToast(`Đã thiết kế xong ${gated.length} slide!`);
    return gated;
  } catch (e: any) {
    console.error(e);
    showToast(isMissingApiKeyError(e) ? e.message : 'Lỗi cấu trúc hoặc kết nối AI, vui lòng thử lại', 'error');
    return null;
  } finally {
    setIsLoading(false);
    onProgress?.('');
  }
};

// ── Text-to-Slide: 2 lượt (outline → expand) ─────────────────────────────────
// Cùng lý do như generateSlideData: 1 call đơn bị trần output token bó hẹp,
// deckTitle thường về trống/fallback. Tách phase outline (nhẹ, trả deckTitle chắc)
// rồi phase expand (bám dàn ý) cho kết quả ổn định hơn.

interface TextSlideSection {
  id: string;
  layout: string;
  title: string;
  contentBrief: string;
}

const buildTextSlideOutlinePrompt = (rawText: string): string => `
BẠN LÀ CHUYÊN GIA THIẾT KẾ BÀI TRÌNH CHIẾU SƯ PHẠM ĐẲNG CẤP QUỐC TẾ.
Đọc đoạn văn bản thô sau và lập DÀN Ý ngắn gọn cho bài trình chiếu.

Văn bản thô:
---
${rawText}
---

NHIỆM VỤ:
1. Xác định tiêu đề bài học (deckTitle) — ngắn gọn, đại diện cho toàn bộ nội dung, dùng làm tên file.
2. Chia nội dung thành 5–10 slide theo logic: mở đầu → kiến thức chính → ứng dụng → kết luận.

QUY TẮC layout:
- "title-body": mặc định (slide có danh sách bullet)
- "section-header": slide chuyển tiếp không có bullet (dùng khi bắt đầu phần lớn mới)

CHỈ TRẢ VỀ JSON OBJECT, KHÔNG bọc \`\`\`json:
{"deckTitle":"Tên bài học ngắn gọn","outline":[{"id":"s1","layout":"title-body","title":"TIÊU ĐỀ SLIDE (VIẾT HOA, ≤48 ký tự)","contentBrief":"Tóm tắt nội dung cần trình bày trong slide này"}]}
`.trim();

const buildTextSlideExpandPrompt = (rawText: string, outline: TextSlideSection[]): string => `
BẠN LÀ CHUYÊN GIA THIẾT KẾ BÀI TRÌNH CHIẾU SƯ PHẠM ĐẲNG CẤP QUỐC TẾ.
Soạn CHI TIẾT từng slide theo đúng dàn ý, bám sát văn bản gốc.

Văn bản gốc:
---
${rawText}
---

DÀN Ý (PHẢI tạo đúng ${outline.length} phần tử):
${JSON.stringify(outline, null, 2)}

YÊU CẦU TỪNG SLIDE:
- title: dùng tiêu đề từ dàn ý (được hoàn chỉnh thêm, ≤ 48 ký tự, VIẾT HOA).
- layout: giữ nguyên layout từ dàn ý.
- points: tối đa 4 ý ngắn gọn (≤ 160 ký tự/ý), trích/tóm tắt từ văn bản gốc.
- speakerNotes: lời dẫn chi tiết cho người thuyết trình.
- visualSuggestion: gợi ý hình ảnh minh họa bằng tiếng Việt.
- imageUrls: để là [].
- icon: emoji phù hợp nội dung.
- TUYỆT ĐỐI KHÔNG đưa gợi ý hình ảnh/lời thoại vào "points".
- CÔNG THỨC TOÁN HỌC: PPTX KHÔNG HỖ TRỢ LATEX — dùng ký hiệu text thường, tránh backslash.

CHỈ TRẢ VỀ JSON MẢNG đúng ${outline.length} phần tử, KHÔNG bọc \`\`\`json:
[{"id":"s1","layout":"title-body","title":"...","icon":"🎯","points":["..."],"imageUrls":[],"speakerNotes":"...","visualSuggestion":"..."}]
`.trim();

export const generateTextToSlideData = async (
  rawText: string,
  data: AppData,
  setIsLoading: (val: boolean) => void,
  showToast: (msg: string, type?: any) => void
): Promise<{ slidesData: any[]; deckTitle: string } | null> => {
  try {
    setIsLoading(true);

    // Phase 1: outline — nhẹ, trả deckTitle + danh sách slide ngắn gọn
    showToast('Đang lập dàn ý bài trình chiếu...', 'info');
    const outlineResponse = await callAI(buildTextSlideOutlinePrompt(rawText), data.settings);
    if (!outlineResponse) throw new Error('Không có phản hồi khi lập dàn ý');

    const outlineCleaned = outlineResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const objMatch = outlineCleaned.match(/\{[\s\S]*\}/);
    if (!objMatch) throw new Error('Không phân tích được dàn ý từ AI');
    const outlineParsed = parseLooseJson(objMatch[0]);
    if (!outlineParsed || !Array.isArray(outlineParsed.outline) || outlineParsed.outline.length < 2) {
      throw new Error('Dàn ý slide không hợp lệ, vui lòng thử lại');
    }
    const deckTitle: string = typeof outlineParsed.deckTitle === 'string' ? outlineParsed.deckTitle.trim() : '';
    const outline: TextSlideSection[] = outlineParsed.outline;

    // Phase 2: expand — soạn chi tiết từng slide bám dàn ý
    showToast(`Đang soạn chi tiết ${outline.length} slide...`, 'info');
    const expandResponse = await callAI(buildTextSlideExpandPrompt(rawText, outline), data.settings);
    if (!expandResponse) throw new Error('Không có phản hồi khi soạn chi tiết slide');

    const expandCleaned = expandResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const arrMatch = expandCleaned.match(/\[[\s\S]*\]/);
    if (!arrMatch) throw new Error('AI chưa trả về mảng slide hợp lệ. Vui lòng thử tạo lại bài trình chiếu.');
    let slidesData: any[] = parseLooseJson(arrMatch[0]);
    if (!Array.isArray(slidesData) || slidesData.length === 0) {
      throw new Error('AI chưa trả về cấu trúc slide hợp lệ. Vui lòng thử tạo lại bài trình chiếu.');
    }

    // Post-process type (deterministic — không giao cho AI)
    slidesData[0].type = 'walt';
    slidesData[slidesData.length - 1].type = 'wrapup';
    for (let i = 1; i < slidesData.length - 1; i++) {
      if (!slidesData[i].type) slidesData[i].type = 'content';
    }

    const gated = await applySlideQualityGate(slidesData, data, showToast);
    showToast('Đã thiết kế xong cấu trúc Slide!');
    return { slidesData: gated, deckTitle: deckTitle || 'baigiang' };
  } catch (e: any) {
    console.error(e);
    showToast(isMissingApiKeyError(e) ? e.message : 'Lỗi cấu trúc hoặc kết nối AI, vui lòng thử lại', 'error');
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

/**
 * PPTX không hỗ trợ LaTeX trực tiếp. Với mỗi slide: tách khối công thức display ($$...$$)
 * ra khỏi text và render thành ảnh PNG (KaTeX) gộp vào "imageUrls" của CHÍNH slide đó —
 * tái dùng nguyên khung hiển thị ảnh sẵn có nên công thức luôn đi cùng đúng slide đã tách
 * (kể cả sau khi bị chia "Phần 1/2" ở bước MAX_POINTS). Công thức inline ($...$) còn sót
 * lại được thay bằng xấp xỉ Unicode dễ đọc thay vì để lộ backslash LaTeX thô.
 */
const resolveSlideFormulas = async (slide: any): Promise<any> => {
  if (!Array.isArray(slide.points) || slide.points.length === 0) return slide;

  const nextPoints: string[] = [];
  const formulaImageUrls: string[] = [];

  for (const rawPoint of slide.points) {
    if (typeof rawPoint !== 'string') { nextPoints.push(rawPoint); continue; }
    const { remainingText, formulas } = extractDisplayFormulas(rawPoint);

    for (const formula of formulas) {
      try {
        const rendered = await renderLatexToPng(formula, { displayMode: true, scale: 3 });
        if (rendered) formulaImageUrls.push(rendered.dataUrl);
      } catch {
        // Rớt ảnh công thức thì bỏ qua — không chặn cả slide
      }
    }

    const finalText = replaceInlineFormulasWithText(remainingText);
    if (finalText.trim()) nextPoints.push(finalText);
  }

  if (formulaImageUrls.length === 0) return { ...slide, points: nextPoints };

  const existingImages = Array.isArray(slide.imageUrls) ? slide.imageUrls.filter(Boolean) : [];
  return { ...slide, points: nextPoints, imageUrls: [...existingImages, ...formulaImageUrls] };
};

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

  // Render công thức LaTeX → ảnh SAU KHI đã chia Phần 1/2, để ảnh luôn gắn đúng slide cuối cùng
  const resolvedSlides = await Promise.all(processedSlides.map(resolveSlideFormulas));

  // ── Content slides ────────────────────────────────────────────────────────
  for (let i = 0; i < resolvedSlides.length; i++) {
    const s = resolvedSlides[i];
    const pSlide = pptx.addSlide();
    pSlide.background = { color: 'FFFFFF' };

    pSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 0.9, fill: { color: '1A237E' }
    });
    
    const headerText = s.icon ? `${s.icon} ${s.title}` : s.title;
    // Co font theo độ dài để tiêu đề luôn nằm 1 dòng trong thanh 0.9in — autofit của
    // pptxgenjs chỉ được PowerPoint tính lại lúc edit, LibreOffice/render tĩnh bỏ qua,
    // nên phải quyết định cỡ chữ deterministic ngay khi xuất (QA thấy title 33 ký tự
    // wrap và tràn khỏi thanh xanh ở fontSize 32 cố định).
    const headerFontSize = headerText.length <= 30 ? 32 : headerText.length <= 38 ? 30 : headerText.length <= 44 ? 28 : 26;
    pSlide.addText(headerText, {
      x: 0.4, y: 0.15, w: 9.2, h: 0.6,
      fontSize: headerFontSize, color: 'FFFFFF', bold: true,
      valign: 'middle', fontFace: 'Arial',
    });

    pSlide.addText(`${i + 1} / ${resolvedSlides.length}`, {
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
          fontSize: 18,
          color: '334155',
          fontFace: 'Arial',
          breakLine: true
        }
      }));

      pSlide.addText(textObjects, {
        x: contentX, y: contentY, w: contentW, h: 3.8,
        valign: 'top',
        autoFit: true,
        lineSpacing: 26
      });
    }

    if (hasImages) {
      const panelX = 6.2;
      const panelW = 3.4;
      const panelBottomY = 5.15;
      // Chia đều chiều cao khả dụng cho số ảnh thực có (ảnh minh họa + ảnh công thức)
      // để nhiều ảnh trên cùng slide không tràn xuống dưới khung — thay vì bước cố định 2.6in.
      const perImageH = Math.min(2.5, (panelBottomY - contentY) / images.length);
      let imgY = contentY;

      for (const url of images) {
        try {
          pSlide.addImage({
            path: url,
            x: panelX, y: imgY, w: panelW, h: perImageH - 0.1,
            sizing: { type: 'contain', w: panelW, h: perImageH - 0.1 }
          });
          imgY += perImageH;
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
