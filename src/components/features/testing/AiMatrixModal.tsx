import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, BookOpen, FileText, CheckCircle2, Loader2, Target } from 'lucide-react';
import { AppData, ExamQuestion, LessonPlan, Exam } from '../../../types';
import { callAI, getActiveApiKey } from '../../../lib/aiProviders';

interface AiMatrixModalProps {
  data: AppData;
  onClose: () => void;
  onGenerate: (questions: ExamQuestion[]) => void;
  showToast: (msg: string, type?: string) => void;
}

export const AiMatrixModal = ({ data, onClose, onGenerate, showToast }: AiMatrixModalProps) => {
  const [selectedContextIds, setSelectedContextIds] = useState<Set<string>>(new Set());
  const [contextType, setContextType] = useState<'lesson' | 'exam'>('lesson');
  const [loading, setLoading] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');

  // Matrix configuration
  const [matrix, setMatrix] = useState({
    nb: 4,
    th: 3,
    vd: 2,
    vdc: 1
  });
  const [defaultPoints, setDefaultPoints] = useState<number>(0.25);
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false'>('multiple_choice');

  const totalQuestions = matrix.nb + matrix.th + matrix.vd + matrix.vdc;

  // Filter sources
  const availableSources = useMemo(() => {
    if (contextType === 'lesson') return data.lessonPlans || [];
    return data.exams || [];
  }, [data, contextType]);

  const toggleContext = (id: string) => {
    setSelectedContextIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getContextContent = () => {
    let content = '';
    selectedContextIds.forEach(id => {
      if (contextType === 'lesson') {
        const lp = data.lessonPlans.find(l => l.id === id);
        if (lp) content += `\n--- GIÁO ÁN: ${lp.title} ---\n${lp.content}\n`;
      } else {
        const ex = data.exams.find(e => e.id === id);
        if (ex) {
          content += `\n--- ĐỀ THI: ${ex.title} ---\n`;
          ex.questions.forEach((q, i) => {
            content += `Câu ${i+1} (${q.cognitiveLevel || 'Nhận biết'}): ${q.content}\n`;
          });
        }
      }
    });
    return content;
  };

  const generatedPrompt = useMemo(() => {
    const typeLabel = questionType === 'multiple_choice' ? 'trắc nghiệm 4 lựa chọn (A, B, C, D)' : 'trắc nghiệm Đúng/Sai';
    return `Đóng vai một chuyên gia ra đề thi chuẩn của Bộ Giáo dục. Hãy tạo một đề thi ${typeLabel} gồm đúng ${totalQuestions} câu hỏi.
MA TRẬN YÊU CẦU:
- ${matrix.nb} câu Nhận biết (Dễ, hỏi khái niệm cơ bản)
- ${matrix.th} câu Thông hiểu (Trung bình, hiểu bản chất, phân tích nhẹ)
- ${matrix.vd} câu Vận dụng (Khó, tính toán hoặc áp dụng công thức)
- ${matrix.vdc} câu Vận dụng cao (Cực khó, tư duy tổng hợp)

NỘI DUNG BÁM SÁT:
${selectedContextIds.size > 0 ? 'Dựa vào kiến thức trong bối cảnh được cung cấp bên dưới.' : 'Dựa vào kiến thức phổ thông chuẩn.'}

Mỗi câu hỏi có ${defaultPoints} điểm. Trả về đúng định dạng JSON array chuẩn. Đảm bảo correctAnswer chính xác.`;
  }, [matrix, totalQuestions, questionType, defaultPoints, selectedContextIds.size]);

  const handleGenerate = async () => {
    if (totalQuestions <= 0) {
      showToast('Vui lòng chọn ít nhất 1 câu hỏi', 'warning');
      return;
    }
    const apiKey = getActiveApiKey(data.settings);
    if (!apiKey) {
      showToast('Vui lòng cấu hình API Key trong Cài đặt trước khi dùng AI', 'error');
      return;
    }

    setLoading(true);
    setProgressLabel('Đang trích xuất bối cảnh...');
    
    try {
      const contextContent = getContextContent();
      
      const fullPrompt = `
${generatedPrompt}

BỐI CẢNH KIẾN THỨC BẮT BUỘC SỬ DỤNG:
${contextContent || '(Không có bối cảnh cụ thể, hãy tự tổng hợp)'}

CHỈ TRẢ VỀ JSON THEO FORMAT SAU:
[
  {
    "type": "${questionType}",
    "content": "Nội dung câu hỏi đầy đủ",
    "options": ["A. Đáp án 1", "B. Đáp án 2", "C. Đáp án 3", "D. Đáp án 4"],
    "correctAnswer": "A",
    "explanation": "Giải thích vì sao A đúng",
    "cognitiveLevel": "Nhận biết",
    "points": ${defaultPoints}
  }
]
Luôn bọc công thức Toán học bằng dấu $...$ hoặc $$...$$. Tuyệt đối KHÔNG sinh text bên ngoài JSON.
`;

      setProgressLabel(`Đang gọi AI (${data.settings.selectedModel})...`);
      const response = await callAI(fullPrompt, data.settings);
      
      setProgressLabel('Đang xử lý kết quả...');
      const match = response.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('AI không trả về đúng định dạng JSON array');
      
      let parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) throw new Error('Kết quả không phải mảng');
      
      // Normalize AI result
      const questions: ExamQuestion[] = parsed.map((q: any) => ({
        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: q.type || questionType,
        content: String(q.content || ''),
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer || 'A',
        explanation: q.explanation || '',
        points: Number(q.points) || defaultPoints,
        cognitiveLevel: q.cognitiveLevel || 'Nhận biết'
      }));

      onGenerate(questions);
    } catch (error: any) {
      console.error(error);
      showToast(`Lỗi tạo bằng AI: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-6xl h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-purple-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Sinh Đề Bằng Ma Trận AI</h2>
              <p className="text-xs font-semibold text-slate-500">Thiết kế ma trận độ khó & tự động chọn lọc từ Giáo Án/Đề Cũ</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Column: Context Selection */}
          <div className="w-[400px] border-r border-slate-100 bg-slate-50/30 flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500"/> Nguồn dữ liệu (Bối cảnh)
              </h3>
              <div className="flex p-1 bg-slate-200/60 rounded-xl">
                <button 
                  onClick={() => setContextType('lesson')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${contextType === 'lesson' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Giáo Án
                </button>
                <button 
                  onClick={() => setContextType('exam')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${contextType === 'exam' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Đề Thi Cũ
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {availableSources.length === 0 ? (
                <div className="text-center py-10 px-4 text-slate-500 text-sm">
                  Chưa có dữ liệu {contextType === 'lesson' ? 'Giáo án' : 'Đề thi'}. AI sẽ sinh đề dựa trên kiến thức chung.
                </div>
              ) : (
                (availableSources as any[]).map((src) => {
                  const isSelected = selectedContextIds.has(src.id);
                  return (
                    <button
                      key={src.id}
                      onClick={() => toggleContext(src.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        isSelected 
                          ? 'bg-purple-50/50 border-purple-200 shadow-sm' 
                          : 'bg-white border-transparent hover:border-slate-200'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-300'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <h4 className={`font-bold text-sm leading-snug line-clamp-2 ${isSelected ? 'text-purple-900' : 'text-slate-700'}`}>
                          {src.title}
                        </h4>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                          {contextType === 'lesson' ? <BookOpen className="w-3 h-3"/> : <FileText className="w-3 h-3"/>}
                          {contextType === 'lesson' ? src.grade || 'Chưa gán khối' : src.code}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Matrix Config */}
          <div className="flex-1 flex flex-col bg-white overflow-y-auto custom-scrollbar p-8">
            <h3 className="text-lg font-black text-slate-800 mb-6 border-b pb-2">Cấu hình Ma trận</h3>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="font-bold text-emerald-800 text-sm">Nhận biết</span>
                  <input type="number" min="0" value={matrix.nb} onChange={e => setMatrix(prev => ({...prev, nb: Number(e.target.value)}))} className="w-16 px-2 py-1 rounded-lg border border-emerald-200 text-center font-bold text-emerald-700 bg-white" />
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="font-bold text-blue-800 text-sm">Thông hiểu</span>
                  <input type="number" min="0" value={matrix.th} onChange={e => setMatrix(prev => ({...prev, th: Number(e.target.value)}))} className="w-16 px-2 py-1 rounded-lg border border-blue-200 text-center font-bold text-blue-700 bg-white" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <span className="font-bold text-amber-800 text-sm">Vận dụng</span>
                  <input type="number" min="0" value={matrix.vd} onChange={e => setMatrix(prev => ({...prev, vd: Number(e.target.value)}))} className="w-16 px-2 py-1 rounded-lg border border-amber-200 text-center font-bold text-amber-700 bg-white" />
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                  <span className="font-bold text-red-800 text-sm">Vận dụng cao</span>
                  <input type="number" min="0" value={matrix.vdc} onChange={e => setMatrix(prev => ({...prev, vdc: Number(e.target.value)}))} className="w-16 px-2 py-1 rounded-lg border border-red-200 text-center font-bold text-red-700 bg-white" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Loại câu hỏi</label>
                <select 
                  value={questionType}
                  onChange={e => setQuestionType(e.target.value as any)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none focus:border-purple-300"
                >
                  <option value="multiple_choice">Trắc nghiệm 4 lựa chọn</option>
                  <option value="true_false">Trắc nghiệm Đúng / Sai</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Điểm mặc định mỗi câu</label>
                <div className="relative">
                  <input 
                    type="number" step="0.25" min="0" 
                    value={defaultPoints}
                    onChange={e => setDefaultPoints(Number(e.target.value))}
                    className="w-full p-3 pl-4 pr-12 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none focus:border-purple-300"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Điểm</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">* Giáo viên có thể tự do chỉnh lại điểm ở màn hình Sửa Đề trước khi xuất bản.</p>
              </div>
            </div>

            <div className="mt-auto">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Prompt Hệ Thống (Xem trước)</label>
              <textarea 
                readOnly
                value={generatedPrompt}
                className="w-full h-32 p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-600 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between z-20">
          <div className="text-sm font-bold text-slate-600">
            Tổng cộng: <strong className="text-2xl text-purple-600 mx-1">{totalQuestions}</strong> câu
            {selectedContextIds.size > 0 && <span className="ml-3 text-xs text-slate-400">({selectedContextIds.size} nguồn dữ liệu)</span>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors">
              Huỷ bỏ
            </button>
            <button 
              onClick={handleGenerate}
              disabled={loading || totalQuestions === 0}
              className="px-6 py-2.5 rounded-xl font-black text-sm text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-600/20 min-w-[180px] flex justify-center items-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin"/> {progressLabel}</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Bắt đầu Sinh Đề</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
