import { useState } from 'react';
import { LessonPlan, AppData, TemplateFile } from '../types';
import { callGeminiAI, MODELS } from '../lib/gemini';
import { cleanMarkdownOutput } from '../utils/markdownUtils';
import Swal from 'sweetalert2';

// Note: MODELS and MODELS_LIST should be consistent. 
// In App.tsx it was MODELS.indexOf(data.settings.selectedModel)
// I'll keep that logic.

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
          Bạn là một chuyên gia giáo dục cao cấp. Hãy soạn một giáo án chi tiết và chuyên nghiệp.
          Môn học: ${subject}. Lớp: ${currentPlan.grade}. Tuần: ${currentPlan.week}.
          Tiêu đề bài học: ${currentPlan.title}.
          ${templateContext}
          ${activeDist ? `THAM KHẢO PHÂN PHỐI CHƯƠNG TRÌNH SAU ĐỂ ĐẢM BẢO CHƯƠNG TRÌNH HỌC:\n${activeDist.content}` : ''}
          ${lessonDocsContent ? `TÀI LIỆU THAM KHẢO CHO BÀI HỌC:\n${lessonDocsContent}` : ''}
          ${singleRequirement ? `YÊU CẦU BỔ SUNG TỪ GIÁO VIÊN: ${singleRequirement}` : ''}
          ${mathRestrictions}
          Yêu cầu: Định dạng Markdown, tiến trình nhiều bảng 3 cột, dùng <br/><br/> để cách dòng trong bảng.
          
          PHẦN QUAN TRỌNG: Ở CUỐI GIÁO ÁN, BẮT BUỘC PHẢI THÊM PHẦN:
          "## Đánh giá của tổ trưởng chuyên môn"
          Dựa trên khung Danielson Miền 1 (Lên kế hoạch và chuẩn bị), hãy tự chấm điểm môn giáo án này theo 6 tiêu chí (Thang 1-4, 4 là Tốt nhất) và đưa ra nhận xét ngắn:
          1a: Áp dụng kiến thức chuyên môn và sư phạm
          1b: Thấu hiểu học sinh
          1c: Thiết lập mục tiêu giảng dạy
          1d: Sử dụng tài nguyên hiệu quả
          1e: Thiết kế bài giảng mạch lạc
          1f: Đánh giá quá trình học tập
        `;
        const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
        if (result) {
          setCurrentPlan(prev => ({ ...prev, content: cleanMarkdownOutput(result) }));
          showToast('Đã khởi tạo giáo án thành công!');
        }
      } else {
        const distContent = activeDist?.content || distributionFile?.content;
        const plannerPrompt = `
          BẠN LÀ CHUYÊN GIA TRÍ TUỆ NHÂN TẠO TRÍCH XUẤT DỮ LIỆU GIÁO DỤC.
          NHIỆM VỤ: Lập danh sách các bài học cần soạn từ Phân phối chương trình (PPCN) sau đây:
          ---
          NỘI DUNG PPCN:
          ${distContent}
          ---
          YÊU CẦU LỌC CỦA GIÁO VIÊN: ${bulkCommand}
          MÔN: ${subject}. LỚP: ${currentPlan.grade}.

          QUY TẮC TRÍCH XUẤT (CỰC KỲ QUAN TRỌNG):
          1. Văn bản PPCN trên thường có dạng bảng với các cột: [Tuần | Tiết | Tên bài dạy | Yêu cầu cần đạt/Mục tiêu].
          2. Bạn phải xác định đúng số TUẦN. Ví dụ nếu đề yêu cầu "Tuần 2", hãy tìm tất cả các bài thuộc Tuần 2 trong văn bản.
          3. TRÍCH XUẤT NGUYÊN VĂN TÊN BÀI DẠY. Không được tự ý tóm tắt hay đổi tên.
          4. TRÍCH XUẤT TÓM TẮT phần "Yêu cầu cần đạt" hoặc "Nội dung kiến thức" tương ứng với bài đó.

          ĐỊNH DẠNG TRẢ VỀ: Một mảng JSON duy nhất. KHÔNG GIẢI THÍCH GÌ THÊM.
          MẪU: [{"week": "2", "title": "...", "objectives": "..."}]
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
            BẠN LÀ CHUYÊN GIA BIÊN SOẠN GIÁO ÁN CAO CẤP.
            HÃY SOẠN GIÁO ÁN CHI TIẾT CHO BÀI: "${lesson.title}"
            THÔNG TIN TỪ PHÂN PHỐI CHƯƠNG TRÌNH:
            - Tuần: ${lesson.week}
            - Mục tiêu/Kiến thức trọng tâm: ${lesson.objectives}
            
            ${templateContext}
            ${mathRestrictions}
            Lớp: ${currentPlan.grade}.
            
            YÊU CẦU NGHIÊM NGẶT:
            1. NỘI DUNG PHẢI TUÂN THỦ HOÀN TOÀN THEO "MỤC TIÊU/KIẾN THỨC TRỌNG TÂM" ĐÃ TRÍCH XUẤT TRÊN.
            2. Định dạng: Nhiều bảng 3 cột. Chi tiết từng hoạt động.
            3. Tiêu đề bài soạn phải khớp 100% với tên bài được cung cấp.
            
            PHẦN QUAN TRỌNG: Ở CUỐI GIÁO ÁN, BẮT BUỘC PHẢI THÊM PHẦN:
            "## Đánh giá của tổ trưởng chuyên môn"
            Dựa trên khung Danielson Miền 1 (Lên kế hoạch và chuẩn bị), hãy tự chấm điểm môn giáo án này theo 6 tiêu chí (Thang 1-4, 4 là Tốt nhất) và đưa ra nhận xét ngắn:
            1a: Áp dụng kiến thức chuyên môn và sư phạm
            1b: Thấu hiểu học sinh
            1c: Thiết lập mục tiêu giảng dạy
            1d: Sử dụng tài nguyên hiệu quả
            1e: Thiết kế bài giảng mạch lạc
            1f: Đánh giá quá trình học tập
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
              content: cleanMarkdownOutput(detailResponse),
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
