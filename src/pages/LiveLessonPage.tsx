import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useLocation, useParams } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { getPilotLiveLessonDefinition } from '../lib/liveLesson/definition';
import type { LiveLessonDefinition, LiveLessonMode, LiveLessonSession, LivePublicState } from '../lib/liveLesson/types';
import { getLiveLessonSession, subscribeToLivePublicState, subscribeToTeacherSession } from '../services/liveLessonService';
import { TeacherLiveView } from '../components/liveLesson/TeacherLiveView';
import { TvLiveView } from '../components/liveLesson/TvLiveView';
import { StudentLiveView } from '../components/liveLesson/StudentLiveView';

export type TvDefinitionProjection = Pick<LiveLessonDefinition, 'id' | 'lessonId' | 'title' | 'durationSeconds' | 'tvScreens'>;
export type StudentCueProjection = { id: string; studentScreenId: string; responseStepId?: string };
export type StudentDefinitionProjection = Pick<LiveLessonDefinition, 'id' | 'lessonId' | 'title' | 'durationSeconds' | 'tvScreens' | 'studentScreens' | 'allowedStepIds' | 'responseSteps'> & { studentCues: StudentCueProjection[] };
export type LiveLessonDefinitionProjection = LiveLessonDefinition | TvDefinitionProjection | StudentDefinitionProjection;

export const parseLiveLessonMode = (value: string | null): LiveLessonMode | null => value === 'teacher' || value === 'tv' || value === 'student' ? value : null;
export const getStudentLiveContext = (search: string): { expectedClassId: string | null; expectedJoinCode: string | null } => {
  const params = new URLSearchParams(search);
  if (params.get('mode') !== 'student') return { expectedClassId: null, expectedJoinCode: null };
  return {
    expectedClassId: params.get('classId')?.trim() || null,
    expectedJoinCode: params.get('joinCode')?.trim() || null,
  };
};
export const shouldLoadParentLiveLessonSession = (mode: LiveLessonMode): boolean => mode === 'teacher';
export const canLoadParentLiveLessonSession = ({ mode, authReady, userUid }: { mode: LiveLessonMode; authReady: boolean; userUid: string | null | undefined }): boolean => shouldLoadParentLiveLessonSession(mode) && authReady && Boolean(userUid);

export const isTeacherSessionOwner = (session: Pick<LiveLessonSession, 'teacherUid'>, uid: string | null | undefined): boolean => Boolean(uid && session.teacherUid === uid);

export function projectLiveLessonDefinition(definition: LiveLessonDefinition, mode: 'teacher'): LiveLessonDefinition;
export function projectLiveLessonDefinition(definition: LiveLessonDefinition, mode: 'tv'): TvDefinitionProjection;
export function projectLiveLessonDefinition(definition: LiveLessonDefinition, mode: 'student'): StudentDefinitionProjection;
export function projectLiveLessonDefinition(definition: LiveLessonDefinition, mode: LiveLessonMode): LiveLessonDefinitionProjection;
export function projectLiveLessonDefinition(definition: LiveLessonDefinition, mode: LiveLessonMode): LiveLessonDefinitionProjection {
  if (mode === 'teacher') return definition;
  if (mode === 'tv') return { id: definition.id, lessonId: definition.lessonId, title: definition.title, durationSeconds: definition.durationSeconds, tvScreens: definition.tvScreens.map(screen => ({ ...screen })) };
  const stepScreenIds = new Map(definition.responseSteps.map(step => [step.id, step.screenId ?? 'HS0']));
  return {
    id: definition.id,
    lessonId: definition.lessonId,
    title: definition.title,
    durationSeconds: definition.durationSeconds,
    tvScreens: definition.tvScreens.map(screen => ({ ...screen })),
    studentScreens: definition.studentScreens.map(screen => ({ ...screen })),
    allowedStepIds: [...definition.allowedStepIds],
    responseSteps: definition.responseSteps.map(step => ({ ...step, responseTypes: [...step.responseTypes] })),
    studentCues: definition.cues.map(cue => ({ id: cue.id, studentScreenId: cue.responseStepId ? (stepScreenIds.get(cue.responseStepId) ?? 'HS0') : 'HS0', ...(cue.responseStepId ? { responseStepId: cue.responseStepId } : {}) })),
  };
}

export const mergeTeacherSessionSnapshot = (current: LiveLessonSession | null, incoming: LiveLessonSession): LiveLessonSession => (
  !current || incoming.updatedAt >= current.updatedAt ? incoming : current
);

export const getPublicListenerFailureMode = (hasSeenPublicState: boolean): 'initial' | 'reconnect' => hasSeenPublicState ? 'reconnect' : 'initial';

export const getLiveLessonRouteError = ({ mode, session, publicState, definition, userUid }: { mode: string | null; session: LiveLessonSession | null; publicState?: LivePublicState | null; definition?: LiveLessonDefinition | null; userUid?: string | null }): string | null => {
  if (!parseLiveLessonMode(mode)) return 'Chế độ tiết trực tiếp không hợp lệ. Hãy dùng mode=teacher, mode=tv hoặc mode=student.';
  if (mode === 'teacher') {
    if (!session) return 'Không tìm thấy phiên tiết trực tiếp này. Bạn có thể quay lại và mở một phiên mới.';
    if (session.expiresAt <= Date.now()) return 'Phiên tiết trực tiếp đã hết hạn. Hãy yêu cầu giáo viên mở phiên mới.';
  } else {
    if (!publicState) return 'Không tìm thấy trạng thái công khai của phiên. Phiên có thể đã đóng hoặc hết hạn; hãy yêu cầu giáo viên mở phiên mới.';
  }
  if (!definition) return 'Không tải được định nghĩa pilot của phiên. Phiên chưa sẵn sàng để hiển thị.';
  if (mode === 'teacher') {
    if (definition.lessonId !== session!.lessonId) return 'Định nghĩa pilot không khớp với bài học của phiên; phiên bị chặn để tránh hiển thị sai nội dung.';
    if (!userUid) return 'Chế độ giáo viên yêu cầu đăng nhập.';
    if (!isTeacherSessionOwner(session!, userUid)) return 'Tài khoản hiện tại không sở hữu phiên tiết trực tiếp này.';
  }
  return null;
};

const RouteError = ({ message }: { message: string }) => <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900"><section className="w-full max-w-xl rounded-[2rem] border border-amber-200 bg-white p-8 text-center shadow-sm"><p className="text-4xl">⚠️</p><h1 className="mt-3 text-2xl font-black">Không thể mở tiết trực tiếp</h1><p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{message}</p><div className="mt-6 flex justify-center gap-3"><button type="button" onClick={() => window.history.back()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50">Quay lại</button><button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700">Thử lại</button></div></section></main>;

const PlaceholderPanel = ({ mode, projection }: { mode: LiveLessonMode; projection: LiveLessonDefinitionProjection }) => {
  const label = mode === 'teacher' ? 'Giáo viên' : mode === 'tv' ? 'Màn hình TV' : 'Học sinh';
  const screenCount = mode === 'teacher' ? (projection as LiveLessonDefinition).cues.length : mode === 'tv' ? (projection as TvDefinitionProjection).tvScreens.length : (projection as StudentDefinitionProjection).studentScreens.length;
  return <main className="min-h-screen bg-slate-950 p-6 text-white sm:p-10"><section className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-slate-900 p-8 shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Task 5 placeholder</p><h1 className="mt-3 text-3xl font-black">{projection.title}</h1><p className="mt-2 text-sm font-semibold text-slate-300">Chế độ: {label} · {screenCount} màn hình runtime an toàn đã tải.</p><div className="mt-8 rounded-2xl border border-dashed border-slate-600 bg-slate-950/60 p-8 text-center"><p className="text-lg font-black">Giao diện realtime của chế độ {label} sẽ được bổ sung ở Task 6/7.</p><p className="mt-2 text-sm font-semibold text-slate-400">Session đã được kiểm tra quyền sở hữu, trạng thái và thời hạn.</p></div></section></main>;
};

export const LiveLessonPage = () => {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const modeParam = useMemo(() => new URLSearchParams(location.search).get('mode'), [location.search]);
  const mode = parseLiveLessonMode(modeParam);
  const studentContext = useMemo(() => getStudentLiveContext(location.search), [location.search]);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<LiveLessonSession | null>(null);
  const [publicState, setPublicState] = useState<LivePublicState | null>(null);
  const [publicStateError, setPublicStateError] = useState<string | null>(null);
  const [teacherSessionError, setTeacherSessionError] = useState<string | null>(null);
  const [definition, setDefinition] = useState<LiveLessonDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const authDependency = mode === 'teacher' ? `${authReady}:${user?.uid ?? ''}` : 'public';

  useEffect(() => onAuthStateChanged(auth, nextUser => {
    setUser(nextUser);
    setAuthReady(true);
  }), []);

  useEffect(() => {
    let active = true;
    let stopPublicState = () => {};
    let stopTeacherSession = () => {};
    let waitingForPublicState = false;
    let hasSeenPublicState = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      setSession(null);
      setDefinition(null);
      setPublicState(null);
      setPublicStateError(null);
      setTeacherSessionError(null);
      if (!mode) {
        setLoading(false);
        return;
      }
      if (!sessionId) {
        setLoadError('Không có session ID trong liên kết.');
        setLoading(false);
        return;
      }
      if (mode === 'teacher' && !authReady) return;
      if (mode === 'teacher' && !user?.uid) {
        setLoadError('Chế độ giáo viên yêu cầu đăng nhập.');
        setLoading(false);
        return;
      }
      try {
        setDefinition(getPilotLiveLessonDefinition());
        if (canLoadParentLiveLessonSession({ mode, authReady, userUid: user?.uid })) {
          const found = await getLiveLessonSession(sessionId);
          if (!active) return;
          setSession(found);
          setLoading(false);
          if (found) {
            stopTeacherSession = subscribeToTeacherSession(sessionId, nextSession => {
              if (!active) return;
              if (!nextSession) {
                setSession(null);
                setTeacherSessionError('Phiên tiết trực tiếp không còn tồn tại.');
                return;
              }
              setSession(current => mergeTeacherSessionSnapshot(current, nextSession));
              setTeacherSessionError(null);
            }, error => {
              if (!active) return;
              setTeacherSessionError(`Không thể cập nhật trạng thái phiên realtime. (${error.message})`);
            });
          }
        } else {
          waitingForPublicState = true;
          stopPublicState = subscribeToLivePublicState(sessionId, state => {
            if (!active) return;
            if (state) {
              hasSeenPublicState = true;
              setPublicState(state);
              setPublicStateError(null);
            } else if (hasSeenPublicState) {
              setPublicStateError('Không còn đọc được trạng thái công khai. Phiên có thể đã đóng hoặc hết hạn.');
            } else {
              setPublicState(null);
            }
            setLoading(false);
          }, error => {
            if (!active) return;
            const message = `Không thể đọc trạng thái công khai của phiên. Phiên có thể đã đóng hoặc hết hạn. (${error.message})`;
            if (getPublicListenerFailureMode(hasSeenPublicState) === 'reconnect') setPublicStateError(message);
            else setLoadError(message);
            setLoading(false);
          });
        }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Không tải được phiên tiết trực tiếp.');
      } finally {
        if (active && !waitingForPublicState) setLoading(false);
      }
    };
    void load();
    return () => { active = false; stopPublicState(); stopTeacherSession(); };
  }, [authDependency, mode, sessionId]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white"><p className="text-sm font-black">Đang tải phiên tiết trực tiếp...</p></main>;
  if (loadError) return <RouteError message={loadError} />;
  const routeError = getLiveLessonRouteError({ mode: modeParam, session, publicState, definition, userUid: user?.uid });
  if (routeError || !mode || !definition || (mode === 'teacher' && !session) || (mode !== 'teacher' && !publicState)) return <RouteError message={routeError || 'Phiên tiết trực tiếp chưa sẵn sàng.'} />;
  if (mode === 'teacher' && session) {
    return <TeacherLiveView definition={definition} session={session} sessionError={teacherSessionError} onSessionChange={setSession} />;
  }
  if (mode === 'tv' && publicState) {
    const tvDefinition = projectLiveLessonDefinition(definition, 'tv');
    return <TvLiveView definition={tvDefinition} sessionId={sessionId} publicState={publicState} publicStateError={publicStateError} />;
  }
  if (mode === 'student' && publicState) {
    return <StudentLiveView definition={projectLiveLessonDefinition(definition, 'student')} sessionId={sessionId} expectedClassId={studentContext.expectedClassId} expectedJoinCode={studentContext.expectedJoinCode} publicState={publicState} publicStateError={publicStateError} />;
  }
  return <PlaceholderPanel mode={mode} projection={projectLiveLessonDefinition(definition, mode)} />;
};
