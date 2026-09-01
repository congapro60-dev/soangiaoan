import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { auth } from '../../lib/firebase';
import type { AdaptiveLesson } from '../../lib/adaptive/types';
import type { ClassDoc } from '../../lib/classroom/types';
import { listTeacherClasses } from '../../lib/classroom/classroomService';
import { getPilotLiveLessonDefinition, validateLiveLessonDefinition } from '../../lib/liveLesson/definition';
import type { LiveLessonDefinition, LiveLessonSession } from '../../lib/liveLesson/types';
import { LiveLessonDefinitionError } from '../../lib/liveLesson/types';
import { buildLiveLessonDefinitionFromV4, getBanToanV4PackageForLesson } from '../../lib/liveLesson/v4';
import { createLiveLessonSession } from '../../services/liveLessonService';
import { getLessonFromFirestore } from '../../services/adaptiveLessonService';
import type { TeacherClass } from '../../types';

type ClassContext = ClassDoc | TeacherClass;

export interface LiveLessonLauncherProps {
  lesson?: AdaptiveLesson | null;
  lessonId?: string | null;
  user?: User | null;
  classes?: ClassContext[];
  onClose?: () => void;
}

export interface LiveLessonUrls {
  teacher: string;
  tv: string;
  student: string;
}

export interface LiveLessonUrlOptions {
  definitionKey?: string;
  lessonId?: string;
}

export const buildLiveLessonUrls = (
  sessionId: string,
  baseUrl = '',
  studentClassId = '',
  studentJoinCode = '',
  options?: LiveLessonUrlOptions,
): LiveLessonUrls => {
  const prefix = baseUrl.replace(/\/$/, '');
  const path = `/adaptive-live/${encodeURIComponent(sessionId)}`;
  const withDefinitionContext = (mode: 'teacher' | 'tv' | 'student') => {
    const query = new URLSearchParams({ mode });
    if (options?.definitionKey?.trim()) query.set('definitionKey', options.definitionKey.trim());
    if (options?.lessonId?.trim()) query.set('lessonId', options.lessonId.trim());
    return query;
  };
  const teacherQuery = withDefinitionContext('teacher');
  const tvQuery = withDefinitionContext('tv');
  const studentQuery = withDefinitionContext('student');
  if (studentClassId.trim()) studentQuery.set('classId', studentClassId);
  if (studentJoinCode.trim()) studentQuery.set('joinCode', studentJoinCode);
  return {
    teacher: `${prefix}${path}?${teacherQuery.toString()}`,
    tv: `${prefix}${path}?${tvQuery.toString()}`,
    student: `${prefix}${path}?${studentQuery.toString()}`,
  };
};

export const validateLiveLessonLaunch = ({ lessonReady, classId, joinCode }: { lessonReady: boolean; classId: string; joinCode?: string }): { ok: true } | { ok: false; message: string } => {
  if (!lessonReady) return { ok: false, message: 'Không thể mở tiết trực tiếp vì định nghĩa pilot chưa sẵn sàng.' };
  if (!classId.trim()) return { ok: false, message: 'Chưa có lớp đã đồng bộ và thuộc tài khoản giáo viên để mở tiết trực tiếp.' };
  if (!joinCode?.trim()) return { ok: false, message: 'Lớp chưa có mã lớp để mở cổng học sinh. Hãy đồng bộ hoặc cấp mã lớp trước.' };
  return { ok: true };
};

const isServerClass = (item: unknown): item is ClassDoc => {
  if (!item || typeof item !== 'object') return false;
  const value = item as Partial<ClassDoc>;
  return typeof value.id === 'string'
    && typeof value.teacherId === 'string'
    && typeof value.name === 'string'
    && typeof value.track === 'string'
    && typeof value.grade === 'string'
    && typeof value.joinCode === 'string'
    && typeof value.studentCount === 'number'
    && Number.isFinite(value.studentCount)
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string';
};

export const isAuthoritativeServerClassList = (items: unknown[] | undefined): items is ClassDoc[] => Boolean(items && items.length > 0 && items.every(isServerClass));

const getOwnedSynchronizedClasses = (items: ClassContext[], uid: string): ClassDoc[] => items.filter(isServerClass).filter(item => item.teacherId === uid);

export const formatLiveLessonLaunchError = (error: unknown): string => {
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : '';
  if (code.toLowerCase().split('/').pop() === 'permission-denied') {
    return 'Firestore từ chối thao tác. Hãy kiểm tra lớp đã đồng bộ thuộc đúng tài khoản giáo viên và Rules realtime đã được triển khai; dữ liệu lớp cũ trên máy không đủ để mở phiên.';
  }
  return error instanceof Error ? error.message : 'Không thể mở phiên tiết trực tiếp.';
};

export const getPilotDefinitionForLesson = (lesson: AdaptiveLesson): LiveLessonDefinition => {
  if (lesson.status !== 'published') {
    throw new LiveLessonDefinitionError('LIVE_LESSON_NOT_PUBLISHED', 'Chỉ bài học đã xuất bản mới có thể mở tiết trực tiếp.');
  }
  const definition = validateLiveLessonDefinition(getPilotLiveLessonDefinition());
  if (lesson.id !== definition.lessonId || lesson.title.trim() !== definition.title.trim() || lesson.durationMinutes !== definition.durationSeconds / 60) {
    throw new LiveLessonDefinitionError('LIVE_PILOT_MISMATCH', 'Bài học này chưa có định nghĩa runtime pilot tương ứng; không tạo phiên cho nội dung chưa được chuẩn hoá.');
  }
  return definition;
};

export const getLiveDefinitionForLesson = (lesson: AdaptiveLesson): LiveLessonDefinition => {
  if (lesson.status !== 'published') {
    throw new LiveLessonDefinitionError('LIVE_LESSON_NOT_PUBLISHED', 'Chỉ bài học đã xuất bản mới có thể mở tiết trực tiếp.');
  }

  const binding = getBanToanV4PackageForLesson(lesson);
  if (binding) {
    return buildLiveLessonDefinitionFromV4(binding.contract, lesson.id);
  }
  if (lesson.id === 'tds-g10-30-pilot') return getPilotDefinitionForLesson(lesson);
  throw new LiveLessonDefinitionError('LIVE_V4_PACKAGE_NOT_FOUND', 'Bài học chưa có gói V4 Ban Toán khớp source key; chưa thể mở tiết trực tiếp.');
};

const copyText = async (value: string): Promise<void> => {
  if (!navigator.clipboard) throw new Error('Trình duyệt không cho phép sao chép liên kết.');
  await navigator.clipboard.writeText(value);
};

const LinkRow = ({ label, url }: { label: string; url: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await copyText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
      <span className="w-14 shrink-0 text-xs font-black uppercase text-slate-500">{label}</span>
      <a className="min-w-0 flex-1 break-all text-sm font-semibold text-blue-700 underline" href={url} target="_blank" rel="noreferrer">{url}</a>
      <button type="button" onClick={() => void copy()} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-blue-50">{copied ? 'Đã chép' : 'Sao chép'}</button>
    </div>
  );
};

export const LiveLessonLauncher = ({ lesson: selectedLesson, lessonId, user: contextUser, classes, onClose }: LiveLessonLauncherProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [lesson, setLesson] = useState<AdaptiveLesson | null>(selectedLesson ?? null);
  const [definition, setDefinition] = useState<LiveLessonDefinition | null>(null);
  const [availableClasses, setAvailableClasses] = useState<ClassDoc[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [session, setSession] = useState<LiveLessonSession | null>(null);
  const [lessonLoading, setLessonLoading] = useState(Boolean(!selectedLesson && lessonId));
  const [classesLoading, setClassesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setCurrentUser), []);

  useEffect(() => {
    let active = true;
    const loadLesson = async () => {
      setLessonLoading(true);
      setError(null);
      try {
        const loaded = selectedLesson ?? (lessonId ? await getLessonFromFirestore(lessonId) : null);
        if (!loaded) throw new Error('Không tìm thấy bài học phân hoá để mở tiết trực tiếp.');
        const liveDefinition = getLiveDefinitionForLesson(loaded);
        if (!active) return;
        setLesson(loaded);
        setDefinition(liveDefinition);
      } catch (loadError) {
        if (!active) return;
        setDefinition(null);
        setError(loadError instanceof Error ? loadError.message : 'Không tải được định nghĩa pilot của bài học.');
      } finally {
        if (active) setLessonLoading(false);
      }
    };
    void loadLesson();
    return () => { active = false; };
  }, [lessonId, selectedLesson]);

  useEffect(() => {
    let active = true;
    const loadClasses = async () => {
      const uid = auth.currentUser?.uid ?? currentUser?.uid ?? contextUser?.uid;
      setClassesLoading(true);
      try {
        if (!uid) {
          if (active) setAvailableClasses([]);
          return;
        }
        const serverClasses = isAuthoritativeServerClassList(classes) ? classes : await listTeacherClasses(uid);
        const ownedClasses = getOwnedSynchronizedClasses(serverClasses, uid);
        if (!active) return;
        setAvailableClasses(ownedClasses);
        setSelectedClassId(current => ownedClasses.some(item => item.id === current) ? current : (ownedClasses.length === 1 ? ownedClasses[0].id : ''));
      } catch (loadError) {
        if (active) setError(formatLiveLessonLaunchError(loadError));
      } finally {
        if (active) setClassesLoading(false);
      }
    };
    void loadClasses();
    return () => { active = false; };
  }, [classes, contextUser?.uid, currentUser?.uid]);

  const selectedClass = useMemo(() => availableClasses.find(item => item.id === selectedClassId), [availableClasses, selectedClassId]);
  const definitionKey = lesson ? getBanToanV4PackageForLesson(lesson)?.sourceKey : undefined;
  const urls = session ? buildLiveLessonUrls(
    session.id,
    window.location.origin,
    session.classId,
    selectedClass?.joinCode ?? '',
    definitionKey ? { definitionKey, lessonId: lesson?.id } : undefined,
  ) : null;
  const noOwnedSynchronizedClass = !classesLoading && availableClasses.length === 0;

  const createSession = async () => {
    setError(null);
    const activeUser = auth.currentUser;
    if (!activeUser) {
      setError('Bạn cần đăng nhập bằng tài khoản giáo viên để mở tiết trực tiếp.');
      return;
    }
    const validation = validateLiveLessonLaunch({ lessonReady: Boolean(definition), classId: selectedClass?.id ?? '', joinCode: selectedClass?.joinCode ?? '' });
    if (validation.ok === false) {
      setError(validation.message);
      return;
    }
    if (selectedClass?.teacherId !== activeUser.uid) {
      setError('Lớp được chọn không thuộc tài khoản giáo viên hiện tại.');
      return;
    }
    setCreating(true);
    try {
      const created = await createLiveLessonSession({ definition: definition!, teacherUid: activeUser.uid, classId: selectedClass.id });
      setSession(created);
    } catch (createError) {
      setError(formatLiveLessonLaunchError(createError));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Mở tiết trực tiếp">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Live lesson V3/V4</p><h2 className="mt-2 text-2xl font-black">Mở tiết trực tiếp</h2><p className="mt-1 text-sm font-semibold text-slate-500">Chỉ mở bài đã xuất bản và có định nghĩa runtime V3/P31 hoặc V4 khớp exact source key; không dò theo tiêu đề.</p></div>
          {onClose && <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng"><X className="h-5 w-5" /></button>}
        </div>
        {lesson && <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4"><p className="text-xs font-black uppercase text-indigo-600">Bài học</p><p className="mt-1 font-black text-indigo-950">{lesson.title}</p><p className="mt-1 text-xs font-semibold text-indigo-700">{lesson.id}</p></div>}
        {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        {!urls && <div className="mt-5 space-y-4"><div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm font-black text-slate-800">Lớp học</p>{classesLoading ? <p className="mt-2 text-sm font-semibold text-slate-500">Đang kiểm tra các lớp đã đồng bộ...</p> : noOwnedSynchronizedClass ? <p className="mt-2 text-sm font-bold text-amber-700">Chưa có lớp đã đồng bộ và thuộc tài khoản này. Hãy đồng bộ lớp trong mục Lớp học trước khi mở tiết trực tiếp.</p> : <select value={selectedClassId} onChange={event => setSelectedClassId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"><option value="">Chọn một lớp</option>{availableClasses.map(item => <option key={item.id} value={item.id}>{item.name} · {item.grade}</option>)}</select>}</div><button type="button" disabled={lessonLoading || classesLoading || creating || !definition || !selectedClass} onClick={() => void createSession()} className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{creating ? 'Đang tạo phiên...' : 'Tạo phiên tiết trực tiếp'}</button></div>}
        {urls && <div className="mt-5 space-y-4"><div className="rounded-2xl border border-green-200 bg-green-50 p-4"><p className="font-black text-green-800">Đã tạo phiên chung: {session?.id}</p><p className="mt-1 text-sm font-semibold text-green-700">Ba liên kết dưới đây dùng cùng một session ID.</p></div><div className="space-y-2"><LinkRow label="GV" url={urls.teacher} /><LinkRow label="TV" url={urls.tv} /><LinkRow label="HS" url={urls.student} /></div><div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 p-5"><QRCodeSVG value={urls.student} size={180} includeMargin /><p className="text-center text-sm font-black text-slate-700">Quét mã để mở giao diện học sinh</p><p className="max-w-xl break-all text-center text-xs font-semibold text-slate-500">{urls.student}</p></div></div>}
      </section>
    </div>
  );
};
