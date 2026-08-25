import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import type { StudentDefinitionProjection } from '../../pages/LiveLessonPage';
import type { LiveResponseType, LivePublicState, SubmitLiveResponseInput } from '../../lib/liveLesson/types';
import {
  enqueueLiveResponse,
  flushLiveResponseQueue,
  getQueuedLiveResponses,
} from '../../lib/liveLesson/offlineQueue';
import { getStudentLoginSession, loginStudent, type LoginResponse } from '../../services/studentPortalApi';
import { submitLiveResponse } from '../../services/liveLessonService';
import { LiveLessonStatus } from './LiveLessonStatus';

type StudentStatus = { tone: 'neutral' | 'success' | 'warning' | 'error'; message: string };
type StepStatus = Record<string, StudentStatus>;

export interface StudentLiveViewProps {
  definition: StudentDefinitionProjection;
  sessionId: string;
  publicState: LivePublicState;
  publicStateError?: string | null;
}

export const resolveStudentLiveIdentity = (
  user: Pick<User, 'uid' | 'isAnonymous'> | null,
  login: Pick<LoginResponse, 'classId'> | null,
): { participantUid: string; classId: string } | null => {
  if (!user?.isAnonymous || !user.uid.trim() || !login?.classId.trim()) return null;
  return { participantUid: user.uid, classId: login.classId };
};

const createNonce = (): string => {
  try { return crypto.randomUUID(); } catch { return `student-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
};

const choiceOptions = (stepId: string): string[] => {
  if (stepId === 'goals') return ['G1', 'G2', 'G3'];
  if (stepId === 'ai-error-w01') return ['Conceptual', 'Algebraic', 'Logical', 'Missing condition'];
  if (stepId === 'notice-wonder') return ['Tôi nhận thấy…', 'Tôi tự hỏi…', 'Câu hỏi cần giải quyết'];
  return ['A', 'B', 'C', 'D'];
};

const statusForError = (error: unknown): StudentStatus => {
  const message = error instanceof Error ? error.message : 'Chưa đồng bộ được phản hồi.';
  const permanent = /permission|closed|expired|hết hạn|đóng/i.test(message);
  return { tone: 'error', message: permanent ? `Không thể gửi phản hồi: ${message}` : `Chưa đồng bộ — hãy thử lại khi có mạng. (${message})` };
};

const activeUserSafetyMessage = (user: User | null): string | null => (
  user && !user.isAnonymous ? 'Trình duyệt đang ở phiên giáo viên. Hãy đăng xuất trước khi vào chế độ học sinh.' : null
);

const ResponseControl = ({
  responseTypes,
  stepId,
  value,
  onChange,
}: {
  responseTypes: LiveResponseType[];
  stepId: string;
  value: string;
  onChange: (value: string, type: LiveResponseType) => void;
}) => {
  if (responseTypes.includes('route')) return <div className="grid gap-2 sm:grid-cols-3">{['M', 'S', 'C'].map(route => <button key={route} type="button" onClick={() => onChange(route, 'route')} className={`rounded-2xl border px-4 py-4 text-left font-black ${value === route ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-700'}`}><span className="text-lg">Tuyến {route}</span><span className="mt-1 block text-xs font-semibold text-slate-500">{route === 'M' ? 'Củng cố' : route === 'S' ? 'Chuẩn' : 'Thử thách'}</span></button>)}</div>;
  if (responseTypes.includes('boolean')) return <div className="grid grid-cols-2 gap-2">{['true', 'false'].map(option => <button key={option} type="button" onClick={() => onChange(option, 'boolean')} className={`rounded-xl border px-4 py-3 font-black ${value === option ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-700'}`}>{option === 'true' ? 'Đúng' : 'Chưa đúng'}</button>)}</div>;
  if (responseTypes.includes('choice')) return <div className="grid gap-2 sm:grid-cols-2">{choiceOptions(stepId).map(option => <button key={option} type="button" onClick={() => onChange(option, 'choice')} className={`rounded-xl border px-4 py-3 text-left font-bold ${value === option ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-700'}`}>{option}</button>)}</div>;
  return null;
};

export const StudentLiveView = ({ definition, sessionId, publicState, publicStateError = null }: StudentLiveViewProps) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [student, setStudent] = useState<LoginResponse | null>(() => getStudentLoginSession());
  const [joinCode, setJoinCode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [selectedValue, setSelectedValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [stepStatuses, setStepStatuses] = useState<StepStatus>({});
  const [queueCount, setQueueCount] = useState(0);
  const [flushing, setFlushing] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged?.(setUser);
    return () => unsubscribe?.();
  }, []);

  const currentCue = definition.studentCues.find(cue => cue.id === publicState.cueId);
  const step = currentCue?.responseStepId ? definition.responseSteps.find(item => item.id === currentCue.responseStepId) ?? null : null;
  const studentScreen = definition.studentScreens.find(screen => screen.id === currentCue?.studentScreenId) ?? definition.studentScreens[0];
  const tvScreen = definition.tvScreens.find(screen => screen.id === publicState.tvScreenId) ?? null;
  const activeSafetyMessage = activeUserSafetyMessage(user);
  const identity = resolveStudentLiveIdentity(user, student);
  const participantUid = identity?.participantUid ?? null;

  const refreshQueueState = useCallback(() => {
    if (!student || !participantUid) { setQueueCount(0); return; }
    setQueueCount(getQueuedLiveResponses(sessionId, participantUid).length);
  }, [participantUid, sessionId, student]);

  const flushQueue = useCallback(async () => {
    if (!student || !participantUid || !navigator.onLine || flushing) return;
    setFlushing(true);
    const result = await flushLiveResponseQueue(
      response => submitLiveResponse(response),
      sessionId,
      participantUid,
    );
    setFlushing(false);
    refreshQueueState();
    if (result.failed) setStepStatuses(current => ({ ...current, [result.failed!.stepId]: statusForError(new Error('Phản hồi đang chờ đồng bộ.')) }));
    if (!result.failed && result.synced > 0) setStepStatuses(current => ({ ...current, [step?.id ?? '']: { tone: 'success', message: 'Đã xác nhận trên máy chủ.' } }));
  }, [flushing, participantUid, refreshQueueState, sessionId, step?.id, student]);

  useEffect(() => {
    refreshQueueState();
    const retry = () => { void flushQueue(); };
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    void flushQueue();
    return () => { window.removeEventListener('online', retry); window.removeEventListener('focus', retry); };
  }, [flushQueue, refreshQueueState]);

  const submit = async (responseType: LiveResponseType, rawValue: string | boolean | number) => {
    if (!student || !step || !definition.allowedStepIds.includes(step.id)) return;
    const value = responseType === 'boolean' ? rawValue === true || rawValue === 'true' : rawValue;
    if (typeof value === 'string' && value.trim().length === 0) return;
    if (typeof value === 'string' && value.length > (step.maxTextLength ?? 2000)) {
      setStepStatuses(current => ({ ...current, [step.id]: { tone: 'error', message: `Câu trả lời tối đa ${step.maxTextLength} ký tự.` } }));
      return;
    }
    if (!participantUid) {
      setStepStatuses(current => ({ ...current, [step.id]: { tone: 'error', message: 'Phiên xác thực học sinh chưa sẵn sàng; không gửi phản hồi.' } }));
      return;
    }
    const payload: SubmitLiveResponseInput = { sessionId, participantUid, classId: identity!.classId, stepId: step.id, responseType, value, clientNonce: createNonce() };
    try {
      enqueueLiveResponse(payload);
      refreshQueueState();
      setStepStatuses(current => ({ ...current, [step.id]: { tone: 'warning', message: navigator.onLine ? 'Đang gửi…' : 'Đã lưu trên thiết bị — chờ đồng bộ.' } }));
      if (navigator.onLine) await flushQueue();
    } catch (error) {
      setStepStatuses(current => ({ ...current, [step.id]: statusForError(error) }));
    }
  };

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    if (activeSafetyMessage) { setLoginError(activeSafetyMessage); return; }
    setLoginBusy(true);
    try {
      const result = await loginStudent(joinCode.trim(), studentId.trim(), pin.trim());
      if (!result.classId || !result.studentId) throw new Error('Phiên học sinh không hợp lệ; không thể tiếp tục.');
      if (!auth.currentUser?.uid || !auth.currentUser.isAnonymous) throw new Error('Không xác định được phiên học sinh an toàn.');
      setUser(auth.currentUser);
      setStudent(result);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Không thể vào lớp.');
    } finally { setLoginBusy(false); }
  };

  const status = step ? stepStatuses[step.id] : null;
  const textControl = useMemo(() => step && (step.responseTypes.includes('text') || step.responseTypes.includes('exit_ticket')), [step]);

  if (!student) return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-900"><form onSubmit={login} className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-xl sm:p-8"><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">SmartPlan · Học sinh</p><h1 className="mt-2 text-2xl font-black">Vào tiết học trực tiếp</h1><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Dùng mã lớp và PIN hiện có. PIN chỉ được gửi để xác thực, không lưu trên thiết bị.</p>{activeSafetyMessage && <LiveLessonStatus tone="error">{activeSafetyMessage}</LiveLessonStatus>}{loginError && <div className="mt-4"><LiveLessonStatus tone="error">{loginError}</LiveLessonStatus></div>}<div className="mt-5 space-y-3"><input required value={joinCode} onChange={event => setJoinCode(event.target.value)} placeholder="Mã lớp" autoComplete="off" className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold" /><input required value={studentId} onChange={event => setStudentId(event.target.value)} placeholder="Mã học sinh" autoComplete="off" className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold" /><input required value={pin} onChange={event => setPin(event.target.value)} placeholder="PIN" inputMode="numeric" type="password" autoComplete="off" className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold" /></div><button disabled={loginBusy || Boolean(activeSafetyMessage)} className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 font-black text-white disabled:opacity-50">{loginBusy ? 'Đang xác thực…' : 'Vào lớp'}</button></form></main>;

  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-4xl space-y-4"><header className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-xl sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Học sinh · tiết trực tiếp</p><h1 className="mt-2 text-2xl font-black sm:text-4xl">{definition.title}</h1><p className="mt-2 text-sm font-semibold text-slate-300">{student.studentName} · {student.className}</p></div><span className="rounded-full border border-emerald-400/50 px-3 py-1 text-xs font-black uppercase text-emerald-300">{publicState.status}</span></div>{publicStateError && <div className="mt-4"><LiveLessonStatus tone="warning">Mất kết nối trạng thái. Đang giữ màn hình cuối; sẽ tự kết nối lại.</LiveLessonStatus></div>}</header><section className="grid gap-4 md:grid-cols-2"><article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-cyan-700">Màn hình chung</p><h2 className="mt-3 text-xl font-black">{tvScreen?.title ?? 'Đang chờ màn hình'}</h2><p className="mt-3 whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">{tvScreen?.body ?? 'Chưa có nội dung công khai.'}</p></article><article className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-indigo-700">Việc của em</p><h2 className="mt-3 text-xl font-black text-indigo-950">{studentScreen?.label ?? 'Theo dõi hướng dẫn'}</h2><p className="mt-3 text-sm font-semibold leading-6 text-indigo-900">{studentScreen?.action ?? 'Chờ giáo viên chuyển sang bước phản hồi.'}</p></article></section>{step && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Bước phản hồi</p><h2 className="mt-2 text-2xl font-black">{step.label}</h2></div>{queueCount > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">{queueCount} phản hồi chờ đồng bộ</span>}</div><div className="mt-5 space-y-4"><ResponseControl responseTypes={step.responseTypes} stepId={step.id} value={selectedValue} onChange={(value, type) => { setSelectedValue(value); if (type === 'choice' || type === 'route' || type === 'boolean') void submit(type, value); }} />{step.responseTypes.includes('hint') && <div className="flex gap-2"><button type="button" onClick={() => void submit('hint', 1)} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800">Gợi ý 1</button><button type="button" onClick={() => void submit('hint', 2)} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800">Gợi ý 2</button></div>}{textControl && <><textarea value={textValue} maxLength={step.maxTextLength ?? 2000} onChange={event => setTextValue(event.target.value)} placeholder="Viết câu trả lời của em…" className="min-h-32 w-full rounded-2xl border border-slate-200 p-4 font-semibold" /><button type="button" onClick={() => void submit(step.responseTypes.includes('exit_ticket') ? 'exit_ticket' : 'text', textValue)} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white">Gửi</button></>}{status && <LiveLessonStatus tone={status.tone}>{status.message}</LiveLessonStatus>}<button type="button" onClick={() => void flushQueue()} disabled={flushing || !navigator.onLine} className="text-sm font-black text-indigo-700 underline disabled:text-slate-400">{flushing ? 'Đang thử lại…' : 'Thử đồng bộ lại'}</button></div></section>}{!step && <LiveLessonStatus>Chưa đến bước cần phản hồi. Theo dõi màn hình chung và hướng dẫn của giáo viên.</LiveLessonStatus>}</div></main>;
};
