import { useMemo, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import type { Student } from '../../../types';
import type { ClassAssignmentReport as ClassAssignmentReportMetrics } from '../../../lib/classroom/classReportModel';
import {
  buildClassProgressMatrix,
  filterClassProgressRows,
  selectClassProgressAssignments,
  type ClassProgressAssignment,
  type ClassProgressCell,
  type ClassProgressFilters,
} from '../../../lib/classroom/classProgressModel';

interface Props {
  students: readonly Student[];
  reports: readonly ClassAssignmentReportMetrics[];
}

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

const purposeLabel: Record<ClassProgressAssignment['purpose'], string> = {
  practice: 'Luyện tập',
  remediation: 'Bổ trợ',
  assignment: 'Bài tập',
  assessment: 'Đánh giá',
};

const ProgressCell = ({
  cell,
  assignment,
  studentName,
  onSelect,
}: {
  cell: ClassProgressCell;
  assignment: ClassProgressAssignment;
  studentName: string;
  onSelect: () => void;
}) => {
  const status = statusOf(cell);
  const score = formatScore(cell.score, cell.maxScore ?? assignment.maxScore);
  return (
    <td className="border-b border-slate-100 px-3 py-3 align-top">
      <button
        type="button"
        onClick={onSelect}
        className={`min-w-28 rounded-xl bg-slate-50 px-3 py-2 text-left transition hover:ring-2 hover:ring-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${status.className}`}
        aria-label={`Xem ${assignment.title} của ${studentName}`}
        title="Bấm để xem chi tiết lượt làm"
      >
        {score && <p className="text-sm font-black text-slate-900">{score}</p>}
        <p className="mt-0.5 text-xs font-black">{status.label}</p>
        {cell.attemptCount > 1 && <p className="mt-0.5 text-[11px] font-bold text-slate-500">{cell.attemptCount} lượt nộp</p>}
      </button>
    </td>
  );
};

export const ClassStudentProgressMatrix = ({ students, reports }: Props) => {
  const [filters, setFilters] = useState<ClassProgressFilters>({ query: '', assignmentId: '', purpose: 'all', status: 'all' });
  const [selectedCell, setSelectedCell] = useState<{ student: Student; assignment: ClassProgressAssignment; cell: ClassProgressCell } | null>(null);
  const matrix = useMemo(() => buildClassProgressMatrix(students, reports), [students, reports]);
  const visibleAssignments = useMemo(() => selectClassProgressAssignments(matrix, filters), [filters, matrix]);
  const visibleRows = useMemo(() => {
    return filterClassProgressRows(matrix, filters, visibleAssignments);
  }, [filters, matrix, visibleAssignments]);
  const visibleAttemptCount = visibleRows.reduce((total, row) => total + visibleAssignments.reduce((rowTotal, assignment) => rowTotal + (row.cells.find(cell => cell.assignmentId === assignment.id)?.attemptCount ?? 0), 0), 0);
  const visibleOfficialCount = visibleRows.reduce((total, row) => total + visibleAssignments.reduce((rowTotal, assignment) => rowTotal + (row.cells.find(cell => cell.assignmentId === assignment.id)?.official ? 1 : 0), 0), 0);

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
            <input value={filters.query} onChange={event => setFilters(previous => ({ ...previous, query: event.target.value }))} placeholder="Tìm học sinh…" className="min-h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:w-52" />
          </label>
          <label>
            <span className="sr-only">Lọc bài</span>
            <select value={filters.assignmentId} onChange={event => setFilters(previous => ({ ...previous, assignmentId: event.target.value }))} className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:w-52">
              <option value="">Tất cả bài giao</option>
              {matrix.assignments.map(assignment => <option key={assignment.id} value={assignment.id}>{assignment.title}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Lọc mục đích</span>
            <select value={filters.purpose} onChange={event => setFilters(previous => ({ ...previous, purpose: event.target.value as ClassProgressFilters['purpose'] }))} className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:w-40">
              <option value="all">Mọi mục đích</option>
              <option value="assignment">Bài tập</option>
              <option value="practice">Luyện tập</option>
              <option value="remediation">Bổ trợ</option>
              <option value="assessment">Đánh giá</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Lọc trạng thái</span>
            <select value={filters.status} onChange={event => setFilters(previous => ({ ...previous, status: event.target.value as ClassProgressFilters['status'] }))} className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:w-44">
              <option value="all">Mọi trạng thái</option>
              <option value="missing">Chưa nộp</option>
              <option value="in_progress">Đang làm</option>
              <option value="pending">Chờ xử lý</option>
              <option value="official">Đã duyệt</option>
              <option value="error">Lỗi chấm</option>
              <option value="low">Điểm dưới 6,5</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-indigo-50 px-4 py-3"><p className="text-xs font-black uppercase tracking-wide text-indigo-500">Bài giao</p><p className="mt-1 text-2xl font-black text-indigo-950">{matrix.assignments.length}</p></div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Lượt trong bộ lọc</p><p className="mt-1 text-2xl font-black text-slate-900">{visibleAttemptCount}</p></div>
        <div className="rounded-2xl bg-amber-50 px-4 py-3"><p className="text-xs font-black uppercase tracking-wide text-amber-600">Học sinh đang xem</p><p className="mt-1 text-2xl font-black text-amber-950">{visibleRows.length}</p></div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3"><p className="text-xs font-black uppercase tracking-wide text-emerald-600">Ô đã duyệt</p><p className="mt-1 text-2xl font-black text-emerald-950">{visibleOfficialCount}</p></div>
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
                {visibleAssignments.map(assignment => <th key={assignment.id} className="min-w-36 border-b border-slate-200 px-3 py-3">{assignment.title}<span className="mt-1 block normal-case font-semibold text-slate-400">{purposeLabel[assignment.purpose]} · {assignment.type}</span></th>)}
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
                  {visibleAssignments.map(assignment => {
                    const cell = row.cells.find(item => item.assignmentId === assignment.id) || { assignmentId: assignment.id, submissionId: null, status: 'missing', score: null, maxScore: null, official: false, attemptCount: 0 };
                    return <ProgressCell key={`${row.studentKey}-${assignment.id}`} cell={cell} assignment={assignment} studentName={row.studentName} onSelect={() => setSelectedCell({ student: students.find(student => student.id === row.studentKey) || { id: row.studentKey, name: row.studentName, code: row.studentCode, progress: 0, status: 'active' }, assignment, cell })} />;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedCell && (
        <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4" role="region" aria-label="Chi tiết tiến độ học sinh">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-indigo-600">Chi tiết lượt làm</p>
              <h4 className="mt-1 text-base font-black text-slate-900">{selectedCell.student.name} · {selectedCell.assignment.title}</h4>
            </div>
            <button type="button" onClick={() => setSelectedCell(null)} className="rounded-lg px-2 py-1 text-xs font-black text-indigo-700 hover:bg-white">Đóng</button>
          </div>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-3">
            <span>Trạng thái: <strong>{statusOf(selectedCell.cell).label}</strong></span>
            <span>Điểm: <strong>{formatScore(selectedCell.cell.score, selectedCell.cell.maxScore ?? selectedCell.assignment.maxScore) || '—'}</strong></span>
            <span>Số lượt: <strong>{selectedCell.cell.attemptCount || 0}</strong></span>
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">{selectedCell.cell.submissionId ? `Lượt hiện hành: ${selectedCell.cell.submissionId}. Mở khu vực Bài nộp để xem bài làm và lịch sử chi tiết.` : 'Học sinh chưa có lượt nộp cho bài này.'}</p>
        </div>
      )}
      <p className="mt-3 text-xs font-semibold text-slate-500">Đang hiển thị {visibleRows.length}/{matrix.rows.length} học sinh · {visibleAssignments.length}/{matrix.assignments.length} bài. “Lượt nộp” bao gồm cả các lần bổ sung/nộp lại; màn hình giữ điểm của lượt mới nhất.</p>
    </section>
  );
};
