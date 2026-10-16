import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenCheck, Filter, Sparkles } from 'lucide-react';
import manifest from '../data/discoverNewKnowledgeLessons';
import type { DiscoverGrade, DiscoverNewKnowledgeSeed, DiscoverSourceDraft } from '../lib/discover/types';

const seeds = manifest as DiscoverNewKnowledgeSeed[];

const titleOf = (seed: DiscoverNewKnowledgeSeed) => seed.text.split(' / ')[0]?.trim() || seed.text;

const lessonSource = (seed: DiscoverNewKnowledgeSeed): DiscoverSourceDraft => ({
  title: `Discover ${seed.grade}: ${titleOf(seed)}`,
  content: [
    `Nguồn PPCT: ${seed.sourceWorkbook}, sheet ${seed.sheet}, dòng ${seed.row}, tuần ${seed.week ?? 'chưa xác định'}, tiết ${seed.period ?? 'chưa xác định'}.`,
    '',
    seed.text,
    '',
    'Yêu cầu sản phẩm: tạo bài tự học tại nhà gồm khởi động, hình thành kiến thức, ví dụ có hướng dẫn, tự kiểm tra, bài chuyển giao và kế hoạch hỗ trợ theo lỗi sai. Giữ công thức, số liệu và hình học chính xác; không dùng ảnh AI làm nguồn cho nội dung Toán chính xác.',
  ].join('\n'),
  grade: seed.grade,
  week: String(seed.week ?? ''),
  sourceLabel: `${seed.sourceWorkbook} · ${seed.sheet} · dòng ${seed.row}`,
});

export const DiscoverSelfStudyPage = () => {
  const navigate = useNavigate();
  const [grade, setGrade] = useState<DiscoverGrade | 'all'>('all');
  const [week, setWeek] = useState<string>('all');
  const [query, setQuery] = useState('');

  const weeks = useMemo(() => Array.from(new Set(seeds.map(seed => seed.week).filter((value): value is number => typeof value === 'number'))).sort((a, b) => a - b), []);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return seeds.filter(seed => (
      (grade === 'all' || seed.grade === grade)
      && (week === 'all' || String(seed.week) === week)
      && (!needle || seed.text.toLowerCase().includes(needle))
    ));
  }, [grade, query, week]);

  const openBuilder = (seed: DiscoverNewKnowledgeSeed) => {
    sessionStorage.setItem('discover-source-draft', JSON.stringify(lessonSource(seed)));
    navigate('/adaptive-builder/new?discover=1');
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">Discover · Tự học cá nhân hóa</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Chọn tiết hình thành kiến thức mới</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-blue-100 sm:text-base">
            Danh mục lấy từ PPCT 2026–2027. Chọn một tiết để tạo bản nháp bài tự học, sau đó AI rà soát và giáo viên duyệt trước khi giao cho học sinh.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {(['10', '11', '12'] as DiscoverGrade[]).map(item => (
              <div key={item} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                <p className="text-xs font-black uppercase tracking-widest text-blue-200">Khối {item}</p>
                <p className="mt-1 text-3xl font-black">{seeds.filter(seed => seed.grade === item).length}</p>
                <p className="text-xs font-bold text-blue-100">tiết kiến thức mới</p>
              </div>
            ))}
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-[160px_160px_1fr]">
            <label className="text-sm font-black text-slate-700">Khối
              <select value={grade} onChange={event => setGrade(event.target.value as DiscoverGrade | 'all')} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-bold">
                <option value="all">Tất cả</option><option value="10">10</option><option value="11">11</option><option value="12">12</option>
              </select>
            </label>
            <label className="text-sm font-black text-slate-700">Tuần
              <select value={week} onChange={event => setWeek(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-bold">
                <option value="all">Tất cả</option>{weeks.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-sm font-black text-slate-700">Tìm bài
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Ví dụ: vectơ, đạo hàm, tích phân" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" />
            </label>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {filtered.map(seed => (
            <article key={seed.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-wider text-blue-600">
                    <span>Khối {seed.grade}</span><span>Tuần {seed.week ?? '?'}</span><span>Dòng {seed.row}</span>
                  </div>
                  <h2 className="mt-2 text-lg font-black text-slate-900">{titleOf(seed)}</h2>
                </div>
                <BookOpenCheck className="h-6 w-6 shrink-0 text-blue-500" />
              </div>
              <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">{seed.text}</p>
              <button type="button" onClick={() => openBuilder(seed)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700">
                <Sparkles className="h-4 w-4" /> Tạo bài tự học có AI rà soát
              </button>
            </article>
          ))}
        </section>

        {filtered.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center font-bold text-slate-500"><Filter className="mx-auto mb-3 h-8 w-8" />Không có tiết phù hợp bộ lọc.</div>}
      </div>
    </main>
  );
};
