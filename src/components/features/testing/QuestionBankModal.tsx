import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, CheckCircle2, ChevronRight, BookOpen, Clock, FileText, Layers, CheckSquare } from 'lucide-react';
import { Exam, ExamQuestion } from '../../../types';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface QuestionBankModalProps {
  exams: Exam[];
  onClose: () => void;
  onAddQuestions: (questions: ExamQuestion[]) => void;
}

export const QuestionBankModal = ({ exams, onClose, onAddQuestions }: QuestionBankModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  // Filter exams based on search term
  const filteredExams = useMemo(() => {
    if (!searchTerm) return exams;
    const lower = searchTerm.toLowerCase();
    return exams.filter(e => 
      e.title.toLowerCase().includes(lower) || 
      e.code.toLowerCase().includes(lower)
    );
  }, [exams, searchTerm]);

  const selectedExam = useMemo(() => 
    exams.find(e => e.id === selectedExamId) || null
  , [exams, selectedExamId]);

  // Handle question selection
  const toggleQuestion = (qId: string) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const toggleAllInExam = () => {
    if (!selectedExam) return;
    const examQIds = selectedExam.questions.map(q => q.id);
    const allSelected = examQIds.every(id => selectedQuestionIds.has(id));
    
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        examQIds.forEach(id => next.delete(id));
      } else {
        examQIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Get all selected questions across all exams
  const allSelectedQuestions = useMemo(() => {
    const questions: ExamQuestion[] = [];
    exams.forEach(exam => {
      exam.questions.forEach(q => {
        if (selectedQuestionIds.has(q.id)) {
          // Regenerate ID to avoid conflicts when importing into current exam
          questions.push({
            ...q,
            id: `q-bank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          });
        }
      });
    });
    return questions;
  }, [exams, selectedQuestionIds]);

  // Calculate stats
  const stats = useMemo(() => {
    const levels = { nb: 0, th: 0, vd: 0, vdc: 0 };
    allSelectedQuestions.forEach(q => {
      if (q.cognitiveLevel === 'Nhận biết' || !q.cognitiveLevel) levels.nb++;
      else if (q.cognitiveLevel === 'Thông hiểu') levels.th++;
      else if (q.cognitiveLevel === 'Vận dụng') levels.vd++;
      else if (q.cognitiveLevel === 'Vận dụng cao') levels.vdc++;
    });
    return { total: allSelectedQuestions.length, ...levels };
  }, [allSelectedQuestions]);

  const handleAdd = () => {
    if (allSelectedQuestions.length > 0) {
      onAddQuestions(allSelectedQuestions);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-6xl h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Ngân hàng câu hỏi</h2>
              <p className="text-xs font-semibold text-slate-500">Trích xuất câu hỏi từ các đề thi cũ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Column: Exams List */}
          <div className="w-80 border-r border-slate-100 bg-slate-50/30 flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm tên đề thi, mã đề..." 
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {filteredExams.length === 0 ? (
                <div className="text-center py-10 px-4 text-slate-500 text-sm">
                  Không tìm thấy đề thi nào phù hợp.
                </div>
              ) : (
                filteredExams.map(exam => {
                  const isSelected = selectedExamId === exam.id;
                  const selectedInExam = exam.questions.filter(q => selectedQuestionIds.has(q.id)).length;
                  
                  return (
                    <button
                      key={exam.id}
                      onClick={() => setSelectedExamId(exam.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-200 shadow-sm' 
                          : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <h4 className={`font-bold text-sm mb-1.5 line-clamp-2 leading-snug ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                        {exam.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3"/> #{exam.code}</span>
                        <span className="flex items-center gap-1"><FileText className="w-3 h-3"/> {exam.questions.length} câu</span>
                      </div>
                      {selectedInExam > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                          Đã chọn {selectedInExam} câu
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Questions List */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
            {!selectedExam ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl border-2 border-slate-100 flex items-center justify-center mb-4">
                  <CheckSquare className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-bold text-slate-500">Chọn một đề thi ở cột trái để xem câu hỏi</p>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10 shadow-sm">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={toggleAllInExam}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-600 transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        selectedExam.questions.every(q => selectedQuestionIds.has(q.id))
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {selectedExam.questions.every(q => selectedQuestionIds.has(q.id)) && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      Chọn tất cả
                    </button>
                    <div className="h-4 w-px bg-slate-200"></div>
                    <span className="text-sm font-bold text-slate-500">
                      Đang xem: <span className="text-slate-800">{selectedExam.title}</span>
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
                  {selectedExam.questions.map((q, idx) => {
                    const isSelected = selectedQuestionIds.has(q.id);
                    return (
                      <div 
                        key={q.id}
                        onClick={() => toggleQuestion(q.id)}
                        className={`group relative flex gap-4 p-5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-blue-50/50 border-blue-300 shadow-sm' 
                            : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-md'
                        }`}
                      >
                        <div className="pt-1">
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white group-hover:border-blue-400'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-600 uppercase tracking-wider">
                              Câu {idx + 1}
                            </span>
                            {q.cognitiveLevel && (
                              <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded">
                                {q.cognitiveLevel}
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded">
                              {q.points} điểm
                            </span>
                          </div>
                          
                          <div className="prose prose-sm prose-slate max-w-none mb-3 font-medium text-slate-800">
                            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                              {q.content}
                            </ReactMarkdown>
                          </div>
                          
                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                              {q.options.map((opt, oIdx) => {
                                const isCorrect = q.correctAnswer && (opt.startsWith(q.correctAnswer + '.') || opt.startsWith(q.correctAnswer + ' '));
                                return (
                                  <div key={oIdx} className={`px-3 py-2 rounded-xl text-sm border ${
                                    isCorrect 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' 
                                      : 'bg-slate-50 border-transparent text-slate-600'
                                  }`}>
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                      {opt}
                                    </ReactMarkdown>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2">
             <span className="text-sm text-slate-500">Đã chọn: <strong className="text-blue-600 text-lg mx-1">{stats.total}</strong> câu</span>
             <div className="h-4 w-px bg-slate-200 mx-2"></div>
             <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600">NB: {stats.nb}</span>
             <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600">TH: {stats.th}</span>
             <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600">VD: {stats.vd}</span>
             <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600">VDC: {stats.vdc}</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Huỷ bỏ
            </button>
            <button 
              onClick={handleAdd}
              disabled={stats.total === 0}
              className="px-6 py-2.5 rounded-xl font-black text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
            >
              Thêm vào đề thi <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
