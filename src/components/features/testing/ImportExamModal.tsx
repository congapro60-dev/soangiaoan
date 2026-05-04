import { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { ExamQuestion } from '../../../types';
import { parseExamFromFiles, summarizeQuestions, MAX_IMPORT_MB } from '../../../utils/examImportUtils';
import type { AppData } from '../../../types';

interface Props {
  onClose: () => void;
  onImport: (questions: ExamQuestion[], title: string) => void;
  settings: AppData['settings'];
  showToast: (msg: string, type?: any) => void;
}

type Step = 'upload' | 'parsing' | 'review';

export const ImportExamModal = ({ onClose, onImport, settings, showToast }: Props) => {
  const [step, setStep] = useState<Step>('upload');
  const [examFile, setExamFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [examTitle, setExamTitle] = useState('');
  const [error, setError] = useState('');

  const examRef = useRef<HTMLInputElement>(null);
  const answerRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined, type: 'exam' | 'answer') => {
    if (!file) return;
    if (file.size > MAX_IMPORT_MB * 1024 * 1024) {
      showToast(`File vượt quá ${MAX_IMPORT_MB}MB!`, 'error');
      return;
    }
    if (type === 'exam') {
      setExamFile(file);
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
      setExamTitle(nameWithoutExt);
    } else {
      setAnswerFile(file);
    }
  };

  const handleParse = async () => {
    if (!examFile) return;
    setStep('parsing');
    setError('');
    try {
      const parsed = await parseExamFromFiles(examFile, answerFile, settings);
      setQuestions(parsed);
      setStep('review');
    } catch (e: any) {
      setError(e.message || 'Có lỗi xảy ra khi phân tích đề.');
      setStep('upload');
    }
  };

  const handleConfirm = () => {
    if (questions.length === 0) return;
    onImport(questions, examTitle || 'Đề thi nhập từ file');
    onClose();
  };

  const summary = questions.length > 0 ? summarizeQuestions(questions) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-800">Nhập đề thi từ file</h2>
            <p className="text-sm text-slate-400 mt-0.5">AI tự động bóc tách câu hỏi và đáp án</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 border-b border-slate-100">
          {(['upload', 'parsing', 'review'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? 'bg-blue-600 text-white' :
                (step === 'review' && s !== 'review') || (step === 'parsing' && s === 'upload')
                  ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
              }`}>{i + 1}</div>
              <span className={`text-xs font-bold ${step === s ? 'text-blue-600' : 'text-slate-400'}`}>
                {s === 'upload' ? 'Tải file' : s === 'parsing' ? 'Phân tích' : 'Xem trước'}
              </span>
              {i < 2 && <ChevronRight className="w-3 h-3 text-slate-300" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-5">
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Exam file */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  File Đề thi <span className="text-red-400">*</span>
                  <span className="normal-case font-normal ml-1">(PDF, DOCX, TXT)</span>
                </label>
                <div
                  onClick={() => examRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0], 'exam'); }}
                  className={`relative border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all text-center ${
                    examFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  {examFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-bold text-emerald-700">{examFile.name}</span>
                      <button
                        onClick={e => { e.stopPropagation(); setExamFile(null); setExamTitle(''); }}
                        className="text-slate-400 hover:text-red-500 ml-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-500">Kéo thả hoặc click để chọn file đề thi</p>
                      <p className="text-xs text-slate-400 mt-1">Hỗ trợ PDF, DOCX, TXT — tối đa {MAX_IMPORT_MB}MB</p>
                    </>
                  )}
                  <input ref={examRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
                    onChange={e => handleFile(e.target.files?.[0], 'exam')} />
                </div>
              </div>

              {/* Answer file */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  File Đáp án <span className="font-normal normal-case">(tùy chọn — nếu đáp án đã nằm trong đề thì bỏ qua)</span>
                </label>
                <div
                  onClick={() => answerRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0], 'answer'); }}
                  className={`border-2 border-dashed rounded-2xl p-4 cursor-pointer transition-all text-center ${
                    answerFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50/20'
                  }`}
                >
                  {answerFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-bold text-emerald-700">{answerFile.name}</span>
                      <button onClick={e => { e.stopPropagation(); setAnswerFile(null); }} className="text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">Chọn file đáp án rời (PDF/DOCX)</span>
                    </div>
                  )}
                  <input ref={answerRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
                    onChange={e => handleFile(e.target.files?.[0], 'answer')} />
                </div>
              </div>

              {/* Title */}
              {examFile && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Tên đề thi</label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={e => setExamTitle(e.target.value)}
                    placeholder="VD: Đề thi HKII Toán 12 - Mã đề 101"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Parsing */}
          {step === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-slate-800">AI đang phân tích đề thi...</p>
                <p className="text-sm text-slate-400 mt-2">Đọc nội dung, nhận diện câu hỏi và ghép đáp án</p>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && summary && (
            <div className="space-y-4">
              {/* Summary chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Trắc nghiệm', value: summary.mcq, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Đúng/Sai', value: summary.trueFalse, color: 'bg-purple-50 text-purple-700' },
                  { label: 'Trả lời ngắn', value: summary.shortAnswer, color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Tự luận', value: summary.essay, color: 'bg-amber-50 text-amber-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`rounded-2xl p-3 text-center ${color}`}>
                    <p className="text-2xl font-black">{value}</p>
                    <p className="text-xs font-bold mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 rounded-2xl p-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Đã nhận diện <strong>{summary.total} câu hỏi</strong>, tổng điểm <strong>{summary.maxScore.toFixed(2)}</strong></span>
              </div>

              {/* Question list preview */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div key={q.id} className="bg-white border border-slate-100 rounded-xl p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        q.type === 'multiple_choice' ? 'bg-blue-100 text-blue-700' :
                        q.type === 'true_false' ? 'bg-purple-100 text-purple-700' :
                        q.type === 'short_answer' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {q.type === 'multiple_choice' ? 'TN' : q.type === 'true_false' ? 'Đ/S' : q.type === 'short_answer' ? 'Ngắn' : 'TL'}
                      </span>
                      <p className="flex-1 text-slate-700 font-medium line-clamp-2">{idx + 1}. {q.content}</p>
                      <span className="shrink-0 text-xs text-slate-400 font-bold">{q.points}đ</span>
                    </div>
                    {q.correctAnswer && (
                      <p className="text-xs text-emerald-600 font-bold mt-1.5 ml-7">✓ {q.correctAnswer}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800">Hủy</button>
          <div className="flex gap-3">
            {step === 'review' && (
              <button onClick={() => setStep('upload')} className="flex items-center gap-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-100">
                <ChevronLeft className="w-4 h-4" /> Tải lại file khác
              </button>
            )}
            {step === 'upload' && (
              <button
                onClick={handleParse}
                disabled={!examFile}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Loader2 className="w-4 h-4 hidden" /> Phân tích với AI →
              </button>
            )}
            {step === 'review' && (
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4" /> Tạo phòng thi với {questions.length} câu
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
