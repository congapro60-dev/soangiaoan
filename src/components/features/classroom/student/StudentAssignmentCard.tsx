import { AlertTriangle, CalendarClock, Camera, CheckCircle2, Clock3, FileText, Loader2, MessageCircle, RotateCcw } from 'lucide-react';
import { NhanXetMarkdown } from '../NhanXetMarkdown';
import { QuestionResultsList } from '../QuestionResultsList';
import type { AssignmentDoc, SubmissionDoc } from '../../../../lib/classroom/types';
import type { StudentAssignmentState } from '../../../../lib/classroom/portalViewModel';

interface Props {
  assignment: AssignmentDoc;
  submission?: SubmissionDoc;
  state: StudentAssignmentState;
  uploading: boolean;
  onUpload: (assignmentId: string, supplementOf?: string) => void;
  onOpen: (assignment: AssignmentDoc, submission?: SubmissionDoc) => void;
}

const statusMeta: Record<StudentAssignmentState['status'], { label: string; className: string; icon: typeof Clock3 }> = {
  todo: { label: 'Cần nộp', className: 'bg-indigo-50 text-indigo-700', icon: Camera },
  waiting: { label: 'Đang chờ chấm', className: 'bg-amber-50 text-amber-700', icon: Clock3 },
  grading: { label: 'Đang chấm', className: 'bg-blue-50 text-blue-700', icon: Loader2 },
  retry: { label: 'Cần nộp lại', className: 'bg-red-50 text-red-700', icon: RotateCcw },
  graded: { label: 'Đã chấm', className: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  'self-submitted': { label: 'Đã nộp', className: 'bg-slate-100 text-slate-600', icon: CheckCircle2 },
};

const dueLabel = (iso?: string): { label: string; className: string } => {
  if (!iso) return { label: 'Không đặt hạn', className: 'text-slate-400' };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { label: 'Hạn chưa rõ', className: 'text-slate-400' };
  const label = `Hạn ${date.toLocaleDateString('vi-VN')} · ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  if (date.getTime() < Date.now()) return { label: `${label} · Quá hạn`, className: 'text-red-600' };
  if (date.getTime() - Date.now() < 24 * 60 * 60 * 1000) return { label: `${label} · Sắp hết hạn`, className: 'text-amber-600' };
  return { label, className: 'text-slate-500' };
};

const STUDENT_GRADING_ERROR_COPY = 'Bài đã được nhận nhưng kết quả chấm chưa hoàn tất. Em chưa cần nộp lại ảnh; thầy/cô sẽ chấm lại hoặc kiểm tra bài.';

export const StudentAssignmentCard = ({ assignment, submission, state, uploading, onUpload, onOpen }: Props) => {
  const meta = statusMeta[state.status];
  const StatusIcon = meta.icon;
  const due = dueLabel(assignment.dueAt);
  const isUploadAction = state.action === 'submit' || state.action === 'retry';
  const canSupplement = state.canResubmit && Boolean(submission?.id);
  const handleAction = () => {
    if (isUploadAction) onUpload(assignment.id);
    else onOpen(assignment, submission);
  };

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${meta.className}`}>
          <StatusIcon className={`h-3.5 w-3.5 ${state.status === 'grading' ? 'animate-spin' : ''}`} />
          {meta.label}
        </span>
        {submission?.grade?.editedByTeacher && (
          <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700">GV đã sửa điểm</span>
        )}
        <span className={`ml-auto inline-flex items-center gap-1 text-xs font-bold ${due.className}`}>
          <CalendarClock className="h-3.5 w-3.5" /> {due.label}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-black leading-6 text-slate-900 sm:text-lg">{assignment.title}</h3>
          {assignment.description && (
            <p className="mt-1 whitespace-pre-line break-words text-sm font-medium leading-6 text-slate-600">{assignment.description}</p>
          )}
          {(assignment.attachments || []).length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Đề bài thầy cô giao</p>
              {/* Ảnh hiện THẲNG ra chứ không chỉ là cái tên file: em mở bài là thấy đề ngay,
                  không phải đoán cái pill kia là gì rồi mới bấm. Bấm vào ảnh thì mở cỡ lớn. */}
              <div className="flex flex-wrap gap-2">
                {(assignment.attachments || []).map(file => (
                  /\.(png|jpe?g|webp|gif)$/i.test(file.name) ? (
                    <a key={file.url} href={file.url} target="_blank" rel="noreferrer" title={`Mở ${file.name} cỡ lớn`}
                       className="block overflow-hidden rounded-2xl ring-1 ring-slate-200 transition hover:ring-indigo-400">
                      <img src={file.url} alt={`Đề bài: ${file.name}`} loading="lazy"
                           className="h-40 w-auto max-w-full object-contain bg-slate-50 sm:h-52" />
                    </a>
                  ) : (
                    <a key={file.url} href={file.url} target="_blank" rel="noreferrer"
                       className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100">
                      <FileText className="h-4 w-4 shrink-0" /> <span className="break-all">{file.name}</span>
                    </a>
                  )
                ))}
              </div>
            </div>
          )}
          {state.status === 'retry' && (
            <p className="mt-3 flex items-start gap-2 text-sm font-bold text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {STUDENT_GRADING_ERROR_COPY}
            </p>
          )}
          {state.status === 'graded' && submission?.grade && (
            <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-black text-emerald-800">
                <CheckCircle2 className="h-4 w-4" /> {submission.grade.score}/{submission.grade.maxScore} điểm
              </p>
              {submission.grade.feedback && (
                <div className="mt-1"><NhanXetMarkdown tone="sang">{submission.grade.feedback}</NhanXetMarkdown></div>
              )}
              <QuestionResultsList results={submission.grade.questionResults} compact />
            </div>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
          <button
            type="button"
            onClick={handleAction}
            disabled={uploading}
            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:w-auto ${
              isUploadAction
                ? state.status === 'retry' ? 'border border-red-200 bg-white text-red-700 hover:bg-red-50' : 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
            }`}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : isUploadAction ? <Camera className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
            {uploading ? 'Đang nộp...' : state.label}
          </button>
          {/* Nút phụ nộp lại: bài đã chấm/đang chờ vẫn phải tạo được lần nộp mới khi phản
              hồi yêu cầu chụp lại — đây chính là P1 của báo cáo QA cổng học sinh 22/08. */}
          {state.canResubmit && (
            <button
              type="button"
              onClick={() => onUpload(assignment.id, canSupplement ? submission?.id : undefined)}
              disabled={uploading}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm font-black text-indigo-700 transition hover:bg-indigo-50 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              <Camera className="h-4 w-4" /> {canSupplement ? 'Bổ sung ảnh và chấm lại' : 'Bổ sung ảnh'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
