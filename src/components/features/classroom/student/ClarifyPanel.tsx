import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, Loader2, MessageCircleQuestion } from 'lucide-react';
import { MAX_PHOTO_TRIES, canonicalAnswer } from '../../../../lib/classroom/clarification';
import type { QuestionResult, SubmissionDoc } from '../../../../lib/classroom/types';
import { SubmissionPhotoReview } from '../SubmissionPhotoReview';
import { actorClarifyAnswers, actorClarifyPhoto, uploadActorEvidence, type SubmissionActorCredentials } from '../../../../services/submissionActorsApi';
import type { ClarifyAnswersResult, ClarifyPhotoResult } from '../../../../services/gradingApi';

export interface ClarifyItem {
  submission: SubmissionDoc;
  title: string;
}

interface Props {
  items: readonly ClarifyItem[];
  /** Đã gửi xong một lượt: tải lại dữ liệu để câu vừa xác nhận biến khỏi danh sách. */
  onChanged: () => void;
  pollingExternally?: boolean;
  credentials?: SubmissionActorCredentials;
  locked?: boolean;
}

const draftKey = (submissionId: string, questionNumber: string) => `smartplan:clarify:${submissionId}:${questionNumber}`;
/** Thầy cô / phụ huynh và học sinh dùng cùng trình duyệt vẫn không lẫn nháp của nhau. */
const draftScopeFor = (credentials: SubmissionActorCredentials, submissionId: string) =>
  credentials.role === 'teacher' ? 'teacher:' + submissionId : credentials.role === 'parent' ? 'parent:' + submissionId : submissionId;

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

const questionKey = (submissionId: string, questionNumber: string) => `${submissionId}:${questionNumber}`;
/** Khoá cho một lượt gửi NHIỀU câu (bảng gửi theo thứ tự câu nên khoá ổn định trong một lượt). */
const batchKey = (submissionId: string, questionNumbers: readonly string[]) => `${submissionId}:${questionNumbers.join(',')}`;

interface QuestionProps {
  submissionId: string;
  submission: SubmissionDoc;
  credentials: SubmissionActorCredentials;
  question: QuestionResult;
  /** Đáp án em đang gõ cho câu này (giữ ở bảng, không phải ở từng ô) — bấm "Lưu hết" mới gửi một lượt. */
  value: string;
  onValue: (questionNumber: string, answer: string) => void;
  busy: boolean;
  error: string;
  /** Câu tự luận: em chọn/chụp ảnh bài làm của câu này (hoặc bấm "thử lại" khi không kèm ảnh). */
  onPhotos: (questionNumber: string, files: File[]) => void;
}

const ClarifyQuestion = ({ submissionId, submission, credentials, question, value, onValue, busy, error, onPhotos }: QuestionProps) => {
  const clarify = question.clarify!;
  const images = [...new Set([...(submission.attachments ?? []).filter(file => file.kind === 'image').map(file => file.url), ...(submission.fileUrls ?? []).filter(url => !/\.(pdf|docx?)(?:\?|$)/i.test(url)), ...(clarify.photoUrls ?? [])])];
  const update = (next: string) => onValue(question.questionNumber, next);
  const parts = clarify.parts;
  const tf = readTrueFalse(value);
  const fileRef = useRef<HTMLInputElement>(null);
  const isPhoto = clarify.kind === 'photo';
  const regrading = clarify.state === 'regrading';
  const photoCount = clarify.photoUrls?.length ?? 0;
  const exhausted = (clarify.tries ?? 0) >= MAX_PHOTO_TRIES;

  return (
    <li className="grid min-w-0 gap-3 rounded-2xl border border-amber-200 bg-white p-3 md:grid-cols-2">
      {images.length > 0 && <SubmissionPhotoReview imageUrl={images[0]} imageUrls={images} alt={`Đối chiếu ${question.questionNumber}`} questionResults={[question]} pending selectedQuestion={question.questionNumber} detailHidden />}
      <div className="min-w-0">
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
      </div>
    </li>
  );
};

/**
 * Bảng "Máy cần em xác nhận": câu máy đọc chưa chắc trong bài em vừa nộp. Em trả lời bao nhiêu câu cũng được rồi bấm
 * "Lưu tất cả" MỘT LẦN (máy chủ chấm cả lượt trong một giao dịch) — không phải chờ mạng sau từng câu.
 * Em thoát giữa chừng thì lần sau vào thấy đúng những câu còn lại, bài và ảnh không bị xoá.
 */
export const ClarifyPanel = ({ items, onChanged, pollingExternally = false, credentials = {}, locked = false }: Props) => {
  const [busyKey, setBusyKey] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Đáp án em đang gõ (trước khi bấm "Lưu tất cả"); nháp đồng thời ghi xuống localStorage để tải lại trang không mất.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draftOf = (submissionId: string, questionNumber: string) => drafts[questionKey(submissionId, questionNumber)] ?? readDraft(draftScopeFor(credentials, submissionId), questionNumber);
  const setDraft = (submissionId: string, questionNumber: string, answer: string) => {
    setDrafts(prev => ({ ...prev, [questionKey(submissionId, questionNumber)]: answer }));
    writeDraft(draftScopeFor(credentials, submissionId), questionNumber, answer);
  };
  const skipAll = (submission: SubmissionDoc, questions: readonly QuestionResult[]) => {
    if (questions.length === 0) return;
    void send(submission.id, questions.map(q => q.questionNumber), () => actorClarifyAnswers(credentials, submission.id, [], questions.map(q => q.questionNumber)));
  };

  // Máy đang chấm lại ảnh ở nền: tự tải lại để kết quả hiện ra mà em không phải bấm gì.
  const hasRegrading = items.some(({ submission }) => (submission.grade?.questionResults || []).some(q => q.clarify?.state === 'regrading'));
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  useEffect(() => {
    if (!hasRegrading || pollingExternally) return undefined;
    const timer = window.setInterval(() => onChangedRef.current(), 4000);
    return () => window.clearInterval(timer);
  }, [hasRegrading, pollingExternally]);

  if (items.length === 0) return null;
  if (locked) return <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">GV đã khóa chốt. Vẫn xem được ảnh; cần GV mở khóa trước khi xác nhận lại.</p>;

  const send = async (submissionId: string, questionNumbers: string[], run: () => Promise<ClarifyAnswersResult | ClarifyPhotoResult>) => {
    const key = batchKey(submissionId, questionNumbers);
    setBusyKey(key);
    setErrors(prev => ({ ...prev, [key]: '' }));
    try {
      const result = await run();
      const rejected = 'rejected' in result ? result.rejected : [];
      if (rejected.length > 0) {
        setErrors(prev => {
          const next = { ...prev, [key]: rejected.find(item => item.questionNumber === '')?.reason || 'Một số câu chưa lưu được — xem dòng đỏ ở câu đó.' };
          for (const item of rejected) if (item.questionNumber) next[questionKey(submissionId, item.questionNumber)] = item.reason;
          return next;
        });
      }
      // Câu đã lưu thì xoá bản nháp (cả phần bị từ chối — gõ lại cho đúng); câu chưa gửi vẫn giữ nguyên.
      const scope = draftScopeFor(credentials, submissionId);
      for (const questionNumber of questionNumbers) { writeDraft(scope, questionNumber, ''); setDrafts(prev => { const next = { ...prev }; delete next[questionKey(submissionId, questionNumber)]; return next; }); }
      onChanged();
    } catch (error) {
      setErrors(prev => ({ ...prev, [key]: error instanceof Error ? error.message : 'Chưa gửi được. Kiểm tra mạng rồi bấm lại.' }));
    } finally {
      setBusyKey('');
    }
  };

  /** Gửi MỌI câu em đã trả lời trong một lượt; câu chưa trả lời giữ lại để em làm tiếp. */
  const saveAll = (submission: SubmissionDoc, questions: readonly QuestionResult[]) => {
    const answers = questions
      .filter(q => q.clarify && q.clarify.kind !== 'photo' && canonicalAnswer(q.clarify.kind, draftOf(submission.id, q.questionNumber), q.clarify.parts).ok)
      .map(q => ({ questionNumber: q.questionNumber, answer: draftOf(submission.id, q.questionNumber) }));
    if (answers.length === 0) return;
    void send(submission.id, answers.map(answer => answer.questionNumber), () => actorClarifyAnswers(credentials, submission.id, answers));
  };

  return (
    <section aria-labelledby="clarify-heading" className="rounded-[1.75rem] border-2 border-amber-300 bg-amber-50 p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white"><MessageCircleQuestion className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h2 id="clarify-heading" className="text-lg font-black text-slate-900">Máy cần em xác nhận vài câu</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-amber-900">
            Máy chưa đọc chắc một số câu trong bài em nộp. Em trả lời hết một lượt rồi bấm “Lưu tất cả” là xong — không phải chờ từng câu. Chờ thầy cô duyệt xong thì điểm mới hiện. Em có thể thoát giữa chừng: bài, ảnh và những gì đã lưu vẫn còn, lần sau vào em làm tiếp phần còn lại.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {items.map(({ submission, title }) => {
          const questions = (submission.grade?.questionResults || []).filter(q => q.clarify && ['open', 'photo_saved', 'regrading'].includes(q.clarify.state));
          const typed = questions.filter(q => q.clarify!.kind !== 'photo');
          const photos = questions.filter(q => q.clarify!.kind === 'photo');
          const answered = typed.filter(q => canonicalAnswer(q.clarify!.kind, draftOf(submission.id, q.questionNumber), q.clarify!.parts).ok).length;
          const saving = busyKey === batchKey(submission.id, typed.map(q => q.questionNumber)) || busyKey === batchKey(submission.id, questions.map(q => q.questionNumber));
          const saveError = errors[batchKey(submission.id, typed.map(q => q.questionNumber))] || '';
          return (
            <div key={submission.id}>
              <p className="text-xs font-black uppercase tracking-wide text-amber-800">{title} · còn {questions.length} câu</p>
              {/* Câu tự luận đứng trên cùng: ảnh bài chấm chiếm chỗ, để dưới thì ô chọn đáp án bị đẩy khỏi màn hình. */}
              {photos.length > 0 && (
                <ul className="mt-2 space-y-3">
                  {photos.map(question => (
                    <ClarifyQuestion
                      key={question.questionNumber}
                      submissionId={submission.id}
                      submission={submission} credentials={credentials}
                      question={question}
                      value="" onValue={() => undefined}
                      busy={busyKey === questionKey(submission.id, question.questionNumber)}
                      error={errors[questionKey(submission.id, question.questionNumber)] || ''}
                      onPhotos={(questionNumber, files) => void send(submission.id, [questionNumber], async () => (
                        actorClarifyPhoto(credentials, submission.id, questionNumber, files.length > 0 ? await uploadActorEvidence(credentials, submission.assignmentId, files, { purpose: 'clarification', submissionId: submission.id, questionNumber }) : undefined)
                      ))}
                    />
                  ))}
                </ul>
              )}
              {typed.length > 0 && (
                <details open className="group mt-3 rounded-2xl border border-amber-200 bg-white">
                  <summary className="cursor-pointer list-none px-3 py-2 text-sm font-black text-slate-700 select-none">
                    Chọn đáp án {typed.length} câu <span className="text-xs font-bold text-slate-500">(đã chọn {answered}/{typed.length})</span>
                  </summary>
                  <ul className="space-y-2 border-t border-amber-100 p-3">
                    {typed.map(question => {
                      const key = questionKey(submission.id, question.questionNumber);
                      return (
                        <li key={key} className="min-w-0">
                          <ClarifyQuestion
                            key={key}
                            submissionId={submission.id}
                            submission={submission} credentials={credentials}
                            question={question}
                            value={draftOf(submission.id, question.questionNumber)}
                            onValue={(questionNumber, answer) => setDraft(submission.id, questionNumber, answer)}
                            busy={saving}
                            error={errors[key] || ''}
                            onPhotos={() => undefined}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </details>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={saving || answered === 0}
                  onClick={() => saveAll(submission, typed)}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Lưu tất cả{answered > 0 ? ` (${answered}/${typed.length})` : ''}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => skipAll(submission, questions)}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Để thầy cô xem hết
                </button>
              </div>
              {saveError && <p className="mt-2 flex items-start gap-1.5 text-xs font-bold text-red-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{saveError}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
};
