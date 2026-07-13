import { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { AppData, Student, TeacherClass } from '../../types';

interface ClassesTabProps {
  data: AppData;
  setData: (data: any) => void;
}
import {
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  Eye,
  GraduationCap,
  MoreVertical,
  Plus,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';



const toneMap: Record<TeacherClass['tone'], { avatar: string; bar: string; badge: string }> = {
  primary: { avatar: 'bg-blue-50 text-blue-700', bar: 'bg-blue-600', badge: 'bg-blue-50 text-blue-700' },
  secondary: { avatar: 'bg-indigo-50 text-indigo-700', bar: 'bg-indigo-500', badge: 'bg-slate-100 text-slate-600' },
  tertiary: { avatar: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  warning: { avatar: 'bg-amber-50 text-amber-700', bar: 'bg-blue-600', badge: 'bg-blue-50 text-blue-700' },
};

const statusLabel: Record<Student['status'], { label: string; className: string }> = {
  active: { label: 'Đang học', className: 'bg-blue-50 text-blue-700' },
  needs_support: { label: 'Cần hỗ trợ', className: 'bg-amber-50 text-amber-700' },
  excellent: { label: 'Xuất sắc', className: 'bg-emerald-50 text-emerald-700' },
};

export const ClassesTab = ({ data, setData }: ClassesTabProps) => {
  const classes = data.classes || [];
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');

  const [query, setQuery] = useState('');

  const selectedClass = classes.find((item) => item.id === selectedClassId) || classes[0];
  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    const keyword = query.trim().toLowerCase();
    if (!keyword) return selectedClass.students;
    return selectedClass.students.filter((student) =>
      `${student.name} ${student.code}`.toLowerCase().includes(keyword)
    );
  }, [query, selectedClass]);

  const totals = useMemo(() => ({
    classes: classes.length,
    students: classes.reduce((sum, item) => sum + item.studentCount, 0),
    assignments: classes.reduce((sum, item) => sum + item.activeAssignments, 0),
  }), [classes]);

  const addClass = async () => {
    const { value } = await Swal.fire({
      title: 'Tạo lớp học mới',
      html: '<input id="class-name" class="swal2-input" placeholder="Tên lớp, VD: Lớp 10A3"><input id="class-track" class="swal2-input" placeholder="Nhóm/ghi chú, VD: Khối Tự nhiên">',
      showCancelButton: true,
      confirmButtonText: 'Tạo lớp',
      cancelButtonText: 'Hủy',
      preConfirm: () => ({
        name: (document.getElementById('class-name') as HTMLInputElement).value.trim(),
        track: (document.getElementById('class-track') as HTMLInputElement).value.trim(),
      }),
    });
    if (!value?.name) return;

    const normalizedNewName = value.name.toLowerCase();
    if (classes.some(c => c.name.toLowerCase() === normalizedNewName)) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi tạo lớp',
        text: `Lớp học mang tên "${value.name}" đã tồn tại!`,
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const grade = value.name.match(/\d+/)?.[0] || '10';
    const newClass: TeacherClass = {
      id: `class-${Date.now()}`,
      name: value.name,
      track: value.track || 'Lớp mới',
      grade,
      studentCount: 0,
      activeAssignments: 0,
      progress: 0,
      tone: 'tertiary',
      students: [],
    };
    setData((prev: AppData) => ({
      ...prev,
      classes: [newClass, ...(prev.classes || [])],
    }));
    setSelectedClassId(newClass.id);
  };

  const addStudent = async () => {
    if (!selectedClass) return;
    const { value } = await Swal.fire({
      title: `Thêm học sinh vào ${selectedClass.name}`,
      html: '<input id="student-name" class="swal2-input" placeholder="Họ và tên học sinh"><input id="student-code" class="swal2-input" placeholder="Mã học sinh / SBD">',
      showCancelButton: true,
      confirmButtonText: 'Thêm',
      cancelButtonText: 'Hủy',
      preConfirm: () => ({
        name: (document.getElementById('student-name') as HTMLInputElement).value.trim(),
        code: (document.getElementById('student-code') as HTMLInputElement).value.trim(),
      }),
    });
    if (!value?.name) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi thiếu thông tin',
        text: 'Tên học sinh không được để trống!',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const rawCode = value.code || `${selectedClass.name.replace(/\s+/g, '')}-${selectedClass.students.length + 1}`;
    const finalCode = rawCode.trim().toUpperCase();

    if (selectedClass.students.some(s => s.code.trim().toUpperCase() === finalCode)) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi trùng lặp',
        text: `Mã học sinh "${finalCode}" đã tồn tại trong lớp này!`,
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    setData((prev: AppData) => {
      const existingClasses = prev.classes || [];
      return {
        ...prev,
        classes: existingClasses.map((item) => {
          if (item.id !== selectedClass.id) return item;
          const nextStudent: Student = {
            id: `student-${Date.now()}`,
            name: value.name,
            code: finalCode,
            progress: 0,
            status: 'active',
          };
          return { ...item, students: [nextStudent, ...item.students], studentCount: item.studentCount + 1 };
        }),
      };
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 text-white shadow-xl shadow-blue-100 sm:p-8">
        <div className="absolute -right-14 -top-14 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-blue-50">
              <Sparkles className="h-3.5 w-3.5" /> Classroom Hub
            </div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Quản lý lớp học & học sinh</h2>
            <p className="mt-3 text-sm leading-6 text-blue-50 sm:text-base">
              Theo dõi sĩ số, bài tập đang mở và tiến độ học tập từng lớp theo phong cách dashboard rõ ràng, dễ thao tác cho giáo viên.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={addStudent} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-black text-white ring-1 ring-white/25 transition hover:bg-white/20">
              <UserPlus className="h-4 w-4" /> Thêm học sinh
            </button>
            <button onClick={addClass} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-lg shadow-blue-900/10 transition hover:-translate-y-0.5">
              <Plus className="h-4 w-4" /> Tạo lớp mới
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Tổng số lớp', value: totals.classes, icon: GraduationCap, color: 'text-blue-600 bg-blue-50' },
          { label: 'Tổng số học sinh', value: totals.students, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Bài tập đang mở', value: totals.assignments, icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.color}`}><item.icon className="h-6 w-6" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className="text-3xl font-black text-slate-900">{item.value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {classes.map((item) => {
          const tone = toneMap[item.tone];
          const isActive = item.id === selectedClass?.id;
          return (
            <article key={item.id} className={`flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${isActive ? 'border-blue-300 ring-4 ring-blue-50' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between border-b border-slate-100 p-5">
                <button onClick={() => setSelectedClassId(item.id)} className="flex min-w-0 items-center gap-4 text-left">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black ${tone.avatar}`}>{item.grade}</div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-slate-900">{item.name}</h3>
                    <p className="text-sm font-semibold text-slate-500">{item.track}</p>
                  </div>
                </button>
                <button disabled title="Tính năng đang phát triển" className="cursor-not-allowed rounded-full p-2 text-slate-300"><MoreVertical className="h-5 w-5" /></button>
              </div>

              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-center justify-between text-sm"><span className="inline-flex items-center gap-2 font-semibold text-slate-500"><Users className="h-4 w-4" /> Sĩ số</span><span className="font-black text-slate-800">{item.studentCount} học sinh</span></div>
                <div className="flex items-center justify-between text-sm"><span className="inline-flex items-center gap-2 font-semibold text-slate-500"><BookOpenCheck className="h-4 w-4" /> Bài tập</span><span className={`rounded-full px-3 py-1 text-xs font-black ${item.activeAssignments > 0 ? tone.badge : 'bg-slate-100 text-slate-500'}`}>{item.activeAssignments} đang mở</span></div>
                <div className="pt-2">
                  <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold text-slate-500">Tiến độ chung</span><span className="font-black text-slate-800">{item.progress}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${item.progress}%` }} /></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 border-t border-slate-100 bg-slate-50/80 p-2">
                <button onClick={() => setSelectedClassId(item.id)} className="flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-black text-blue-700 transition hover:bg-white"><Eye className="h-5 w-5" /> Danh sách</button>
                <button disabled title="Tính năng đang phát triển — sẽ nối với Thi online" className="flex cursor-not-allowed flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-black text-slate-300"><Send className="h-5 w-5" /> Giao bài</button>
                <button disabled title="Tính năng đang phát triển — sẽ gom kết quả chấm theo lớp" className="flex cursor-not-allowed flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-black text-slate-300"><BarChart3 className="h-5 w-5" /> Báo cáo</button>
              </div>
            </article>
          );
        })}
      </section>

      {selectedClass && (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Danh sách học sinh</p>
              <h3 className="mt-1 text-2xl font-black text-slate-900">{selectedClass.name}</h3>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm học sinh..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 sm:w-72" />
              </div>
              <button onClick={addStudent} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"><UserPlus className="h-4 w-4" /> Thêm học sinh</button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-3xl border border-slate-100">
            <div className="hidden grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-400 md:grid">
              <span>Học sinh</span><span>Mã HS</span><span>Tiến độ</span><span>Trạng thái</span>
            </div>
            {filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-sm font-semibold text-slate-400">Chưa có học sinh phù hợp.</div>
            ) : filteredStudents.map((student) => {
              const status = statusLabel[student.status];
              return (
                <div key={student.id} className="grid gap-3 border-t border-slate-100 px-5 py-4 text-sm md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] md:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 font-black text-blue-700">{student.name.charAt(0)}</div>
                    <div><p className="font-black text-slate-900">{student.name}</p><p className="text-xs font-semibold text-slate-400 md:hidden">{student.code}</p></div>
                  </div>
                  <span className="hidden font-semibold text-slate-600 md:block">{student.code}</span>
                  <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${student.progress}%` }} /></div><span className="w-10 text-right font-black text-slate-700">{student.progress}%</span></div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${status.className}`}>{status.label}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-blue-50 p-4"><TrendingUp className="mb-3 h-5 w-5 text-blue-600" /><p className="text-xs font-bold uppercase text-blue-500">Gợi ý AI</p><p className="mt-1 text-sm font-semibold text-blue-950">Ưu tiên ôn tập cho nhóm dưới 60% trước khi giao bài mới.</p></div>
            <div className="rounded-3xl bg-emerald-50 p-4"><BookOpenCheck className="mb-3 h-5 w-5 text-emerald-600" /><p className="text-xs font-bold uppercase text-emerald-600">Liên kết bài học</p><p className="mt-1 text-sm font-semibold text-emerald-950">Có thể dùng dữ liệu lớp để giao bài adaptive hoặc đề online.</p></div>
            <div className="rounded-3xl bg-amber-50 p-4"><ClipboardList className="mb-3 h-5 w-5 text-amber-600" /><p className="text-xs font-bold uppercase text-amber-600">Theo dõi</p><p className="mt-1 text-sm font-semibold text-amber-950">Báo cáo lớp sẽ gom tiến độ, bài nộp và kết quả chấm AI.</p></div>
          </div>
        </section>
      )}
    </div>
  );
};

