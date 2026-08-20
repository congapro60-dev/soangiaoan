import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AlertTriangle, ArrowLeft, BookOpenCheck, Camera, Clock3, Loader2, LogOut, Target, TrendingUp } from 'lucide-react';
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

const MAX_ANH = 4;

const docAnh = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error(`Không đọc được ảnh ${file.name}`));
  reader.readAsDataURL(file);
});

type Stage = 'dang-tai' | 'nhap-ma-lop' | 'chon-ten' | 'dashboard';

interface Phien {
  studentId: string;
  classId: string;
  teacherId: string;
  className: string;
  studentName: string;
}

const RANG_BUOC = 'rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white';

const formatHan = (iso?: string): string => {
  if (!iso) return 'Không đặt hạn';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Không đặt hạn';
  return `Hạn nộp: ${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

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
    setLoi('');
    setDangNop(targetRef.current || 'tu-do');
    try {
      const images = await Promise.all(chon.map(docAnh));
      const submission = await submitHomework({
        classId: phien.classId,
        studentId: phien.studentId,
        teacherId: phien.teacherId,
        assignmentId: targetRef.current,
        images,
      });
      // Bài tự nộp thì chấm luôn, không phải chờ thầy cô bấm.
      if (!targetRef.current) {
        await gradeOneSubmission(submission.id).catch(error => {
          setLoi(error instanceof Error ? error.message : 'Nộp được nhưng chưa chấm được, thầy cô sẽ chấm sau.');
        });
      }
      await taiDuLieu();
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Không nộp được bài.');
    } finally {
      setDangNop('');
      targetRef.current = null;
    }
  };

  const taiDuLieu = useCallback(async () => {
    if (!phien) return;
    {
      const [bai, nop, hoSo] = await Promise.all([
        getDocs(query(
          collection(db, ASSIGNMENTS_COL),
          where('classId', '==', phien.classId),
          where('isOpen', '==', true),
          orderBy('createdAt', 'desc'),
          limit(50),
        )).catch(() => null),
        getDocs(query(
          collection(db, SUBMISSIONS_COL),
          where('studentId', '==', phien.studentId),
          orderBy('createdAt', 'desc'),
          limit(50),
        )).catch(() => null),
        getDoc(doc(db, STUDENT_PROFILES_COL, phien.studentId)).catch(() => null),
      ]);
      setAssignments(bai ? bai.docs.map(d => d.data() as AssignmentDoc) : []);
      setSubmissions(nop ? nop.docs.map(d => d.data() as SubmissionDoc) : []);
      setProfile(hoSo?.exists() ? (hoSo.data() as StudentProfileDoc) : null);
    }
  }, [phien]);

  useEffect(() => {
    if (stage === 'dashboard') void taiDuLieu();
  }, [stage, taiDuLieu]);

  if (stage === 'dang-tai') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (stage !== 'dashboard') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-xl">
          <h1 className="text-2xl font-black text-slate-900">Cổng học sinh</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {stage === 'nhap-ma-lop' ? 'Nhập mã lớp thầy cô cho em.' : `Lớp ${className} — chọn tên em rồi nhập mã PIN.`}
          </p>

          {loi && (
            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {loi}
            </p>
          )}

          {stage === 'nhap-ma-lop' ? (
            <div className="mt-5 space-y-3">
              <input
                value={joinCode}
                onChange={e => setJoinCode(normalizeJoinCode(e.target.value))}
                placeholder="VD: ACDEFG"
                maxLength={6}
                className={`${RANG_BUOC} w-full text-center text-2xl tracking-[0.4em]`}
              />
              <button
                onClick={() => moLop(joinCode)}
                disabled={dangGoi || joinCode.length < 4}
                className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {dangGoi ? 'Đang mở lớp...' : 'Vào lớp'}
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <select value={chosenId} onChange={e => setChosenId(e.target.value)} className={`${RANG_BUOC} w-full`}>
                <option value="">— Chọn tên em —</option>
                {roster.map(s => <option key={s.studentId} value={s.studentId}>{s.name}</option>)}
              </select>
              <input
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Mã PIN 4 số"
                inputMode="numeric"
                className={`${RANG_BUOC} w-full text-center text-2xl tracking-[0.5em]`}
              />
              <button
                onClick={dangNhap}
                disabled={dangGoi || !chosenId || pin.length !== 4}
                className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {dangGoi ? 'Đang kiểm tra...' : 'Vào học'}
              </button>
              <button onClick={() => { setStage('nhap-ma-lop'); setLoi(''); }} className="flex w-full items-center justify-center gap-2 py-2 text-sm font-bold text-slate-500">
                <ArrowLeft className="h-4 w-4" /> Đổi mã lớp
              </button>
            </div>
          )}
        </div>
      </div>
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
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 font-black text-blue-700">
            {phien?.studentName.charAt(0) || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-black text-slate-900">{phien?.studentName}</p>
            <p className="truncate text-sm font-semibold text-slate-500">Lớp {phien?.className}</p>
          </div>
          <button onClick={dangXuat} title="Đăng xuất" aria-label="Đăng xuất" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
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

        {loi && (
          <p className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {loi}
          </p>
        )}

        <section className="grid grid-cols-3 gap-3">
          {[
            { label: 'Bài chưa nộp', value: String(chuaNop.length) },
            { label: 'Điểm trung bình', value: diemTB },
            { label: 'Bài đã chấm', value: String(daCham.length) },
          ].map(item => (
            <div key={item.label} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-500">{item.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{item.value}</p>
            </div>
          ))}
        </section>

        <section>
          <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Bài được giao</h2>
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            {chuaNop.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm font-semibold text-slate-400">Em đã nộp hết bài được giao. Nghỉ ngơi chút nhé.</p>
            ) : chuaNop.map(a => (
              <div key={a.id} className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0">
                <Clock3 className="h-5 w-5 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900">{a.title}</p>
                  <p className="text-sm font-semibold text-slate-500">{formatHan(a.dueAt)}</p>
                </div>
                <button
                  onClick={() => chonAnh(a.id)}
                  disabled={dangNop !== ''}
                  className="shrink-0 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {dangNop === a.id
                    ? 'Đang nộp...'
                    : <><Camera className="mr-1 inline h-4 w-4" /> Nộp ảnh</>}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Bài đã chấm</h2>
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            {daCham.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm font-semibold text-slate-400">Chưa có bài nào được chấm.</p>
            ) : daCham.map(s => (
              <div key={s.id} className="border-b border-slate-100 px-5 py-4 last:border-b-0">
                <div className="flex items-baseline gap-3">
                  <p className="flex-1 truncate font-bold text-slate-900">
                    {assignments.find(a => a.id === s.assignmentId)?.title || 'Bài em tự nộp'}
                  </p>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
                    {s.grade?.score} / {s.grade?.maxScore}
                  </span>
                </div>
                {s.grade?.feedback && <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{s.grade.feedback}</p>}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Hồ sơ của em</h2>
          {!profile || profile.topics.length === 0 ? (
            <p className="rounded-3xl bg-white px-5 py-8 text-center text-sm font-semibold text-slate-400 shadow-sm">
              Sau vài bài đã chấm, chỗ này sẽ ghi em đang vững phần nào và nên luyện thêm phần nào.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="mb-2 flex items-center gap-2 text-sm font-black text-emerald-700"><TrendingUp className="h-4 w-4" /> Em đang vững</p>
                <p className="text-sm font-semibold leading-6 text-slate-700">{vung.map(t => t.topic).join(' · ') || 'Chưa đủ dữ liệu.'}</p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="mb-2 flex items-center gap-2 text-sm font-black text-amber-700"><Target className="h-4 w-4" /> Nên luyện thêm</p>
                <p className="text-sm font-semibold leading-6 text-slate-700">{yeu.map(t => t.topic).join(' · ') || 'Chưa đủ dữ liệu.'}</p>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Luyện thêm theo chủ đề</h2>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            {luyenTap.length === 0 ? (
              <>
                <p className="text-sm font-semibold text-slate-500">
                  Máy sẽ ra bài luyện bám đúng chủ đề em còn vướng, dựa trên các bài đã chấm.
                </p>
                <button
                  onClick={layBaiLuyen}
                  disabled={dangLuyen}
                  className="mt-3 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {dangLuyen ? 'Đang soạn bài...' : 'Lấy bài luyện'}
                </button>
              </>
            ) : (
              <ol className="space-y-4">
                {luyenTap.map((q, i) => (
                  <li key={`${i}-${q.question.slice(0, 20)}`}>
                    <p className="font-bold text-slate-900">Bài {i + 1}. {q.question}</p>
                    {q.hint && <p className="mt-1 text-sm font-semibold text-slate-500">Gợi ý: {q.hint}</p>}
                    {q.solution && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-sm font-bold text-blue-600">Xem lời giải</summary>
                        <p className="mt-1 whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">{q.solution}</p>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-6 text-center">
          <BookOpenCheck className="mx-auto mb-2 h-6 w-6 text-slate-400" />
          <p className="text-sm font-bold text-slate-600">Nộp bài tự do</p>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            Chụp bài tập ở nhà, chụp cả đề lẫn bài làm trong ảnh để máy đọc được em phải làm gì.
          </p>
          <button
            onClick={() => chonAnh(null)}
            disabled={dangNop !== ''}
            className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {dangNop === 'tu-do' ? 'Đang chấm, đợi chút...' : <><Camera className="mr-1 inline h-4 w-4" /> Chụp bài nhờ chấm</>}
          </button>
        </section>
      </main>
    </div>
  );
};
