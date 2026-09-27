import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardList, Loader2 } from 'lucide-react';
import { listAssignmentsForClass, listSubmissionsForClass } from '../../../lib/classroom/submissionService';
import { classBacklog, type ClassBacklog } from '../../../lib/classroom/submissionSelection';

interface ClassRef {
  id: string;
  name: string;
}

interface Row {
  id: string;
  name: string;
  backlog: ClassBacklog;
}

const CHIPS: Array<{ key: keyof Omit<ClassBacklog, 'assignmentCount'>; nhan: string; mau: string }> = [
  { key: 'toGrade', nhan: 'chưa chấm', mau: 'bg-amber-50 text-amber-800' },
  { key: 'errored', nhan: 'chấm lỗi', mau: 'bg-rose-50 text-rose-800' },
  { key: 'toApprove', nhan: 'chờ duyệt', mau: 'bg-emerald-50 text-emerald-800' },
  { key: 'uncertain', nhan: 'máy đọc chưa chắc', mau: 'bg-violet-50 text-violet-800' },
];

const tong = (b: ClassBacklog): number => b.toGrade.length + b.errored.length + b.toApprove.length + b.uncertain.length;

/**
 * Bảng điều khiển: việc chấm/duyệt còn tồn của MỌI lớp giáo viên dạy — bấm lớp nào là mở thẳng khung
 * "Việc tồn của cả lớp" của lớp đó. Lỗi tải một lớp thì bỏ qua lớp đó, không làm hỏng cả ô.
 */
export const TeacherBacklogCard = ({ classes, onOpenClass }: { classes: ClassRef[]; onOpenClass: (classId: string) => void }) => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const classKey = classes.map(c => c.id).join('|');

  useEffect(() => {
    let huy = false;
    if (classes.length === 0) { setRows([]); return; }
    setRows(null);
    Promise.all(classes.map(async (lop): Promise<Row | null> => {
      try {
        const [assignments, submissions] = await Promise.all([
          listAssignmentsForClass(lop.id, ''),
          listSubmissionsForClass(lop.id, ''),
        ]);
        const ids = new Set(assignments.filter(a => a.type !== 'exam').map(a => a.id));
        return { id: lop.id, name: lop.name, backlog: classBacklog(submissions, ids) };
      } catch {
        return null;
      }
    })).then(result => { if (!huy) setRows(result.filter((row): row is Row => row !== null)); });
    return () => { huy = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ tải lại khi danh sách lớp đổi
  }, [classKey]);

  if (classes.length === 0) return null;
  const coViec = (rows ?? []).filter(row => tong(row.backlog) > 0);

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-black text-slate-900">Việc cần xử lý</h2>
        <span className="text-xs font-semibold text-slate-400">bài nộp chưa chấm, chấm lỗi, chờ duyệt — mọi lớp</span>
      </div>
      {rows === null ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang gom bài của các lớp…</p>
      ) : coViec.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Không còn bài nào cần chấm hay duyệt.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {coViec.map(row => (
            <li key={row.id}>
              <button type="button" onClick={() => onOpenClass(row.id)} className="flex w-full flex-wrap items-center gap-2 py-3 text-left hover:bg-slate-50">
                <span className="min-w-24 text-sm font-black text-slate-900">{row.name}</span>
                {CHIPS.filter(chip => row.backlog[chip.key].length > 0).map(chip => (
                  <span key={chip.key} className={`rounded-full px-2.5 py-1 text-xs font-black ${chip.mau}`}>{row.backlog[chip.key].length} {chip.nhan}</span>
                ))}
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-black text-indigo-600">Xử lý <ArrowRight className="h-3.5 w-3.5" /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
