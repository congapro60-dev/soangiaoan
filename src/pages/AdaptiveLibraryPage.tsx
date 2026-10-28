import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublishedSelfStudyLessons, type SelfStudyLibraryItem } from '../services/adaptiveLessonService';

/**
 * Thư viện học lại — danh sách công khai các Bài tự học phân hoá đã xuất bản.
 * Bất kỳ học sinh nào cũng vào được (không cần GV giao): xem list, chọn bài, học lại ở nhà
 * qua cổng `/adaptive-portal/:id` đã có. Yêu cầu thầy 28/10.
 */
export const AdaptiveLibraryPage = () => {
  const [items, setItems] = useState<SelfStudyLibraryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<'all' | '10' | '11' | '12'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    listPublishedSelfStudyLessons()
      .then((rows) => { if (alive) setItems(rows); })
      .catch((err) => { console.error('Không tải được thư viện học lại', err); if (alive) setError('Không tải được danh sách bài tự học. Em hãy thử lại sau.'); });
    return () => { alive = false; };
  }, []);

  const weekLabel = (week: string) => (/^\d+$/.test(week.trim()) ? `Tuần ${week.trim()}` : '');
  const visible = (items || [])
    .filter((item) => gradeFilter === 'all' || item.grade === gradeFilter)
    .filter((item) => !query.trim() || item.title.toLowerCase().includes(query.trim().toLowerCase()));
  const groups = ['10', '11', '12'].filter((g) => visible.some((item) => item.grade === g));

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Thư viện học lại</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Tất cả bài tự học phân hoá đã xuất bản — em tự chọn bài để học lại ở nhà, không cần thầy cô giao.</p>
          </div>
          <Link to="/adaptive-portal" className="inline-flex min-h-10 items-center rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-800 transition hover:bg-blue-100">← Cổng học sinh</Link>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="relative">
            <span className="sr-only">Tìm bài học lại</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên bài… (ví dụ: Khoảng biến thiên)"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-base"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(['all', '10', '11', '12'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGradeFilter(g)}
                className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-black transition ${gradeFilter === g ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                {g === 'all' ? 'Tất cả khối' : `Lớp ${g}`}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}
        {!error && items === null && <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-500">Đang tải thư viện…</p>}
        {items !== null && visible.length === 0 && <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-500">Chưa có bài tự học nào đã xuất bản. Em quay lại sau nhé.</p>}

        {groups.map((g) => (
          <section key={g} className="mt-6">
            <h2 className="text-lg font-black text-slate-900">Lớp {g}</h2>
            <ul className="mt-2 space-y-2">
              {visible.filter((item) => item.grade === g).map((item) => (
                <li key={item.id} className="flex flex-col gap-2 rounded-2xl border border-blue-100 bg-white/90 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-black text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Lớp {item.grade}{weekLabel(item.week) ? ` · ${weekLabel(item.week)}` : ''}{item.period ? ` · Tiết ${item.period}` : ''}
                    </p>
                  </div>
                  <Link
                    to={`/adaptive-portal/${encodeURIComponent(item.id)}`}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-800 transition hover:bg-blue-100"
                  >
                    Học lại bài này
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};
