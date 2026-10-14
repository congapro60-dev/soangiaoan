import { useEffect, useRef, useState } from 'react';
import type { StudentAssignmentView, SubmissionDoc } from '../../../lib/classroom/types';
import { actorAssignments, actorAssignmentDetail, actorAnswerExamCode, type SubmissionActorCredentials } from '../../../services/submissionActorsApi';
import { ActorSubmissionUpload } from './ActorSubmissionUpload';
import { SubmissionPhotoReview } from './SubmissionPhotoReview';
import { QuestionResultsList } from './QuestionResultsList';
import { ClarifyPanel } from './student/ClarifyPanel';
import { isActionableClarifyQuestion } from '../../../lib/classroom/clarification';
import { latestSubmissionByAssignment } from '../../../lib/classroom/portalViewModel';
import { submissionDeadlineState } from '../../../lib/classroom/hanNop';
import { Camera, ChevronRight, Search } from 'lucide-react';
/** Parent credentials never become the student Firebase session. */
export const ParentAssignmentWorkspace = ({ credentials }: { credentials: SubmissionActorCredentials }) => {
  const [assignments, setAssignments] = useState<StudentAssignmentView[]>([]);
  const [summaries, setSummaries] = useState<SubmissionDoc[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<{ assignment: StudentAssignmentView; submissions: SubmissionDoc[] }>();
  const [selected, setSelected] = useState('');
  const [upload, setUpload] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadRequest, setReloadRequest] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);
  const focusedAssignment = useRef('');
  const focusedUpload = useRef<string | null>(null);
  const request = useRef(0);
  const uploadIntent = useRef<{ assignmentId: string; base: string } | null>(null);
  const selectedRef = useRef(selected); selectedRef.current = selected;
  useEffect(() => () => { ++request.current; }, []);
  useEffect(() => {
    let current = true;
    actorAssignments(credentials).then(result => { if (current) { setAssignments(result.assignments); setSummaries(result.submissions || []); } }).catch(reason => { if (current) setError(reason.message); });
    return () => { current = false; };
  }, []);
  useEffect(() => {
    if (!selected) return;
    let current = true; const ticket = ++request.current; setBusy(true); setError(''); setDetail(undefined); setUpload(null);
    actorAssignmentDetail(credentials, selected).then(result => {
      if (!current || ticket !== request.current) return;
      setDetail(result);
      if (uploadIntent.current?.assignmentId === selected) {
        if (!result.assignment.submissionLocked && result.assignment.type !== 'exam' && result.assignment.deliveryMode !== 'online') setUpload(uploadIntent.current.base);
        else setError('GV đã khóa chốt. Cần mở khóa trước khi nộp.');
        uploadIntent.current = null;
      }
    }).catch(reason => { if (current) setError(reason.message); }).finally(() => { if (current && ticket === request.current) setBusy(false); });
    return () => { current = false; };
  }, [selected, reloadRequest]);
  useEffect(() => { if (!busy && selected && detail?.assignment.id === selected && (focusedAssignment.current !== selected || upload !== null && focusedUpload.current !== upload)) { detailRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); detailRef.current?.focus({ preventScroll: true }); focusedAssignment.current = selected; } focusedUpload.current = upload; }, [selected, busy, upload, detail]);
  const openAssignment = (id: string) => {
    if (selected === id) {
      if (detail?.assignment.id === id) detailRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      else setReloadRequest(value => value + 1);
    } else setSelected(id);
  };
  const refresh = async () => { const target = selected; const ticket = request.current; if (!target) return; try { const result = await actorAssignmentDetail(credentials, target); if (ticket === request.current && selectedRef.current === target) { setDetail(result); setAssignments(values => values.map(item => item.id === target ? result.assignment : item)); setSummaries(values => [...values.filter(item => item.assignmentId !== target), ...result.submissions]); } } catch (reason) { if (ticket === request.current && selectedRef.current === target) setError(reason instanceof Error ? reason.message : 'Chưa tải lại được bài.'); } };
  const directUpload = (assignment: StudentAssignmentView, base = '') => {
    if (assignment.submissionLocked || assignment.type === 'exam' || assignment.deliveryMode === 'online' || busy) return;
    if (selected === assignment.id && detail?.assignment.id === assignment.id) { setUpload(base); detailRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    uploadIntent.current = { assignmentId: assignment.id, base };
    openAssignment(assignment.id);
  };
  const latest = latestSubmissionByAssignment(summaries);
  const filtered = assignments.filter(item => item.title.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN')));
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 20)));
  useEffect(() => { if (!detail?.submissions.some(submission => submission.status === 'submitted' || submission.status === 'grading' || submission.grade?.questionResults?.some(question => question.clarify?.state === 'regrading'))) return; const timer = window.setInterval(() => { void refresh().catch(reason => setError(reason.message)); }, 4000); return () => window.clearInterval(timer); }, [detail, selected]);
  return <section className="space-y-3" aria-label="Bài tập của con">
    {error && <div><p role="alert" className="text-sm text-red-700">{error}</p>{selected && !detail && <button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-sm font-bold" onClick={() => setReloadRequest(value => value + 1)}>Thử tải bài lại</button>}</div>}
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4"><h1 className="text-lg font-black text-indigo-950">Bài tập của con</h1><p className="mt-1 text-sm text-indigo-800">{assignments.length} bài · Nộp ảnh và đối chiếu cùng thầy cô</p></div>
    <label className="relative block"><span className="sr-only">Tìm bài tập của con</span><Search className="absolute left-3 top-3.5 h-4 w-4 text-indigo-500" /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm tên bài…" className="min-h-11 w-full rounded-xl border border-indigo-200 bg-white pl-9 pr-3 text-base" /></label>
    <div className="space-y-2.5">{filtered.slice((safePage - 1) * 20, safePage * 20).map(assignment => {
      const submitted = latest.get(assignment.id);
      const timing = submissionDeadlineState(assignment.dueAt, submitted?.createdAt);
      return <article key={assignment.id} data-assignment-row={assignment.id} className="rounded-2xl border border-indigo-100 bg-white p-3.5 shadow-sm">
        <button type="button" className="min-h-11 w-full text-left" onClick={() => openAssignment(assignment.id)}><span className="flex flex-wrap items-center gap-2"><span className={'rounded-md px-2 py-1 text-xs font-bold ' + timing.className}>{timing.label}</span>{assignment.submissionLocked && <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-800">Đã khóa chốt</span>}</span><h2 className="mt-2 break-words text-base font-black text-slate-900">{assignment.title}</h2><p className="mt-1 text-xs font-semibold text-slate-600">{timing.dueLabel ? 'Hạn nộp: ' + timing.dueLabel : 'Không đặt hạn'}</p></button>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-indigo-50 pt-3">{!assignment.submissionLocked && assignment.type !== 'exam' && assignment.deliveryMode !== 'online' && <><button type="button" disabled={busy} onClick={() => directUpload(assignment)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white disabled:opacity-50"><Camera className="h-4 w-4" />{submitted ? 'Nộp lại' : 'Nộp ảnh hộ'}</button>{submitted && <button type="button" disabled={busy} onClick={() => directUpload(assignment, submitted.id)} className="min-h-11 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-800 disabled:opacity-50">Bổ sung ảnh</button>}</>}<button type="button" onClick={() => openAssignment(assignment.id)} className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-bold text-indigo-700">Xem bài<ChevronRight className="h-4 w-4" /></button></div>
      </article>;
    })}</div>
    {filtered.length > 20 && <div className="flex items-center justify-between gap-2"><button type="button" disabled={safePage === 1} className="min-h-11 rounded-lg border px-3 text-sm" onClick={() => setPage(safePage - 1)}>Trước</button><span className="text-sm text-slate-600">{filtered.length} bài · Trang {safePage}</span><button type="button" disabled={safePage * 20 >= filtered.length} className="min-h-11 rounded-lg border px-3 text-sm" onClick={() => setPage(safePage + 1)}>Sau</button></div>}
    {busy && <p role="status">Đang tải bài…</p>}
    {detail && <div ref={detailRef} tabIndex={-1} className="scroll-mt-20"><h2 className="text-lg font-black">{detail.assignment.title}</h2>
      <p className="text-sm font-bold text-slate-600">{detail.assignment.submissionLocked ? 'Đã khóa chốt · chỉ xem' : 'Có thể nộp / bổ sung bất kỳ lúc nào'}</p>
      {!detail.assignment.submissionLocked && detail.assignment.type !== 'exam' && detail.assignment.deliveryMode !== 'online' && <button type="button" className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white" onClick={() => setUpload('')}>Nộp bài hộ con</button>}
      {upload !== null && detail.assignment.type !== 'exam' && detail.assignment.deliveryMode !== 'online' && <ActorSubmissionUpload key={detail.assignment.id + ':' + upload} credentials={credentials} assignmentId={detail.assignment.id} locked={detail.assignment.submissionLocked} supplementOf={upload || undefined} onClose={() => setUpload(null)} onSubmitted={() => { setUpload(null); void refresh().catch(reason => setError(reason.message)); }} />}
      {[...detail.submissions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((submission, index) => {
        const grade = submission.grade; const approved = grade?.teacherApproved === true && !grade.scoreHidden && !grade.awaitingClarification;
        const images = [...new Set([...(submission.attachments ?? []).filter(file => file.kind === 'image').map(file => file.url), ...(submission.fileUrls ?? []).filter(url => !/\.(pdf|docx?)(?:\?|$)/i.test(url)), ...(grade?.questionResults?.flatMap(question => question.clarify?.photoUrls ?? []) ?? [])])];
        const actionable = grade?.questionResults?.filter(isActionableClarifyQuestion) ?? [];
        return <article key={submission.id} className="rounded-xl border bg-white p-3"><p className="mb-2 text-xs font-bold">{index === 0 ? 'Lượt mới nhất' : 'Lượt trước'} · {new Date(submission.createdAt).toLocaleString('vi-VN')}</p>
          {index === 0 && !detail.assignment.submissionLocked && detail.assignment.type !== 'exam' && detail.assignment.deliveryMode !== 'online' && <button type="button" className="mb-2 min-h-11 rounded-lg border px-3 text-sm font-bold text-indigo-700" onClick={() => setUpload(submission.id)}>Bổ sung ảnh lượt này</button>}
          {!!images.length && <SubmissionPhotoReview imageUrl={images[0]} imageUrls={images} alt="Bài làm của con" questionResults={approved ? grade?.questionResults ?? [] : []} approved={approved} grade={approved ? grade : undefined} hideScores={Boolean(detail.assignment.periodicTest)} />}
          {approved && !images.length && <QuestionResultsList results={grade?.questionResults} hideScores={Boolean(detail.assignment.periodicTest)} />}
          {index === 0 && actionable.length > 0 && <ClarifyPanel items={[{ title: detail.assignment.title, submission: { ...submission, grade: { ...grade!, questionResults: actionable } } }]} credentials={credentials} locked={detail.assignment.submissionLocked} onChanged={() => void refresh().catch(reason => setError(reason.message))} pollingExternally />}
          {index === 0 && !!submission.examCodeAsk?.length && !detail.assignment.submissionLocked && <div className="flex flex-wrap gap-2"><p className="w-full text-sm font-bold">Mã đề chưa rõ. Đối chiếu mã trên ảnh rồi chọn:</p>{submission.examCodeAsk.map(code => <button key={code} type="button" className="min-h-11 rounded-lg border px-3 font-bold" onClick={() => { void actorAnswerExamCode(credentials, submission.id, code).then(refresh).catch(reason => setError(reason.message)); }}>{code}</button>)}</div>}
        </article>;
      })}
    </div>}
  </section>;
};
