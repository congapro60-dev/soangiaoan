import { Award, BookOpenCheck, ClipboardList, NotebookPen } from 'lucide-react';
import type { ReactNode } from 'react';
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
  const hs1Avg = hs1Average(hs1);
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
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Card
          icon={<BookOpenCheck className="h-4 w-4 text-emerald-600" />}
          title="Bài tập về nhà & đề online"
          summary={homeworkAvg !== null && <span className={`text-xs font-black ${scoreColor(homeworkAvg)}`}>TB {homeworkAvg}/10</span>}
        >
          {homework.length === 0 ? <Empty>Chưa có bài được thầy cô duyệt điểm.</Empty> : (
            <ul>{homework.map(item => {
              const out10 = item.score / item.maxScore * 10;
              return <Row key={item.id} label={item.title} value={<span className={scoreColor(out10)}>{item.score}/{item.maxScore}</span>} />;
            })}</ul>
          )}
        </Card>

        <Card
          icon={<NotebookPen className="h-4 w-4 text-blue-600" />}
          title="Điểm hệ số 1"
          summary={hs1Avg !== null && <span className={`text-xs font-black ${scoreColor(hs1Avg)}`}>TB {hs1Avg}/10</span>}
        >
          {hs1.length === 0 ? <Empty>Chưa có điểm hệ số 1.</Empty> : (
            <ul>{hs1.map((mark, index) => <Row key={`${mark.label}-${index}`} label={mark.label} sub={ngayVn(mark.date)} value={<span className={scoreColor(mark.score)}>{mark.score}</span>} />)}</ul>
          )}
        </Card>

        <Card icon={<ClipboardList className="h-4 w-4 text-violet-600" />} title="Thi định kì (thang 10)">
          {moet.length === 0 ? <Empty>Chưa có điểm thi định kì.</Empty> : (
            <ul>{moet.map(mark => <Row key={mark.label} label={mark.label} value={<span className={scoreColor(mark.score)}>{mark.score}</span>} />)}</ul>
          )}
        </Card>

        <Card icon={<Award className="h-4 w-4 text-indigo-600" />} title="Điểm theo quý (TDS)">
          {tds.length === 0 ? <Empty>Chưa có điểm quý.</Empty> : (
            <ul>{tds.map(mark => <Row key={mark.label} label={mark.label} value={<span className="text-indigo-700">{mark.score}{mark.letter && <span className="ml-1.5 rounded bg-indigo-50 px-1.5 text-xs">{mark.letter}</span>}</span>} />)}</ul>
          )}
        </Card>
      </div>
    </section>
  );
};
