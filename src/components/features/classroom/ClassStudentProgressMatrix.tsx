import { useMemo, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import type { Student } from '../../../types';
import type { ClassAssignmentReport as ClassAssignmentReportMetrics } from '../../../lib/classroom/classReportModel';
import { buildClassProgressMatrix, type ClassProgressCell } from '../../../lib/classroom/classProgressModel';

interface Props {
  students: readonly Student[];
  reports: readonly ClassAssignmentReportMetrics[];
}

type ProgressFilter = 'all' | 'missing' | 'pending' | 'low';

const normalized = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('vi-VN');

const formatScore = (score: number | null, maxScore: number | null): string | null => {
  if (score === null || maxScore === null || maxScore <= 0) return null;
  return `${Number.isInteger(score) ? score : score.toFixed(2).replace(/0+$/u, '').replace(/\.$/u, '')}/${Number.isInteger(maxScore) ? maxScore : maxScore.toFixed(2).replace(/0+$/u, '').replace(/\.$/u, '')}`;
};

const statusOf = (cell: ClassProgressCell): { label: string; className: string } => {
  if (cell.status === 'missing') return { label: 'Chưa nộp', className: 'text-slate-500' };
  if (cell.status === 'in_progress') return { label: 'Đang làm', className: 'text-blue-700' };
  if (cell.status === 'error') return { label: 'Lỗi chấm', className: 'text-rose-700' };
  if (cell.official) return { label: 'Đã duyệt', className: 'text-emerald-700' };
  if (cell.status === 'submitted' || cell.status === 'grading') return { label: 'Chờ chấm', className: 'text-amber-700' };
  return { label: 'Chờ duyệt', className: 'text-indigo-700' };
};

const isLowScore = (cell: ClassProgressCell, assignmentMaxScore: number | null): boolean => {
  const maxScore = cell.maxScore ?? assignmentMaxScore;
  const score = formatScore(cell.score, maxScore);
  return Boolean(score && maxScore && cell.score !== null && cell.score / maxScore < 0.65);
};

const ProgressCell = ({ cell, maxScore }: { cell: ClassProgressCell; maxScore: number | null }) => {
  const status = statusOf(cell);
  const score = formatScore(cell.score, cell.maxScore ?? maxScore);
  return (
    <td className="border-b border-slate-100 px-3 py-3 align-top">
      <div className={`min-w-28 rounded-xl bg-slate-50 px-3 py-2 ${status.className}`}>
        {score && <p className="text-sm font-black text-slate-900">{score}</p>}
        <p className="mt-0.5 text-xs font-black">{status.label}</p>
        {cell.attemptCount > 1 && <p className="mt-0.5 text-[11px] font-bold text-slate-500">{cell.attemptCount} lượt nộp</p>}
      </div>
    </td>
  );
};

export const ClassStudentProgressMatrix = ({ students, reports }: Props) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProgressFilter>('all');
  const matrix = useMemo(() => buildClassProgressMatrix(students, reports), [students, reports]);
  const visibleRows = useMemo(() => {
    const search = normalized(query.trim());
    return matrix.rows.filter(row => {
      const matchesSearch = !search || normalized(`${row.studentName} ${row.studentCode}`).includes(search);
      if (!matchesSearch) return false;
      if (filter === 'missing') return row.cells.some(cell => cell.status === 'missing');
      if (filter === 'pending') return row.cells.some(cell => cell.status !== 'missing' && !cell.official);
      if (filter === 'low') return row.cells.some((cell, index) => isLowScore(cell, matrix.assignments[index]?.maxScore ?? null));
      return true;
    });
  }, [filter, matrix.rows, query]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="class-progress-heading">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            <h3 id="class-progress-heading" className="text-lg font-black text-slate-900">Theo dõi bài tập theo học sinh</h3>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">Mỗi ô là một bài giao; điểm chỉ tính vào trung bình khi đã được duyệt.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block">
            <span className="sr-only">Tìm học sinh</span>
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm học sinh…" className="min-h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:w-52" />
          </label>
          <label>
            <span className="sr-only">Lọc tiến độ</span>
            <select value={filter} onChange={event => setFilter(event.target.value as ProgressFilter)} className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:w-44">
              <option value="all">Tất cả học sinh</option>
              <option value="missing">Có bài chưa nộp</option>
              <option value="pending">Có bài chờ xử lý</option>
              <option value="low">Có điểm dưới 6,5</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-indigo-50 px-4 py-3"><p className="text-xs font-black uppercase tracking-wide text-indigo-500">Bài giao</p><p className="mt-1 text-2xl font-black text-indigo-950">{matrix.assignments.length}</p></div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Tổng lượt nộp</p><p className="mt-1 text-2xl font-black text-slate-900">{matrix.totalAttempts}</p></div>
        <div className="rounded-2xl bg-amber-50 px-4 py-3"><p className="text-xs font-black uppercase tracking-wide text-amber-600">Ô đã có bài</p><p className="mt-1 text-2xl font-black text-amber-950">{matrix.totalSubmitted}</p></div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3"><p className="text-xs font-black uppercase tracking-wide text-emerald-600">Bài đã duyệt</p><p className="mt-1 text-2xl font-black text-emerald-950">{matrix.totalOfficial}</p></div>
      </div>

      {reports.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500">Chưa có bài giao để lập ma trận.</p>
      ) : visibleRows.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500">Không có học sinh phù hợp với bộ lọc hiện tại.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-max text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 min-w-56 border-b border-r border-slate-200 bg-slate-50 px-4 py-3">Học sinh</th>
                <th className="min-w-28 border-b border-slate-200 px-3 py-3">Hoàn thành</th>
                {matrix.assignments.map(assignment => <th key={assignment.id} className="min-w-36 border-b border-slate-200 px-3 py-3">{assignment.title}<span className="mt-1 block normal-case font-semibold text-slate-400">{assignment.type}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(row => (
                <tr key={row.studentKey}>
                  <td className="sticky left-0 z-[1] border-b border-r border-slate-100 bg-white px-4 py-3 align-top">
                    <p className="font-black text-slate-900">{row.studentName}</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">{row.studentCode || 'Chưa có mã'}</p>
                    <p className="mt-2 text-xs font-black text-indigo-700">Đã nộp {row.submittedCount}/{row.assignmentCount} · {Math.round(row.completionRate * 100)}%</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">Điểm chính thức: {row.averagePercent === null ? '—' : `${row.averagePercent.toFixed(1).replace('.', ',')}%`}</p>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3 align-top text-xs font-bold text-slate-600">{row.officialCount}/{row.assignmentCount} bài duyệt</td>
                  {row.cells.map((cell, index) => <ProgressCell key={`${row.studentKey}-${cell.assignmentId}`} cell={cell} maxScore={matrix.assignments[index]?.maxScore ?? null} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs font-semibold text-slate-500">Đang hiển thị {visibleRows.length}/{matrix.rows.length} học sinh. “Lượt nộp” bao gồm cả các lần bổ sung/nộp lại; màn hình giữ điểm của lượt mới nhất.</p>
    </section>
  );
};
