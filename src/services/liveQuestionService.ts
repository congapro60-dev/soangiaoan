/**
 * COMM-AQ-01 — dịch vụ client cho Giơ tay (CÓ tên) + Câu hỏi ẩn danh (KHÔNG định danh)
 * + Understanding Pulse. Spec: tasks/gate-pd-hand-raise-anon-questions.md.
 *
 * Hai luồng tách biệt tuyệt đối: hand raise ghi Firestore trực tiếp theo participantUid;
 * câu hỏi ẩn danh chỉ đi qua server (api/classroom action liveAnonymousQuestion) — client
 * không bao giờ ghi/có trường định danh trong câu hỏi.
 */
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type HandAction = 'raise' | 'lower';
export interface HandRaiseRow {
  participantUid: string;
  studentName: string;
  action: HandAction;
  updatedAtMs: number;
}
export interface AnonymousQuestionRow {
  questionId: string;
  activityId: string | null;
  body: string;
  status: 'new' | 'reviewing' | 'answered' | 'deferred' | 'hidden';
  isPublished: boolean;
  receivedAtMs: number;
}
export interface PublishedQuestionRow {
  questionId: string;
  activityId: string | null;
  body: string;
  publishedAtMs: number;
}
export type PulseReport = 'understood' | 'need_example' | 'unclear';
export interface PulseRow {
  participantUid: string;
  cueId: string;
  selfReport: PulseReport;
  updatedAtMs: number;
}

const sessionRef = (sessionId: string) => doc(db, 'liveLessonSessions', sessionId);
const ms = (value: unknown): number => {
  const to = value as { toMillis?: () => number } | null | undefined;
  return typeof to?.toMillis === 'function' ? to.toMillis() : 0;
};

// ---------- GIƠ TAY (CÓ tên — doc theo participantUid, bấm nhiều lần không trùng) ----------

export const setHandRaised = async (sessionId: string, participantUid: string, classId: string, studentName: string, action: HandAction) => {
  await setDoc(doc(sessionRef(sessionId), 'handRaises', participantUid), {
    participantUid,
    classId,
    studentName,
    action,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToTeacherHands = (sessionId: string, onValue: (rows: HandRaiseRow[]) => void, onError: (error: Error) => void) =>
  onSnapshot(collection(sessionRef(sessionId), 'handRaises'), snapshot => {
    onValue(snapshot.docs
      .map(row => {
        const data = row.data();
        return {
          participantUid: row.id,
          studentName: typeof data.studentName === 'string' ? data.studentName : '',
          action: data.action === 'raise' ? 'raise' : 'lower',
          updatedAtMs: ms(data.updatedAt),
        } satisfies HandRaiseRow;
      })
      .filter(row => row.action === 'raise' && row.studentName.length > 0)
      .sort((a, b) => a.updatedAtMs - b.updatedAtMs));
  }, onError);

/** HS đọc trạng thái giơ tay của chính mình (để nút hiện đúng sau khi reload). */
export const subscribeToMyHand = (sessionId: string, participantUid: string, onValue: (action: HandAction | null) => void, onError: (error: Error) => void) =>
  onSnapshot(doc(sessionRef(sessionId), 'handRaises', participantUid), snapshot => {
    const action = snapshot.data()?.action;
    onValue(action === 'raise' || action === 'lower' ? action : null);
  }, onError);

// ---------- CÂU HỎI ẨN DANH (chỉ qua server; client không ghi Firestore) ----------

const callApi = async (payload: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const idToken = await auth.currentUser?.getIdToken();
  const res = await fetch('/api/classroom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, idToken }),
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Chưa gửi được yêu cầu.');
  return data ?? {};
};

export const sanitizeQuestionBody = (raw: string): string => raw.replace(/\s+/g, ' ').trim().slice(0, 500);

export const buildQuestionNonce = (): string => {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

export const submitAnonymousQuestion = async (sessionId: string, body: string, activityId?: string): Promise<{ questionId: string; duplicate: boolean }> => {
  const clean = sanitizeQuestionBody(body);
  if (clean.length < 2) throw new Error('Câu hỏi còn quá ngắn.');
  const data = await callApi({
    action: 'liveAnonymousQuestion',
    sessionId,
    body: clean,
    activityId: activityId && activityId.length <= 128 ? activityId : undefined,
    clientNonce: buildQuestionNonce(),
  });
  const questionId = typeof data.questionId === 'string' ? data.questionId : '';
  if (!questionId) throw new Error('Server không xác nhận câu hỏi.');
  return { questionId, duplicate: data.duplicate === true };
};

export const subscribeToTeacherQuestions = (sessionId: string, onValue: (rows: AnonymousQuestionRow[]) => void, onError: (error: Error) => void) =>
  onSnapshot(collection(sessionRef(sessionId), 'questions'), snapshot => {
    onValue(snapshot.docs.map(row => {
      const data = row.data();
      const status = typeof data.status === 'string' && ['new', 'reviewing', 'answered', 'deferred', 'hidden'].includes(data.status)
        ? data.status as AnonymousQuestionRow['status'] : 'new';
      return {
        questionId: row.id,
        activityId: typeof data.activityId === 'string' ? data.activityId : null,
        body: typeof data.body === 'string' ? data.body : '',
        status,
        isPublished: data.isPublished === true,
        receivedAtMs: ms(data.serverReceivedAt),
      } satisfies AnonymousQuestionRow;
    }).sort((a, b) => a.receivedAtMs - b.receivedAtMs));
  }, onError);

export const subscribeToPublishedQuestions = (sessionId: string, onValue: (rows: PublishedQuestionRow[]) => void, onError: (error: Error) => void) =>
  onSnapshot(collection(sessionRef(sessionId), 'publishedQuestions'), snapshot => {
    onValue(snapshot.docs.map(row => {
      const data = row.data();
      return {
        questionId: row.id,
        activityId: typeof data.activityId === 'string' ? data.activityId : null,
        body: typeof data.body === 'string' ? data.body : '',
        publishedAtMs: ms(data.publishedAt),
      } satisfies PublishedQuestionRow;
    }).sort((a, b) => a.publishedAtMs - b.publishedAtMs));
  }, onError);

export const publishQuestion = (sessionId: string, questionId: string) => callApi({ action: 'livePublishQuestion', sessionId, questionId });
export const setQuestionStatus = (sessionId: string, questionId: string, status: 'new' | 'reviewing' | 'answered' | 'deferred' | 'hidden') =>
  callApi({ action: 'liveSetQuestionStatus', sessionId, questionId, status });

// ---------- UNDERSTANDING PULSE (dữ liệu cá nhân, có tên; tách biệt câu hỏi ẩn danh) ----------

export const pulseDocId = (participantUid: string, cueId: string) => `${participantUid}__${cueId}`;

export const submitPulse = async (sessionId: string, participantUid: string, classId: string, cueId: string, selfReport: PulseReport) => {
  await setDoc(doc(sessionRef(sessionId), 'pulses', pulseDocId(participantUid, cueId)), {
    participantUid,
    classId,
    cueId,
    selfReport,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToPulseSummary = (sessionId: string, cueId: string, onValue: (rows: PulseRow[]) => void, onError: (error: Error) => void) =>
  onSnapshot(query(collection(sessionRef(sessionId), 'pulses'), where('cueId', '==', cueId)), snapshot => {
    onValue(snapshot.docs.map(row => {
      const data = row.data();
      return {
        participantUid: data.participantUid,
        cueId: data.cueId,
        selfReport: data.selfReport,
        updatedAtMs: ms(data.updatedAt),
      } satisfies PulseRow;
    }));
  }, onError);

/** HS đọc pulse của chính mình (reload không mất lựa chọn). */
export const readMyPulse = async (sessionId: string, participantUid: string, cueId: string): Promise<PulseReport | null> => {
  const snapshot = await getDoc(doc(sessionRef(sessionId), 'pulses', pulseDocId(participantUid, cueId)));
  const value = snapshot.data()?.selfReport;
  return value === 'understood' || value === 'need_example' || value === 'unclear' ? value : null;
};

// ---------- Pulse bật theo override client (KHÔNG sửa snapshot đã duyệt) ----------

/** Chặng bật Understanding Pulse theo bài (override client, giống SELF_STUDY_WEEK11_OVERRIDE). */
export const PULSE_CUE_IDS_BY_KEY: Readonly<Record<string, readonly string[]>> = {
  // Tuần 11: bật ở chặng luyện tập phân hoá + kiểm tra cuối của 10 bài tương tác.
  '11-11-76': ['P20', 'P27'],
  '10-11-80': ['P20', 'P27'],
  '10-12-88': ['P20', 'P27'],
  '11-12-82': ['P18', 'P26'],
  '11-11-78': ['P13', 'P20'],
  '11-11-79': ['P13', 'P20'],
  '12-11-77': ['P20', 'P27'],
  '12-11-78': ['P20', 'P27'],
  '12-11-79': ['P20', 'P27'],
};

export const pulseCuesFor = (definitionKey: string | null | undefined): readonly string[] =>
  definitionKey && definitionKey in PULSE_CUE_IDS_BY_KEY ? PULSE_CUE_IDS_BY_KEY[definitionKey] : [];
