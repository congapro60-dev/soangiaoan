import { useState } from 'react';
import { LessonPlan, AppData, TemplateFile } from '../types';
import { callGeminiAI, MODELS } from '../lib/gemini';
import { cleanMarkdownOutput } from '../utils/markdownUtils';
import Swal from 'sweetalert2';

// Note: MODELS and MODELS_LIST should be consistent. 
// In App.tsx it was MODELS.indexOf(data.settings.selectedModel)
// I'll keep that logic.

/**
 * Trích xuất nội dung giáo án từ phản hồi AI có thể chứa thẻ XML.
 * Ưu tiên lấy <lesson_content>, gộp <pedagogical_review> nếu AI tách riêng,
 * fallback sang toàn bộ text nếu AI không dùng XML.
 */
const extractLessonContent = (rawResult: string): string => {
  const contentMatch = rawResult.match(/<lesson_content>([\s\S]*?)<\/lesson_content>/);
  let finalContent = '';
  if (contentMatch) {
    finalContent = contentMatch[1];
    // Nếu AI vẫn tách riêng phần pedagogical_review, gộp lại
    const reviewMatch = rawResult.match(/<pedagogical_review>([\s\S]*?)<\/pedagogical_review>/);
    if (reviewMatch && !finalContent.includes('Danielson') && !finalContent.includes('tổ trưởng chuyên môn')) {
      finalContent += '\n\n## Đánh giá của tổ trưởng chuyên môn\n' + reviewMatch[1];
    }
  } else {
    // Fallback: AI không dùng thẻ XML, lấy toàn bộ và loại bỏ thẻ thinking
    finalContent = rawResult.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
  }
  return finalContent;
};

export const useLessonCreator = (
  data: AppData, 
  setData: React.Dispatch<React.SetStateAction<AppData>>,
  setIsLoading: (val: boolean) => void,
  showToast: (msg: string, type?: any) => void,
  setIsSettingsOpen: (val: boolean) => void
) => {
  const [generationMode, setGenerationMode] = useState<'single' | 'bulk'>('single');
  const [currentPlan, setCurrentPlan] = useState<Partial<LessonPlan>>({
    title: '',
    content: '',
    subjectId: 'math',
    templateId: '',
    grade: '10',
    week: '1'
  });
  const [lessonDocs, setLessonDocs] = useState<TemplateFile[]>([]);
  const [singleRequirement, setSingleRequirement] = useState('');
  const [distributionFile, setDistributionFile] = useState<TemplateFile | null>(null);
  const [selectedDistributionId, setSelectedDistributionId] = useState<string>('');
  const [bulkCommand, setBulkCommand] = useState('');
  const [bulkResults, setBulkResults] = useState<LessonPlan[]>([]);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [revisionPrompt, setRevisionPrompt] = useState('');

  const handleCreateLesson = async () => {
    if (!data.settings.geminiApiKey) {
      setIsSettingsOpen(true);
      showToast('Vui lòng nhập API Key!', 'warning');
      return;
    }

    if (generationMode === 'single' && !currentPlan.title) {
      showToast('Vui lòng nhập tiêu đề giáo án!', 'warning');
      return;
    }

    if (generationMode === 'bulk' && (!distributionFile && !selectedDistributionId) && !bulkCommand) {
      showToast('Vui lòng chọn hoặc tải lên phân phối chương trình!', 'warning');
      return;
    }

    setIsLoading(true);
    setBulkResults([]);

    try {
      const subject = data.subjects.find(s => s.id === currentPlan.subjectId)?.name || 'Chung';
      const selectedTemplate = data.templates.find(t => t.id === currentPlan.templateId);
      const activeDist = selectedDistributionId 
        ? data.distributions.find(d => d.id === selectedDistributionId) 
        : distributionFile;
      
      let templateContext = '';
      if (selectedTemplate) {
        const samples = selectedTemplate.files.filter(f => f.category === 'sample').map(f => f.content).join('\n---\n');
        const criteria = selectedTemplate.files.filter(f => f.category === 'criteria').map(f => f.content).join('\n---\n');
        templateContext = `
          DỰA TRÊN MẪU GIÁO ÁN SAU (Cấu trúc và phong cách):
          ${samples}
          
          TUÂN THỦ CÁC TIÊU CHÍ/QUY ĐỊNH SAU:
          ${criteria}
        `;
      }

      const mathRestrictions = subject === 'Toán học' || subject.toLowerCase().includes('toán') ? `
===========================================================
YÊU CẦU ĐẶC BIỆT THIẾT KẾ GIÁO ÁN MÔN TOÁN BẬC CAO
(Chuẩn hóa theo CIS, TDS và Danielson Framework)
===========================================================
1. THÔNG TIN CHUNG BẮT BUỘC: WALT, WILF (3 mức độ 🌶️), NĂNG LỰC CỐT LÕI.
2. CẤU TRÚC BƯỚC: 4 giai đoạn, mỗi giai đoạn 1 bảng 3 cột riêng.
3. HÀNH ĐỘNG SƯ PHẠM: [Quét Radar], [🌐 Công dân toàn cầu], v.v.
4. ĐỘ CHI TIẾT: Biên kịch hội thoại GV/HS 100%.
===========================================================
      ` : '';

      if (generationMode === 'single') {
        const lessonDocsContent = lessonDocs.map(f => f.content).join('\n---\n');
        const prompt = `
          BẠN LÀ MỘT CHUYÊN GIA GIÁO DỤC CAO CẤP VỚI TƯ DUY CỦA CLAUDE 4.5 SONNET. 
          NHIỆM VỤ: Soạn một giáo án "Masterpiece" (Kiệt tác sư phạm).

          BỐ CỤC PHẢN HỒI (BẮT BUỘC):
          1. <thinking>: Phân tích mục tiêu bài học, đặc điểm HS lớp ${currentPlan.grade}, lựa chọn phương pháp (VARK, 5E, Gagne...) và kế hoạch "gây nghiện" cho bài giảng.
          2. <lesson_content>: TOÀN BỘ nội dung giáo án chi tiết (Markdown), BAO GỒM CẢ phần đánh giá Danielson ở cuối.

          THÔNG TIN BÀI HỌC:
          - Môn học: ${subject}. Lớp: ${currentPlan.grade}. Tuần: ${currentPlan.week}.
          - Tiêu đề: ${currentPlan.title}.
          ${templateContext}
          ${activeDist ? `PHÂN PHỐI CHƯƠNG TRÌNH:\n${activeDist.content}` : ''}
          ${lessonDocsContent ? `TÀI LIỆU THAM KHẢO:\n${lessonDocsContent}` : ''}
          ${singleRequirement ? `YÊU CẦU BỔ SUNG: ${singleRequirement}` : ''}
          ${mathRestrictions}

          ===== YÊU CẦU ĐỊNH DẠNG NỘI DUNG BÊN TRONG <lesson_content> (TUYỆT ĐỐI TUÂN THỦ) =====
          A. CẤU TRÚC GIÁO ÁN:
          - Phần đầu: Thông tin chung (WALT, WILF 3 mức độ 🌶️, Năng lực cốt lõi) nếu là môn Toán.
          - Tiến trình 4 bước: Mở đầu → Hình thành kiến thức → Luyện tập → Vận dụng.
          - MỖI BƯỚC phải trình bày dạng BẢNG MARKDOWN 3 CỘT:
            | Hoạt động của GV | Hoạt động của HS | Công cụ & Đánh giá |
          - KHÔNG ĐƯỢC viết dạng đoạn văn tự do. PHẢI là bảng.
          - Ngôn ngữ biên kịch hội thoại 100%. Dùng <br/><br/> để cách dòng trong ô bảng.
          - Tích hợp kỹ năng thế kỷ 21 và năng lực cốt lõi.

          B. PHẦN ĐÁNH GIÁ DANIELSON (BẮT BUỘC, VIẾT Ở CUỐI BÊN TRONG <lesson_content>):
          Sau nội dung giáo án, PHẢI thêm phần:
          "## Đánh giá của tổ trưởng chuyên môn"
          Tự chấm điểm theo khung Danielson Miền 1 (Lên kế hoạch và chuẩn bị), 6 tiêu chí (Thang 1-4, 4 là Tốt nhất):
          1a: Áp dụng kiến thức chuyên môn và sư phạm
          1b: Thấu hiểu học sinh
          1c: Thiết lập mục tiêu giảng dạy
          1d: Sử dụng tài nguyên hiệu quả
          1e: Thiết kế bài giảng mạch lạc
          1f: Đánh giá quá trình học tập
          ===== HẾT YÊU CẦU ĐỊNH DẠNG =====
        `;
        const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
        if (result) {
          const finalContent = extractLessonContent(result);
          setCurrentPlan(prev => ({ ...prev, content: cleanMarkdownOutput(finalContent) }));
          showToast('Đã khởi tạo giáo án cấp độ Senior!');
        }
      } else {
        const distContent = activeDist?.content || distributionFile?.content;
        const plannerPrompt = `
          BẠN LÀ CHUYÊN GIA TRÍ TUỆ NHÂN TẠO TRÍCH XUẤT DỮ LIỆU GIÁO DỤC (CLAUDE AGENT STYLE).
          NHIỆM VỤ: Lập danh sách các bài học từ Phân phối chương trình (PPCN).

          BỐ CỤC PHẢN HỒI:
          1. <thinking>: Phân tích cấu trúc bảng trong PPCN, xác định cột tuần, cột bài, cột yêu cầu cần đạt.
          2. <extraction_list>: Trả về mảng JSON các bài học.

          NỘI DUNG PPCN:
          ${distContent}
          ---
          YÊU CẦU LỌC: ${bulkCommand}
          MÔN: ${subject}. LỚP: ${currentPlan.grade}.

          ĐỊNH DẠNG JSON TRONG <extraction_list>:
          [{"week": "2", "title": "...", "objectives": "..."}]
          KHÔNG TRẢ VỀ GÌ QUÁ NGOÀI XML.
        `;
        
        const planResponse = await callGeminiAI(plannerPrompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
        if (!planResponse) throw new Error("Không trích xuất được kế hoạch từ PPCN");

        const jsonStr = planResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedLessons = JSON.parse(jsonStr) as { week: string, title: string, objectives: string }[];
        
        setBulkProgress({ current: 0, total: extractedLessons.length });
        const newPlans: LessonPlan[] = [];

        for (let i = 0; i < extractedLessons.length; i++) {
          const lesson = extractedLessons[i];
          setBulkProgress({ current: i + 1, total: extractedLessons.length });
          
          const detailPrompt = `
            BẠN LÀ CHUYÊN GIA BIÊN SOẠN GIÁO ÁN CAO CẤP VỚI TƯ DUY CỦA CLAUDE 4.5 SONNET.
            
            BỐ CỤC PHẢN HỒI:
            1. <thinking>: Phân tích ngắn mục tiêu bài, đặc điểm HS, phương pháp phù hợp.
            2. <lesson_content>: TOÀN BỘ giáo án (Markdown), BAO GỒM đánh giá Danielson ở cuối.

            HÃY SOẠN GIÁO ÁN CHI TIẾT CHO BÀI: "${lesson.title}"
            THÔNG TIN TỪ PHÂN PHỐI CHƯƠNG TRÌNH:
            - Tuần: ${lesson.week}
            - Mục tiêu/Kiến thức trọng tâm: ${lesson.objectives}
            
            ${templateContext}
            ${mathRestrictions}
            Lớp: ${currentPlan.grade}.
            
            ===== YÊU CẦU ĐỊNH DẠNG BÊN TRONG <lesson_content> (TUYỆT ĐỐI TUÂN THỦ) =====
            A. YÊU CẦU NGHIÊM NGẶT:
            1. NỘI DUNG PHẢI TUÂN THỦ HOÀN TOÀN THEO "MỤC TIÊU/KIẾN THỨC TRỌNG TÂM" ĐÃ TRÍCH XUẤT TRÊN.
            2. Tiêu đề bài soạn phải khớp 100% với tên bài được cung cấp.
            3. Tiến trình 4 bước: Mở đầu → Hình thành kiến thức → Luyện tập → Vận dụng.
            4. MỖI BƯỚC phải trình bày dạng BẢNG MARKDOWN 3 CỘT:
              | Hoạt động của GV | Hoạt động của HS | Công cụ & Đánh giá |
            5. KHÔNG ĐƯỢC viết dạng đoạn văn tự do. PHẢI là bảng.
            6. Ngôn ngữ biên kịch hội thoại 100%. Dùng <br/><br/> để cách dòng trong ô bảng.

            B. PHẦN ĐÁNH GIÁ DANIELSON (BẮT BUỘC, VIẾT Ở CUỐI BÊN TRONG <lesson_content>):
            "## Đánh giá của tổ trưởng chuyên môn"
            Tự chấm điểm theo khung Danielson Miền 1, 6 tiêu chí (Thang 1-4):
            1a: Áp dụng kiến thức chuyên môn và sư phạm
            1b: Thấu hiểu học sinh
            1c: Thiết lập mục tiêu giảng dạy
            1d: Sử dụng tài nguyên hiệu quả
            1e: Thiết kế bài giảng mạch lạc
            1f: Đánh giá quá trình học tập
            ===== HẾT YÊU CẦU =====
          `;

          const detailResponse = await callGeminiAI(detailPrompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
          if (detailResponse) {
            newPlans.push({
              id: Math.random().toString(36).substr(2, 9),
              subjectId: currentPlan.subjectId || 'math',
              templateId: currentPlan.templateId,
              grade: currentPlan.grade,
              week: lesson.week || currentPlan.week,
              title: lesson.title,
              content: cleanMarkdownOutput(extractLessonContent(detailResponse)),
              status: 'draft',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
        setBulkResults(newPlans);
        showToast(`Đã tự động soạn xong ${newPlans.length} giáo án!`);
      }
    } catch (error: any) {
      showToast(error.message || 'Lỗi soạn thảo', 'error');
    } finally {
      setIsLoading(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  const handleReviseLesson = async () => {
    if (!revisionPrompt.trim() || !currentPlan.content || !data.settings.geminiApiKey) return;
    setIsLoading(true);
    try {
      const prompt = `Viết lại giáo án sau theo yêu cầu: "${revisionPrompt}". \nNội dung cũ: ${currentPlan.content}`;
      const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
      if (result) {
        setCurrentPlan(prev => ({ ...prev, content: cleanMarkdownOutput(result) }));
        setRevisionPrompt('');
        showToast('Đã cập nhật giáo án!');
      }
    } catch (error) {
      showToast('Lỗi khi sửa đổi', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generationMode, setGenerationMode,
    currentPlan, setCurrentPlan,
    lessonDocs, setLessonDocs,
    singleRequirement, setSingleRequirement,
    distributionFile, setDistributionFile,
    selectedDistributionId, setSelectedDistributionId,
    bulkCommand, setBulkCommand,
    bulkResults, setBulkResults,
    bulkProgress,
    handleCreateLesson,
    handleReviseLesson,
    revisionPrompt, setRevisionPrompt
  };
};
