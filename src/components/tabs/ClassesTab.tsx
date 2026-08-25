import { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { User } from 'firebase/auth';
import { AppData, ClassAssignment, Student, TeacherClass } from '../../types';
import { useExams } from '../../hooks/useExams';
import { parseRosterRows } from '../../utils/classRosterImport';
import { countUnmigratedClasses, getClassDoc, migrateLegacyClasses, themHocSinhLenServer } from '../../lib/classroom/classroomService';
import { listAssignmentsForClass, listSubmissionsForClass } from '../../lib/classroom/submissionService';
import { issueClassPins, resetStudentPin, revokeClassData, revokeStudentAccessServer, viewClassPins, viewStudentPin } from '../../services/studentPortalApi';
import { AssignmentPanel } from '../features/classroom/AssignmentPanel';
import { ClassAssignmentReport } from '../features/classroom/ClassAssignmentReport';
import { StudentReport } from '../features/classroom/StudentReport';
import { ClassWorkspaceNav, WorkspaceEmptyAction, type WorkspaceView } from '../features/classroom/ClassWorkspaceNav';

interface ClassesTabProps {
  data: AppData;
  setData: (data: any) => void;
  user: User | null;
  showToast: (msg: string, icon?: any) => void;
}

const escapeHtml = (value: string) => value.replace(/[<>&"]/g, ch => (
  ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : '&quot;'
));
import {
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  KeyRound,
  Plus,
  Search,
  Send,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  X,
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

export const ClassesTab = ({ data, setData, user, showToast }: ClassesTabProps) => {
  const classes = data.classes || [];
  const { exams } = useExams(user);
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('overview');

  const [query, setQuery] = useState('');
  const rosterInputRef = useRef<HTMLInputElement>(null);
  const [unmigrated, setUnmigrated] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const assignmentPanelRef = useRef<HTMLDivElement>(null);

  // Lớp học đang chuyển từ mảng trong userSettings sang collection Firestore thật.
  // Mảng cũ CỐ Ý giữ nguyên để còn đường lùi, nên phải đếm xem còn lớp nào chưa chuyển.
  useEffect(() => {
    if (!user?.uid || classes.length === 0) {
      setUnmigrated(0);
      return;
    }
    let huy = false;
    countUnmigratedClasses(user.uid, classes)
      .then(count => { if (!huy) setUnmigrated(count); })
      .catch(error => console.error('Không đếm được lớp chưa đồng bộ', error));
    return () => { huy = true; };
  }, [user?.uid, classes]);

  /**
   * Cấp lại PIN cho MỘT em. Trước đây chỉ có nút đổi cả lớp, nên một em quên mã là 25 em kia
   * cũng phải nhận mã mới — phiền cho cả lớp vì lỗi của một người.
   */
  /**
   * Xem PIN ĐANG DÙNG của một em. Máy chủ giữ cả bản hiển thị (từ 2026-08-22) nên xem lại
   * được thoải mái; muốn đổi sang mã khác thì bấm "Cấp mã mới" trong hộp thoại.
   * Mã cấp trước ngày đó không đọc ngược được — phải cấp lại đúng một lần để có bản hiển thị.
   */
  const xemPinHienTai = async (cls: TeacherClass, student: Student) => {
    try {
      const ket = await viewStudentPin(cls.id, student.id);
      if (!ket.pin) {
        const { isConfirmed } = await Swal.fire({
          icon: 'info',
          title: `Chưa xem được mã hiện tại của ${escapeHtml(ket.name || student.name)}`,
          html: 'Em này được cấp mã trước khi app lưu bản hiển thị, nên mã cũ không đọc ngược được.<br/>Bấm <b>"Cấp mã mới"</b> một lần là từ giờ xem lại được bất cứ lúc nào.',
          showCancelButton: true,
          confirmButtonText: 'Cấp mã mới',
          cancelButtonText: 'Đóng',
          confirmButtonColor: '#3085d6',
        });
        if (isConfirmed) await capLaiPinMotEm(cls, student);
        return;
      }

      const { isDenied } = await Swal.fire({
        title: `Mã PIN đang dùng · ${escapeHtml(ket.name || student.name)}`,
        html: `<p style="font-size:36px;font-weight:800;letter-spacing:8px;margin:14px 0;">${escapeHtml(ket.pin)}</p>
               <p style="font-size:13px;color:#64748b;">Đây là mã em ấy đang dùng để đăng nhập. Muốn đổi sang mã khác thì bấm "Cấp mã mới" — mã cũ hết hiệu lực ngay.</p>`,
        showDenyButton: true,
        denyButtonText: 'Cấp mã mới',
        confirmButtonText: 'Đóng',
        confirmButtonColor: '#3085d6',
        denyButtonColor: '#d97706',
      });
      if (isDenied) await capLaiPinMotEm(cls, student);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Không xem được mã PIN',
        text: error instanceof Error ? error.message : 'Thử lại sau ít phút.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  const capLaiPinMotEm = async (cls: TeacherClass, student: Student) => {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: `Cấp lại mã PIN cho ${student.name}?`,
      html: 'Mã cũ của em sẽ hết hiệu lực ngay. <b>Các bạn khác trong lớp giữ nguyên mã.</b><br/><br/>Mã mới chỉ hiện MỘT LẦN — chụp lại rồi hãy đóng.',
      showCancelButton: true,
      confirmButtonText: 'Cấp mã mới',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#3085d6',
    });
    if (!isConfirmed) return;

    try {
      const ket = await resetStudentPin(cls.id, student.id);
      await Swal.fire({
        icon: 'success',
        title: `Mã PIN mới của ${escapeHtml(ket.name || student.name)}`,
        html: `<p style="font-size:34px;font-weight:800;letter-spacing:8px;margin:14px 0;">${escapeHtml(ket.pin)}</p>
               <p style="font-size:13px;color:#64748b;">Mã này không xem lại được. Quên nữa thì cấp lại lần khác.</p>`,
        confirmButtonText: 'Tôi đã ghi lại',
        confirmButtonColor: '#3085d6',
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Không cấp lại được',
        text: error instanceof Error ? error.message : 'Thử lại sau.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  /** Chép vào clipboard, báo bằng toast. Trang chạy HTTPS nên `navigator.clipboard` dùng được. */
  const chep = async (text: string, baoGi: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(baoGi, 'success');
    } catch {
      // Trình duyệt chặn clipboard: hiện ra để giáo viên bôi đen chép tay, không im lặng nuốt.
      Swal.fire({
        title: 'Chép tay giúp thầy cô nhé',
        html: `<textarea readonly style="width:100%;height:180px;font-size:13px;padding:8px;">${escapeHtml(text)}</textarea>`,
        confirmButtonText: 'Đóng',
        confirmButtonColor: '#3085d6',
        width: 620,
      });
    }
  };

  const linkVaoLop = (joinCode: string) => `${window.location.origin}/lop/${joinCode}`;

  /**
   * Bảng phát cho lớp: link chung + PIN riêng từng em, sao chép được ngay.
   *
   * Trước đây link chỉ nằm dạng chữ trong hộp thoại mã lớp, còn bảng PIN thì hiện đúng một lần
   * lúc cấp — giáo viên muốn phát lại cho em mới hay phụ huynh hỏi lại là bó tay.
   */
  const bangPhatChoLop = async (cls: TeacherClass) => {
    try {
      const classDoc = await getClassDoc(cls.id);
      if (!classDoc) {
        Swal.fire({
          icon: 'info',
          title: 'Lớp chưa lên máy chủ',
          text: 'Bấm "Đồng bộ ngay" ở dải nhắc phía trên trước đã.',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      const { rows } = await viewClassPins(cls.id);
      const link = linkVaoLop(classDoc.joinCode);
      const thieuPin = rows.filter(r => !r.pin).length;

      const dongBang = rows.map(r => `
        <tr>
          <td style="text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(r.name)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-weight:700;letter-spacing:2px;${r.pin ? '' : 'color:#b45309;font-weight:600;letter-spacing:0;font-size:12px;'}">
            ${r.pin ? escapeHtml(r.pin) : 'chưa xem được — cấp lại'}
          </td>
        </tr>`).join('');

      const { isConfirmed, isDenied } = await Swal.fire({
        title: `Phát cho lớp ${escapeHtml(cls.name)}`,
        width: 620,
        html: `
          <p style="font-size:13px;color:#475569;text-align:left;">Link vào lớp (gửi chung cả lớp được):</p>
          <p style="font-size:13px;font-weight:700;word-break:break-all;text-align:left;color:#2563eb;margin-bottom:10px;">${escapeHtml(link)}</p>
          ${thieuPin > 0 ? `<p style="font-size:12px;color:#b45309;text-align:left;margin-bottom:8px;"><b>${thieuPin} em</b> được cấp PIN từ trước nên không xem lại được mã. Bấm nút chìa khoá ở dòng em đó để cấp mã mới.</p>` : ''}
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="background:#f8fafc;color:#475569;font-size:11px;text-transform:uppercase;">
              <th style="text-align:left;padding:6px 8px;">Học sinh</th><th style="padding:6px 8px;">Mã PIN</th>
            </tr></thead>
            <tbody>${dongBang}</tbody>
          </table>
          <p style="font-size:12px;color:#64748b;text-align:left;margin-top:10px;">PIN là mã riêng từng em — gửi riêng, đừng gửi cả bảng vào nhóm chung.</p>
        `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Chép link lớp',
        denyButtonText: 'Chép cả bảng',
        cancelButtonText: 'Đóng',
        confirmButtonColor: '#3085d6',
        denyButtonColor: '#475569',
        footer: '<button id="nut-cap-pin" style="background:none;border:none;color:#2563eb;font-weight:700;font-size:13px;cursor:pointer;">Cấp mã PIN cho em chưa có →</button>',
        didOpen: () => {
          document.getElementById('nut-cap-pin')?.addEventListener('click', () => {
            Swal.close();
            void showClassAccess(cls);
          });
        },
      });

      if (isConfirmed) {
        await chep(`Link vào lớp ${cls.name}: ${link}`, 'Đã chép link lớp.');
      } else if (isDenied) {
        const vanBan = [
          `Lớp ${cls.name} — link vào lớp: ${link}`,
          '',
          ...rows.map(r => `${r.name}\t${r.pin || '(cần cấp lại PIN)'}`),
        ].join('\n');
        await chep(vanBan, 'Đã chép cả bảng — dán vào Excel hoặc Zalo được.');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Không mở được bảng phát',
        text: error instanceof Error ? error.message : 'Thử lại sau ít phút.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  const syncClassesToCloud = async () => {
    if (!user?.uid) return;
    setSyncing(true);
    try {
      const result = await migrateLegacyClasses(user.uid, classes);
      setUnmigrated(0);
      showToast(`Đã đồng bộ ${result.createdClasses} lớp và ${result.createdStudents} học sinh.`, 'success');
    } catch (error) {
      console.error('Lỗi đồng bộ lớp học', error);
      Swal.fire({
        icon: 'error',
        title: 'Đồng bộ thất bại',
        text: error instanceof Error ? error.message : 'Không ghi được lên máy chủ. Dữ liệu lớp trên máy vẫn còn nguyên.',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setSyncing(false);
    }
  };

  const selectedClass = classes.find((item) => item.id === selectedClassId) || classes[0];
  const selectClass = (classId: string) => {
    setSelectedClassId(classId);
    setWorkspaceView('overview');
  };

  // Tiến độ THẬT từng học sinh: đếm từ bài nộp trên Firestore, không dùng trường `progress`
  // cũ (mô hình lưu cục bộ, migrate lên mặc định 0 và không bao giờ được cập nhật).
  const [tienDoThat, setTienDoThat] = useState<Map<string, { daNop: number; tongBai: number }> | null>(null);
  useEffect(() => {
    if (!selectedClass || !user) { setTienDoThat(null); return; }
    let boQua = false;
    void (async () => {
      try {
        const [dsBai, dsNop] = await Promise.all([
          listAssignmentsForClass(selectedClass.id, user.uid),
          listSubmissionsForClass(selectedClass.id, user.uid),
        ]);
        if (boQua) return;
        const baiDangMo = dsBai.filter(b => b.isOpen);
        const dem = new Map<string, Set<string>>();
        for (const s of dsNop) {
          if (!s.assignmentId || !baiDangMo.some(b => b.id === s.assignmentId)) continue;
          if (!dem.has(s.studentId)) dem.set(s.studentId, new Set());
          dem.get(s.studentId)!.add(s.assignmentId);
        }
        const map = new Map<string, { daNop: number; tongBai: number }>();
        for (const hs of selectedClass.students) {
          map.set(hs.id, { daNop: dem.get(hs.id)?.size ?? 0, tongBai: baiDangMo.length });
        }
        setTienDoThat(map);
      } catch {
        if (!boQua) setTienDoThat(null);
      }
    })();
    return () => { boQua = true; };
  }, [selectedClass, user]);

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

    const maHocSinhMoi = `student-${Date.now()}`;
    setData((prev: AppData) => {
      const existingClasses = prev.classes || [];
      return {
        ...prev,
        classes: existingClasses.map((item) => {
          if (item.id !== selectedClass.id) return item;
          const nextStudent: Student = {
            id: maHocSinhMoi,
            name: value.name,
            code: finalCode,
            progress: 0,
            status: 'active',
          };
          return { ...item, students: [nextStudent, ...item.students], studentCount: item.studentCount + 1 };
        }),
      };
    });

    // F-01: lớp ĐÃ đồng bộ thì ghi thẳng roster lên server — em mới đăng nhập được ngay.
    // Trước đây chỉ lưu local, lớp đã sync không được cảnh báo lần nữa nên em mới mãi không vào được.
    try {
      const daLenServer = await themHocSinhLenServer(selectedClass.id, user?.uid || '', {
        id: maHocSinhMoi,
        name: value.name,
        code: finalCode,
      });
      if (daLenServer) showToast(`Đã thêm ${value.name} — đăng nhập được ngay.`, 'success');
      else showToast(`Đã thêm ${value.name}. Bấm "Đồng bộ ngay" để em ấy đăng nhập được.`, 'warning');
    } catch {
      showToast('Đã lưu trên máy này nhưng chưa lên được máy chủ — bấm "Đồng bộ ngay".', 'warning');
    }
  };

  /**
   * Nhập cả lớp từ file Excel/CSV của trường. Chỉ lấy họ tên và mã học sinh — mọi cột khác
   * (email, mật khẩu mặc định, phụ huynh, số điện thoại, địa chỉ) cố ý KHÔNG đọc vào app.
   */
  const importRoster = async (file: File) => {
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: '' });

      const suggestedName = file.name.replace(/\.[^.]+$/, '').replace(/^\s*\d{2}\s*-\s*\d{2}\s*/, '').trim();
      const preview = parseRosterRows(rows, suggestedName);

      const sampleNames = preview.students.slice(0, 5).map(s => escapeHtml(s.name)).join(', ');
      const remaining = preview.students.length - 5;
      const warnings = [
        preview.duplicateCount > 0 ? `Đã bỏ ${preview.duplicateCount} dòng trùng mã học sinh.` : '',
        preview.codeGenerated ? 'Bảng không có cột mã học sinh — app tự sinh mã theo thứ tự.' : '',
      ].filter(Boolean);

      const { value } = await Swal.fire({
        title: `Tìm thấy ${preview.students.length} học sinh`,
        html: `
          <p style="font-size:13px;color:#475569;text-align:left;margin-bottom:10px;">
            ${sampleNames}${remaining > 0 ? ` và ${remaining} em khác` : ''}.
          </p>
          ${warnings.map(w => `<p style="font-size:12px;color:#b45309;text-align:left;margin-bottom:6px;">${escapeHtml(w)}</p>`).join('')}
          <input id="roster-class-name" class="swal2-input" placeholder="Tên lớp" value="${escapeHtml(suggestedName)}">
          <input id="roster-class-track" class="swal2-input" placeholder="Nhóm/ghi chú, VD: Lộ trình 1">
        `,
        showCancelButton: true,
        confirmButtonText: 'Tạo lớp',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#3085d6',
        preConfirm: () => ({
          name: (document.getElementById('roster-class-name') as HTMLInputElement).value.trim(),
          track: (document.getElementById('roster-class-track') as HTMLInputElement).value.trim(),
        }),
      });
      if (!value?.name) return;

      if (classes.some(c => c.name.toLowerCase() === value.name.toLowerCase())) {
        Swal.fire({
          icon: 'error',
          title: 'Lỗi tạo lớp',
          text: `Lớp học mang tên "${value.name}" đã tồn tại!`,
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      // Đọc lại với tên lớp đã chốt để mã tự sinh mang đúng tên lớp.
      const { students } = parseRosterRows(rows, value.name);
      const newClass: TeacherClass = {
        id: `class-${Date.now()}`,
        name: value.name,
        track: value.track || 'Nhập từ Excel',
        grade: value.name.match(/\d+/)?.[0] || '10',
        studentCount: students.length,
        activeAssignments: 0,
        progress: 0,
        tone: 'tertiary',
        students,
      };

      setData((prev: AppData) => ({ ...prev, classes: [newClass, ...(prev.classes || [])] }));
      setSelectedClassId(newClass.id);
      showToast(`Đã tạo lớp ${value.name} với ${students.length} học sinh.`, 'success');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Không đọc được danh sách',
        text: error instanceof Error ? error.message : 'File không phải bảng Excel/CSV hợp lệ.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  /**
   * Mở bảng "mã lớp + PIN" để giáo viên in phát cho học sinh.
   * PIN thô chỉ máy chủ trả về đúng lần cấp này — app chỉ giữ bản băm, nên mất là phải cấp lại.
   */
  const showClassAccess = async (cls: TeacherClass) => {
    try {
      const classDoc = await getClassDoc(cls.id);
      if (!classDoc) {
        Swal.fire({
          icon: 'info',
          title: 'Lớp chưa lên máy chủ',
          text: 'Bấm "Đồng bộ ngay" ở dải nhắc phía trên trước, rồi quay lại cấp mã PIN.',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      const link = `${window.location.origin}/lop/${classDoc.joinCode}`;
      const { isConfirmed, isDenied } = await Swal.fire({
        title: `Mã lớp ${classDoc.joinCode}`,
        html: `
          <p style="font-size:13px;color:#475569;text-align:left;">Học sinh vào lớp bằng link:</p>
          <p style="font-size:13px;font-weight:700;word-break:break-all;text-align:left;color:#2563eb;">${escapeHtml(link)}</p>
          <p style="font-size:12px;color:#64748b;text-align:left;margin-top:10px;">Mỗi em cần thêm một mã PIN 4 số. Cấp PIN xong bảng hiện ra chỉ một lần — nhớ in hoặc chép lại.</p>
        `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Cấp PIN cho em chưa có',
        denyButtonText: 'Cấp lại PIN cho cả lớp',
        cancelButtonText: 'Đóng',
        confirmButtonColor: '#3085d6',
        denyButtonColor: '#d97706',
      });
      if (!isConfirmed && !isDenied) return;

      const { issued } = await issueClassPins(cls.id, isDenied);
      if (issued.length === 0) {
        showToast('Mọi học sinh trong lớp đều đã có mã PIN.', 'info');
        return;
      }

      const rows = issued.map(item => `
        <tr>
          <td style="text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(item.name)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-weight:700;font-size:16px;letter-spacing:2px;">${escapeHtml(item.pin)}</td>
        </tr>`).join('');

      await Swal.fire({
        title: `Mã PIN lớp ${cls.name}`,
        width: 560,
        html: `
          <p style="font-size:12px;color:#b45309;text-align:left;margin-bottom:8px;"><b>Bảng này chỉ hiện một lần.</b> In hoặc chụp lại ngay — máy chủ chỉ giữ bản mã hoá.</p>
          <p style="font-size:13px;text-align:left;margin-bottom:8px;">Mã lớp: <b>${escapeHtml(classDoc.joinCode)}</b></p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="background:#f8fafc;color:#475569;font-size:11px;text-transform:uppercase;">
              <th style="text-align:left;padding:6px 8px;">Học sinh</th><th style="padding:6px 8px;">Mã PIN</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `,
        confirmButtonText: 'Đã lưu lại',
        confirmButtonColor: '#3085d6',
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Không cấp được mã PIN',
        text: error instanceof Error ? error.message : 'Thử lại sau ít phút.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  const deleteClass = async (cls: TeacherClass) => {
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: `Xoá lớp ${cls.name}?`,
      html: `Lớp này có <b>${cls.students.length} học sinh</b>. Xoá lớp là gỡ luôn danh sách học sinh và <b>thu hồi quyền đăng nhập</b> của cả lớp trên máy chủ.<br/><br/>Điểm và bài nộp đã chấm vẫn giữ lại để đối chiếu. Nhập lại danh sách được từ file Excel.`,
      showCancelButton: true,
      confirmButtonText: 'Xoá lớp & thu hồi quyền',
      cancelButtonText: 'Giữ lại',
      confirmButtonColor: '#dc2626',
      focusCancel: true,
    });
    if (!isConfirmed) return;

    try {
      // F-02: gỡ dữ liệu lớp khỏi server trước — roster/secret/link biến mất thì quyền truy cập
      // chết ngay, dù thiết bị nào đã đăng nhập trước đó. Lớp chưa sync thì chỉ xoá local.
      const lopDaSync = await getClassDoc(cls.id);
      if (lopDaSync) {
        const ket = await revokeClassData(cls.id);
        showToast(`Đã xoá lớp ${cls.name} (${ket.removedStudents} học sinh, ${ket.revokedLinks} phiên bị thu hồi).`, 'success');
      } else {
        showToast(`Đã xoá lớp ${cls.name} khỏi máy này.`, 'success');
      }
      setData((prev: AppData) => ({
        ...prev,
        classes: (prev.classes || []).filter(item => item.id !== cls.id),
      }));
      if (selectedClassId === cls.id) {
        setSelectedClassId('');
        setWorkspaceView('overview');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Chưa xoá được lớp',
        text: error instanceof Error ? error.message : 'Không gỡ được dữ liệu trên máy chủ. Danh sách local giữ nguyên.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  const deleteStudent = async (cls: TeacherClass, student: Student) => {
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: `Xoá ${student.name} khỏi ${cls.name}?`,
      html: 'Em này sẽ <b>mất quyền đăng nhập ngay lập tức</b> (mã lớp + PIN cũ không còn tác dụng).<br/>Các bài nộp đã chấm vẫn giữ lại để đối chiếu.',
      showCancelButton: true,
      confirmButtonText: 'Xoá & thu hồi quyền',
      cancelButtonText: 'Giữ lại',
      confirmButtonColor: '#dc2626',
      focusCancel: true,
    });
    if (!isConfirmed) return;

    try {
      // F-02: thu hồi trên server TRƯỚC khi xoá local. Lớp chưa sync thì không có gì để thu hồi.
      const lopDaSync = await getClassDoc(cls.id);
      if (lopDaSync) await revokeStudentAccessServer(cls.id, student.id);

      setData((prev: AppData) => ({
        ...prev,
        classes: (prev.classes || []).map(item => {
          if (item.id !== cls.id) return item;
          const students = item.students.filter(s => s.id !== student.id);
          return { ...item, students, studentCount: students.length };
        }),
      }));
      if (viewingStudent?.id === student.id) setViewingStudent(null);
      showToast(lopDaSync
        ? `Đã xoá ${student.name} và thu hồi quyền đăng nhập.`
        : `Đã xoá ${student.name} khỏi danh sách máy này.`,
        'success');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Chưa xoá được',
        text: error instanceof Error ? error.message : 'Không thu hồi được quyền trên máy chủ. Danh sách local giữ nguyên.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  /**
   * Nút "Giao bài" trên thẻ lớp từng trỏ thẳng sang luồng đề trắc nghiệm online, nên người dùng
   * bấm vào chỉ nhận được thông báo "chưa có đề thi online" mà không hiểu vì sao. Nay hỏi rõ
   * hai loại trước.
   */
  const chonKieuGiaoBai = async (cls: TeacherClass) => {
    const { isConfirmed, isDenied } = await Swal.fire({
      title: `Giao bài cho ${cls.name}`,
      html: `
        <p style="font-size:13px;color:#475569;text-align:left;margin-bottom:6px;"><b>Bài nộp ảnh</b> — gửi đề dạng PDF/ảnh/Word, học sinh chụp bài làm nộp lên, AI chấm cả lớp.</p>
        <p style="font-size:13px;color:#475569;text-align:left;"><b>Đề trắc nghiệm online</b> — học sinh làm bài ngay trên web, máy chấm tự động.</p>
      `,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Bài nộp ảnh (AI chấm)',
      denyButtonText: 'Đề trắc nghiệm online',
      cancelButtonText: 'Đóng',
      confirmButtonColor: '#3085d6',
      denyButtonColor: '#475569',
    });

    if (isConfirmed) {
      setSelectedClassId(cls.id);
      setWorkspaceView('assignments');
      setTimeout(() => assignmentPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      return;
    }
    if (isDenied) await assignExam(cls);
  };

  const assignExam = async (cls: TeacherClass) => {
    if (exams.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Chưa có đề thi online',
        text: 'Hãy tạo đề trong tab "Thi online" trước, rồi quay lại giao cho lớp.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const options = exams.reduce<Record<string, string>>((acc, exam) => {
      acc[exam.id] = `${exam.title} (#${exam.code})${exam.isActive ? '' : ' — chưa phát hành'}`;
      return acc;
    }, {});

    const { value: examId } = await Swal.fire({
      title: `Giao bài cho ${cls.name}`,
      input: 'select',
      inputOptions: options,
      inputPlaceholder: '-- Chọn đề thi --',
      showCancelButton: true,
      confirmButtonText: 'Giao bài & copy link',
      cancelButtonText: 'Hủy',
    });
    if (!examId) return;

    const exam = exams.find(item => item.id === examId);
    if (!exam) return;

    const assignment: ClassAssignment = {
      examId: exam.id,
      examCode: exam.code,
      examTitle: exam.title,
      assignedAt: new Date().toISOString(),
    };

    setData((prev: AppData) => ({
      ...prev,
      classes: (prev.classes || []).map(item => {
        if (item.id !== cls.id) return item;
        const assignments = [...(item.assignments || []).filter(a => a.examId !== exam.id), assignment];
        return { ...item, assignments, activeAssignments: assignments.length };
      }),
    }));

    const url = `${window.location.origin}/exam/${exam.code}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(`Đã giao "${exam.title}" cho ${cls.name} — link làm bài đã copy!`, 'success');
    } catch {
      showToast(`Đã giao "${exam.title}" cho ${cls.name}. Link: ${url}`, 'success');
    }
    if (!exam.isActive) {
      showToast('Đề này chưa phát hành — nhớ bật "Mở đề" trong tab Thi online để học sinh vào làm.', 'warning');
    }
  };

  const showClassReport = (cls: TeacherClass) => {
    setSelectedClassId(cls.id);
    setWorkspaceView('reports');
  };

  const showRoster = workspaceView === 'overview' || workspaceView === 'students';
  const showAssignments = workspaceView === 'overview' || workspaceView === 'assignments';
  const showSubmissions = workspaceView === 'submissions';

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Quản lý lớp học</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Class Workspace</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">Chọn một lớp để đi thẳng vào danh sách học sinh, bài giao, bài nộp và báo cáo — không phải săn từng nút trên nhiều thẻ.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={rosterInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void importRoster(file);
              }}
            />
            <button type="button" onClick={addClass} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700"><Plus className="h-4 w-4" /> Tạo lớp mới</button>
            <button type="button" onClick={() => rosterInputRef.current?.click()} title="Đọc họ tên và mã học sinh từ file Excel của trường" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"><FileSpreadsheet className="h-4 w-4" /> Nhập Excel</button>
          </div>
        </div>
      </section>

      {unmigrated > 0 && (
        <section className="flex flex-col gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-amber-900">
              {unmigrated} lớp chưa đồng bộ lên máy chủ
            </p>
            <p className="mt-1 text-sm font-semibold text-amber-800">
              Học sinh chỉ đăng nhập và nộp bài được sau khi lớp đã lên máy chủ. Danh sách trên máy vẫn giữ nguyên.
            </p>
          </div>
          <button
            onClick={syncClassesToCloud}
            disabled={syncing}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-700 disabled:opacity-60"
          >
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
          </button>
        </section>
      )}

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

      {classes.length === 0 ? <WorkspaceEmptyAction onAddClass={addClass} /> : <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {classes.map((item) => {
          const tone = toneMap[item.tone];
          const isActive = item.id === selectedClass?.id;
          return (
            <article key={item.id} className={`flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${isActive ? 'border-blue-300 ring-4 ring-blue-50' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between border-b border-slate-100 p-5">
                <button type="button" onClick={() => selectClass(item.id)} className="flex min-w-0 items-center gap-4 text-left">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black ${tone.avatar}`}>{item.grade}</div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-slate-900">{item.name}</h3>
                    <p className="text-sm font-semibold text-slate-500">{item.track}</p>
                  </div>
                </button>
                <button onClick={() => deleteClass(item)} title={`Xoá lớp ${item.name}`} aria-label={`Xoá lớp ${item.name}`} className="rounded-full p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-5 w-5" /></button>
              </div>

              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-center justify-between text-sm"><span className="inline-flex items-center gap-2 font-semibold text-slate-500"><Users className="h-4 w-4" /> Sĩ số</span><span className="font-black text-slate-800">{item.studentCount} học sinh</span></div>
                <div className="flex items-center justify-between text-sm"><span className="inline-flex items-center gap-2 font-semibold text-slate-500"><BookOpenCheck className="h-4 w-4" /> Bài tập</span><span className={`rounded-full px-3 py-1 text-xs font-black ${item.activeAssignments > 0 ? tone.badge : 'bg-slate-100 text-slate-500'}`}>{item.activeAssignments} đang mở</span></div>
                <div className="pt-2">
                  <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold text-slate-500">Tiến độ chung</span><span className="font-black text-slate-800">{item.progress}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${item.progress}%` }} /></div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 border-t border-slate-100 bg-slate-50/80 p-2">
                <button type="button" onClick={() => { selectClass(item.id); setWorkspaceView('students'); }} className="flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-black text-blue-700 transition hover:bg-white"><Eye className="h-5 w-5" /> Danh sách</button>
                <button onClick={() => bangPhatChoLop(item)} title="Link vào lớp và mã PIN từng em — chép sẵn để gửi học sinh" className="flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-black text-blue-700 transition hover:bg-white"><KeyRound className="h-5 w-5" /> Mã lớp</button>
                <button onClick={() => chonKieuGiaoBai(item)} title="Giao bài nộp ảnh hoặc đề trắc nghiệm online" className="flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-black text-blue-700 transition hover:bg-white"><Send className="h-5 w-5" /> Giao bài</button>
                <button onClick={() => showClassReport(item)} title="Tổng hợp kết quả các đề đã giao" className="flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-black text-blue-700 transition hover:bg-white"><BarChart3 className="h-5 w-5" /> Báo cáo</button>
              </div>
            </article>
          );
        })}
      </section>}

      {selectedClass && (
        <ClassWorkspaceNav
          selectedClass={selectedClass}
          activeView={workspaceView}
          onViewChange={setWorkspaceView}
          onAccess={() => void bangPhatChoLop(selectedClass)}
          onAssign={() => void chonKieuGiaoBai(selectedClass)}
          onReport={() => void showClassReport(selectedClass)}
        />
      )}

      {selectedClass && (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {showRoster && (
            <>
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
            <div className="hidden grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto] bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-400 md:grid">
              <span>Học sinh</span><span>Mã PIN</span><span>Tiến độ</span><span>Trạng thái</span><span className="sr-only">Thao tác</span>
            </div>
            {filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-sm font-semibold text-slate-400">Chưa có học sinh phù hợp.</div>
            ) : filteredStudents.map((student) => {
              const status = statusLabel[student.status];
              return (
                <div key={student.id} className="grid gap-3 border-t border-slate-100 px-5 py-4 text-sm md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto] md:items-center">
                  <button onClick={() => setViewingStudent(student)} title={`Xem trang của ${student.name}`} className="flex items-center gap-3 text-left transition hover:opacity-70">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 font-black text-blue-700">{student.name.charAt(0)}</div>
                    <div><p className="font-black text-slate-900 underline decoration-slate-200 underline-offset-4">{student.name}</p></div>
                  </button>
                  <button onClick={() => xemPinHienTai(selectedClass, student)} title={`Xem mã PIN đang dùng của ${student.name} — muốn đổi thì bấm "Cấp mã mới" trong hộp thoại`} className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-100">
                    <KeyRound className="mr-1 inline h-3.5 w-3.5" /> Xem PIN
                  </button>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const td = tienDoThat?.get(student.id);
                      if (!td || td.tongBai === 0) return <span className="text-xs font-semibold text-slate-300">Chưa có bài đang mở</span>;
                      const pt = Math.round((td.daNop / td.tongBai) * 100);
                      return (
                        <>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${pt}%` }} /></div>
                          <span className="w-16 text-right text-[11px] font-black text-slate-600">{td.daNop}/{td.tongBai} bài</span>
                        </>
                      );
                    })()}
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${status.className}`}>{status.label}</span>
                  <button onClick={() => deleteStudent(selectedClass, student)} title={`Xoá ${student.name} khỏi lớp`} aria-label={`Xoá ${student.name} khỏi lớp`} className="w-fit rounded-full p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>

            </>
          )}

          {viewingStudent && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8" onClick={() => setViewingStudent(null)}>
              <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-lg font-black text-blue-700">{viewingStudent.name.charAt(0)}</div>
                    <div>
                      <p className="text-lg font-black text-slate-900">{viewingStudent.name}</p>
                      <p className="text-sm font-semibold text-slate-500">{selectedClass.name} · Mã HS {viewingStudent.code}</p>
                    </div>
                  </div>
                  <button onClick={() => setViewingStudent(null)} aria-label="Đóng" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100"><X className="h-5 w-5" /></button>
                </div>

                <div className="mt-4">
                  <StudentReport
                    studentId={viewingStudent.id}
                    teacherId={user?.uid || ''}
                    studentName={viewingStudent.name}
                    studentCode={viewingStudent.code}
                    className={selectedClass.name}
                  />
                </div>
              </div>
            </div>
          )}

          {workspaceView === 'reports' && user?.uid && (
            <ClassAssignmentReport
              classId={selectedClass.id}
              teacherId={user.uid}
              className={selectedClass.name}
              students={selectedClass.students}
              onlineAssignments={selectedClass.assignments || []}
              exams={exams}
            />
          )}

          {user?.uid && (showAssignments || showSubmissions) && (
            <div ref={assignmentPanelRef} className="mt-5 scroll-mt-6">
              <AssignmentPanel
                classId={selectedClass.id}
                teacherId={user.uid}
                className={selectedClass.name}
                showToast={showToast}
                view={showSubmissions ? 'submissions' : 'assignments'}
              />
            </div>
          )}

          {workspaceView === 'overview' && <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-blue-50 p-4"><TrendingUp className="mb-3 h-5 w-5 text-blue-600" /><p className="text-xs font-bold uppercase text-blue-500">Gợi ý AI</p><p className="mt-1 text-sm font-semibold text-blue-950">Ưu tiên ôn tập cho nhóm dưới 60% trước khi giao bài mới.</p></div>
            <div className="rounded-3xl bg-emerald-50 p-4"><BookOpenCheck className="mb-3 h-5 w-5 text-emerald-600" /><p className="text-xs font-bold uppercase text-emerald-600">Liên kết bài học</p><p className="mt-1 text-sm font-semibold text-emerald-950">Có thể dùng dữ liệu lớp để giao bài adaptive hoặc đề online.</p></div>
            <div className="rounded-3xl bg-amber-50 p-4"><ClipboardList className="mb-3 h-5 w-5 text-amber-600" /><p className="text-xs font-bold uppercase text-amber-600">Theo dõi</p><p className="mt-1 text-sm font-semibold text-amber-950">Báo cáo lớp sẽ gom tiến độ, bài nộp và kết quả chấm AI.</p></div>
          </div>}
        </section>
      )}
    </div>
  );
};

