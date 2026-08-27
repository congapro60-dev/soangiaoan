import { BarChart3, BookOpenCheck, ClipboardList, Eye, KeyRound, Plus, Send, Users } from 'lucide-react';
import type { TeacherClass } from '../../../types';

export type WorkspaceView = 'overview' | 'students' | 'assignments' | 'submissions' | 'reports';

interface Props {
  selectedClass: TeacherClass;
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  onAccess: () => void;
  onAssign: () => void;
  onReport: () => void;
  onManageMembers: () => void;
}

const tabs: Array<{ view: WorkspaceView; label: string; icon: typeof Eye }> = [
  { view: 'overview', label: 'Tổng quan', icon: Eye },
  { view: 'students', label: 'Học sinh', icon: Users },
  { view: 'assignments', label: 'Bài giao', icon: ClipboardList },
  { view: 'submissions', label: 'Bài nộp', icon: BookOpenCheck },
  { view: 'reports', label: 'Báo cáo', icon: BarChart3 },
];

export const ClassWorkspaceNav = ({ selectedClass, activeView, onViewChange, onAccess, onAssign, onReport, onManageMembers }: Props) => (
  <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-black text-indigo-700">{selectedClass.grade}</div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Class Workspace</p>
          <h2 className="mt-1 break-words text-xl font-black text-slate-900 sm:text-2xl">{selectedClass.name}</h2>
          <p className="truncate text-sm font-semibold text-slate-500">{selectedClass.track} · {selectedClass.studentCount} học sinh · {selectedClass.activeAssignments} bài đang mở</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onAccess} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"><KeyRound className="h-4 w-4" /> Mã lớp & PIN</button>
        <button type="button" onClick={onAssign} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700"><Send className="h-4 w-4" /> Giao bài</button>
        <button type="button" onClick={onReport} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"><BarChart3 className="h-4 w-4" /> Báo cáo</button>
        <button type="button" onClick={onManageMembers} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"><Users className="h-4 w-4" /> Giáo viên</button>
      </div>
    </div>
    <nav className="flex overflow-x-auto border-t border-slate-100 px-3 sm:px-5" role="tablist" aria-label="Khu vực quản lý lớp">
      <div className="flex min-w-max gap-1">
        {tabs.map(({ view, label, icon: Icon }) => (
          <button
            type="button"
            key={view}
            role="tab"
            aria-selected={activeView === view}
            onClick={() => onViewChange(view)}
            className={`inline-flex min-h-12 items-center gap-2 border-b-2 px-3 text-sm font-black transition sm:px-4 ${activeView === view ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
    </nav>
  </section>
);

export const WorkspaceEmptyAction = ({ onAddClass }: { onAddClass: () => void }) => (
  <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-5 py-14 text-center shadow-sm">
    <Plus className="mx-auto mb-3 h-9 w-9 text-indigo-300" />
    <h2 className="font-black text-slate-900">Chưa có lớp học</h2>
    <p className="mx-auto mt-1 max-w-md text-sm font-medium leading-6 text-slate-500">Tạo lớp mới hoặc nhập danh sách từ Excel để bắt đầu giao bài và theo dõi bài nộp.</p>
    <button type="button" onClick={onAddClass} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-indigo-200 hover:bg-indigo-700"><Plus className="h-4 w-4" /> Tạo lớp mới</button>
  </div>
);
