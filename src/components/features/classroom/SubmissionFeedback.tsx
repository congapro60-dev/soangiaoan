import { useEffect, useRef, useState } from 'react';
import { scoreHiddenFromStudent } from '../../../lib/classroom/portalViewModel';
import type { SubmissionDoc, SubmissionFeedbackDoc } from '../../../lib/classroom/types';
import { submissionFeedback, sendSubmissionFeedback, replySubmissionFeedback, readSubmissionFeedback, type SubmissionActorCredentials } from '../../../services/submissionActorsApi';
interface Props { submission: SubmissionDoc; credentials?: SubmissionActorCredentials; questionNumber?: string; openRequest?: number; onEditGrade?: () => void; onChanged?: () => void }
const readDraft = (key: string) => { try { return sessionStorage.getItem(key) || ''; } catch { return ''; } };
/** Gắn đúng lượt nộp; khóa bài không khóa trao đổi. Không tự đổi điểm khi gửi. */
export const SubmissionFeedback = ({ submission, credentials = {}, questionNumber, openRequest, onEditGrade, onChanged }: Props) => {
  const teacher = credentials.role === 'teacher';
  const scope = `${submission.teacherId}:${submission.studentId}:${submission.id}:${teacher ? 'teacher' : 'student'}`;
  return <FeedbackForm key={scope} {...{ submission, credentials, questionNumber, openRequest, onEditGrade, onChanged }} scope={scope} />;
};
const FeedbackForm = ({ submission, credentials = {}, questionNumber, openRequest, onEditGrade, onChanged, scope }: Props & { scope: string }) => {
  const teacher = credentials.role === 'teacher';
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SubmissionFeedbackDoc[]>([]);
  const [message, setMessage] = useState(() => readDraft(`smartplan:feedback:${scope}`));
  const [question, setQuestion] = useState(questionNumber || '');
  const [reply, setReply] = useState<Record<string, string>>(() => { try { const value: unknown = JSON.parse(readDraft(`smartplan:feedback-replies:${scope}`) || '{}'); return value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([, text]) => typeof text === 'string')) : {}; } catch { return {}; } });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { if (!teacher) return; try { sessionStorage.setItem(`smartplan:feedback-replies:${scope}`, JSON.stringify(reply)); } catch { /* nháp giữ trong màn hình */ } }, [reply, scope, teacher]);
  const alive = useRef(true);
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const published = Boolean(submission.grade) && !scoreHiddenFromStudent(submission) && !submission.grade?.awaitingClarification;
  useEffect(() => { if (openRequest) { setQuestion(questionNumber || ''); setOpen(true); } }, [questionNumber, openRequest]);
  useEffect(() => { if (open && openRequest) sectionRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, [open, openRequest]);
  useEffect(() => {
    if (!open) return;
    let current = true;
    setBusy(true); setError('');
    submissionFeedback(submission.id, credentials).then(async result => {
      if (!current) return;
      setItems(result.feedback); setLoaded(true);
      if (!teacher && submission.feedbackSummary?.lastReplyAt) { await readSubmissionFeedback(submission.id, submission.feedbackSummary.lastReplyAt); if (current) onChanged?.(); }
    }).catch(reason => { if (current) setError(reason instanceof Error ? reason.message : 'Chưa tải được phản hồi.'); }).finally(() => { if (current) setBusy(false); });
    return () => { current = false; };
  }, [open, submission.id]);
  const update = (text: string) => { setMessage(text); try { sessionStorage.setItem(`smartplan:feedback:${scope}`, text); } catch { /* nháp giữ trong màn hình */ } };
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await action(); const result = await submissionFeedback(submission.id, credentials); if (!alive.current) return; setItems(result.feedback); setLoaded(true); onChanged?.(); }
    catch (reason) { if (!alive.current) return; setError(reason instanceof Error ? reason.message : 'Chưa gửi được. Bản nháp vẫn được giữ.'); }
    finally { if (alive.current) setBusy(false); }
  };
  if (!teacher && !published) return null;
  return <section ref={sectionRef} className="mt-3 scroll-mt-20 rounded-xl border border-indigo-200 bg-white p-3" aria-label="Phản hồi bài chấm">
    <button type="button" className="flex min-h-11 w-full flex-wrap items-center gap-2 text-left text-sm font-black text-indigo-800" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      {teacher ? 'Trao đổi với học sinh' : 'Phản hồi bài chấm'}
      {submission.feedbackSummary?.pending ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900">{submission.feedbackSummary.pending} chờ trả lời</span> : null}
      {!teacher && submission.feedbackSummary?.lastReplyAt && submission.feedbackSummary.lastReplyAt > (submission.feedbackReadAt || '') && <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs">Có trả lời mới</span>}
    </button>
    {open && <div className="space-y-3">
      <p className="text-xs leading-5 text-slate-500">Trao đổi về đúng lượt nộp này. Gửi phản hồi không tự thay đổi điểm hoặc bài làm.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {busy && <p role="status" className="text-xs text-slate-500">Đang xử lý…</p>}
      {loaded && !items.length && <p className="text-xs text-slate-500">Chưa có phản hồi.</p>}
      {items.map(item => <article key={item.id} className="space-y-2 rounded-lg border border-slate-200 p-3">
        <p className="text-xs font-bold text-slate-500">{item.questionNumber || 'Cả bài'} · {item.status === 'resolved' ? 'Đã giải quyết' : item.status === 'answered' ? 'Đã trả lời' : 'Chờ trả lời'}</p>
        {item.messages.map(entry => <div key={entry.id} className={entry.role === 'teacher' ? 'rounded-lg bg-indigo-50 p-2' : 'rounded-lg bg-slate-50 p-2'}><p className="text-xs font-bold">{entry.role === 'teacher' ? 'Thầy cô' : 'Học sinh'} · {new Date(entry.at).toLocaleString('vi-VN')}</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{entry.text}</p></div>)}
        {teacher && <div><label className="block text-xs font-bold">Trả lời học sinh<textarea disabled={busy} maxLength={2000} value={reply[item.id] || ''} onChange={event => setReply(values => ({ ...values, [item.id]: event.target.value }))} className="mt-1 min-h-24 w-full rounded-lg border p-2 text-sm" /></label>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !reply[item.id]?.trim()} className="min-h-11 rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white disabled:opacity-50" onClick={() => void run(async () => { await replySubmissionFeedback(credentials, submission.id, item.id, reply[item.id]); setReply(values => ({ ...values, [item.id]: '' })); })}>Gửi trả lời</button>
            <button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-sm font-bold" onClick={() => void run(() => replySubmissionFeedback(credentials, submission.id, item.id, reply[item.id] || '', true))}>Đánh dấu đã giải quyết</button>
            {onEditGrade && <button type="button" onClick={onEditGrade} className="min-h-11 rounded-lg border px-3 text-sm font-bold">Mở sửa điểm</button>}</div></div>}
      </article>)}
      {!teacher && <form onSubmit={event => { event.preventDefault(); if (!message.trim() || busy) return; void run(async () => { await sendSubmissionFeedback(submission.id, message.trim(), question || undefined); update(''); }); }}>
        <label className="block text-xs font-bold">Nội dung phản hồi<select disabled={busy} aria-label="Câu cần phản hồi" value={question} onChange={event => setQuestion(event.target.value)} className="my-2 block min-h-11 w-full rounded-lg border p-2 text-sm"><option value="">Cả bài</option>{submission.grade?.questionResults?.map(row => <option key={row.questionNumber} value={row.questionNumber}>{row.questionNumber}</option>)}</select>
          <textarea disabled={busy} aria-label="Lời nhắn phản hồi" maxLength={2000} value={message} onChange={event => update(event.target.value)} className="min-h-28 w-full rounded-lg border p-3 text-sm leading-6" placeholder="Em thấy chỗ nào cần thầy cô kiểm tra hoặc giải thích thêm?" /></label>
        <div className="mt-2 flex items-center justify-between"><span className="text-xs text-slate-500">{message.length}/2000</span><button type="submit" disabled={busy || !message.trim()} className="min-h-11 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-50">Gửi thầy cô</button></div>
      </form>}
    </div>}
  </section>;
};
