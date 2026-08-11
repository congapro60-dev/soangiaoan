import { useEffect, useMemo, useState } from 'react';
import { X, BookOpen, Loader2, Search, ChevronRight } from 'lucide-react';
import {
  loadPpct,
  groupByWeek,
  PPCT_GRADES,
  PPCT_SOURCE_LABELS,
  type PpctLesson,
  type PpctProgram,
  type PpctSource,
} from '../../data/ppct';

interface Props {
  initialSource?: PpctSource;
  initialGrade?: number;
  onPick: (lesson: PpctLesson, source: PpctSource, grade: number) => void;
  onClose: () => void;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const PpctPickerModal = ({ initialSource = 'TDS', initialGrade, onPick, onClose }: Props) => {
  const [source, setSource] = useState<PpctSource>(initialSource);
  const [grade, setGrade] = useState<number>(() => {
    const allowed = PPCT_GRADES[initialSource];
    return initialGrade && allowed.includes(initialGrade) ? initialGrade : allowed[0];
  });
  const [program, setProgram] = useState<PpctProgram | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [openWeek, setOpenWeek] = useState<number | null>(null);

  // Đổi nguồn mà khối hiện tại không có (MOET chỉ có 10–12) thì lùi về khối gần nhất.
  useEffect(() => {
    const allowed = PPCT_GRADES[source];
    if (!allowed.includes(grade)) setGrade(allowed[0]);
  }, [source, grade]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadPpct(source, grade)
      .then(result => { if (!cancelled) { setProgram(result); setOpenWeek(result?.lessons[0]?.week ?? null); } })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [source, grade]);

  const weeks = useMemo(() => {
    if (!program) return [];
    const needle = norm(query.trim());
    const lessons = needle
      ? program.lessons.filter(l => norm(`${l.title} ${l.subject} ${l.objectives}`).includes(needle))
      : program.lessons;
    return groupByWeek(lessons);
  }, [program, query]);

  const totalFound = weeks.reduce((n, w) => n + w.lessons.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl flex flex-col max-h-[88vh] overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-lg">Chọn bài theo phân phối chương trình</h2>
              <p className="text-xs text-slate-400 font-medium">Năm học 2026–2027</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 pb-4 space-y-4 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PPCT_SOURCE_LABELS) as PpctSource[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={`py-2.5 px-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  source === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'
                }`}
              >
                {PPCT_SOURCE_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {PPCT_GRADES[source].map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all ${
                  grade === g ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Lớp {g}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm theo tên bài, phân môn, mục tiêu..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm font-bold text-slate-500">Đang mở phân phối chương trình...</p>
            </div>
          )}

          {!isLoading && !program && (
            <p className="text-sm text-slate-500 py-8 text-center">
              Chưa có dữ liệu phân phối cho {source} lớp {grade}.
            </p>
          )}

          {!isLoading && program && totalFound === 0 && (
            <p className="text-sm text-slate-500 py-8 text-center">Không tìm thấy bài nào khớp "{query}".</p>
          )}

          {!isLoading && program && weeks.map(({ week, lessons }) => {
            const isOpen = query.trim() !== '' || openWeek === week;
            return (
              <div key={week} className="border-b border-slate-50 last:border-0">
                <button
                  type="button"
                  onClick={() => setOpenWeek(isOpen && !query ? null : week)}
                  className="w-full flex items-center justify-between py-3 text-left hover:bg-slate-50 rounded-xl px-2 transition-colors"
                >
                  <span className="text-sm font-black text-slate-700">Tuần {week}</span>
                  <span className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    {lessons.length} bài
                    <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </span>
                </button>

                {isOpen && (
                  <ul className="pb-2 space-y-1.5">
                    {lessons.map(lesson => (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          onClick={() => onPick(lesson, source, grade)}
                          className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className={`text-sm font-bold ${lesson.isElective ? 'text-amber-700' : 'text-slate-700'}`}>
                              {lesson.title}
                            </p>
                            <span className="text-[10px] font-bold text-blue-500 whitespace-nowrap mt-0.5">
                              {lesson.periodCount > 1
                                ? `Tiết ${lesson.periodIndex}/${lesson.periodCount}`
                                : '1 tiết'}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold mt-0.5 text-slate-400">
                            {lesson.subject && <span className="text-blue-500">{lesson.subject} · </span>}
                            Tiết {lesson.periodNo} theo PPCT
                          </p>
                          {lesson.isElective && (
                            <p className="text-[11px] text-amber-600 mt-1">
                              PPCT để trống — chọn rồi tự điền nội dung muốn dạy.
                            </p>
                          )}
                          {lesson.detail && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                              {lesson.detail.replace(/\n/g, ' · ')}
                            </p>
                          )}
                          {lesson.objectives && (
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                              {lesson.objectives.replace(/\n/g, ' · ').slice(0, 160)}
                            </p>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
