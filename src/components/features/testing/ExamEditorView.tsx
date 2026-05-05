import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Loader2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppData, Exam, ExamQuestion, QuestionType } from '../../../types';
import { generateExamCode, calculateMaxScore } from '../../../lib/examParser';

interface ExamEditorViewProps {
  user: User;
  data: AppData;
  saveExam: (exam: Exam) => Promise<void>;
  showToast: (msg: string, type?: any) => void;
  onBack: () => void;
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

export const ExamEditorView = ({ user, data, saveExam, showToast, onBack }: ExamEditorViewProps) => {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(45);
  const [grade, setGrade] = useState('');
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');
  const [questions, setQuestions] = useState<ExamQuestion[]>([EMPTY_QUESTION()]);
  const [expandedId, setExpandedId] = useState<string>(questions[0]?.id ?? '');
  const [saving, setSaving] = useState(false);

  const updateQuestion = useCallback((id: string, patch: Partial<ExamQuestion>) => {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q));
  }, []);

  const addQuestion = () => {
    const q = EMPTY_QUESTION();
    setQuestions(qs => [...qs, q]);
    setExpandedId(q.id);
  };

  const removeQuestion = (id: string) => {
    setQuestions(qs => {
      const next = qs.filter(q => q.id !== id);
      return next.length > 0 ? next : [EMPTY_QUESTION()];
    });
  };

  const moveQuestion = (id: string, dir: -1 | 1) => {
    setQuestions(qs => {
      const i = qs.findIndex(q => q.id === id);
      if (i + dir < 0 || i + dir >= qs.length) return qs;
      const copy = [...qs];
      [copy[i], copy[i + dir]] = [copy[i + dir], copy[i]];
      return copy;
    });
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800 mb-4 flex items-center gap-1">
        ← Quay lại
      </button>

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
            onMoveUp={i > 0 ? () => moveQuestion(q.id, -1) : undefined}
            onMoveDown={i < questions.length - 1 ? () => moveQuestion(q.id, 1) : undefined}
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
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const QuestionCard = ({ question, num, isExpanded, onToggle, onChange, onRemove, onMoveUp, onMoveDown }: QuestionCardProps) => {
  const preview = question.content.slice(0, 80) || '(chưa có nội dung)';

  return (
    <div className={`bg-white rounded-2xl border transition-all ${isExpanded ? 'border-blue-300 shadow-sm' : 'border-slate-100'}`}>
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
            onClick={e => { e.stopPropagation(); onMoveUp?.(); }}
            disabled={!onMoveUp}
            className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-0"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onMoveDown?.(); }}
            disabled={!onMoveDown}
            className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-0"
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
            <label className="text-xs font-bold text-slate-500 block mb-1">Nội dung câu hỏi *</label>
            <textarea
              rows={3}
              value={question.content}
              onChange={e => onChange({ content: e.target.value })}
              placeholder="Nhập câu hỏi... (hỗ trợ LaTeX: $x^2$, **in đậm**)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
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
