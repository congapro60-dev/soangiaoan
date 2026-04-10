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
    templateId: ''
  });
  const [lessonDocs, setLessonDocs] = useState<TemplateFile[]>([]);
  const [singleRequirement, setSingleRequirement] = useState('');
  const [distributionFile, setDistributionFile] = useState<TemplateFile | null>(null);
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

    if (generationMode === 'bulk' && (!distributionFile || !bulkCommand)) {
      showToast('Vui lòng tải lên phân phối chương trình và nhập yêu cầu soạn thảo!', 'warning');
      return;
    }

    setIsLoading(true);
    setBulkResults([]);

    try {
      const subject = data.subjects.find(s => s.id === currentPlan.subjectId)?.name || 'Chung';
      const selectedTemplate = data.templates.find(t => t.id === currentPlan.templateId);
      
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
          Bạn là một chuyên gia giáo dục cao cấp. Hãy soạn một giáo án chi tiết và chuyên nghiệp cho môn học: ${subject}.
          Tiêu đề bài học: ${currentPlan.title}.
          ${templateContext}
          ${lessonDocsContent ? `TÀI LIỆU THAM KHẢO CHO BÀI HỌC:\n${lessonDocsContent}` : ''}
          ${singleRequirement ? `YÊU CẦU BỔ SUNG TỪ GIÁO VIÊN: ${singleRequirement}` : ''}
          ${mathRestrictions}
          Yêu cầu: Định dạng Markdown, tiến trình nhiều bảng 3 cột, dùng <br/><br/> để cách dòng trong bảng.
        `;
        const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
        if (result) {
          setCurrentPlan(prev => ({ ...prev, content: cleanMarkdownOutput(result) }));
          showToast('Đã khởi tạo giáo án thành công!');
        }
      } else {
        const plannerPrompt = `
          LẬP DANH SÁCH BÀI HỌC CẦN SOẠN dựa trên Phân phối chương trình:\n${distributionFile?.content}
          Yêu cầu: ${bulkCommand}. Môn: ${subject}.
          Trả về duy nhất mảng JSON tiêu đề bài học.
        `;
        
        const planResponse = await callGeminiAI(plannerPrompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
        if (!planResponse) throw new Error("Không tạo được kế hoạch");

        const jsonStr = planResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const titles = JSON.parse(jsonStr) as string[];
        
        setBulkProgress({ current: 0, total: titles.length });
        const newPlans: LessonPlan[] = [];

        for (let i = 0; i < titles.length; i++) {
          const title = titles[i];
          setBulkProgress({ current: i + 1, total: titles.length });
          
          const detailPrompt = `Soạn giáo án chi tiết cho bài: ${title}. ${templateContext} ${mathRestrictions} Định dạng nhiều bảng 3 cột.`;
          const detailResponse = await callGeminiAI(detailPrompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
          if (detailResponse) {
            newPlans.push({
              id: Math.random().toString(36).substr(2, 9),
              subjectId: currentPlan.subjectId || 'math',
              templateId: currentPlan.templateId,
              title: title,
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
    bulkCommand, setBulkCommand,
    bulkResults, setBulkResults,
    bulkProgress,
    handleCreateLesson,
    handleReviseLesson,
    revisionPrompt, setRevisionPrompt
  };
};
