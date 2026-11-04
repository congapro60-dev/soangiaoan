import { Award, BookOpenCheck, CalendarCheck, ClipboardList, NotebookPen } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { hs1Average, type StudentScoreView } from '../../../../lib/classroom/scoreBook';

export interface HomeworkScore {
  id: string;
  title: string;
  score: number;
  maxScore: number;
}

interface Props {
  scores: StudentScoreView | null;
  homework: readonly HomeworkScore[];
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

const ngayVn = (isoDay: string): string => {
  const [y, m, d] = isoDay.split('-');
  return d && m && y ? `${d}/${m}/${y}` : isoDay;
};

const scoreColor = (outOf10: number): string =>
  outOf10 >= 8 ? 'text-emerald-600' : outOf10 >= 6.5 ? 'text-blue-600' : outOf10 >= 5 ? 'text-amber-600' : 'text-rose-600';

const Card = ({ icon, title, summary, children }: { icon: ReactNode; title: string; summary?: ReactNode; children: ReactNode }) => (
  <article className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <p className="flex items-center gap-2 text-sm font-black text-slate-900">{icon} {title}</p>
      {summary}
    </div>
    <div className="mt-3">{children}</div>
  </article>
);

const Row = ({ label, sub, value }: { label: string; sub?: string; value: ReactNode }) => (
  <li className="flex items-baseline justify-between gap-3 border-t border-slate-100 py-1.5 first:border-t-0">
    <span className="min-w-0 break-words text-sm font-semibold text-slate-700">{label}{sub && <span className="ml-1.5 text-[11px] font-semibold text-slate-400">{sub}</span>}</span>
    <span className="shrink-0 text-sm font-black">{value}</span>
  </li>
);

const Empty = ({ children }: { children: ReactNode }) => <p className="text-sm font-semibold text-slate-400">{children}</p>;

/**
 * Bảng điểm của học sinh: BTVN đã duyệt, thi định kì (MOET), điểm quý (TDS), điểm hệ số 1.
 * Chỉ điểm chính thức — bài đang chờ thầy cô duyệt không hiện ở đây.
 */
export const StudentScoreBoard = ({ scores, homework }: Props) => {
  const moet = scores?.exams.moet ?? [];
  const tds = scores?.exams.tds ?? [];
  const hs1 = scores?.hs1 ?? [];
  const hs1Avg = scores?.average !== undefined ? scores.average : hs1Average(hs1);
  const [query, setQuery] = useState('');
  const [homeworkPage, setHomeworkPage] = useState(1);
  const [markPage, setMarkPage] = useState(1);
  const matches = (value: string) => value.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN'));
  const shownHomework = homework.filter(item => matches(item.title));
  const shownMarks = hs1.filter(item => matches(item.label));
  const safeHomeworkPage = Math.min(homeworkPage, Math.max(1, Math.ceil(shownHomework.length / 20)));
  const safeMarkPage = Math.min(markPage, Math.max(1, Math.ceil(shownMarks.length / 20)));
  const pageControls = (page: number, count: number, update: (next: number) => void) => count > 20 && <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500"><span>{count} mục · Trang {page}/{Math.ceil(count / 20)}</span><div className="flex gap-2"><button type="button" aria-label="Điểm trang trước" disabled={page === 1} onClick={() => update(page - 1)} className="min-h-11 rounded-lg border border-slate-200 px-3 disabled:opacity-40">Trước</button><button type="button" aria-label="Điểm trang sau" disabled={page * 20 >= count} onClick={() => update(page + 1)} className="min-h-11 rounded-lg border border-slate-200 px-3 disabled:opacity-40">Sau</button></div></div>;
  const stats = scores?.homework;
  const homeworkAvg = homework.length === 0
    ? null
    : round2(homework.reduce((sum, item) => sum + item.score / item.maxScore * 10, 0) / homework.length);

  return (
    <section aria-labelledby="student-scores-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Kết quả chính thức</p>
          <h2 id="student-scores-heading" className="mt-1 text-xl font-black text-slate-900">Bảng điểm của em</h2>
        </div>
      </div>
      <label className="mt-3 block"><span className="sr-only">Tìm bài hoặc cột điểm</span><input value={query} onChange={event => { setQuery(event.target.value); setHomeworkPage(1); setMarkPage(1); }} placeholder="Tìm bài hoặc cột điểm…" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base" /></label>
      <p className="mt-2 text-xs leading-5 text-slate-500">Điểm trung bình giữ theo toàn bộ sổ; tìm kiếm chỉ lọc danh sách.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Card
          icon={<BookOpenCheck className="h-4 w-4 text-emerald-600" />}
          title="Bài tập về nhà & đề online"
          summary={homeworkAvg !== null && <span className={`text-xs font-black ${scoreColor(homeworkAvg)}`}>TB {homeworkAvg}/10</span>}
        >
          {shownHomework.length === 0 ? <Empty>Chưa có bài được thầy cô duyệt điểm.</Empty> : (
            <ul>{shownHomework.slice((safeHomeworkPage - 1) * 20, safeHomeworkPage * 20).map(item => {
              const out10 = item.score / item.maxScore * 10;
              return <Row key={item.id} label={item.title} value={<span className={scoreColor(out10)}>{item.score}/{item.maxScore}</span>} />;
            })}</ul>
          )}
          {pageControls(safeHomeworkPage, shownHomework.length, setHomeworkPage)}
        </Card>

        <Card
          icon={<NotebookPen className="h-4 w-4 text-blue-600" />}
          title="Điểm có hệ số"
          summary={hs1Avg !== null && <span className={`text-xs font-black ${scoreColor(hs1Avg)}`}>TB {hs1Avg}/10</span>}
        >
          {shownMarks.length === 0 ? <Empty>Chưa có điểm.</Empty> : (
            <ul>{shownMarks.slice((safeMarkPage - 1) * 20, safeMarkPage * 20).map((mark, index) => <Row key={`${mark.label}-${index}`} label={mark.label} sub={`${ngayVn(mark.date)} · HS${mark.weight ?? 1}`} value={<span className={scoreColor(mark.score)}>{mark.score}</span>} />)}</ul>
          )}
          {pageControls(safeMarkPage, shownMarks.length, setMarkPage)}
        </Card>

        <Card icon={<CalendarCheck className="h-4 w-4 text-emerald-600" />} title="Chuyên cần & TB bài tập về nhà">
          {!stats || stats.total === 0 ? <Empty>Chưa có bài nào đến hạn để tính.</Empty> : (
            <ul>
              <Row label="Chuyên cần" sub={`${stats.submitted}/${stats.total} bài đã nộp`} value={<span className={scoreColor(stats.attendance ?? 0)}>{stats.attendance}</span>} />
              <Row label="TB mọi bài tập về nhà" sub={`${stats.graded} bài có điểm`} value={stats.average === null ? <span className="text-slate-300">—</span> : <span className={scoreColor(stats.average)}>{stats.average}</span>} />
            </ul>
          )}
        </Card>

        <Card icon={<ClipboardList className="h-4 w-4 text-violet-600" />} title="Thi định kì (thang 10)">
          {moet.length === 0 ? <Empty>Chưa có điểm thi định kì.</Empty> : (
            <ul>{moet.filter(mark => matches(mark.label)).map(mark => <Row key={mark.label} label={mark.label} sub={scores?.examWeights?.[mark.label] ? `HS${scores.examWeights[mark.label]}` : undefined} value={<span className={scoreColor(mark.score)}>{mark.score}</span>} />)}</ul>
          )}
        </Card>

        <Card icon={<Award className="h-4 w-4 text-indigo-600" />} title="Điểm theo quý (TDS)">
          {tds.length === 0 ? <Empty>Chưa có điểm quý.</Empty> : (
            <ul>{tds.filter(mark => matches(mark.label)).map(mark => <Row key={mark.label} label={mark.label} value={<span className="text-indigo-700">{mark.score}{mark.letter && <span className="ml-1.5 rounded bg-indigo-50 px-1.5 text-xs">{mark.letter}</span>}</span>} />)}</ul>
          )}
        </Card>
      </div>
    </section>
  );
};
