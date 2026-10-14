import { useEffect, useRef, useState } from 'react';
import { Camera, MessageSquareText } from 'lucide-react';
import type { CorrectionAttemptDoc, SubmissionDoc } from '../../../lib/classroom/types';
import { scoreHiddenFromStudent } from '../../../lib/classroom/portalViewModel';
import { nenAnhBaiLam } from '../../../utils/imageCompress';
import { listCorrectionAttempts, saveCorrectionAttempt, reviewCorrectionAttempt, uploadActorEvidence, type SubmissionActorCredentials } from '../../../services/submissionActorsApi';
import { NhanXetMarkdown } from './NhanXetMarkdown';

interface Props { submission: SubmissionDoc; credentials?: SubmissionActorCredentials }
export const CorrectionAttempts = ({ submission, credentials = {} }: Props) => {
  const teacher = credentials.role === 'teacher';
  const visible = Boolean(submission.grade) && !scoreHiddenFromStudent(submission) && !submission.grade?.awaitingClarification;
  if (!visible && !teacher) return null;
  return <CorrectionWork key={submission.studentId + ':' + submission.id + ':' + (teacher ? 'teacher' : 'student')} submission={submission} credentials={credentials} />;
};
const outcomes = { achieved: 'Đã đạt', needs_work: 'Cần sửa thêm', uncertain: 'Chưa đủ căn cứ' } as const;
const CorrectionWork = ({ submission, credentials = {} }: Props) => {
  const teacher = credentials.role === 'teacher';
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [attempts, setAttempts] = useState<CorrectionAttemptDoc[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const alive = useRef(true);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file)); setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);
  useEffect(() => {
    if (!open) return;
    let current = true;
    listCorrectionAttempts(submission.id, credentials).then(result => { if (current) setAttempts(result.attempts); })
      .catch(reason => { if (current) setError(reason instanceof Error ? reason.message : 'Chưa tải được bài chữa.'); });
    return () => { current = false; };
  }, [open, submission.id]);
  useEffect(() => {
    if (!attempts.some(attempt => attempt.status === 'reviewing')) return;
    const timer = window.setInterval(() => {
      void listCorrectionAttempts(submission.id, credentials).then(result => { if (alive.current) setAttempts(result.attempts); }).catch(() => {});
    }, 4000);
    return () => window.clearInterval(timer);
  }, [attempts, submission.id]);
  const save = async () => {
    if (busy || !files.length) return;
    setBusy('save'); setError('');
    try {
      if (files.length > 12 || files.some(file => !file.type.startsWith('image/') || !file.size || file.size >= 20 * 1024 * 1024)) throw new Error('Chọn từ 1 đến 12 ảnh, mỗi ảnh nhỏ hơn 20 MB.');
      const prepared = await Promise.all(files.map(async (file, index) => {
        const data = await nenAnhBaiLam(file), match = data.match(/^data:([^;,]+);base64,(.+)$/s);
        if (!match) throw new Error('Không đọc được ảnh bài chữa. Chọn ảnh rõ hơn rồi thử lại.');
        return new File([Uint8Array.from(atob(match[2]), char => char.charCodeAt(0))], 'bai-chua-' + (index + 1) + '.jpg', { type: match[1] });
      }));
      const grant = await uploadActorEvidence({}, submission.assignmentId || null, prepared, { purpose: 'correction', submissionId: submission.id });
      const result = await saveCorrectionAttempt(submission.id, grant, note);
      if (!alive.current) return;
      setAttempts(values => [result.attempt, ...values]); setFiles([]); setNote('');
    } catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : 'Chưa lưu được. Ảnh đã chọn vẫn được giữ.'); }
    finally { if (alive.current) setBusy(''); }
  };
  const review = async (attempt: CorrectionAttemptDoc) => {
    if (busy) return;
    setBusy(attempt.id); setError('');
    try {
      const result = await reviewCorrectionAttempt(submission.id, attempt.id);
      if (alive.current) setAttempts(values => values.map(value => value.id === result.attempt.id ? result.attempt : value));
    } catch (reason) { if (alive.current) { setAttempts(values => values.map(value => value.id === attempt.id ? { ...value, status: 'error' } : value)); setError(reason instanceof Error ? reason.message : 'Chưa đánh giá xong. Ảnh đã lưu, em có thể thử lại.'); } }
    finally { if (alive.current) setBusy(''); }
  };
  return <section className="mt-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3" aria-label="Bài chữa và làm lại">
    <div className="flex flex-wrap items-center gap-2"><button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-teal-900"><MessageSquareText className="h-4 w-4" />Bài chữa / làm lại</button>
      {!teacher && <button type="button" disabled={!!busy} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-bold text-white" onClick={() => { setOpen(true); fileRef.current?.click(); }}><Camera className="h-4 w-4" />Chụp ảnh bài chữa</button>}</div>
    {!teacher && <input ref={fileRef} disabled={!!busy} type="file" accept="image/*" multiple className="hidden" aria-label="Ảnh bài chữa" onChange={event => { const selected = Array.from(event.target.files ?? []); setFiles(values => [...values, ...selected]); event.target.value = ''; }} />}
    {open && <div className="space-y-3"><p className="text-xs leading-5 text-teal-900">Bài chữa lưu riêng để theo dõi tiến bộ. Đánh giá chỉ nhận xét, không chấm lại hoặc thay điểm bài gốc.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!!files.length && <div className="space-y-2 rounded-lg bg-white p-3"><div className="flex flex-wrap gap-2">{files.map((file, index) => <div key={index} className="w-24"><img src={previews[index]} alt={'Ảnh chữa đã chọn ' + (index + 1)} className="h-24 w-full rounded-lg object-contain" /><button type="button" disabled={!!busy} className="min-h-11 text-xs font-bold text-red-700" onClick={() => setFiles(values => values.filter((_, i) => i !== index))}>Bỏ ảnh {index + 1}</button></div>)}</div>
        <label className="block text-xs font-bold">Em đã chữa phần nào?<textarea disabled={!!busy} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border p-2 text-sm" /></label>
        <button type="button" disabled={!!busy} onClick={() => void save()} className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-bold text-white disabled:opacity-50">{busy === 'save' ? 'Đang lưu…' : 'Lưu ảnh bài chữa'}</button></div>}
      {attempts.map((attempt, index) => <article key={attempt.id} className="space-y-3 rounded-lg border border-teal-100 bg-white p-3"><p className="text-xs font-bold text-slate-600">Lượt chữa {attempts.length - index} · {new Date(attempt.createdAt).toLocaleString('vi-VN')}</p>
        <div className="flex gap-2 overflow-x-auto">{attempt.fileUrls.map((url, number) => <a key={url} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={'Bài chữa ảnh ' + (number + 1)} loading="lazy" className="h-32 w-auto rounded-lg" /></a>)}</div>
        {attempt.note && <p className="whitespace-pre-wrap text-sm text-slate-700">{attempt.note}</p>}
        {attempt.assessment && <div className="space-y-2"><p className="text-sm font-black text-teal-900">{outcomes[attempt.assessment.outcome]}</p><NhanXetMarkdown>{attempt.assessment.feedback}</NhanXetMarkdown></div>}
        {!teacher && attempt.status !== 'reviewed' && <button type="button" disabled={!!busy || attempt.status === 'reviewing'} onClick={() => void review(attempt)} className="min-h-11 rounded-lg border border-teal-300 bg-teal-50 px-3 text-sm font-bold text-teal-900 disabled:opacity-50">{busy === attempt.id || attempt.status === 'reviewing' ? 'AI đang đọc bài chữa…' : attempt.status === 'error' ? 'Thử đánh giá bài chữa lại' : 'Đánh giá bài chữa'}</button>}
      </article>)}
      {!attempts.length && !files.length && <p className="text-sm text-slate-600">Chưa có ảnh bài chữa được lưu.</p>}
    </div>}
  </section>;
};
