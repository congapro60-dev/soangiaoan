import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Swal from 'sweetalert2';
import { AlertTriangle, ArrowLeft, GraduationCap, Loader2 } from 'lucide-react';
import { STUDENT_PORTAL_APP, auth, db } from '../lib/firebase';
import { normalizeJoinCode } from '../lib/classroom/joinCode';
import {
  CLASSES_COL,
  STUDENT_LINKS_COL,
  STUDENT_PROFILES_COL,
  type AssignmentDoc,
  type StudentProfileDoc,
  type StudentAssignmentView,
  type SubmissionDoc,
} from '../lib/classroom/types';
import type { ExamSubmission } from '../types';
import { dichLoiNopBai, nenAnhBaiLam } from '../utils/imageCompress';
import { fetchRoster, fetchStudentAssignments, fetchStudentOnlineSubmissions, fetchStudentScoreBook, fetchStudentSubmissions, loginStudent, type RosterEntry } from '../services/studentPortalApi';
import type { StudentScoreView } from '../lib/classroom/scoreBook';
import { layThongBaoHocSinh, submitHomework } from '../lib/classroom/submissionService';
import { buildStudentFeed } from '../lib/classroom/studentNotifications';
import type { StudentNotificationDoc } from '../lib/classroom/types';
import { appendPendingFiles, removePendingFile } from '../lib/classroom/uploadQueue';
import {
  answerExamCode,
  fetchPractice,
  gradeOneSubmission,
  submitPractice,
  type PracticeAttemptResult,
  type PracticeSetResult,
} from '../services/gradingApi';
import { StudentPortalDashboard } from '../components/features/classroom/student/StudentPortalDashboard';
import { scoreHiddenFromStudent } from '../lib/classroom/portalViewModel';

/**
 * Tran anh cho MOT lan nop. Moi anh la mot luot doc cua AI nen tra bang tien cua chu du an,
 * nhung 4 tam thi khong du cho bai 2 trang viet ca hai mat. 10 la muc vua: du cho bai dai ma
 * van chan duoc ca xap anh chup nham.
 */
const MAX_ANH = 10;
/** File gốc chỉ để giáo viên mở; phần chấm vẫn đi qua ảnh/chữ đã kiểm soát. */
const MAX_RAW_FILE_BYTES = 20 * 1024 * 1024;
const MAX_STUDENT_TEXT_CHARS = 60000;
/**
 * Máy chủ nhận bài rồi chấm ngầm. Lớp bật "hỏi lại" thì máy có thể cần em xác nhận vài câu viết chưa rõ,
 * nên nhắc em chờ ở trang; thoát giữa chừng cũng không mất gì (bài, ảnh, câu đã trả lời đều được lưu).
 */
const DANG_CHAM_NGAM = 'Máy đã nhận bài và đang chấm — em chờ ở trang này một chút, nếu câu nào chưa rõ máy sẽ hỏi lại em ngay. Em thoát giữa chừng cũng không sao: bài và ảnh đã được lưu, lần sau vào em làm tiếp phần còn lại.';
const CHO_CHAM_MS = 4000;
const CHO_CHAM_TOI_DA_MS = 3 * 60 * 1000;
type Stage = 'dang-tai' | 'nhap-ma-lop' | 'chon-ten' | 'dashboard';

interface Phien {
  studentId: string;
  classId: string;
  teacherId: string;
  className: string;
  studentName: string;
}

const RANG_BUOC = 'rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-indigo-400 focus:bg-white';
const practiceStorageKey = (session: Phien): string => `smartplan:practice:${session.classId}:${session.studentId}`;

interface StoredPracticeState {
  setId: string;
  attemptId?: string;
  answers: Record<string, string>;
}

const readStoredPractice = (session: Phien): StoredPracticeState | null => {
  try {
    const raw = window.localStorage.getItem(practiceStorageKey(session));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPracticeState>;
    if (typeof parsed.setId !== 'string' || !parsed.setId) return null;
    return {
      setId: parsed.setId,
      attemptId: typeof parsed.attemptId === 'string' ? parsed.attemptId : undefined,
      answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers as Record<string, string> : {},
    };
  } catch {
    return null;
  }
};

const writeStoredPractice = (session: Phien, state: StoredPracticeState): void => {
  try {
    window.localStorage.setItem(practiceStorageKey(session), JSON.stringify(state));
  } catch {
    // localStorage có thể bị khoá trong chế độ riêng tư; bài vẫn hoạt động trong phiên hiện tại.
  }
};

const clearStoredPractice = (session: Phien): void => {
  try {
    window.localStorage.removeItem(practiceStorageKey(session));
  } catch {
    // Không làm hỏng cổng học sinh chỉ vì trình duyệt không cho ghi localStorage.
  }
};

/**
 * Mốc học sinh mở chuông lần gần nhất, lưu theo MÁY chứ không theo tài khoản.
 *
 * Cố ý chọn localStorage: huy hiệu "chưa đọc" là tiện nghi của riêng máy em đang cầm, không
 * đáng để thêm một lượt ghi máy chủ mỗi lần bấm chuông. Đổi máy thì đếm lại từ đầu — chấp nhận.
 */
const notificationSeenKey = (session: Phien): string =>
  `smartplan:notifications-seen:${session.classId}:${session.studentId}`;

const readNotificationsSeenAt = (session: Phien): string | null => {
  try {
    return window.localStorage.getItem(notificationSeenKey(session));
  } catch {
    return null;
  }
};

const writeNotificationsSeenAt = (session: Phien, seenAt: string): void => {
  try {
    window.localStorage.setItem(notificationSeenKey(session), seenAt);
  } catch {
    // Chế độ riêng tư khoá localStorage: chuông vẫn chạy, chỉ là lần sau đếm lại.
  }
};

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
  // Vào /lop bằng điều hướng trong app (Firebase đã khởi tạo ở app mặc định của GV) → tải lại một lần
  // để chạy trên app riêng của HS; không thì đăng nhập HS sẽ đè phiên Google của GV.
  useEffect(() => { if (auth.app.name !== STUDENT_PORTAL_APP) window.location.reload(); }, []);
  const { joinCode: joinCodeParam } = useParams<{ joinCode?: string }>();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('dang-tai');
  const [joinCode, setJoinCode] = useState(normalizeJoinCode(joinCodeParam || ''));
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [className, setClassName] = useState('');
  const [chosenId, setChosenId] = useState('');
  const [pin, setPin] = useState('');
  const [phien, setPhien] = useState<Phien | null>(null);
  const [loi, setLoi] = useState('');
  const [dangGoi, setDangGoi] = useState(false);

  const [assignments, setAssignments] = useState<StudentAssignmentView[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDoc[]>([]);
  const [onlineSubmissions, setOnlineSubmissions] = useState<ExamSubmission[]>([]);
  const [profile, setProfile] = useState<StudentProfileDoc | null>(null);
  const [scores, setScores] = useState<StudentScoreView | null>(null);
  const [notifications, setNotifications] = useState<StudentNotificationDoc[]>([]);
  const [notificationsSeenAt, setNotificationsSeenAt] = useState<string | null>(null);
  const [dangTaiDu, setDangTaiDu] = useState(true);
  const [dangNop, setDangNop] = useState('');
  const [buocNop, setBuocNop] = useState('');
  const [thanhCong, setThanhCong] = useState('');
  /** Bài vừa nộp đang được máy chấm ngầm: trang tự tải lại cho tới khi có kết quả hoặc câu hỏi lại. */
  const [choBaiId, setChoBaiId] = useState('');
  const [canhBao, setCanhBao] = useState('');
  const [loiDuLieu, setLoiDuLieu] = useState('');
  const [practiceSet, setPracticeSet] = useState<PracticeSetResult | null>(null);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
  const [practiceAttempt, setPracticeAttempt] = useState<PracticeAttemptResult | null>(null);
  const [dangLuyen, setDangLuyen] = useState(false);
  const [dangNopLuyen, setDangNopLuyen] = useState(false);
  const [loiLuyen, setLoiLuyen] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  // Ảnh mới chọn chỉ nằm trên máy em: đóng tab/tải lại lúc chưa nộp (hoặc đang tải lên) là mất bài → trình duyệt hỏi lại.
  const coBaiChuaGui = pendingFiles.length > 0 || dangNop !== '';
  useEffect(() => {
    if (!coBaiChuaGui) return;
    const giuLai = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', giuLai);
    return () => window.removeEventListener('beforeunload', giuLai);
  }, [coBaiChuaGui]);
  // Gộp thông báo đã lưu (bị xoá bài) với các việc suy ra từ chính bài nộp.
  const notificationFeed = useMemo(
    () => buildStudentFeed({ submissions, assignments, notifications }),
    [submissions, assignments, notifications],
  );
  const uploadRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<string | null>(null);
  const targetSupplementRef = useRef<string | null>(null);

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
    if (phien) clearStoredPractice(phien);
    setPhien(null);
    setRoster([]);
    setAssignments([]);
    setSubmissions([]);
    setOnlineSubmissions([]);
    setProfile(null);
    setScores(null);
    setChosenId('');
    setPracticeSet(null);
    setPracticeAnswers({});
    setPracticeAttempt(null);
    setPendingFiles([]);
    targetRef.current = null;
    targetSupplementRef.current = null;
    setStage('nhap-ma-lop');
  };

  const layBaiLuyen = async () => {
    if (!phien) return;
    setLoiLuyen('');
    setDangLuyen(true);
    try {
      const ket = await fetchPractice();
      const answers = Object.fromEntries(ket.questions.map(question => [question.id, '']));
      setPracticeSet(ket);
      setPracticeAnswers(answers);
      setPracticeAttempt(ket.attempt || null);
      if (ket.setId) writeStoredPractice(phien, { setId: ket.setId, answers });
      if (ket.questions.length === 0) setLoiLuyen(ket.reason || 'Chưa có chủ đề nào để luyện thêm.');
    } catch (error) {
      setLoiLuyen(error instanceof Error ? error.message : 'Không lấy được bài luyện.');
    } finally {
      setDangLuyen(false);
    }
  };

  const capNhatCauTraLoi = (questionId: string, answer: string) => {
    if (!phien || !practiceSet) return;
    setPracticeAnswers(previous => {
      const answers = { ...previous, [questionId]: answer };
      writeStoredPractice(phien, {
        setId: practiceSet.setId,
        attemptId: practiceAttempt?.attemptId,
        answers,
      });
      return answers;
    });
  };

  const nopBaiLuyen = async () => {
    if (!phien || !practiceSet?.setId) return;
    setLoiLuyen('');
    setDangNopLuyen(true);
    try {
      const ket = await submitPractice(practiceSet.setId, practiceAnswers, practiceAttempt?.attemptId);
      setPracticeAttempt(ket);
      writeStoredPractice(phien, {
        setId: practiceSet.setId,
        attemptId: ket.attemptId,
        answers: practiceAnswers,
      });
      if (ket.status === 'error') setLoiLuyen(ket.errorMessage || 'Chưa chấm được bài luyện. Em có thể thử lại.');
    } catch (error) {
      setLoiLuyen(error instanceof Error ? error.message : 'Không nộp được bài luyện.');
    } finally {
      setDangNopLuyen(false);
    }
  };

  const chonAnh = (assignmentId: string | null, supplementOf?: string) => {
    const normalizedSupplementOf = supplementOf || null;
    if (pendingFiles.length > 0 && (
      targetRef.current !== assignmentId
      || targetSupplementRef.current !== normalizedSupplementOf
    )) {
      setLoi('Em đang có tệp chờ nộp cho bài khác. Hãy nộp hoặc xóa bộ tệp hiện tại trước nhé.');
      return;
    }
    setLoi('');
    targetRef.current = assignmentId;
    targetSupplementRef.current = normalizedSupplementOf;
    uploadRef.current?.click();
  };

  const themAnhCho = () => {
    if (pendingFiles.length === 0) return;
    setLoi('');
    uploadRef.current?.click();
  };

  const taiDuLieu = useCallback(async () => {
    if (!phien) return;
    setDangTaiDu(true);
    try {
      const [bai, nop, baiOnline, hoSo, thongBao, soDiem] = await Promise.all([
        fetchStudentAssignments(),
        fetchStudentSubmissions(),
        fetchStudentOnlineSubmissions(),
        getDoc(doc(db, STUDENT_PROFILES_COL, phien.studentId)),
        // Chuông hỏng không được làm hỏng cả màn hình bài tập.
        layThongBaoHocSinh().catch(() => [] as StudentNotificationDoc[]),
        // Bảng điểm cũng vậy: lỗi thì ẩn điểm thi, không chặn việc nộp bài.
        fetchStudentScoreBook().catch(() => null),
      ]);
      setAssignments(bai);
      setSubmissions(nop);
      setOnlineSubmissions(baiOnline);
      setProfile(hoSo.exists() ? (hoSo.data() as StudentProfileDoc) : null);
      setNotifications(thongBao);
      setScores(soDiem);
      setLoiDuLieu('');

      const stored = readStoredPractice(phien);
      if (stored) {
        try {
          const savedPractice = await fetchPractice(stored.setId, stored.attemptId);
          setPracticeSet(savedPractice);
          setPracticeAnswers(stored.answers);
          setPracticeAttempt(savedPractice.attempt || null);
          if (savedPractice.attempt?.attemptId && savedPractice.attempt.attemptId !== stored.attemptId) {
            writeStoredPractice(phien, { ...stored, attemptId: savedPractice.attempt.attemptId });
          }
        } catch (error) {
          const status = (error as { status?: number })?.status;
          // Chỉ xoá con trỏ khi server xác nhận set không còn/không thuộc phiên; lỗi mạng phải
          // giữ lại để lần tải sau còn cơ hội khôi phục bài và câu trả lời đang viết.
          console.warn('Không khôi phục được bài luyện cũ', error);
          if (status === 403 || status === 404) {
            clearStoredPractice(phien);
            setPracticeSet(null);
            setPracticeAnswers({});
            setPracticeAttempt(null);
          } else {
            setLoiLuyen('Chưa tải lại được bài luyện cũ. Kiểm tra mạng rồi bấm thử lại.');
          }
        }
      }
    } catch (error) {
      console.error('Không tải được dữ liệu cổng học sinh', error);
      setLoiDuLieu('Không tải được dữ liệu từ máy chủ. Kiểm tra kết nối mạng rồi bấm thử lại nhé.');
    } finally {
      setDangTaiDu(false);
    }
  }, [phien]);

  useEffect(() => {
    if (stage !== 'dashboard') return;
    // Đọc mốc đã xem của đúng em này trên máy này trước khi tính huy hiệu chưa đọc.
    if (phien) setNotificationsSeenAt(readNotificationsSeenAt(phien));
    void taiDuLieu();
  }, [stage, phien, taiDuLieu]);

  // Bảng điểm tự cập nhật khi thầy cô chấm xong bài hoặc em nộp bài: làm mới riêng bảng điểm (nhẹ) mỗi 30 giây khi tab đang mở.
  useEffect(() => {
    if (stage !== 'dashboard' || !phien) return undefined;
    const lamMoi = () => {
      if (document.visibilityState !== 'visible') return;
      fetchStudentScoreBook().then(setScores).catch(() => { /* giữ bảng điểm đang hiện */ });
    };
    const timer = window.setInterval(lamMoi, 30_000);
    document.addEventListener('visibilitychange', lamMoi);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', lamMoi); };
  }, [stage, phien]);

  useEffect(() => {
    if (!choBaiId) return undefined;
    const batDau = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - batDau > CHO_CHAM_TOI_DA_MS) { setChoBaiId(''); return; }
      void taiDuLieu();
    }, CHO_CHAM_MS);
    return () => window.clearInterval(timer);
  }, [choBaiId, taiDuLieu]);

  useEffect(() => {
    if (!choBaiId) return;
    const baiDangCho = submissions.find(item => item.id === choBaiId);
    if (baiDangCho && baiDangCho.status !== 'grading' && baiDangCho.status !== 'submitted') {
      setChoBaiId('');
      setThanhCong(baiDangCho.grade?.awaitingClarification
        ? 'Máy cần em xác nhận vài câu — em trả lời ở khung màu vàng đầu trang nhé.'
        : baiDangCho.status === 'graded' ? 'Máy đã đọc xong bài của em. Em chờ thầy cô duyệt rồi xem điểm và nhận xét nhé!' : '');
    }
  }, [choBaiId, submissions]);

  const nopBai = async (files: readonly File[]) => {
    if (!phien) return;
    const chon = files.slice(0, MAX_ANH);
    const mucTieu = targetRef.current;
    const supplementOf = targetSupplementRef.current;
    let submitted = false;
    setLoi('');
    setCanhBao('');
    setThanhCong('');
    setDangNop(mucTieu || 'tu-do');
    try {
      const images: string[] = [];
      const rawFiles: File[] = [];
      const textParts: string[] = [];
      for (let i = 0; i < chon.length; i += 1) {
        const file = chon[i];
        if (file.size > MAX_RAW_FILE_BYTES) {
          throw new Error(`${file.name} vượt quá giới hạn 20 MB. Em chọn file nhỏ hơn rồi thử lại nhé.`);
        }
        setBuocNop(chon.length > 1 ? `Đang chuẩn bị tệp ${i + 1}/${chon.length}...` : 'Đang chuẩn bị bài...');

        // PDF: tach thanh tung trang anh roi cham nhu anh thuong. Duong cham dung Gemini Vision
        // nen phai la anh; tach o day thi may chu khong phai biet gi ve PDF.
        // Giữ thêm file gốc để giáo viên mở khi cần đối chiếu trang PDF.
        if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
          const { pdfToImages } = await import('../utils/examImportUtils');
          const trang = await pdfToImages(file);
          if (trang.length === 0) throw new Error(`Không đọc được trang nào trong ${file.name}.`);
          images.push(...trang);
          rawFiles.push(file);
        } else if (/\.doc$/i.test(file.name)) {
          throw new Error('Định dạng .doc cũ chưa được hỗ trợ ổn định. Em lưu lại thành .docx hoặc PDF rồi nộp lại nhé.');
        } else if (/\.docx$/i.test(file.name) || file.type.includes('wordprocessingml')) {
          const { extractTextFromWord } = await import('../utils/fileUtils');
          const text = (await extractTextFromWord(file)).trim();
          if (!text) throw new Error(`Không đọc được nội dung trong ${file.name}.`);
          textParts.push(text.slice(0, MAX_STUDENT_TEXT_CHARS));
          rawFiles.push(file);
        } else {
          images.push(await nenAnhBaiLam(file));
        }
      }
      if (images.length === 0 && rawFiles.length === 0) throw new Error('Không có bài nào để nộp.');
      if (images.length > MAX_ANH) images.length = MAX_ANH;
      setBuocNop('Đang tải bài lên máy chủ...');
      const submission = await submitHomework({
        classId: phien.classId,
        studentId: phien.studentId,
        teacherId: phien.teacherId,
        assignmentId: mucTieu,
        supplementOf: supplementOf || undefined,
        images,
        rawFiles,
        textContent: textParts.join('\n\n').slice(0, MAX_STUDENT_TEXT_CHARS),
      });
      submitted = true;
      setPendingFiles([]);
      targetRef.current = null;
      targetSupplementRef.current = null;
      const tenBai = mucTieu
        ? assignments.find(a => a.id === mucTieu)?.title || 'bài được giao'
        : 'bài tự nộp';
      setThanhCong(`${supplementOf ? 'Đã bổ sung ảnh cho' : 'Đã nộp'} "${tenBai}" thành công lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`);

      if (!mucTieu) {
        setBuocNop('Đã nộp! Máy đang chấm bài...');
        try {
          const ketQua = await gradeOneSubmission(submission.id, 'quick');
          if (ketQua.pending) { setThanhCong(DANG_CHAM_NGAM); setChoBaiId(submission.id); }
        } catch (error) {
          console.error('Chấm bài tự do chưa xong', error);
          setCanhBao('Bài đã nộp thành công nhưng máy chưa chấm được ngay — thầy cô sẽ chấm giúp em sau.');
        }
      } else {
        const bai = assignments.find(a => a.id === mucTieu);
        if (bai) {
          // Quét bài NGAY lúc nộp (không hỏi em): máy chỉ đọc để tìm chỗ chưa rõ và hỏi lại em. Em KHÔNG thấy điểm —
          // điểm và nhận xét chỉ hiện sau khi thầy cô duyệt.
          setBuocNop(supplementOf ? 'Đã bổ sung ảnh! Máy đang đọc lại bài...' : 'Đã nộp! Máy đang đọc bài để xem chỗ nào chưa rõ...');
          try {
            const ketQua = await gradeOneSubmission(submission.id, 'quick');
            if (ketQua.pending) setChoBaiId(submission.id);
            setThanhCong(ketQua.pending
              ? DANG_CHAM_NGAM
              : `Đã nộp "${tenBai}". Máy đã đọc xong — nếu có chỗ chưa rõ, máy sẽ hỏi em ở đầu trang; còn lại em chờ thầy cô duyệt rồi xem điểm nhé.`);
          } catch (error) {
            console.error('Quét bài giao chưa xong', error);
            setCanhBao('Bài đã nộp thành công nhưng máy chưa đọc được ngay — thầy cô sẽ xử lý giúp em sau.');
          }
        }
        else if (supplementOf) {
          setThanhCong(`Đã bổ sung ảnh cho "${tenBai}" — lượt mới đang chờ thầy cô chấm lại toàn bộ.`);
        }
      }
      await taiDuLieu();
    } catch (error) {
      console.error('Không nộp được bài', error);
      setLoi(dichLoiNopBai(error));
    } finally {
      setDangNop('');
      setBuocNop('');
      if (!submitted) {
        targetRef.current = mucTieu;
        targetSupplementRef.current = supplementOf;
      }
    }
  };

  const xuLyChonFile = (event: ChangeEvent<HTMLInputElement>) => {
    // FileList gắn SỐNG với ô input: phải sao chép trước khi reset để handler không nhận mảng rỗng.
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    const nextFiles = appendPendingFiles(pendingFiles, files, MAX_ANH);
    setPendingFiles(nextFiles);
    setLoi('');
    if (nextFiles.length < pendingFiles.length + files.length) {
      setCanhBao(`Em đã chọn quá ${MAX_ANH} tệp. Hệ thống giữ ${MAX_ANH} tệp đầu tiên.`);
    } else {
      setCanhBao('');
    }
  };

  const xoaAnhCho = (index: number) => {
    const nextFiles = removePendingFile(pendingFiles, index);
    setPendingFiles(nextFiles);
    setLoi('');
    setCanhBao('');
    if (nextFiles.length === 0) {
      targetRef.current = null;
      targetSupplementRef.current = null;
    }
  };

  const nopAnhCho = () => {
    if (pendingFiles.length === 0) {
      setLoi('Em hãy chụp hoặc chọn ít nhất một tệp trước khi nộp nhé.');
      return;
    }
    void nopBai(pendingFiles);
  };

  // Em chọn mã đề khi máy chưa đọc được: máy đọc tiếp ngay, điểm vẫn chờ thầy cô duyệt.
  const chonMaDe = async (submissionId: string, examCode: string) => {
    const ketQua = await answerExamCode(submissionId, examCode);
    if (ketQua.pending) setChoBaiId(submissionId);
    setThanhCong(ketQua.pending
      ? DANG_CHAM_NGAM
      : `Đã nhận mã đề ${examCode}. Máy đã đọc xong — nếu có chỗ chưa rõ, máy sẽ hỏi em ở đầu trang; còn lại em chờ thầy cô duyệt rồi xem điểm nhé.`);
    await taiDuLieu();
  };

  const moChiTiet = (assignment: AssignmentDoc | undefined, submission?: SubmissionDoc) => {
    if (assignment?.type === 'exam') {
      navigate(`/lop/${encodeURIComponent(joinCode)}/exam/${encodeURIComponent(assignment.id)}`);
      return;
    }
    const title = assignment?.title || 'Bài tự nộp';
    const grade = submission?.grade;
    if (grade?.awaitingClarification) {
      void Swal.fire({
        icon: 'info',
        title,
        text: 'Máy cần em xác nhận vài câu em viết chưa rõ. Em kéo lên đầu trang để trả lời. Điểm sẽ hiện sau khi thầy cô duyệt.',
        confirmButtonText: 'Đã hiểu',
        confirmButtonColor: '#4f46e5',
      });
      return;
    }
    if (submission?.status === 'graded' && grade && scoreHiddenFromStudent(submission)) {
      void Swal.fire({
        icon: 'info',
        title,
        text: 'Em đã nộp xong. Điểm và nhận xét sẽ hiện sau khi thầy cô duyệt.',
        confirmButtonText: 'Đã hiểu',
        confirmButtonColor: '#4f46e5',
      });
      return;
    }
    const isGraded = submission?.status === 'graded' && grade;
    const isErrorNoGrade = submission?.status === 'error' && !grade;
    const isErrorWithGrade = submission?.status === 'graded' && grade && submission.lastGradingError;
    const approvalLabel = grade?.teacherApproved
      ? (grade.approvalSource === 'student_ai' || grade.approvalSource === 'auto_timeout' ? ' (AI tự duyệt)' : ' (Đã duyệt GV)')
      : (grade ? ' (Chờ GV duyệt)' : '');
    // Bài kiểm tra định kì: không nêu điểm AI chấm lại — điểm chính thức là điểm thầy cô chấm trên bài giấy.
    const scoreText = grade && assignment?.periodicTest
      ? 'Đã phân tích từng câu (điểm chính thức là điểm thầy cô chấm trên bài giấy)'
      : `${grade?.score ?? 0}/${grade?.maxScore ?? 10} điểm`;
    const text = isGraded
      ? `${scoreText}${approvalLabel}${grade.feedback ? `\n\n${grade.feedback}` : ''}`
      : isErrorWithGrade
        ? `Đã chấm: ${scoreText}${approvalLabel}${grade.feedback ? `\n\n${grade.feedback}` : ''}\n\n⚠️ Lần chấm lại chưa thành công; điểm hiện tại vẫn được giữ nguyên.${submission.lastGradingError ? `\nChi tiết: ${submission.lastGradingError}` : ''}`
      : isErrorNoGrade
        ? submission.errorMessage || 'Lần nộp trước chưa xử lý được. Em có thể nộp lại.'
        : submission?.status === 'grading' ? 'Máy đang chấm bài. Em có thể quay lại sau ít phút.' : 'Bài đã lên máy chủ và đang chờ thầy cô xử lý.';
    const icon = isErrorNoGrade ? 'warning' : (isErrorWithGrade ? 'warning' : 'info');
    void Swal.fire({ icon, title, text, confirmButtonText: 'Đã hiểu', confirmButtonColor: '#4f46e5' });
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
  const pendingAssignmentTitle = targetRef.current
    ? `${assignments.find(assignment => assignment.id === targetRef.current)?.title || 'Bài được giao'}${targetSupplementRef.current ? ' — bổ sung ảnh, chấm lại toàn bộ' : ''}`
    : 'Bài tự nộp';
  return (
    <StudentPortalDashboard
      session={{ studentId: phien.studentId, studentName: phien.studentName, className: phien.className }}
      assignments={assignments}
      submissions={submissions}
      onlineSubmissions={onlineSubmissions}
      profile={profile}
      scores={scores}
      loading={dangTaiDu}
      uploadingId={dangNop}
      uploadStep={buocNop}
      successMessage={thanhCong}
      warningMessage={canhBao}
      actionError={loi}
      dataError={loiDuLieu}
      practiceSet={practiceSet}
      practiceAnswers={practiceAnswers}
      practiceAttempt={practiceAttempt}
      loadingPractice={dangLuyen}
      submittingPractice={dangNopLuyen}
      practiceError={loiLuyen}
      uploadRef={uploadRef}
      pendingFiles={pendingFiles}
      pendingAssignmentTitle={pendingFiles.length > 0 ? pendingAssignmentTitle : null}
      maxPendingFiles={MAX_ANH}
      onFileChange={xuLyChonFile}
      onChooseImage={chonAnh}
      onAddMoreImages={themAnhCho}
      onRemovePendingFile={xoaAnhCho}
      onSubmitPendingFiles={nopAnhCho}
      onOpenAssignment={moChiTiet}
      onAnswerExamCode={chonMaDe}
      onSignOut={() => void dangXuat()}
      onReload={() => void taiDuLieu()}
      onLoadPractice={() => void layBaiLuyen()}
      onPracticeAnswerChange={capNhatCauTraLoi}
      onSubmitPractice={() => void nopBaiLuyen()}
      notifications={notificationFeed}
      notificationsLastSeenAt={notificationsSeenAt}
      onNotificationsOpened={seenAt => {
        setNotificationsSeenAt(seenAt);
        if (phien) writeNotificationsSeenAt(phien, seenAt);
      }}
      onDismissSuccess={() => setThanhCong('')}
    />
  );
};
