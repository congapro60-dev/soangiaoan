import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchStudentGroupHomework } from '../../../../services/studentWorkspaceApi';
import { HOMEWORK_RECEIPT_LABELS, type GroupHomeworkView } from '../../../../lib/classroom/groupHomework';

export const StudentGroupHomework = () => {
  const [view, setView] = useState<GroupHomeworkView | null>(null), [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [missingOnly, setMissingOnly] = useState(false);
  const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current; setBusy(true); setError('');
    try { const data = await fetchStudentGroupHomework(); if (request.current === id) setView(data); }
    catch { if (request.current === id) { setView(null); setError('Chưa kiểm tra được quyền hoặc dữ liệu tổ. Em thử làm mới.'); } }
    finally { if (request.current === id) setBusy(false); }
  }, []);
  useEffect(() => { void load(); return () => { ++request.current; }; }, [load]);
  if (!view && !error) return null;
  const assignments = view?.assignments.filter(a => a.open) || [];
  return <section aria-label="Theo dõi tổ" className="mb-4 rounded-2xl border border-indigo-200 bg-white p-4">
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-11 rounded-xl px-3 font-bold text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600">Theo dõi tổ {view ? [...new Set(view.students.map(s => s.groupId))].join(', ') : ''}</button>
      <button type="button" disabled={busy} onClick={() => void load()} className="min-h-11 rounded-xl border px-3 text-sm font-semibold disabled:opacity-50">{busy ? 'Đang tải…' : 'Làm mới'}</button>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    {view && open && <>
      <p className="my-2 text-sm text-slate-600">Đã nhận bài trên web chưa đồng nghĩa đã kiểm đủ vở. Cập nhật: {new Date(view.updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.</p>
      <label className="mb-3 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={missingOnly} onChange={e => setMissingOnly(e.target.checked)} />Chỉ hiện HS còn bài chưa nộp hoặc cần bổ sung</label>
      {!assignments.length ? <p className="text-sm">Chưa có BTVN đang mở cho tổ.</p> : <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Bảng nộp bài của tổ">
        <table className="w-full border-collapse text-left text-sm"><caption className="sr-only">Trạng thái nộp bài, không hiển thị điểm hoặc ảnh</caption>
          <thead><tr><th scope="col" className="sticky left-0 min-w-40 bg-white p-2">Học sinh</th>{assignments.map(a => {
            const work = view.students.map(s => s.work.find(w => w.assignmentId === a.id)).filter(w => w && w.status !== 'not_assigned');
            return <th scope="col" key={a.id} className="min-w-48 border p-2"><span>{a.title}</span><span className="mt-1 block text-xs font-normal">{work.filter(w => w?.status === 'received').length}/{work.length} đã nhận bài</span></th>;
          })}</tr></thead>
          <tbody>{view.students.filter(s => !missingOnly || s.work.some(w => assignments.some(a => a.id === w.assignmentId) && ['missing', 'review', 'in_progress'].includes(w.status))).map(s => <tr key={s.id}>
            <th scope="row" className="sticky left-0 bg-white p-2">{s.name}</th>{assignments.map(a => {
              const w = s.work.find(w => w.assignmentId === a.id);
              return <td key={a.id} className={`border p-2 ${w?.status === 'received' ? 'bg-emerald-50 text-emerald-800' : w?.status === 'review' ? 'bg-amber-50 text-amber-900' : ''}`}>{w ? HOMEWORK_RECEIPT_LABELS[w.status] : 'Chưa xác minh'}{w?.submittedAt && <span className="mt-1 block text-xs">{new Date(w.submittedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>}</td>;
            })}</tr>)}</tbody>
        </table>
      </div>}
    </>}
  </section>;
};
