import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Loader2,
  Image as ImageIcon, XCircle, FileImage, Scissors
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject, uploadString } from 'firebase/storage';
import { storage } from '../../../lib/firebase';
import { User } from 'firebase/auth';
import { AppData, Exam, ExamQuestion, QuestionType } from '../../../types';
import { generateExamCode, calculateMaxScore } from '../../../lib/examParser';
import { ManualCropModal } from './ManualCropModal';

interface ExamEditorViewProps {
  user: User;
  data: AppData;
  saveExam: (exam: Exam) => Promise<void>;
  showToast: (msg: string, type?: any) => void;
  onBack: () => void;
  pageImages?: string[];
}

const EMPTY_QUESTION = (): ExamQuestion => ({
  id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type: 'multiple_choice',
  content: '',
  options: ['', '', '', ''],
  correctAnswer: 'A',
  points: 1,
});

const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Trắc nghiệm (MCQ)' },
  { value: 'true_false', label: 'Đúng / Sai' },
  { value: 'short_answer', label: 'Trả lời ngắn' },
  { value: 'essay', label: 'Tự luận' },
];

const TYPE_SHORT: Record<QuestionType, string> = {
  multiple_choice: 'MCQ', true_false: 'ĐS', short_answer: 'Ngắn', essay: 'TL',
};

const serializeToText = (qs: ExamQuestion[]): string =>
  qs.map((q, i) => {
    const lines = [`# Câu ${i + 1} — ${TYPE_SHORT[q.type]} — ${q.points} điểm`, q.content || ''];
    if (q.type === 'multiple_choice' && q.options) {
      ['A', 'B', 'C', 'D'].forEach((l, j) => { if (q.options![j] !== undefined) lines.push(`${l}. ${q.options![j]}`); });
    }
    if (q.type !== 'essay' && q.correctAnswer) lines.push(`Đáp án: ${q.correctAnswer}`);
    if (q.explanation) lines.push(`Giải thích: ${q.explanation}`);
    return lines.join('\n');
  }).join('\n\n---\n\n');

const parseFromText = (text: string, existingIds: string[]): ExamQuestion[] => {
  const blocks = text.split(/\n\s*---\s*\n/).map(b => b.trim()).filter(Boolean);
  if (blocks.length === 0) throw new Error('Không tìm thấy câu hỏi nào');
  return blocks.map((block, i) => {
    const lines = block.split('\n');
    const m = lines[0]?.match(/^#\s*Câu\s+\d+\s*[—–-]\s*(\S+)\s*[—–-]\s*([\d.]+)/);
    if (!m) throw new Error(`Câu ${i + 1}: dòng đầu phải có dạng "# Câu N — MCQ — X điểm"`);
    const typeStr = m[1].toLowerCase();
    const points = parseFloat(m[2]) || 1;
    let type: QuestionType;
    if (typeStr === 'mcq') type = 'multiple_choice';
    else if (typeStr === 'đs') type = 'true_false';
    else if (typeStr === 'ngắn') type = 'short_answer';
    else type = 'essay';
    let content = '', correctAnswer = '', explanation = '';
    const options: string[] = [];
    for (let j = 1; j < lines.length; j++) {
      const line = lines[j];
      const optM = line.match(/^([ABCD])\.\s*(.*)/);
      if (optM) { options.push(optM[2]); continue; }
      if (line.startsWith('Đáp án: ')) { correctAnswer = line.slice(8).trim(); continue; }
      if (line.startsWith('Giải thích: ')) { explanation = line.slice(12).trim(); continue; }
      content += (content ? '\n' : '') + line;
    }
    const q: ExamQuestion = {
      id: existingIds[i] ?? `q-${Date.now()}-${i}`,
      type, content: content.trim(), points,
    };
    if (correctAnswer) q.correctAnswer = correctAnswer;
    if (explanation) q.explanation = explanation;
    if (type === 'multiple_choice') q.options = options.length === 4 ? options : ['', '', '', ''];
    return q;
  });
};

export const ExamEditorView = ({ user, data, saveExam, showToast, onBack, pageImages }: ExamEditorViewProps) => {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(45);
  const [grade, setGrade] = useState('');
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');
  const initialQ = [EMPTY_QUESTION()];
  const [questions, setQuestions] = useState<ExamQuestion[]>(initialQ);
  const [expandedId, setExpandedId] = useState<string>(initialQ[0].id);
  const [saving, setSaving] = useState(false);
  const [croppingId, setCroppingId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState(() => serializeToText(initialQ));
  const [parseError, setParseError] = useState<string | null>(null);

  const updateQuestion = useCallback((id: string, patch: Partial<ExamQuestion>) => {
    setQuestions(prev => {
      const next = prev.map(q => q.id === id ? { ...q, ...patch } : q);
      setTextDraft(serializeToText(next));
      return next;
    });
  }, []);

  const addQuestion = () => {
    const q = EMPTY_QUESTION();
    setQuestions(prev => { const next = [...prev, q]; setTextDraft(serializeToText(next)); return next; });
    setExpandedId(q.id);
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => {
      const next = prev.filter(q => q.id !== id);
      const result = next.length > 0 ? next : [EMPTY_QUESTION()];
      setTextDraft(serializeToText(result));
      return result;
    });
  };

  const moveQuestion = (id: string, dir: -1 | 1) => {
    setQuestions(prev => {
      const i = prev.findIndex(q => q.id === id);
      if (i + dir < 0 || i + dir >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[i + dir]] = [copy[i + dir], copy[i]];
      setTextDraft(serializeToText(copy));
      return copy;
    });
  };

  const handleTextChange = (newText: string) => {
    setTextDraft(newText);
    try {
      const parsed = parseFromText(newText, questions.map(q => q.id));
      setQuestions(parsed);
      setParseError(null);
      setExpandedId(id => parsed.some(q => q.id === id) ? id : (parsed[0]?.id ?? ''));
    } catch (e: any) {
      setParseError(e.message);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { showToast('Vui lòng nhập tiêu đề đề thi', 'warning'); return; }
    const validQuestions = questions.filter(q => q.content.trim());
    if (validQuestions.length === 0) { showToast('Cần ít nhất 1 câu hỏi có nội dung', 'warning'); return; }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const exam: Exam = {
        id: `exam-${Date.now()}`,
        code: generateExamCode(),
        title: title.trim(),
        subjectId,
        grade: grade.trim() || undefined,
        teacherId: user.uid,
        teacherName: data.authorName || user.displayName || 'Giáo viên',
        questions: validQuestions,
        durationMinutes: duration,
        maxScore: calculateMaxScore(validQuestions),
        isActive: false,
        allowReview: true,
        shuffleQuestions: false,
        createdAt: now,
        updatedAt: now,
        tfScoringMode: 'thpt2025', // Default to 2025 standard for new exams
      };
      await saveExam(exam);
      showToast(`Đã tạo đề "${exam.title}" với ${validQuestions.length} câu hỏi!`);
      onBack();
    } catch (err: any) {
      showToast('Lỗi lưu đề: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[1400px] mx-auto">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800 mb-4 flex items-center gap-1">
        ← Quay lại
      </button>

      {/* Manual Crop Modal */}
      <AnimatePresence>
        {croppingId && pageImages && pageImages.length > 0 && (
          <ManualCropModal
            pageImages={pageImages}
            onClose={() => setCroppingId(null)}
            onCrop={async (base64) => {
              const path = `exam-images/${Date.now()}_manual_${croppingId}.jpg`;
              const storageRef = ref(storage, path);
              await uploadString(storageRef, base64.split(',')[1], 'base64', { contentType: 'image/jpeg' });
              const url = await getDownloadURL(storageRef);
              updateQuestion(croppingId, { imageUrl: url });
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex gap-5 items-start">
        {/* ── Left panel: card editor ── */}
        <div className="flex-1 min-w-0">
          {/* Meta */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4 space-y-4">
            <h2 className="text-sm font-black text-slate-700">Thông tin đề thi</h2>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Tiêu đề *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="VD: Kiểm tra 15 phút Toán 10"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Môn học</label>
                <select
                  value={subjectId}
                  onChange={e => setSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {data.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Thời gian (phút)</label>
                <input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value) || 45)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Khối</label>
                <input
                  type="text"
                  value={grade}
                  onChange={e => setGrade(e.target.value)}
                  placeholder="VD: 10"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-3 mb-4">
            {questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                num={i + 1}
                isExpanded={expandedId === q.id}
                onToggle={() => setExpandedId(expandedId === q.id ? '' : q.id)}
                onChange={patch => updateQuestion(q.id, patch)}
                onRemove={() => removeQuestion(q.id)}
                onMove={dir => moveQuestion(q.id, dir)}
                onStartCrop={() => setCroppingId(q.id)}
                hasPageImages={!!pageImages && pageImages.length > 0}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={addQuestion}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 rounded-xl text-sm font-bold transition-all"
            >
              <Plus className="w-4 h-4" /> Thêm câu hỏi
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{questions.filter(q => q.content.trim()).length} câu có nội dung</span>
              <span>•</span>
              <span>Tổng {calculateMaxScore(questions.filter(q => q.content.trim()))} điểm</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu đề thi
            </button>
          </div>
        </div>

        {/* ── Right panel: text editor ── */}
        <div className="w-80 xl:w-96 shrink-0 self-start sticky top-4">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
              <span className="text-xs font-black text-slate-600 flex-1">Chỉnh sửa văn bản</span>
              {parseError && (
                <span className="text-[10px] font-bold text-red-500 truncate max-w-[160px]" title={parseError}>
                  ⚠ {parseError}
                </span>
              )}
            </div>
            <textarea
              value={textDraft}
              onChange={e => handleTextChange(e.target.value)}
              spellCheck={false}
              className="w-full font-mono text-[11px] px-4 py-3 outline-none resize-none bg-slate-50 leading-relaxed"
              style={{ height: '560px' }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2 px-1 leading-relaxed">
            Định dạng: <code># Câu N — MCQ/ĐS/Ngắn/TL — X điểm</code><br />
            A. Phương án A &nbsp;•&nbsp; Đáp án: A<br />
            Phân cách câu bằng dòng <code>---</code>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ─── QuestionCard ─────────────────────────────────────────────────────────────

interface QuestionCardProps {
  question: ExamQuestion;
  num: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ExamQuestion>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onStartCrop?: () => void;
  hasPageImages: boolean;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const QuestionCard = ({ question, num, isExpanded, onToggle, onChange, onRemove, onMove, onStartCrop, hasPageImages }: QuestionCardProps) => {
  const preview = question.content.slice(0, 80) || '(chưa có nội dung)';
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          // Reuse upload function if possible or local preview
          onChange({ imageUrl: base64 }); // Temporary preview, ideally upload here
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div 
      onPaste={handlePaste}
      className={`bg-white rounded-2xl border transition-all ${isExpanded ? 'border-blue-300 shadow-sm' : 'border-slate-100'}`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 shrink-0">
          Câu {num}
        </span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 shrink-0">
          {TYPE_OPTIONS.find(t => t.value === question.type)?.label.split(' ')[0] ?? question.type}
        </span>
        <span className="text-sm text-slate-600 flex-1 truncate">{preview}</span>
        <span className="text-xs font-bold text-slate-400 shrink-0">{question.points} đ</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onMove(-1); }}
            className="p-1 text-slate-300 hover:text-slate-600"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onMove(1); }}
            className="p-1 text-slate-300 hover:text-slate-600"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="p-1 text-slate-300 hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {/* Image Preview if exists */}
      {!isExpanded && question.imageUrl && (
        <div className="px-4 pb-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
            <img src={question.imageUrl} alt="preview" className="w-full h-full object-cover" />
          </div>
          <span className="text-[10px] text-slate-400 font-medium italic">Có ảnh minh họa đính kèm</span>
        </div>
      )}

      {/* Body */}
      {isExpanded && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Loại câu hỏi</label>
              <select
                value={question.type}
                onChange={e => {
                  const type = e.target.value as QuestionType;
                  const patch: Partial<ExamQuestion> = { type };
                  if (type === 'multiple_choice') {
                    patch.options = question.options?.length === 4 ? question.options : ['', '', '', ''];
                    patch.correctAnswer = 'A';
                  } else if (type === 'true_false') {
                    patch.options = undefined;
                    patch.correctAnswer = 'Đúng';
                  } else {
                    patch.options = undefined;
                    patch.correctAnswer = '';
                  }
                  onChange(patch);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Điểm</label>
              <input
                type="number"
                min={0.25}
                step={0.25}
                value={question.points}
                onChange={e => onChange({ points: parseFloat(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-500">Nội dung câu hỏi *</label>
                 {hasPageImages && (
                   <button 
                    onClick={onStartCrop}
                    className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg text-[10px] font-bold transition-all border border-transparent hover:border-purple-200"
                   >
                     <Scissors className="w-3.5 h-3.5" /> Cắt từ PDF
                   </button>
                 )}

                 <label className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg cursor-pointer transition-all border border-transparent hover:border-blue-100">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">Tải ảnh</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const path = `exams/${Date.now()}_${file.name}`;
                          const storageRef = ref(storage, path);
                          await uploadBytes(storageRef, file);
                          const url = await getDownloadURL(storageRef);
                          onChange({ imageUrl: url });
                        } catch (err) {
                          console.error("Upload error", err);
                        }
                      }}
                    />
                 </label>
                 {question.imageUrl && (
                   <button 
                    onClick={() => onChange({ imageUrl: undefined })}
                    className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-[10px] font-bold"
                   >
                     <XCircle className="w-3.5 h-3.5" /> Xóa ảnh
                   </button>
                 )}
              </div>
            <textarea
              rows={3}
              value={question.content}
              onChange={e => onChange({ content: e.target.value })}
              onPaste={async (e) => {
                const item = e.clipboardData.items[0];
                if (item?.type.startsWith('image/')) {
                  const file = item.getAsFile();
                  if (!file) return;
                  try {
                    const path = `exam-images/${Date.now()}_paste_${question.id}.jpg`;
                    const storageRef = ref(storage, path);
                    await uploadBytes(storageRef, file);
                    const url = await getDownloadURL(storageRef);
                    onChange({ imageUrl: url });
                  } catch (err) {
                    console.error("Paste upload failed", err);
                  }
                }
              }}
              placeholder="Nhập câu hỏi... (hỗ trợ LaTeX: $x^2$, **in đậm**, Dán ảnh Ctrl+V)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            
            {question.imageUrl && (
              <div className="mt-3 relative group w-fit max-w-full">
                <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                  <img src={question.imageUrl} alt="Question illustration" className="max-h-64 object-contain bg-slate-50" />
                </div>
              </div>
            )}
          </div>

          {/* MCQ options */}
          {question.type === 'multiple_choice' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 block">Các lựa chọn</label>
              {(question.options ?? ['', '', '', '']).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                    question.correctAnswer === OPTION_LABELS[i]
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}>{OPTION_LABELS[i]}</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => {
                      const opts = [...(question.options ?? ['', '', '', ''])];
                      opts[i] = e.target.value;
                      onChange({ options: opts });
                    }}
                    placeholder={`Phương án ${OPTION_LABELS[i]}`}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => onChange({ correctAnswer: OPTION_LABELS[i] })}
                    className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg transition-all ${
                      question.correctAnswer === OPTION_LABELS[i]
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                    }`}
                  >
                    ✓ Đúng
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* True/False */}
          {question.type === 'true_false' && (
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-2">Đáp án đúng</label>
              <div className="flex gap-3">
                {(['Đúng', 'Sai'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => onChange({ correctAnswer: v })}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                      question.correctAnswer === v
                        ? v === 'Đúng' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Short answer correct */}
          {question.type === 'short_answer' && (
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Đáp án đúng</label>
              <input
                type="text"
                value={question.correctAnswer ?? ''}
                onChange={e => onChange({ correctAnswer: e.target.value })}
                placeholder="Nhập đáp án chính xác"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Giải thích (tùy chọn)</label>
            <textarea
              rows={2}
              value={question.explanation ?? ''}
              onChange={e => onChange({ explanation: e.target.value || undefined })}
              placeholder="Giải thích đáp án..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
