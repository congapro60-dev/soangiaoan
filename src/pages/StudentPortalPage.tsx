import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  GraduationCap,
  Info,
  Loader2,
  LogOut,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { normalizeJoinCode } from '../lib/classroom/joinCode';
import {
  ASSIGNMENTS_COL,
  CLASSES_COL,
  STUDENT_LINKS_COL,
  STUDENT_PROFILES_COL,
  SUBMISSIONS_COL,
  type AssignmentDoc,
  type StudentProfileDoc,
  type SubmissionDoc,
} from '../lib/classroom/types';
import { fetchRoster, loginStudent, type RosterEntry } from '../services/studentPortalApi';
import { submitHomework } from '../lib/classroom/submissionService';
import { fetchPractice, gradeOneSubmission, type PracticeQuestion } from '../services/gradingApi';
import { dichLoiNopBai, nenAnhBaiLam } from '../utils/imageCompress';

const MAX_ANH = 4;

type Stage = 'dang-tai' | 'nhap-ma-lop' | 'chon-ten' | 'dashboard';

interface Phien {
  studentId: string;
  classId: string;
  teacherId: string;
  className: string;
  studentName: string;
}

const RANG_BUOC = 'rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white';

const trangThaiHan = (iso?: string): { chu: string; lopMau: string } => {
  if (!iso) return { chu: 'Không đặt hạn nộp', lopMau: 'text-slate-400' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { chu: 'Không đặt hạn nộp', lopMau: 'text-slate-400' };
  const chu = `Hạn: ${d.toLocaleDateString('vi-VN')} · ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  const ms = d.getTime() - Date.now();
  if (ms < 0) return { chu: `${chu} · Quá hạn`, lopMau: 'text-red-600' };
  if (ms < 24 * 60 * 60 * 1000) return { chu: `${chu} · Sắp hết hạn`, lopMau: 'text-amber-600' };
  return { chu, lopMau: 'text-slate-500' };
};

const KhungDangNhap = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 p-4">
    <div className="w-full max-w-md">
      <div className="mb-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur">
          <GraduationCap className="h-7 w-7 text-white" />
        </div>
        <p className="mt-3 text-xl font-black tracking-tight text-white">Cổng học sinh</p>
        <p className="text-sm font-semibold text-blue-200">SmartPlan AI · Lớp học</p>
      </div>
      <div className="rounded-[2rem] bg-white p-7 shadow-2xl">{children}</div>
    </div>
  </div>
);

export const StudentPortalPage = () => {
  const { joinCode: joinCodeParam } = useParams<{ joinCode?: string }>();

  const [stage, setStage] = useState<Stage>('dang-tai');
  const [joinCode, setJoinCode] = useState(normalizeJoinCode(joinCodeParam || ''));
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [className, setClassName] = useState('');
  const [chosenId, setChosenId] = useState('');
  const [pin, setPin] = useState('');
  const [phien, setPhien] = useState<Phien | null>(null);
  const [loi, setLoi] = useState('');
  const [dangGoi, setDangGoi] = useState(false);

  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDoc[]>([]);
  const [profile, setProfile] = useState<StudentProfileDoc | null>(null);
  const [dangNop, setDangNop] = useState<string>('');
  const [buocNop, setBuocNop] = useState('');
  const [canhBao, setCanhBao] = useState('');
  const [loiDuLieu, setLoiDuLieu] = useState('');
  const [luyenTap, setLuyenTap] = useState<PracticeQuestion[]>([]);
  const [dangLuyen, setDangLuyen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<string | null>(null);

  // Phiên ẩn danh còn sống thì vào thẳng dashboard, khỏi bắt nhập lại mã lớp mỗi lần mở.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user || !user.isAnonymous) {
        setStage(joinCodeParam ? 'dang-tai' : 'nhap-ma-lop');
        if (joinCodeParam) void moLop(normalizeJoinCode(joinCodeParam));
        return;
      }
      try {
        const linkSnap = await getDoc(doc(db, STUDENT_LINKS_COL, user.uid));
        if (!linkSnap.exists()) {
          setStage('nhap-ma-lop');
          if (joinCodeParam) void moLop(normalizeJoinCode(joinCodeParam));
          return;
        }
        const link = linkSnap.data() as { studentId: string; classId: string; teacherId: string };
        const [classSnap, studentSnap] = await Promise.all([
          getDoc(doc(db, CLASSES_COL, link.classId)),
          getDoc(doc(db, CLASSES_COL, link.classId, 'students', link.studentId)),
        ]);
        setPhien({
          studentId: link.studentId,
          classId: link.classId,
          teacherId: link.teacherId,
          className: (classSnap.data()?.name as string) || '',
          studentName: (studentSnap.data()?.name as string) || '',
        });
        setStage('dashboard');
      } catch {
        setStage('nhap-ma-lop');
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCodeParam]);

  const moLop = useCallback(async (ma: string) => {
    setLoi('');
    setDangGoi(true);
    try {
      const data = await fetchRoster(ma);
      setRoster(data.students);
      setClassName(data.className);
      setJoinCode(ma);
      setStage('chon-ten');
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Không mở được lớp.');
      setStage('nhap-ma-lop');
    } finally {
      setDangGoi(false);
    }
  }, []);

  const dangNhap = async () => {
    setLoi('');
    setDangGoi(true);
    try {
      const result = await loginStudent(joinCode, chosenId, pin);
      setPhien(result);
      setPin('');
      setStage('dashboard');
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Không đăng nhập được.');
    } finally {
      setDangGoi(false);
    }
  };

  const dangXuat = async () => {
    await signOut(auth);
    setPhien(null);
    setRoster([]);
    setChosenId('');
    setStage('nhap-ma-lop');
  };

  const layBaiLuyen = async () => {
    setLoi('');
    setDangLuyen(true);
    try {
      const ket = await fetchPractice();
      setLuyenTap(ket.questions);
      if (ket.questions.length === 0) setLoi(ket.reason || 'Chưa có chủ đề nào để luyện thêm.');
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Không lấy được bài luyện.');
    } finally {
      setDangLuyen(false);
    }
  };

  const chonAnh = (assignmentId: string | null) => {
    targetRef.current = assignmentId;
    uploadRef.current?.click();
  };

  const nopBai = async (files: FileList) => {
    if (!phien) return;
    const chon = Array.from(files).slice(0, MAX_ANH);
    const mucTieu = targetRef.current;
    setLoi('');
    setCanhBao('');
    setDangNop(mucTieu || 'tu-do');
    try {
      // Nén từng ảnh để hiện tiến trình thật: ảnh điện thoại thường vượt ngưỡng 6MB của
      // storage.rules nếu gửi nguyên bản, và bản nén cũng giúp lượt chấm AI rẻ hơn.
      const images: string[] = [];
      for (let i = 0; i < chon.length; i += 1) {
        setBuocNop(chon.length > 1 ? `Đang chuẩn bị ảnh ${i + 1}/${chon.length}...` : 'Đang chuẩn bị ảnh...');
        images.push(await nenAnhBaiLam(chon[i]));
      }
      setBuocNop('Đang tải bài lên máy chủ...');
      const submission = await submitHomework({
        classId: phien.classId,
        studentId: phien.studentId,
        teacherId: phien.teacherId,
        assignmentId: mucTieu,
        images,
      });
      // Bài tự nộp thì chấm luôn, không phải chờ thầy cô bấm. Nộp đã xong thì không được
      // báo đỏ như thất bại — chỉ cảnh báo vàng là "máy chưa chấm ngay".
      if (!mucTieu) {
        setBuocNop('Đã nộp! Máy đang chấm bài...');
        try {
          await gradeOneSubmission(submission.id);
        } catch (error) {
          console.error('Chấm bài tự do chưa xong', error);
          setCanhBao('Bài đã nộp thành công nhưng máy chưa chấm được ngay — thầy cô sẽ chấm giúp em sau.');
        }
      }
      await taiDuLieu();
    } catch (error) {
      console.error('Không nộp được bài', error);
      setLoi(dichLoiNopBai(error));
    } finally {
      setDangNop('');
      setBuocNop('');
      targetRef.current = null;
    }
  };

  const taiDuLieu = useCallback(async () => {
    if (!phien) return;
    try {
      const [bai, nop, hoSo] = await Promise.all([
        getDocs(query(
          collection(db, ASSIGNMENTS_COL),
          where('classId', '==', phien.classId),
          where('isOpen', '==', true),
          orderBy('createdAt', 'desc'),
          limit(50),
        )),
        getDocs(query(
          collection(db, SUBMISSIONS_COL),
          where('studentId', '==', phien.studentId),
          orderBy('createdAt', 'desc'),
          limit(50),
        )),
        getDoc(doc(db, STUDENT_PROFILES_COL, phien.studentId)),
      ]);
      setAssignments(bai.docs.map(d => d.data() as AssignmentDoc));
      setSubmissions(nop.docs.map(d => d.data() as SubmissionDoc));
      setProfile(hoSo.exists() ? (hoSo.data() as StudentProfileDoc) : null);
      setLoiDuLieu('');
    } catch (error) {
      // Không được nuốt lỗi im lặng: bảng trống y hệt "chưa có bài" khiến học sinh tưởng mình bị bỏ quên.
      console.error('Không tải được dữ liệu cổng học sinh', error);
      setAssignments([]);
      setSubmissions([]);
      setProfile(null);
      setLoiDuLieu('Không tải được dữ liệu từ máy chủ. Kiểm tra kết nối mạng rồi bấm thử lại nhé.');
    }
  }, [phien]);

  useEffect(() => {
    if (stage === 'dashboard') void taiDuLieu();
  }, [stage, taiDuLieu]);

  if (stage === 'dang-tai') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800">
        <Loader2 className="h-9 w-9 animate-spin text-white/80" />
      </div>
    );
  }

  if (stage !== 'dashboard') {
    const buoc = stage === 'nhap-ma-lop'
      ? { so: 'Bước 1 / 2', chu: 'Nhập mã lớp thầy cô cho em' }
      : { so: 'Bước 2 / 2', chu: `Chọn tên em trong lớp ${className}` };
    return (
      <KhungDangNhap>
        <p className="text-xs font-black uppercase tracking-widest text-blue-600">{buoc.so}</p>
        <h1 className="mt-1 text-2xl font-black leading-tight text-slate-900">{buoc.chu}</h1>

        {loi && (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {loi}
          </p>
        )}

        {stage === 'nhap-ma-lop' ? (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Mã lớp gồm 6 ký tự</span>
              <input
                value={joinCode}
                onChange={e => setJoinCode(normalizeJoinCode(e.target.value))}
                placeholder="VD: ACDEFG"
                maxLength={6}
                autoComplete="off"
                className={`${RANG_BUOC} w-full py-4 text-center text-2xl uppercase tracking-[0.4em]`}
              />
            </label>
            <button
              onClick={() => moLop(joinCode)}
              disabled={dangGoi || joinCode.length < 4}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
            >
              {dangGoi && <Loader2 className="h-4 w-4 animate-spin" />}
              {dangGoi ? 'Đang mở lớp...' : 'Vào lớp'}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Tên của em</span>
              <select value={chosenId} onChange={e => setChosenId(e.target.value)} className={`${RANG_BUOC} w-full py-4`}>
                <option value="">— Chọn tên em —</option>
                {roster.map(s => <option key={s.studentId} value={s.studentId}>{s.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Mã PIN thầy cô đã cấp</span>
              <input
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                inputMode="numeric"
                autoComplete="off"
                className={`${RANG_BUOC} w-full py-4 text-center text-2xl tracking-[0.5em]`}
              />
            </label>
            <button
              onClick={dangNhap}
              disabled={dangGoi || !chosenId || pin.length !== 4}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
            >
              {dangGoi && <Loader2 className="h-4 w-4 animate-spin" />}
              {dangGoi ? 'Đang kiểm tra...' : 'Vào học'}
            </button>
            <button onClick={() => { setStage('nhap-ma-lop'); setLoi(''); }} className="flex w-full items-center justify-center gap-2 py-2 text-sm font-bold text-slate-500 transition hover:text-blue-600">
              <ArrowLeft className="h-4 w-4" /> Đổi mã lớp khác
            </button>
          </div>
        )}
      </KhungDangNhap>
    );
  }

  const daCham = submissions.filter(s => s.status === 'graded' && s.grade);
  const diemTB = daCham.length > 0
    ? (daCham.reduce((sum, s) => sum + (s.grade?.score ?? 0), 0) / daCham.length).toFixed(1)
    : '—';
  const daNop = new Set(submissions.map(s => s.assignmentId).filter(Boolean));
  const chuaNop = assignments.filter(a => !daNop.has(a.id));
  const yeu = (profile?.topics || []).filter(t => t.level === 'weak');
  const vung = (profile?.topics || []).filter(t => t.level === 'solid');

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      <header className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 pb-10 pt-5 text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-black backdrop-blur">
            {phien?.studentName.charAt(0) || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black leading-tight">Chào {phien?.studentName}!</p>
            <p className="truncate text-sm font-semibold text-blue-200">Lớp {phien?.className}</p>
          </div>
          <button onClick={dangXuat} title="Đăng xuất" aria-label="Đăng xuất" className="rounded-full bg-white/15 p-2 transition hover:bg-white/25">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-6">
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={event => {
            const files = event.target.files;
            event.target.value = '';
            if (files && files.length > 0) void nopBai(files);
          }}
        />

        <section className="-mt-7 grid grid-cols-3 gap-3">
          {[
            { nhan: 'Chưa nộp', giaTri: String(chuaNop.length), icon: ClipboardList, nen: 'bg-amber-50 text-amber-600' },
            { nhan: 'Điểm trung bình', giaTri: diemTB, icon: TrendingUp, nen: 'bg-emerald-50 text-emerald-600' },
            { nhan: 'Đã được chấm', giaTri: String(daCham.length), icon: BookOpenCheck, nen: 'bg-sky-50 text-sky-600' },
          ].map(item => (
            <div key={item.nhan} className="rounded-3xl bg-white p-4 shadow-md ring-1 ring-slate-900/5">
              <div className={`mb-2 inline-flex rounded-xl p-2 ${item.nen}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <p className="text-xl font-black leading-none text-slate-900">{item.giaTri}</p>
              <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-wide text-slate-400">{item.nhan}</p>
            </div>
          ))}
        </section>

        {buocNop && (
          <div className="flex items-center gap-3 rounded-3xl bg-blue-600 px-5 py-4 text-white shadow-lg">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
            <p className="text-sm font-bold">{buocNop}</p>
          </div>
        )}

        {loi && (
          <p className="flex items-start gap-2 rounded-3xl bg-red-50 px-5 py-4 text-sm font-bold text-red-800 ring-1 ring-red-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {loi}
          </p>
        )}
        {canhBao && (
          <p className="flex items-start gap-2 rounded-3xl bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800 ring-1 ring-amber-100">
            <Info className="mt-0.5 h-4 w-4 shrink-0" /> {canhBao}
          </p>
        )}
        {loiDuLieu && (
          <div className="rounded-3xl bg-red-50 px-5 py-4 ring-1 ring-red-100">
            <p className="flex items-start gap-2 text-sm font-bold text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {loiDuLieu}
            </p>
            <button
              onClick={() => void taiDuLieu()}
              className="mt-3 rounded-2xl bg-red-600 px-4 py-2 text-xs font-black text-white transition hover:bg-red-700"
            >
              Thử lại
            </button>
          </div>
        )}

        <section>
          <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-black uppercase tracking-wide text-slate-500">
            <ClipboardList className="h-4 w-4 text-blue-600" /> Bài cần làm hôm nay
            {chuaNop.length > 0 && (
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-black text-blue-700">{chuaNop.length}</span>
            )}
          </h2>
          <div className="overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-900/5">
            {chuaNop.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                <p className="text-sm font-semibold text-slate-400">Em đã nộp hết bài được giao. Nghỉ ngơi chút nhé!</p>
              </div>
            ) : chuaNop.map(a => {
              const han = trangThaiHan(a.dueAt);
              return (
                <div key={a.id} className="border-b border-slate-100 px-5 py-4 last:border-b-0 sm:flex sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">{a.title}</p>
                    <p className={`mt-0.5 flex items-center gap-1.5 text-sm font-semibold ${han.lopMau}`}>
                      <Clock3 className="h-3.5 w-3.5 shrink-0" /> {han.chu}
                    </p>
                    {(a.attachments || []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(a.attachments || []).map(file => (
                          <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 underline-offset-2 transition hover:underline">
                            <FileText className="h-3 w-3" /> {file.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => chonAnh(a.id)}
                    disabled={dangNop !== ''}
                    className="mt-3 inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 sm:mt-0 sm:w-auto"
                  >
                    {dangNop === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {dangNop === a.id ? 'Đang nộp...' : 'Nộp ảnh'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-center shadow-xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Camera className="h-6 w-6 text-amber-300" />
          </div>
          <h3 className="text-base font-black text-white">Chụp bài nhờ máy chấm</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm font-medium leading-6 text-slate-300">
            Chụp cả đề lẫn bài làm trong ảnh để máy đọc được em phải làm gì và chấm giúp em.
          </p>
          <button
            onClick={() => chonAnh(null)}
            disabled={dangNop !== ''}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-black text-slate-900 shadow-lg transition hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50"
          >
            {dangNop === 'tu-do' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {dangNop === 'tu-do' ? 'Đang xử lý...' : 'Chụp bài ngay'}
          </button>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-black uppercase tracking-wide text-slate-500">
            <BookOpenCheck className="h-4 w-4 text-emerald-600" /> Bài đã được chấm
          </h2>
          <div className="overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-900/5">
            {daCham.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm font-semibold text-slate-400">Chưa có bài nào được chấm.</p>
            ) : daCham.map(s => (
              <div key={s.id} className="border-b border-slate-100 px-5 py-4 last:border-b-0">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full bg-emerald-50 ring-2 ring-emerald-100">
                    <span className="text-sm font-black leading-none text-emerald-700">{s.grade?.score}</span>
                    <span className="text-[9px] font-bold text-emerald-500">/{s.grade?.maxScore}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">
                      {assignments.find(a => a.id === s.assignmentId)?.title || 'Bài em tự nộp'}
                    </p>
                    {s.grade?.feedback && (
                      <p className="mt-1 whitespace-pre-line text-sm font-medium leading-6 text-slate-600">{s.grade.feedback}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-black uppercase tracking-wide text-slate-500">
            <Target className="h-4 w-4 text-violet-600" /> Hồ sơ học tập của em
          </h2>
          {!profile || profile.topics.length === 0 ? (
            <div className="rounded-3xl bg-white px-5 py-10 text-center shadow-md ring-1 ring-slate-900/5">
              <Sparkles className="mx-auto mb-2 h-8 w-8 text-violet-300" />
              <p className="text-sm font-semibold text-slate-400">
                Sau vài bài đã chấm, chỗ này sẽ ghi em đang vững phần nào và nên luyện thêm phần nào.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-900/5">
                <p className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-700"><TrendingUp className="h-4 w-4" /> Em đang vững</p>
                <div className="flex flex-wrap gap-2">
                  {vung.map(t => (
                    <span key={t.topic} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{t.topic}</span>
                  ))}
                  {vung.length === 0 && <span className="text-sm font-semibold text-slate-400">Chưa đủ dữ liệu.</span>}
                </div>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-900/5">
                <p className="mb-3 flex items-center gap-2 text-sm font-black text-amber-700"><Target className="h-4 w-4" /> Nên luyện thêm</p>
                <div className="flex flex-wrap gap-2">
                  {yeu.map(t => (
                    <span key={t.topic} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">{t.topic}</span>
                  ))}
                  {yeu.length === 0 && <span className="text-sm font-semibold text-slate-400">Chưa đủ dữ liệu.</span>}
                </div>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-black uppercase tracking-wide text-slate-500">
            <Sparkles className="h-4 w-4 text-indigo-600" /> Luyện thêm theo chủ đề
          </h2>
          <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-900/5">
            {luyenTap.length === 0 ? (
              <>
                <p className="text-sm font-semibold text-slate-500">
                  Máy sẽ ra bài luyện bám đúng chủ đề em còn vướng, dựa trên các bài đã chấm.
                </p>
                <button
                  onClick={layBaiLuyen}
                  disabled={dangLuyen}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-md transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
                >
                  {dangLuyen && <Loader2 className="h-4 w-4 animate-spin" />}
                  {dangLuyen ? 'Đang soạn bài...' : 'Lấy bài luyện'}
                </button>
              </>
            ) : (
              <ol className="space-y-3">
                {luyenTap.map((q, i) => (
                  <li key={`${i}-${q.question.slice(0, 20)}`} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-bold text-slate-900">Câu {i + 1}. {q.question}</p>
                    {q.hint && <p className="mt-1 text-sm font-semibold text-slate-500">Gợi ý: {q.hint}</p>}
                    {q.solution && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-sm font-bold text-indigo-600">Xem lời giải</summary>
                        <p className="mt-1 whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">{q.solution}</p>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
