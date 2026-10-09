import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, Loader2, MessageCircleQuestion } from 'lucide-react';
import { MAX_PHOTO_TRIES, canonicalAnswer } from '../../../../lib/classroom/clarification';
import type { QuestionResult, SubmissionDoc } from '../../../../lib/classroom/types';
import { uploadClarifyPhotos } from '../../../../lib/classroom/submissionService';
import { submitClarifyAnswers, submitClarifyPhotos, type ClarifyAnswersResult, type ClarifyPhotoResult } from '../../../../services/gradingApi';

export interface ClarifyItem {
  submission: SubmissionDoc;
  title: string;
}

interface Props {
  items: readonly ClarifyItem[];
  /** Đã gửi xong một lượt: tải lại dữ liệu để câu vừa xác nhận biến khỏi danh sách. */
  onChanged: () => void;
}

const draftKey = (submissionId: string, questionNumber: string) => `smartplan:clarify:${submissionId}:${questionNumber}`;

const readDraft = (submissionId: string, questionNumber: string): string => {
  try { return window.localStorage.getItem(draftKey(submissionId, questionNumber)) || ''; } catch { return ''; }
};
const writeDraft = (submissionId: string, questionNumber: string, value: string) => {
  try {
    if (value) window.localStorage.setItem(draftKey(submissionId, questionNumber), value);
    else window.localStorage.removeItem(draftKey(submissionId, questionNumber));
  } catch { /* Trình duyệt khoá bộ nhớ: bản nháp chỉ mất khi tải lại trang, đáp án đã gửi vẫn nằm trên máy chủ. */ }
};

const choiceClass = (active: boolean) => `inline-flex min-h-12 min-w-12 flex-1 items-center justify-center rounded-2xl border px-4 py-2 text-base font-black transition active:scale-[0.97] ${
  active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
}`;

/** "a) Đ; b) S" → { a: 'Đ', b: 'S' }; nháp dở dang vẫn đọc được. */
const readTrueFalse = (value: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const item of value.split(';')) {
    const m = item.trim().match(/^([a-d])\)\s*([ĐS])$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
};

interface QuestionProps {
  submissionId: string;
  question: QuestionResult;
  busy: boolean;
  error: string;
  onConfirm: (questionNumber: string, answer: string) => void;
  onSkip: (questionNumber: string) => void;
  /** Câu tự luận: em chọn/chụp ảnh bài làm của câu này (hoặc bấm "thử lại" khi không kèm ảnh). */
  onPhotos: (questionNumber: string, files: File[]) => void;
}

const ClarifyQuestion = ({ submissionId, question, busy, error, onConfirm, onSkip, onPhotos }: QuestionProps) => {
  const clarify = question.clarify!;
  const [value, setValue] = useState(() => readDraft(submissionId, question.questionNumber));
  const update = (next: string) => { setValue(next); writeDraft(submissionId, question.questionNumber, next); };
  const ready = canonicalAnswer(clarify.kind, value, clarify.parts).ok;
  const parts = clarify.parts;
  const tf = readTrueFalse(value);
  const fileRef = useRef<HTMLInputElement>(null);
  const isPhoto = clarify.kind === 'photo';
  const regrading = clarify.state === 'regrading';
  const photoCount = clarify.photoUrls?.length ?? 0;
  const exhausted = (clarify.tries ?? 0) >= MAX_PHOTO_TRIES;

  return (
    <li className="rounded-2xl border border-amber-200 bg-white p-4">
      <p className="text-sm font-black text-slate-900">{question.questionNumber}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        {clarify.reading ? <>Máy đọc được: <span className="font-black text-slate-700">“{clarify.reading}”</span> — chưa chắc. </> : 'Máy chưa đọc được câu này. '}
        {isPhoto ? 'Em chụp lại đúng phần bài làm của câu này cho rõ nhé.' : 'Em chọn / gõ lại đáp án cho đúng ý em nhé.'}
      </p>
      {isPhoto && clarify.message && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-900">{clarify.message}</p>}
      {isPhoto && photoCount > 0 && <p className="mt-2 text-xs font-bold text-slate-500">Em đã gửi {photoCount} ảnh cho câu này — ảnh được giữ lại, em gửi thêm ảnh mới nếu cần.</p>}

      <div className="mt-3">
        {clarify.kind === 'mcq' && (
          <div className="flex gap-2" role="group" aria-label={`Đáp án ${question.questionNumber}`}>
            {['A', 'B', 'C', 'D'].map(letter => (
              <button key={letter} type="button" aria-pressed={value === letter} onClick={() => update(letter)} className={choiceClass(value === letter)}>{letter}</button>
            ))}
          </div>
        )}
        {clarify.kind === 'true_false' && parts && parts.length > 0 && (
          <div className="space-y-2">
            {parts.map(part => (
              <div key={part} className="flex items-center gap-2" role="group" aria-label={`Ý ${part}`}>
                <span className="w-8 shrink-0 text-sm font-black text-slate-600">{part})</span>
                {[{ code: 'Đ', label: 'Đúng' }, { code: 'S', label: 'Sai' }].map(option => (
                  <button
                    key={option.code}
                    type="button"
                    aria-pressed={tf[part] === option.code}
                    onClick={() => update(parts.map(p => (p === part ? `${p}) ${option.code}` : tf[p] ? `${p}) ${tf[p]}` : '')).filter(Boolean).join('; '))}
                    className={choiceClass(tf[part] === option.code)}
                  >{option.label}</button>
                ))}
              </div>
            ))}
          </div>
        )}
        {clarify.kind === 'true_false' && (!parts || parts.length === 0) && (
          <div className="flex gap-2" role="group" aria-label={`Đáp án ${question.questionNumber}`}>
            {['Đúng', 'Sai'].map(option => (
              <button key={option} type="button" aria-pressed={value === option} onClick={() => update(option)} className={choiceClass(value === option)}>{option}</button>
            ))}
          </div>
        )}
        {clarify.kind === 'short' && (
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={event => update(event.target.value)}
            placeholder="Gõ một con số, ví dụ 3,5"
            aria-label={`Đáp án ${question.questionNumber}`}
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-base font-bold text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        )}
      </div>

      {isPhoto && (
        <div className="mt-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={event => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = '';
              if (files.length > 0) onPhotos(question.questionNumber, files);
            }}
          />
          {regrading ? (
            <p className="flex items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-800" role="status">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> Máy đang đọc lại ảnh em chụp… Em chờ ở trang này một chút (thoát cũng không mất ảnh).
            </p>
          ) : clarify.state === 'photo_saved' ? (
            <button type="button" disabled={busy} onClick={() => onPhotos(question.questionNumber, [])} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Thử lại
            </button>
          ) : exhausted ? (
            <p className="text-xs font-bold leading-5 text-slate-500">Em đã chụp lại câu này nhiều lần rồi — em bấm "Để thầy cô xem" nhé.</p>
          ) : (
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} {busy ? 'Đang gửi ảnh…' : photoCount > 0 ? 'Gửi thêm ảnh câu này' : 'Chụp / chọn ảnh câu này'}
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-2 flex items-start gap-1.5 text-xs font-bold text-red-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {!isPhoto && (
          <button
            type="button"
            disabled={!ready || busy}
            onClick={() => onConfirm(question.questionNumber, value)}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Xác nhận câu này
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onSkip(question.questionNumber)}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Để thầy cô xem
        </button>
      </div>
    </li>
  );
};

/**
 * Bảng "Máy cần em xác nhận": câu máy đọc chưa chắc trong bài em vừa nộp. Mỗi câu xác nhận được LƯU NGAY lên máy chủ —
 * em thoát giữa chừng thì lần sau vào thấy đúng những câu còn lại, bài và ảnh không bị xoá.
 */
export const ClarifyPanel = ({ items, onChanged }: Props) => {
  const [busyKey, setBusyKey] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Máy đang chấm lại ảnh ở nền: tự tải lại để kết quả hiện ra mà em không phải bấm gì.
  const hasRegrading = items.some(({ submission }) => (submission.grade?.questionResults || []).some(q => q.clarify?.state === 'regrading'));
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  useEffect(() => {
    if (!hasRegrading) return undefined;
    const timer = window.setInterval(() => onChangedRef.current(), 4000);
    return () => window.clearInterval(timer);
  }, [hasRegrading]);

  if (items.length === 0) return null;

  const send = async (submissionId: string, questionNumber: string, run: () => Promise<ClarifyAnswersResult | ClarifyPhotoResult>) => {
    const key = `${submissionId}:${questionNumber}`;
    setBusyKey(key);
    setErrors(prev => ({ ...prev, [key]: '' }));
    try {
      const result = await run();
      const rejected = ('rejected' in result ? result.rejected : []).find(item => item.questionNumber === questionNumber || item.questionNumber === '');
      if (rejected) {
        setErrors(prev => ({ ...prev, [key]: rejected.reason }));
      } else {
        writeDraft(submissionId, questionNumber, '');
      }
      onChanged();
    } catch (error) {
      setErrors(prev => ({ ...prev, [key]: error instanceof Error ? error.message : 'Chưa gửi được. Kiểm tra mạng rồi bấm lại.' }));
    } finally {
      setBusyKey('');
    }
  };

  return (
    <section aria-labelledby="clarify-heading" className="rounded-[1.75rem] border-2 border-amber-300 bg-amber-50 p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white"><MessageCircleQuestion className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h2 id="clarify-heading" className="text-lg font-black text-slate-900">Máy cần em xác nhận vài câu</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-amber-900">
            Máy chưa đọc chắc một số câu trong bài em nộp. Em xác nhận xong thì điểm mới hiện. Em có thể thoát giữa chừng — bài và ảnh vẫn được lưu, lần sau vào em làm tiếp phần còn lại.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {items.map(({ submission, title }) => {
          const questions = (submission.grade?.questionResults || []).filter(q => q.clarify);
          return (
            <div key={submission.id}>
              <p className="text-xs font-black uppercase tracking-wide text-amber-800">{title} · còn {questions.length} câu</p>
              <ul className="mt-2 space-y-3">
                {questions.map(question => {
                  const key = `${submission.id}:${question.questionNumber}`;
                  return (
                    <ClarifyQuestion
                      key={key}
                      submissionId={submission.id}
                      question={question}
                      busy={busyKey === key}
                      error={errors[key] || ''}
                      onConfirm={(questionNumber, answer) => void send(submission.id, questionNumber, () => submitClarifyAnswers(submission.id, [{ questionNumber, answer }]))}
                      onSkip={questionNumber => void send(submission.id, questionNumber, () => submitClarifyAnswers(submission.id, [], [questionNumber]))}
                      onPhotos={(questionNumber, files) => void send(submission.id, questionNumber, async () => (
                        submitClarifyPhotos(submission.id, questionNumber, files.length > 0 ? await uploadClarifyPhotos(submission.id, files) : [])
                      ))}
                    />
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
};
