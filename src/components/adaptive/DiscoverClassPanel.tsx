import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { moTaLoiHttp } from '../../lib/httpErrorText';
import { listAccessibleClasses, type AccessibleClassDoc } from '../../lib/classroom/classroomService';
import { buildAssignmentStats } from '../../lib/adaptive/assignmentStats';
import type { AdaptiveLesson } from '../../lib/adaptive/types';

type Row = Record<string, unknown> & { id: string };

const assignLesson = async (classId: string, lessonId: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Cần đăng nhập bằng tài khoản giáo viên.');
  const response = await fetch('/api/classroom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'teacherAssignAdaptiveLesson', classId, lessonId, idToken: await user.getIdToken() }),
  });
  const data = await response.json().catch(() => null) as { error?: unknown } | null;
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : moTaLoiHttp(response.status));
};

export const DiscoverClassPanel = ({ lessons }: { lessons: AdaptiveLesson[] }) => {
  const published = useMemo(() => lessons.filter(lesson => lesson.status === 'published'), [lessons]);
  const [classes, setClasses] = useState<AccessibleClassDoc[]>([]);
  const [classId, setClassId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [assignments, setAssignments] = useState<Row[]>([]);
  const [progress, setProgress] = useState<Row[]>([]);
  const [events, setEvents] = useState<Row[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { listAccessibleClasses().then(setClasses).catch(error => setMessage({ ok: false, text: error instanceof Error ? error.message : 'Không tải được danh sách lớp.' })); }, []);

  const load = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const read = async (name: string): Promise<Row[]> => (await getDocs(query(collection(db, name), where('classId', '==', id)))).docs.map(item => ({ ...item.data(), id: item.id }));
      const [a, p, e] = await Promise.all([read('adaptiveAssignments'), read('adaptiveAssignmentProgress'), read('adaptiveEvents')]);
      setAssignments(a); setProgress(p); setEvents(e);
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Không tải được thống kê.' });
    }
  }, []);
  useEffect(() => { void load(classId); }, [classId, load]);

  const submit = async () => {
    setBusy(true); setMessage(null);
    try {
      await assignLesson(classId, lessonId);
      setMessage({ ok: true, text: 'Đã giao bài cho lớp.' });
      await load(classId);
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Giao bài không thành công.' });
    } finally { setBusy(false); }
  };

  const stats = useMemo(() => buildAssignmentStats(assignments, progress, events), [assignments, progress, events]);
  const select = 'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold';

  return (
    <section aria-label="Giao bài Discover cho lớp" className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-900">Giao bài cho lớp và thống kê</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="text-sm font-black text-slate-700">Lớp
          <select value={classId} onChange={event => setClassId(event.target.value)} className={select}>
            <option value="">Chọn lớp</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-black text-slate-700">Bài đã xuất bản
          <select value={lessonId} onChange={event => setLessonId(event.target.value)} className={select}>
            <option value="">Chọn bài</option>{published.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy || !classId || !lessonId} onClick={() => void submit()} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? 'Đang giao...' : 'Giao bài'}
        </button>
      </div>
      {message && <p role="status" className={`mt-3 text-sm font-bold ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}
      {classId && (stats.length === 0 ? <p className="mt-4 text-sm font-semibold text-slate-500">Lớp này chưa được giao bài Discover.</p> : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Bài / seed</th><th className="px-3 py-2">Đã học / xong</th><th className="px-3 py-2">Mục tiêu (TB %)</th><th className="px-3 py-2">Lỗi sai hay gặp</th><th className="px-3 py-2">Hỗ trợ (nộp lại)</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.map(item => (
                <tr key={item.assignmentId} className="align-top">
                  <td className="px-3 py-3"><p className="font-black text-slate-800">{item.title || item.assignmentId}</p><p className="text-xs text-slate-400">{item.discoverSeedId || '—'}</p></td>
                  <td className="px-3 py-3 font-bold">{item.started} / {item.completed}</td>
                  <td className="px-3 py-3">{item.objectives.map(o => <p key={o.objectiveId}>{o.objectiveId}: {o.avgPercent}%</p>)}</td>
                  <td className="px-3 py-3">{item.misconceptions.length ? item.misconceptions.map(m => <p key={m.id}>{m.id} ×{m.count}</p>) : '—'}{item.wrongQuestions.map(q => <p key={q.id} className="text-xs text-slate-500">Câu {q.id} sai ×{q.count}</p>)}</td>
                  <td className="px-3 py-3">{item.support.studentsRetrying} HS · {item.support.retryEvents} lượt</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
};
