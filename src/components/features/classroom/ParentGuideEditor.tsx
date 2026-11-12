import { useState } from 'react';
import type { AssignmentDoc, ParentGuide } from '../../../lib/classroom/types';
import { prepareParentGuide, saveParentGuide } from '../../../services/submissionActorsApi';

const lines = (value: string): string[] => value.split('\n').map(line => line.trim()).filter(Boolean);
const toText = (value: string[]): string => value.join('\n');

/** GV soạn hướng dẫn phụ huynh: AI tạo nháp, GV sửa rồi mới đăng. Học sinh không thấy khung này. */
export const ParentGuideEditor = ({ assignment, classId, studentId, onChanged }: { assignment: AssignmentDoc; classId: string; studentId?: string; onChanged: () => void }) => {
  const [guide, setGuide] = useState<ParentGuide | undefined>(assignment.parentGuide);
  const [examCode, setExamCode] = useState(assignment.examVariants?.[0]?.code || '');
  const [goal, setGoal] = useState(guide?.goal || '');
  const [askFirst, setAskFirst] = useState(toText(guide?.askFirst || []));
  const [steps, setSteps] = useState(toText(guide?.steps || []));
  const [commonMistakes, setCommonMistakes] = useState(toText(guide?.commonMistakes || []));
  const [askTeacher, setAskTeacher] = useState(guide?.askTeacher || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const credentials = { role: 'teacher' as const, classId, studentId: studentId || '' };
  const fill = (next: ParentGuide) => {
    setGuide(next); setGoal(next.goal); setAskFirst(toText(next.askFirst)); setSteps(toText(next.steps));
    setCommonMistakes(toText(next.commonMistakes)); setAskTeacher(next.askTeacher);
  };
  const generate = (force: boolean) => {
    if (busy || !studentId) return;
    if (force && guide && !window.confirm('Soạn lại sẽ thay bản đang sửa. Tiếp tục?')) return;
    setBusy(true); setMessage('');
    void prepareParentGuide(credentials, assignment.id, examCode || undefined, force)
      .then(({ parentGuide }) => { fill(parentGuide); setMessage('Đã soạn bản nháp. Thầy cô đọc, sửa rồi đăng.'); onChanged(); })
      .catch(error => setMessage(error instanceof Error ? error.message : 'Chưa soạn được hướng dẫn. Thử lại.'))
      .finally(() => setBusy(false));
  };
  const save = (publish: boolean) => {
    if (busy || !studentId) return;
    setBusy(true); setMessage('');
    void saveParentGuide(credentials, assignment.id, { goal: goal.trim(), askFirst: lines(askFirst), steps: lines(steps), commonMistakes: lines(commonMistakes), askTeacher: askTeacher.trim() }, publish)
      .then(({ parentGuide }) => { fill(parentGuide); setMessage(publish ? 'Đã đăng. Phụ huynh xem được khi bài chưa đổi nội dung.' : 'Đã lưu nháp. Phụ huynh chưa thấy.'); onChanged(); })
      .catch(error => setMessage(error instanceof Error ? error.message : 'Chưa lưu được. Thử lại.'))
      .finally(() => setBusy(false));
  };
  const published = guide?.status === 'published';
  return <div className="my-3 rounded-xl border border-emerald-200 bg-white p-3">
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="text-sm font-black text-slate-900">Hướng dẫn phụ huynh</h3>
      {guide && <span className={'rounded-md px-2 py-1 text-xs font-bold ' + (published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700')}>{published ? 'Đang hiển thị cho phụ huynh' : 'Nháp, phụ huynh chưa thấy'}</span>}
    </div>
    <p className="mt-1 text-xs text-slate-500">Phụ huynh chỉ thấy bản đã đăng, và chỉ khi bài chưa đổi đề hoặc đáp án. Học sinh không thấy mục này.</p>
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {!!assignment.examVariants?.length && <select aria-label="Mã đề soạn hướng dẫn" value={examCode} onChange={event => setExamCode(event.target.value)} className="min-h-11 rounded-lg border p-2 text-sm">{assignment.examVariants.map(variant => <option key={variant.code} value={variant.code}>{variant.code}</option>)}</select>}
      {!guide && <button type="button" disabled={busy || !studentId} onClick={() => generate(false)} className="min-h-11 rounded-lg border px-3 text-sm font-bold text-emerald-800 disabled:opacity-50">{busy ? 'Đang soạn…' : 'Soạn hướng dẫn bằng AI'}</button>}
    </div>
    {guide && <div className="mt-3 space-y-2">
      <label className="block text-xs font-bold text-slate-700">Mục tiêu<textarea value={goal} onChange={event => setGoal(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
      <label className="block text-xs font-bold text-slate-700">Hỏi con trước (mỗi dòng một câu)<textarea value={askFirst} onChange={event => setAskFirst(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
      <label className="block text-xs font-bold text-slate-700">Các bước (mỗi dòng một bước)<textarea value={steps} onChange={event => setSteps(event.target.value)} rows={5} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
      <label className="block text-xs font-bold text-slate-700">Lỗi hay gặp (mỗi dòng một lỗi)<textarea value={commonMistakes} onChange={event => setCommonMistakes(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
      <label className="block text-xs font-bold text-slate-700">Khi nào nên hỏi giáo viên<textarea value={askTeacher} onChange={event => setAskTeacher(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" disabled={busy || !studentId} onClick={() => save(false)} className="min-h-11 rounded-lg border px-3 text-sm font-bold text-slate-700 disabled:opacity-50">Lưu nháp</button>
        <button type="button" disabled={busy || !studentId} onClick={() => save(true)} className="min-h-11 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-50">Đăng cho phụ huynh</button>
        <button type="button" disabled={busy || !studentId} onClick={() => generate(true)} className="min-h-11 rounded-lg border px-3 text-sm font-bold text-emerald-800 disabled:opacity-50">Soạn lại bằng AI</button>
      </div>
    </div>}
    {message && <p role="status" className="mt-2 text-sm text-slate-600">{message}</p>}
  </div>;
};
