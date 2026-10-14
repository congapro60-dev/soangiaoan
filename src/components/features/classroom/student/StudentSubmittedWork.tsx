import { useEffect, useState } from 'react';
import type { SubmissionDoc } from '../../../../lib/classroom/types';
import { SubmissionPhotoReview } from '../SubmissionPhotoReview';
import { SubmissionFeedback } from '../SubmissionFeedback';
import { CorrectionAttempts } from '../CorrectionAttempts';
export const StudentSubmittedWork = ({ submissions, hideScores = false, feedbackSubmissionId, feedbackOpenRequest, onFeedbackChanged }: { submissions: SubmissionDoc[]; hideScores?: boolean; feedbackSubmissionId?: string; feedbackOpenRequest?: number; onFeedbackChanged?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [feedbackQuestion, setFeedbackQuestion] = useState<Record<string, { question: string; nonce: number }>>({});
  useEffect(() => { if (feedbackSubmissionId && feedbackOpenRequest) setFeedbackQuestion(values => ({ ...values, [feedbackSubmissionId]: { question: '', nonce: (values[feedbackSubmissionId]?.nonce || 0) + 1 } })); }, [feedbackSubmissionId, feedbackOpenRequest]);
  const attempts = [...submissions].sort((left, right) => left.createdAt.localeCompare(right.createdAt)).map(submission => {
    const metadata = new Map((submission.attachments ?? []).map(file => [file.url, file]));
    const clarifyPhotos = new Set(submission.grade?.questionResults?.flatMap(result => result.clarify?.photoUrls ?? []) ?? []);
    const files = [...new Set([...(submission.fileUrls ?? []), ...metadata.keys(), ...clarifyPhotos])].flatMap((url, index) => {
      try {
        const parsed = new URL(url); if (!['https:', 'http:'].includes(parsed.protocol)) return [];
        const file = metadata.get(url); const path = decodeURIComponent(parsed.pathname);
        const document = /\.(pdf|docx?)$/i.test(path) || file?.kind === 'pdf' || file?.kind === 'document' || /application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/i.test(file?.mimeType ?? '');
        const image = !document && (clarifyPhotos.has(url) || file?.kind === 'image' || file?.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic|avif)$/i.test(path));
        return [{ url, name: file?.name || `Tệp ${index + 1}`, image }];
      } catch { return []; }
    });
    return { submission, files };
  });
  const published = attempts.filter(({ submission }) => submission.grade?.teacherApproved === true && !submission.grade.awaitingClarification && !submission.grade.scoreHidden);
  if (!attempts.some(attempt => attempt.files.length) && !published.length) return null;
  return <section>
    {attempts.some(attempt => attempt.files.length) && <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-bold text-indigo-700">Xem bài đã nộp</summary>
    {open && <div className="space-y-4 border-t border-slate-200 p-3">{attempts.map(({ submission, files }, index) => {
      const images = files.filter(file => file.image).map(file => file.url);
      const approved = submission.grade?.teacherApproved === true && !submission.grade.awaitingClarification && !submission.grade.scoreHidden;
      return <section key={submission.id}><p className="mb-2 text-xs font-bold text-slate-600">Lượt {index + 1} · {new Date(submission.createdAt).toLocaleString('vi-VN')}</p>
        {!!images.length && <SubmissionPhotoReview imageUrl={images[0]} imageUrls={images} alt={`Bài đã nộp · lượt ${index + 1}`} questionResults={approved ? submission.grade?.questionResults ?? [] : []} approved={approved} grade={approved ? submission.grade : undefined} hideScores={hideScores} onFeedback={question => setFeedbackQuestion(values => ({ ...values, [submission.id]: { question: question || '', nonce: (values[submission.id]?.nonce || 0) + 1 } }))} />}
        {files.filter(file => !file.image).map(file => <a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer" className="block min-h-11 break-words px-2 py-3 text-sm font-bold text-indigo-700 underline">{file.name}</a>)}
      </section>;
    })}</div>}
  </details>}
    {published.map(({ submission }) => <section key={submission.id} aria-label={`Trao đổi và bài chữa · ${submission.id}`}>
      {published.length > 1 && <p className="mt-3 text-xs font-bold text-slate-600">Bài nộp {new Date(submission.createdAt).toLocaleString('vi-VN')}</p>}
      <SubmissionFeedback submission={submission} questionNumber={feedbackQuestion[submission.id]?.question} openRequest={feedbackQuestion[submission.id]?.nonce} onChanged={onFeedbackChanged} />
      <CorrectionAttempts submission={submission} />
    </section>)}
  </section>;
};
