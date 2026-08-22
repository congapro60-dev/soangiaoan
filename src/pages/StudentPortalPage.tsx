import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Swal from 'sweetalert2';
import { AlertTriangle, ArrowLeft, GraduationCap, Loader2 } from 'lucide-react';
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
import { dichLoiNopBai, nenAnhBaiLam } from '../utils/imageCompress';
import { fetchRoster, loginStudent, type RosterEntry } from '../services/studentPortalApi';
import { submitHomework } from '../lib/classroom/submissionService';
import { fetchPractice, gradeOneSubmission, type PracticeQuestion } from '../services/gradingApi';
import { StudentPortalDashboard } from '../components/features/classroom/student/StudentPortalDashboard';

const MAX_ANH = 4;
type Stage = 'dang-tai' | 'nhap-ma-lop' | 'chon-ten' | 'dashboard';

interface Phien {
  studentId: string;
  classId: string;
  teacherId: string;
  className: string;
  studentName: string;
}

const RANG_BUOC = 'rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-indigo-400 focus:bg-white';

const KhungDangNhap = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-white p-4">
    <div className="w-full max-w-md">
      <div className="mb-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-200">
          <GraduationCap className="h-7 w-7 text-white" />
        </div>
        <p className="mt-3 text-xl font-black tracking-tight text-slate-900">Cổng học sinh</p>
        <p className="text-sm font-semibold text-slate-400">SmartPlan AI · Lớp học</p>
      </div>
      <div className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-xl shadow-slate-200/60">{children}</div>
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
  const [dangTaiDu, setDangTaiDu] = useState(true);
  const [dangNop, setDangNop] = useState('');
  const [buocNop, setBuocNop] = useState('');
  const [thanhCong, setThanhCong] = useState('');
  const [canhBao, setCanhBao] = useState('');
  const [loiDuLieu, setLoiDuLieu] = useState('');
  const [luyenTap, setLuyenTap] = useState<PracticeQuestion[]>([]);
  const [dangLuyen, setDangLuyen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<string | null>(null);

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
  }, [joinCodeParam, moLop]);

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

  const taiDuLieu = useCallback(async () => {
    if (!phien) return;
    setDangTaiDu(true);
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
      console.error('Không tải được dữ liệu cổng học sinh', error);
      setLoiDuLieu('Không tải được dữ liệu từ máy chủ. Kiểm tra kết nối mạng rồi bấm thử lại nhé.');
    } finally {
      setDangTaiDu(false);
    }
  }, [phien]);

  useEffect(() => {
    if (stage === 'dashboard') void taiDuLieu();
  }, [stage, taiDuLieu]);

  const nopBai = async (files: readonly File[]) => {
    if (!phien) return;
    const chon = files.slice(0, MAX_ANH);
    const mucTieu = targetRef.current;
    setLoi('');
    setCanhBao('');
    setThanhCong('');
    setDangNop(mucTieu || 'tu-do');
    try {
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
      const tenBai = mucTieu
        ? assignments.find(a => a.id === mucTieu)?.title || 'bài được giao'
        : 'bài tự nộp';
      setThanhCong(`Đã nộp "${tenBai}" thành công lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`);

      if (!mucTieu) {
        setBuocNop('Đã nộp! Máy đang chấm bài...');
        try {
          await gradeOneSubmission(submission.id);
        } catch (error) {
          console.error('Chấm bài tự do chưa xong', error);
          setCanhBao('Bài đã nộp thành công nhưng máy chưa chấm được ngay — thầy cô sẽ chấm giúp em sau.');
        }
      } else {
        const bai = assignments.find(a => a.id === mucTieu);
        if (bai && (bai.answerKey || bai.rubric)) {
          setBuocNop('');
          const { isConfirmed } = await Swal.fire({
            icon: 'success',
            title: 'Nộp bài thành công!',
            text: 'Bài này thầy cô đã soạn đáp án và hướng dẫn chấm. Em muốn máy chấm luôn để xem kết quả, hay gửi cho thầy cô chấm?',
            showDenyButton: true,
            confirmButtonText: 'Tự chấm ngay',
            denyButtonText: 'Gửi thầy cô chấm',
            confirmButtonColor: '#4f46e5',
            denyButtonColor: '#64748b',
            allowOutsideClick: false,
          });
          if (isConfirmed) {
            setBuocNop('Máy đang chấm bài...');
            try {
              await gradeOneSubmission(submission.id);
              setThanhCong(`Máy đã chấm xong bài "${tenBai}" — mở mục "Đã chấm" để xem nhận xét nhé!`);
            } catch (error) {
              console.error('Chấm bài giao chưa xong', error);
              setCanhBao('Bài đã nộp thành công nhưng máy chưa chấm được ngay — thầy cô sẽ chấm giúp em sau.');
            }
          } else {
            setThanhCong(`Đã nộp "${tenBai}" — bài của em đang chờ thầy cô chấm.`);
          }
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

  const xuLyChonFile = (event: ChangeEvent<HTMLInputElement>) => {
    // FileList gắn SỐNG với ô input: phải sao chép trước khi reset để handler không nhận mảng rỗng.
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length > 0) void nopBai(files);
  };

  const moChiTiet = (assignment: AssignmentDoc | undefined, submission?: SubmissionDoc) => {
    const title = assignment?.title || 'Bài tự nộp';
    const text = submission?.status === 'graded'
      ? `${submission.grade?.score ?? 0}/${submission.grade?.maxScore ?? 10} điểm${submission.grade?.feedback ? `\n\n${submission.grade.feedback}` : ''}`
      : submission?.status === 'error'
        ? submission.errorMessage || 'Lần nộp trước chưa xử lý được. Em có thể nộp lại.'
        : submission?.status === 'grading' ? 'Máy đang chấm bài. Em có thể quay lại sau ít phút.' : 'Bài đã lên máy chủ và đang chờ thầy cô xử lý.';
    void Swal.fire({ icon: submission?.status === 'error' ? 'warning' : 'info', title, text, confirmButtonText: 'Đã hiểu', confirmButtonColor: '#4f46e5' });
  };

  if (stage === 'dang-tai') {
    return <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 to-white"><Loader2 className="h-9 w-9 animate-spin text-indigo-500" /></div>;
  }

  if (stage !== 'dashboard') {
    const buoc = stage === 'nhap-ma-lop'
      ? { so: 1, chu: 'Nhập mã lớp thầy cô cho em' }
      : { so: 2, chu: `Chọn tên em trong lớp ${className}` };
    return (
      <KhungDangNhap>
        <div className="flex items-center gap-1.5">
          {[1, 2].map(i => <span key={i} className={`h-1.5 rounded-full transition-all ${i === buoc.so ? 'w-6 bg-indigo-600' : 'w-3 bg-slate-200'}`} />)}
          <span className="ml-2 text-xs font-black uppercase tracking-widest text-indigo-600">Bước {buoc.so}/2</span>
        </div>
        <h1 className="mt-2 text-2xl font-black leading-tight text-slate-900">{buoc.chu}</h1>

        {loi && <p className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {loi}</p>}

        {stage === 'nhap-ma-lop' ? (
          <div className="mt-6 space-y-4">
            <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Mã lớp gồm 6 ký tự</span><input value={joinCode} onChange={event => setJoinCode(normalizeJoinCode(event.target.value))} placeholder="VD: ACDEFG" maxLength={6} autoComplete="off" className={`${RANG_BUOC} w-full py-4 text-center text-2xl uppercase tracking-[0.4em]`} /></label>
            <button type="button" onClick={() => moLop(joinCode)} disabled={dangGoi || joinCode.length < 4} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50">{dangGoi && <Loader2 className="h-4 w-4 animate-spin" />}{dangGoi ? 'Đang mở lớp...' : 'Vào lớp'}</button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Tên của em</span><select value={chosenId} onChange={event => setChosenId(event.target.value)} className={`${RANG_BUOC} w-full py-4`}><option value="">— Chọn tên em —</option>{roster.map(student => <option key={student.studentId} value={student.studentId}>{student.name}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Mã PIN thầy cô đã cấp</span><input value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" inputMode="numeric" autoComplete="off" className={`${RANG_BUOC} w-full py-4 text-center text-2xl tracking-[0.5em]`} /></label>
            <button type="button" onClick={dangNhap} disabled={dangGoi || !chosenId || pin.length !== 4} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50">{dangGoi && <Loader2 className="h-4 w-4 animate-spin" />}{dangGoi ? 'Đang kiểm tra...' : 'Vào học'}</button>
            <button type="button" onClick={() => { setStage('nhap-ma-lop'); setLoi(''); }} className="flex min-h-11 w-full items-center justify-center gap-2 py-2 text-sm font-bold text-slate-500 transition hover:text-indigo-600"><ArrowLeft className="h-4 w-4" /> Đổi mã lớp khác</button>
          </div>
        )}
      </KhungDangNhap>
    );
  }

  if (!phien) return null;
  return (
    <StudentPortalDashboard
      session={{ studentName: phien.studentName, className: phien.className }}
      assignments={assignments}
      submissions={submissions}
      profile={profile}
      loading={dangTaiDu}
      uploadingId={dangNop}
      uploadStep={buocNop}
      successMessage={thanhCong}
      warningMessage={canhBao}
      actionError={loi}
      dataError={loiDuLieu}
      practice={luyenTap}
      loadingPractice={dangLuyen}
      uploadRef={uploadRef}
      onFileChange={xuLyChonFile}
      onChooseImage={chonAnh}
      onOpenAssignment={moChiTiet}
      onSignOut={() => void dangXuat()}
      onReload={() => void taiDuLieu()}
      onLoadPractice={() => void layBaiLuyen()}
      onDismissSuccess={() => setThanhCong('')}
    />
  );
};
