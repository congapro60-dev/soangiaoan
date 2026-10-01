import { useEffect, useState } from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import type { QuestionResult, QuestionResultStatus } from '../../../lib/classroom/types';
import { isBlankAnswer, parseExpectedAnswer, rescoreQuestion, type ObjectiveAnswer } from '../../../lib/classroom/questionRescore';

interface Props {
  rows: QuestionResult[];
  /** Bảng lúc mở hộp — để biết câu nào thầy cô vừa đổi đáp án. */
  original: QuestionResult[];
  /** Bài nộp gắn với một bài giao thì mới sửa đáp án cho cả lớp được. */
  canFixForClass: boolean;
  classFixes: ReadonlySet<string>;
  onChange: (rows: QuestionResult[]) => void;
  onToggleClassFix: (questionNumber: string) => void;
}

const STATUS: Record<QuestionResultStatus, { label: string; className: string }> = {
  correct: { label: 'Đúng', className: 'bg-emerald-50 text-emerald-700' },
  partially_correct: { label: 'Đúng một phần', className: 'bg-amber-50 text-amber-700' },
  incorrect: { label: 'Sai', className: 'bg-red-50 text-red-700' },
  unreadable: { label: 'Chưa đọc rõ', className: 'bg-slate-100 text-slate-600' },
  not_attempted: { label: 'Bỏ trống', className: 'bg-slate-100 text-slate-600' },
};

const KIND: Record<ObjectiveAnswer['kind'], { label: string; mau: string }> = {
  mcq: { label: 'Trắc nghiệm', mau: 'C' },
  true_false: { label: 'Đúng/Sai', mau: 'a) Đ; b) S; c) Đ; d) S' },
  true_false_single: { label: 'Đúng/Sai', mau: 'Đ' },
  numeric: { label: 'Trả lời ngắn', mau: '-1,5' },
};

const O = 'w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400';

const statusForScore = (score: number, q: QuestionResult): QuestionResultStatus => {
  if (score >= q.maxScore) return 'correct';
  if (score > 0) return 'partially_correct';
  return isBlankAnswer(q.studentAnswer) ? 'not_attempted' : 'incorrect';
};

/** Ô điểm giữ chữ đang gõ ("0," "0.") — chỉ nhận số khi gõ xong một số hợp lệ. */
const ScoreInput = ({ value, max, label, onCommit }: { value: number; max: number; label: string; onCommit: (text: string) => void }) => {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText(prev => (Number(prev) === value ? prev : String(value)));
  }, [value]);
  return (
    <input
      type="number" min={0} max={max} step={0.05}
      value={text}
      onChange={e => { setText(e.target.value); onCommit(e.target.value); }}
      aria-label={label}
      className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-right text-sm font-black outline-none focus:border-blue-400"
    />
  );
};

/**
 * Bảng từng câu sửa được. Ba lỗi thường gặp đều sửa ngay tại đây:
 *  - máy đọc nhầm bài em (tô rồi tẩy, chữ mờ) → sửa ô "Em làm";
 *  - đáp án máy sai → sửa ô "Đáp án", tick "cả lớp" nếu cả lớp cùng bị;
 *  - cho điểm sai (tự luận) → sửa thẳng ô điểm.
 * Câu trắc nghiệm / Đúng-Sai / trả lời ngắn tự tính lại điểm, không tốn lượt AI.
 */
export const QuestionResultsEditor = ({ rows, original, canFixForClass, classFixes, onChange, onToggleClassFix }: Props) => {
  const capNhat = (index: number, next: QuestionResult) => onChange(rows.map((q, i) => (i === index ? next : q)));

  const suaChu = (index: number, field: 'studentAnswer' | 'expectedAnswer', value: string) => {
    const edited = { ...rows[index], [field]: value };
    capNhat(index, rescoreQuestion(edited, 'teacher') || edited);
  };

  const suaDiem = (index: number, value: string) => {
    const q = rows[index];
    const raw = Number(value);
    if (value === '' || !Number.isFinite(raw)) return;
    const score = Math.min(Math.max(raw, 0), q.maxScore);
    capNhat(index, { ...q, score, status: statusForScore(score, q) });
  };

  return (
    <section aria-label="Kết quả từng câu">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-black text-slate-800">Kết quả từng câu</p>
        <p className="text-xs font-semibold text-slate-500">
          Sửa <b>Em làm</b> khi máy đọc nhầm, sửa <b>Đáp án</b> khi đáp án sai, hoặc sửa thẳng điểm câu.
          Trắc nghiệm, Đúng/Sai, trả lời ngắn tự tính lại điểm.
        </p>
      </div>
      <div className="space-y-2">
        {rows.map((q, index) => {
          const kind = parseExpectedAnswer(q.expectedAnswer)?.kind;
          const tuTinh = kind && !q.ignoredByTeacherInstruction ? rescoreQuestion(q, 'teacher') !== null : false;
          const goc = original[index];
          const doiDapAn = goc && goc.expectedAnswer.trim() !== q.expectedAnswer.trim() && q.expectedAnswer.trim() !== '';
          const st = STATUS[q.status] || STATUS.unreadable;
          return (
            <div key={`${q.questionNumber}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3" data-question={q.questionNumber}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-slate-800">{q.questionNumber}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${st.className}`}>{st.label}</span>
                {kind && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-700">
                    {KIND[kind].label}{tuTinh ? ' · tự tính' : ''}
                  </span>
                )}
                {q.teacherEdited && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-black text-violet-700">Đã soát tay</span>}
                {q.needsTeacherReview && <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Cần thầy cô xem lại" />}
                <label className="ml-auto flex items-center gap-1 text-xs font-black text-slate-600">
                  Điểm
                  <ScoreInput value={q.score} max={q.maxScore} label={`Điểm ${q.questionNumber}`} onCommit={text => suaDiem(index, text)} />
                  <span className="text-slate-400">/ {q.maxScore}</span>
                </label>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Em làm</span>
                  <textarea
                    rows={q.studentAnswer.length > 60 ? 3 : 1}
                    value={q.studentAnswer}
                    onChange={e => suaChu(index, 'studentAnswer', e.target.value)}
                    aria-label={`Em làm ${q.questionNumber}`}
                    className={O}
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Đáp án</span>
                  <textarea
                    rows={q.expectedAnswer.length > 60 ? 3 : 1}
                    value={q.expectedAnswer}
                    onChange={e => suaChu(index, 'expectedAnswer', e.target.value)}
                    aria-label={`Đáp án ${q.questionNumber}`}
                    className={O}
                  />
                </label>
              </div>
              {kind && !tuTinh && !q.ignoredByTeacherInstruction && (
                <p className="mt-1 text-xs font-bold text-amber-700">
                  Máy chưa đọc được bài em theo khuôn — ghi lại lựa chọn của em, ví dụ "{KIND[kind].mau}", để tự tính điểm.
                </p>
              )}
              {doiDapAn && canFixForClass && (
                <label className="mt-2 flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={classFixes.has(q.questionNumber)}
                    onChange={() => onToggleClassFix(q.questionNumber)}
                    className="mt-0.5"
                  />
                  <span>
                    <Users className="mr-1 inline h-3.5 w-3.5" />
                    Đáp án gốc sai — sửa đáp án <b>{q.questionNumber}</b> cho <b>cả lớp</b> (tính lại câu này ở mọi bài đã chấm,
                    bài đã duyệt vẫn giữ duyệt; lượt chấm sau dùng đáp án mới).
                  </span>
                </label>
              )}
              {q.explanation.trim() && (
                <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-500" title={q.explanation}>{q.explanation}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
