import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import type { StudentDefinitionProjection } from '../../pages/LiveLessonPage';
import type { LiveResponseType, LivePublicState, SubmitLiveResponseInput } from '../../lib/liveLesson/types';
import {
  enqueueLiveResponse,
  flushLiveResponseQueue,
  getLiveResponseStepState,
  getQueuedLiveResponses,
  type LiveResponseQueueFailure,
} from '../../lib/liveLesson/offlineQueue';
import { fetchRoster, getStudentLoginSession, loginStudent, saveStudentLoginSession, type RosterResponse, type StudentLoginSession } from '../../services/studentPortalApi';
import { submitLiveResponse } from '../../services/liveLessonService';
import { getG10P31V4Contract } from '../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4';
import {
  buildStudentGlossaryPopup,
  changeStudentLanguageView,
  resolveStudentLanguageView,
  type StudentGlossaryPopupPayload,
  type StudentLanguageView,
  type V4Language,
} from '../../lib/liveLesson/v4';
import { LiveLessonStatus } from './LiveLessonStatus';

type StudentStatus = { tone: 'neutral' | 'success' | 'warning' | 'error'; message: string };
type StepStatus = Record<string, StudentStatus>;

export interface StudentLiveViewProps {
  definition: StudentDefinitionProjection;
  sessionId: string;
  expectedClassId: string | null;
  expectedJoinCode: string | null;
  publicState: LivePublicState;
  publicStateError?: string | null;
}

export const resolveStudentLiveIdentity = (
  user: Pick<User, 'uid' | 'isAnonymous'> | null,
  login: Pick<StudentLoginSession, 'classId' | 'anonymousUid'> | null,
  expectedClassId: string | null,
): { participantUid: string; classId: string } | null => {
  if (!user?.isAnonymous || !user.uid.trim() || !login?.anonymousUid || login.anonymousUid !== user.uid) return null;
  if (!login.classId.trim() || !expectedClassId?.trim() || login.classId !== expectedClassId) return null;
  return { participantUid: user.uid, classId: login.classId };
};

export type StudentRosterContextResult = { ok: true; roster: RosterResponse } | { ok: false; message: string };

export const validateStudentRosterContext = (
  roster: RosterResponse,
  expectedClassId: string | null,
  expectedJoinCode: string | null,
): StudentRosterContextResult => {
  if (!expectedJoinCode?.trim()) return { ok: false, message: 'Liên kết cũ thiếu ngữ cảnh lớp. Hãy yêu cầu giáo viên mở phiên mới.' };
  if (!expectedClassId?.trim()) return { ok: false, message: 'Liên kết học sinh thiếu mã lớp của phiên; không thể tiếp tục.' };
  if (roster.classId !== expectedClassId) return { ok: false, message: 'Danh sách học sinh không khớp lớp của liên kết này.' };
  return { ok: true, roster };
};

const createNonce = (): string => {
  try { return crypto.randomUUID(); } catch { return `student-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
};

export const getStudentChoiceOptions = (stepId: string): string[] => {
  if (stepId === 'goals') return ['G1', 'G2', 'G3'];
  if (stepId === 'ai-think-w01') return ['Yes', 'No', 'Unsure'];
  if (stepId === 'ai-error-w01') return ['Conceptual', 'Algebraic', 'Logical', 'Missing condition'];
  if (stepId === 'notice-wonder') return ['Tôi nhận thấy…', 'Tôi tự hỏi…', 'Câu hỏi cần giải quyết'];
  return ['A', 'B', 'C', 'D'];
};

export const getStudentChoiceLabel = (stepId: string, option: string): string => {
  if (stepId !== 'ai-think-w01') return option;
  return { Yes: 'Là nghiệm', No: 'Không là nghiệm', Unsure: 'Chưa chắc' }[option] ?? option;
};

const statusForError = (error: unknown): StudentStatus => {
  const message = error instanceof Error ? error.message : 'Chưa đồng bộ được phản hồi.';
  return { tone: 'error', message: `Không thể lưu phản hồi trên thiết bị: ${message}` };
};

const statusForQueueFailure = (failure: LiveResponseQueueFailure): StudentStatus => failure.kind === 'blocked'
  ? { tone: 'error', message: `Phản hồi bị chặn và không tự thử lại: ${failure.message}. Hãy gửi câu trả lời mới để mở lại bước này.` }
  : { tone: 'warning', message: `Chưa đồng bộ — phản hồi vẫn được giữ trên thiết bị và sẽ thử lại khi có mạng. (${failure.message})` };

const activeUserSafetyMessage = (user: User | null): string | null => (
  user && !user.isAnonymous ? 'Trình duyệt đang ở phiên giáo viên. Hãy đăng xuất trước khi vào chế độ học sinh.' : null
);

const languageLabels: Record<V4Language, string> = { vi: 'VI', en: 'EN', ja: 'JA', ko: 'KO', zh: 'ZH' };

const languageStorageKey = (participantUid: string): string => `smartplan-ai:live-language:v4:${participantUid}`;

export const buildStudentLanguageChoiceState = (savedPreference: unknown): { view: StudentLanguageView; needsFirstRunChoice: boolean } => {
  const resolved = resolveStudentLanguageView(savedPreference);
  return { view: resolved.view, needsFirstRunChoice: resolved.source === 'default' };
};

export const buildStudentLanguageChip = (view: StudentLanguageView): { label: string; actionLabel: string } => ({
  label: view.language === 'vi' ? 'Tiếng Việt' : `Tiếng Việt + ${languageLabels[view.language]}`,
  actionLabel: 'Đổi ngôn ngữ',
});

export const buildOfflineStatusText = (online: boolean, retryableQueueCount: number, blockedQueueCount: number): string => {
  if (blockedQueueCount > 0) return `Lỗi — dùng vở; ${blockedQueueCount} phản hồi bị chặn.`;
  if (!online && retryableQueueCount > 0) return 'Đã lưu trên máy — chờ đồng bộ.';
  if (online && retryableQueueCount > 0) return `Đang đồng bộ ${retryableQueueCount} phản hồi đã lưu trên máy.`;
  return 'Đã gửi.';
};

export const validateStudentLoginClassId = (resultClassId: string, expectedClassId: string | null): { ok: true } | { ok: false; message: string } => {
  if (!resultClassId.trim()) return { ok: false, message: 'Phiên học sinh không hợp lệ; không thể tiếp tục.' };
  if (!expectedClassId?.trim()) return { ok: false, message: 'Liên kết học sinh thiếu mã lớp phiên; không thể tiếp tục.' };
  if (resultClassId !== expectedClassId) return { ok: false, message: 'Mã lớp của tài khoản không khớp liên kết phiên này.' };
  return { ok: true };
};

const readSavedLanguageView = (participantUid: string | null): unknown => {
  if (!participantUid) return null;
  try {
    const raw = localStorage.getItem(languageStorageKey(participantUid));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveLanguageView = (participantUid: string | null, view: StudentLanguageView): void => {
  if (!participantUid) return;
  try { localStorage.setItem(languageStorageKey(participantUid), JSON.stringify(view)); } catch { /* non-sensitive preference only */ }
};

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
  if (responseTypes.includes('choice')) return <div className="grid gap-2 sm:grid-cols-2">{getStudentChoiceOptions(stepId).map(option => <button key={option} type="button" onClick={() => onChange(option, 'choice')} className={`rounded-xl border px-4 py-3 text-left font-bold ${value === option ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-700'}`}>{getStudentChoiceLabel(stepId, option)}</button>)}</div>;
  return null;
};

const LanguageChoicePanel = ({
  view,
  onPick,
}: {
  view: StudentLanguageView;
  onPick: (language: V4Language) => void;
}) => (
  <section className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
    <p className="text-xs font-black uppercase tracking-widest text-cyan-700">Chọn hỗ trợ ngôn ngữ</p>
    <p className="mt-2 text-sm font-semibold leading-6 text-cyan-950">Tiếng Việt và ký hiệu Toán là mỏ neo. Lựa chọn này chỉ đổi giao diện/khung hỗ trợ, không phải nhãn năng lực.</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {(['vi', 'en', 'ja', 'ko', 'zh'] as const).map(language => <button key={language} type="button" onClick={() => onPick(language)} className={`rounded-full border px-3 py-2 text-xs font-black ${view.language === language ? 'border-cyan-700 bg-white text-cyan-900' : 'border-cyan-200 bg-cyan-100 text-cyan-800'}`}>{languageLabels[language]}</button>)}
    </div>
  </section>
);

export const StudentLiveView = ({ definition, sessionId, expectedClassId, expectedJoinCode, publicState, publicStateError = null }: StudentLiveViewProps) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [student, setStudent] = useState<StudentLoginSession | null>(() => auth.currentUser?.isAnonymous ? getStudentLoginSession(auth.currentUser.uid) : null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [pin, setPin] = useState('');
  const [roster, setRoster] = useState<RosterResponse | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [selectedValue, setSelectedValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [stepStatuses, setStepStatuses] = useState<StepStatus>({});
  const [queueCount, setQueueCount] = useState(0);
  const [blockedQueueCount, setBlockedQueueCount] = useState(0);
  const [retryableQueueCount, setRetryableQueueCount] = useState(0);
  const [flushing, setFlushing] = useState(false);
  const [languageChoiceOpen, setLanguageChoiceOpen] = useState(false);
  const [languageView, setLanguageView] = useState<StudentLanguageView>(() => buildStudentLanguageChoiceState(null).view);
  const [glossaryPopup, setGlossaryPopup] = useState<StudentGlossaryPopupPayload | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, nextUser => {
      setUser(nextUser);
      setStudent(nextUser?.isAnonymous ? getStudentLoginSession(nextUser.uid) : null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let active = true;
    const classId = expectedClassId?.trim() ?? '';
    const joinCode = expectedJoinCode?.trim() ?? '';
    setRoster(null);
    setRosterError(null);
    setRosterLoading(false);
    if (!joinCode) {
      setRosterError('Liên kết cũ thiếu ngữ cảnh lớp. Hãy yêu cầu giáo viên mở phiên mới.');
      return () => { active = false; };
    }
    if (!classId) {
      setRosterError('Liên kết học sinh thiếu mã lớp của phiên; không thể tiếp tục.');
      return () => { active = false; };
    }
    setRosterLoading(true);
    void fetchRoster(joinCode).then(nextRoster => {
      if (!active) return;
      const result = validateStudentRosterContext(nextRoster, classId, joinCode);
      if (result.ok === false) {
        setRosterError(result.message);
        return;
      }
      setRoster(result.roster);
    }).catch(error => {
      if (active) setRosterError(error instanceof Error ? error.message : 'Không tải được danh sách học sinh của lớp.');
    }).finally(() => {
      if (active) setRosterLoading(false);
    });
    return () => { active = false; };
  }, [expectedClassId, expectedJoinCode]);

  const currentCue = definition.studentCues.find(cue => cue.id === publicState.cueId);
  const step = currentCue?.responseStepId ? definition.responseSteps.find(item => item.id === currentCue.responseStepId) ?? null : null;
  const studentScreen = definition.studentScreens.find(screen => screen.id === currentCue?.studentScreenId) ?? definition.studentScreens[0];
  const tvScreen = definition.tvScreens.find(screen => screen.id === publicState.tvScreenId) ?? null;
  const activeSafetyMessage = activeUserSafetyMessage(user);
  const identity = resolveStudentLiveIdentity(user, student, expectedClassId);
  const participantUid = identity?.participantUid ?? null;
  const v4Contract = useMemo(() => getG10P31V4Contract(), []);
  const languageChip = buildStudentLanguageChip(languageView);
  const offlineStatusText = buildOfflineStatusText(typeof navigator === 'undefined' ? true : navigator.onLine, retryableQueueCount, blockedQueueCount);

  useEffect(() => {
    if (!participantUid) return;
    const state = buildStudentLanguageChoiceState(readSavedLanguageView(participantUid));
    setLanguageView(state.view);
    setLanguageChoiceOpen(state.needsFirstRunChoice);
  }, [participantUid]);

  const pickLanguage = (language: V4Language) => {
    const next = changeStudentLanguageView(languageView, {
      language,
      supportMode: language === 'vi' ? 'vi_anchor' : 'bilingual',
      showGlossary: true,
      showSentenceFrames: language !== 'vi',
    });
    setLanguageView(next);
    saveLanguageView(participantUid, next);
    setLanguageChoiceOpen(false);
  };

  const refreshQueueState = useCallback(() => {
    if (!student || !participantUid) {
      setQueueCount(0);
      setBlockedQueueCount(0);
      setRetryableQueueCount(0);
      return;
    }
    const queued = getQueuedLiveResponses(sessionId, participantUid);
    setQueueCount(queued.length);
    setBlockedQueueCount(queued.filter(item => item.deliveryState === 'blocked').length);
    setRetryableQueueCount(queued.filter(item => item.deliveryState === 'pending').length);
    if (!step) return;
    const savedState = getLiveResponseStepState(sessionId, participantUid, step.id);
    if (savedState) {
      setStepStatuses(current => current[step.id] ? current : {
        ...current,
        [step.id]: savedState.status === 'blocked'
          ? { tone: 'error', message: `Phản hồi bị chặn: ${savedState.lastError ?? 'cần gửi câu trả lời mới.'}` }
          : savedState.status === 'pending'
            ? { tone: 'warning', message: `Phản hồi đang chờ đồng bộ. ${savedState.lastError ?? ''}`.trim() }
            : { tone: 'success', message: 'Đã xác nhận trên máy chủ.' },
      });
    }
  }, [participantUid, sessionId, step, student]);

  const flushQueue = useCallback(async () => {
    if (!student || !participantUid || !navigator.onLine || flushing) return;
    setFlushing(true);
    try {
      const result = await flushLiveResponseQueue(response => submitLiveResponse(response), sessionId, participantUid);
      refreshQueueState();
      if (result.failed) setStepStatuses(current => ({ ...current, [result.failed.item.stepId]: statusForQueueFailure(result.failed) }));
      if (!result.failed && result.synced > 0 && step) setStepStatuses(current => ({ ...current, [step.id]: { tone: 'success', message: 'Đã xác nhận trên máy chủ.' } }));
    } catch (error) {
      if (step) setStepStatuses(current => ({ ...current, [step.id]: statusForError(error) }));
    } finally {
      setFlushing(false);
    }
  }, [flushing, participantUid, refreshQueueState, sessionId, step, student]);

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
    if (!identity) {
      setStepStatuses(current => ({ ...current, [step.id]: { tone: 'error', message: 'Liên kết học sinh không khớp với lớp của phiên; không gửi phản hồi.' } }));
      return;
    }
    if (!step.responseTypes.includes(responseType)) {
      setStepStatuses(current => ({ ...current, [step.id]: { tone: 'error', message: 'Bước này không hỗ trợ loại phản hồi đã chọn.' } }));
      return;
    }
    const value = responseType === 'boolean' ? rawValue === true || rawValue === 'true' : rawValue;
    if (typeof value === 'string' && value.trim().length === 0) return;
    if (typeof value === 'string' && value.length > (step.maxTextLength ?? 2000)) {
      setStepStatuses(current => ({ ...current, [step.id]: { tone: 'error', message: `Câu trả lời tối đa ${step.maxTextLength} ký tự.` } }));
      return;
    }
    const savedState = getLiveResponseStepState(sessionId, identity.participantUid, step.id);
    const payload: SubmitLiveResponseInput & { languagePreference: StudentLanguageView } = {
      sessionId,
      participantUid: identity.participantUid,
      classId: identity.classId,
      stepId: step.id,
      responseType,
      value,
      clientNonce: savedState?.clientNonce ?? createNonce(),
      languagePreference: languageView,
    };
    try {
      enqueueLiveResponse(payload);
      refreshQueueState();
      setStepStatuses(current => ({ ...current, [step.id]: { tone: 'warning', message: navigator.onLine ? 'Đang gửi…' : 'Đã lưu trên máy — chờ đồng bộ.' } }));
      if (navigator.onLine) await flushQueue();
    } catch (error) {
      setStepStatuses(current => ({ ...current, [step.id]: statusForError(error) }));
    }
  };

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    if (activeSafetyMessage) { setLoginError(activeSafetyMessage); return; }
    if (!expectedJoinCode?.trim()) { setLoginError('Liên kết cũ thiếu ngữ cảnh lớp. Hãy yêu cầu giáo viên mở phiên mới.'); return; }
    if (!expectedClassId) { setLoginError('Liên kết học sinh thiếu mã lớp phiên; không thể tiếp tục.'); return; }
    if (!roster) { setLoginError(rosterError ?? 'Chưa tải được danh sách học sinh của lớp.'); return; }
    setLoginBusy(true);
    try {
      const result = await loginStudent(expectedJoinCode.trim(), selectedStudentId.trim(), pin.trim());
      if (!result.classId || !result.studentId) throw new Error('Phiên học sinh không hợp lệ; không thể tiếp tục.');
      const classCheck = validateStudentLoginClassId(result.classId, expectedClassId);
      if (classCheck.ok !== true) throw new Error(classCheck.message);
      const activeStudentUser = auth.currentUser;
      if (!activeStudentUser?.uid || !activeStudentUser.isAnonymous) throw new Error('Không xác định được phiên học sinh an toàn.');
      const saved = saveStudentLoginSession(result, activeStudentUser.uid);
      if (!saved) throw new Error('Không lưu được danh tính học sinh an toàn.');
      setUser(activeStudentUser);
      setStudent(saved);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Không thể vào lớp.');
    } finally { setLoginBusy(false); }
  };

  const status = step ? stepStatuses[step.id] : null;
  const textControl = useMemo(() => step && (step.responseTypes.includes('text') || step.responseTypes.includes('exit_ticket')), [step]);
  const glossaryTerms = v4Contract.glossary.filter(item => item.status === 'approved').slice(0, 4);

  if (!expectedJoinCode) return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-900"><section className="w-full max-w-xl rounded-[2rem] bg-white p-7 text-center shadow-xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Học sinh · liên kết cũ</p><h1 className="mt-2 text-2xl font-black">Không thể vào phiên học</h1><div className="mt-4"><LiveLessonStatus tone="error">Liên kết cũ thiếu ngữ cảnh lớp. Hãy yêu cầu giáo viên mở phiên mới.</LiveLessonStatus></div></section></main>;
  if (!expectedClassId) return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-900"><section className="w-full max-w-xl rounded-[2rem] bg-white p-7 text-center shadow-xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Học sinh · liên kết không hợp lệ</p><h1 className="mt-2 text-2xl font-black">Không thể vào phiên học</h1><div className="mt-4"><LiveLessonStatus tone="error">Liên kết học sinh thiếu mã lớp của phiên. Không có phản hồi nào được gửi.</LiveLessonStatus></div></section></main>;
  if (rosterError) return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-900"><section className="w-full max-w-xl rounded-[2rem] bg-white p-7 text-center shadow-xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Học sinh · không tải được lớp</p><h1 className="mt-2 text-2xl font-black">Không thể chọn học sinh</h1><div className="mt-4"><LiveLessonStatus tone="error">{rosterError}</LiveLessonStatus></div></section></main>;
  if (rosterLoading || !roster) return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-900"><section className="w-full max-w-xl rounded-[2rem] bg-white p-7 text-center shadow-xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Học sinh · đang tải lớp</p><h1 className="mt-2 text-2xl font-black">Đang tải danh sách học sinh</h1><p className="mt-4 text-sm font-semibold text-slate-500">Chờ một chút để hiện các tên thuộc đúng lớp của phiên.</p></section></main>;
  if (student && !identity) return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-900"><section className="w-full max-w-xl rounded-[2rem] bg-white p-7 text-center shadow-xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Học sinh · danh tính bị chặn</p><h1 className="mt-2 text-2xl font-black">Không thể gửi phản hồi</h1><div className="mt-4"><LiveLessonStatus tone="error">{activeSafetyMessage ?? 'Phiên đăng nhập hoặc mã lớp không khớp liên kết này. Hãy đăng nhập lại từ đúng liên kết học sinh.'}</LiveLessonStatus></div></section></main>;
  if (!student) return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-900"><form onSubmit={login} className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-xl sm:p-8"><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">SmartPlan · Học sinh</p><h1 className="mt-2 text-2xl font-black">Vào tiết học trực tiếp</h1><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Chọn tên của em trong lớp rồi nhập PIN. PIN chỉ được gửi để xác thực, không lưu trên thiết bị.</p>{activeSafetyMessage && <LiveLessonStatus tone="error">{activeSafetyMessage}</LiveLessonStatus>}{loginError && <div className="mt-4"><LiveLessonStatus tone="error">{loginError}</LiveLessonStatus></div>}<div className="mt-5 space-y-3"><label className="block text-sm font-black text-slate-700">Lớp {roster.className}<select required value={selectedStudentId} onChange={event => setSelectedStudentId(event.target.value)} autoComplete="off" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold"><option value="">Chọn tên của em</option>{roster.students.map(item => <option key={item.studentId} value={item.studentId}>{item.name}</option>)}</select></label><input required value={pin} onChange={event => setPin(event.target.value)} placeholder="PIN" inputMode="numeric" type="password" autoComplete="off" className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold" /></div><button disabled={loginBusy || Boolean(activeSafetyMessage) || !selectedStudentId} className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 font-black text-white disabled:opacity-50">{loginBusy ? 'Đang xác thực…' : 'Vào lớp'}</button></form></main>;

  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-4xl space-y-4"><header className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-xl sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Học sinh · tiết trực tiếp</p><h1 className="mt-2 text-2xl font-black sm:text-4xl">{definition.title}</h1><p className="mt-2 text-sm font-semibold text-slate-300">{student.studentName} · {student.className}</p></div><div className="flex flex-col items-end gap-2"><span className="rounded-full border border-emerald-400/50 px-3 py-1 text-xs font-black uppercase text-emerald-300">{publicState.status}</span><button type="button" onClick={() => setLanguageChoiceOpen(true)} className="rounded-full border border-cyan-300/60 px-3 py-1 text-xs font-black text-cyan-100">{languageChip.label} · {languageChip.actionLabel}</button></div></div>{publicStateError && <div className="mt-4"><LiveLessonStatus tone="warning">Mất kết nối trạng thái. Đang giữ màn hình cuối; sẽ tự kết nối lại.</LiveLessonStatus></div>}</header>{languageChoiceOpen && <LanguageChoicePanel view={languageView} onPick={pickLanguage} />}<LiveLessonStatus tone={blockedQueueCount > 0 ? 'error' : retryableQueueCount > 0 ? 'warning' : 'success'}>{offlineStatusText}</LiveLessonStatus><section className="grid gap-4 md:grid-cols-2"><article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-cyan-700">Màn hình chung</p><h2 className="mt-3 text-xl font-black">{tvScreen?.title ?? 'Đang chờ màn hình'}</h2><p className="mt-3 whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">{tvScreen?.body ?? 'Chưa có nội dung công khai.'}</p></article><article className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-indigo-700">Việc của em</p><h2 className="mt-3 text-xl font-black text-indigo-950">{studentScreen?.label ?? 'Theo dõi hướng dẫn'}</h2><p className="mt-3 text-sm font-semibold leading-6 text-indigo-900">{studentScreen?.action ?? 'Chờ giáo viên chuyển sang bước phản hồi.'}</p></article></section><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Thuật ngữ</p><div className="mt-3 flex flex-wrap gap-2">{glossaryTerms.map(term => <button key={term.id} type="button" onClick={() => setGlossaryPopup(buildStudentGlossaryPopup(v4Contract.glossary, term.id, languageView))} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{term.vietnamese}</button>)}</div>{glossaryPopup && <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-indigo-950">{glossaryPopup.vietnamese}{glossaryPopup.translation ? ` · ${glossaryPopup.translation}` : ''}</p><p className="mt-2 text-sm font-semibold leading-6 text-indigo-900">{glossaryPopup.explanation}</p>{glossaryPopup.notation && <p className="mt-2 font-mono text-sm font-black text-indigo-950">{glossaryPopup.notation}</p>}{glossaryPopup.example && <p className="mt-2 text-sm font-semibold text-indigo-900">Ví dụ: {glossaryPopup.example}</p>}</div><button type="button" onClick={() => setGlossaryPopup(null)} className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700">Đóng</button></div></div>}</section>{queueCount > 0 && <LiveLessonStatus tone={blockedQueueCount > 0 ? 'error' : 'warning'}>{blockedQueueCount > 0 ? `${blockedQueueCount} phản hồi bị chặn; hãy gửi câu trả lời mới.` : `${queueCount} phản hồi đã lưu trên máy.`}</LiveLessonStatus>}{step && <section className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Phản hồi nhanh</p><h2 className="mt-2 text-xl font-black">{step.label}</h2><div className="mt-4 space-y-4"><ResponseControl responseTypes={step.responseTypes} stepId={step.id} value={selectedValue} onChange={(value, type) => { setSelectedValue(value); void submit(type, value); }} />{textControl && <div className="space-y-2"><textarea value={textValue} onChange={event => setTextValue(event.target.value)} maxLength={step.maxTextLength ?? 2000} placeholder="Viết câu trả lời ngắn" className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" /><button type="button" onClick={() => void submit(step.responseTypes.includes('exit_ticket') ? 'exit_ticket' : 'text', textValue)} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white">Gửi câu trả lời</button></div>}{status && <LiveLessonStatus tone={status.tone}>{status.message}</LiveLessonStatus>}</div></section>}</div></main>;
};
