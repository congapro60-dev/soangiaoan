import { useState } from 'react';
import type { SubmissionDoc } from '../../../../lib/classroom/types';
import { SubmissionPhotoReview } from '../SubmissionPhotoReview';

export const StudentSubmittedWork = ({ submissions }: { submissions: SubmissionDoc[] }) => {
  const [open, setOpen] = useState(false);
  const attempts = [...submissions].sort((left, right) => left.createdAt.localeCompare(right.createdAt)).map(submission => {
    const metadata = new Map((submission.attachments ?? []).map(file => [file.url, file]));
    const clarifyPhotos = new Set(submission.grade?.questionResults?.flatMap(result => result.clarify?.photoUrls ?? []) ?? []);
    const files = [...new Set([...(submission.fileUrls ?? []), ...metadata.keys(), ...clarifyPhotos])].flatMap((url, index) => {
      try {
        const parsed = new URL(url);
        if (!['https:', 'http:'].includes(parsed.protocol)) return [];
        const file = metadata.get(url);
        const path = decodeURIComponent(parsed.pathname);
        const document = /\.(pdf|docx?)$/i.test(path) || file?.kind === 'pdf' || file?.kind === 'document'
          || /application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/i.test(file?.mimeType ?? '');
        const image = !document && (clarifyPhotos.has(url) || file?.kind === 'image' || file?.mimeType?.startsWith('image/')
          || /\.(png|jpe?g|webp|gif|heic|avif)$/i.test(path));
        return [{ url, name: file?.name || `Tệp ${index + 1}`, image }];
      } catch {
        return [];
      }
    });
    return { submission, files };
  });
  if (!attempts.some(attempt => attempt.files.length)) return null;

  return (
    <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50" onToggle={event => setOpen(event.currentTarget.open)}>
      <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-bold text-indigo-700">Xem bài đã nộp</summary>
      {open && <div className="space-y-4 border-t border-slate-200 p-3">
        {attempts.map(({ submission, files }, index) => <section key={submission.id}>
          <p className="mb-2 text-xs font-bold text-slate-600">Lượt {index + 1} · {new Date(submission.createdAt).toLocaleString('vi-VN')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {files.map((file, fileIndex) => {
              const approved = submission.grade?.teacherApproved === true && !submission.grade.awaitingClarification && !submission.grade.scoreHidden;
              return <div key={file.url} className="min-w-0 rounded-xl bg-white p-2">
                {file.image ? <SubmissionPhotoReview imageUrl={file.url} alt={`Bài đã nộp · lượt ${index + 1} · ảnh ${fileIndex + 1}`}
                  questionResults={approved ? submission.grade?.questionResults ?? [] : []} approved={approved} />
                  : <a href={file.url} target="_blank" rel="noopener noreferrer" className="block min-h-11 break-words px-2 py-3 text-sm font-bold text-indigo-700 underline">{file.name}</a>}
              </div>;
            })}
          </div>
        </section>)}
      </div>}
    </details>
  );
};
