import { createHash, randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { digestText, digestWindow, vietnamDate, type DeadlineItem } from './_assistant-deadline.js';
import { deadlineOwner } from './_assistant-deadline-config.js';
import { quoteChatCommands } from './_assistant-zalo-send.js';

export interface DeadlineNotice {
  source?: 'sheet';
  taskId: string; version: string; studentId: string; classId: string; teacherId: string;
  title: string; dueAt: string; description: string; url: string;
}
export interface DeadlineTarget { linkId: string; userId: string; studentId: string; classId: string; teacherId: string }
export interface DeadlineDeliveryPolicy {
  enabled: boolean; botId: string; testUserIds: string[];
  /** These must be derived from separately approved server config, never a teacher/HS request. */
  realDeliveryApproved?: boolean; quotaVerified?: boolean;
}
export type DeliveryReceipt = { state: 'sent' | 'rejected' | 'unknown'; code?: number };
export type DeadlineSender = (userId: string, text: string) => Promise<DeliveryReceipt>;
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const deliveryId = (bot: string, cls: string, student: string, task: string, version: string) => hash([bot, cls, student, task, version]);
export const deadlineRecipientAllowed = (policy: DeadlineDeliveryPolicy, user: string) => policy.enabled && Boolean(policy.botId)
  && (policy.testUserIds.includes(user) || policy.realDeliveryApproved === true && policy.quotaVerified === true);
const outbox = (db: Firestore, id: string) => db.collection('assistantDeadlineOutbox').doc(id);
const snapshotRef = (db: Firestore, botId: string, classId: string, studentId: string) => db.collection('assistantDeadlineSnapshots').doc(hash([botId, classId, studentId]));
const noticeText = (notice: DeadlineNotice) => [
  'VIỆC MỚI / CẬP NHẬT NHIỆM VỤ', String(notice.title).replace(/[\r\n]+/g, ' ').slice(0, 250),
  ...(notice.dueAt ? [`Hạn: ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short', hour12: false }).format(new Date(notice.dueAt))}`] : []),
  notice.description.slice(0, 700), notice.source === 'sheet'
    ? 'Nhắn "deadline" vào ô chat để xem yêu cầu và mở file deadline của lớp.'
    : 'Nhắn "web" vào ô chat để xem yêu cầu và mở đúng hồ sơ của em.',
].filter(Boolean).join('\n');

/** Each student's snapshot + baseline are atomic; source failures must never call this with []. */
export async function syncDeadlineNotices(db: Firestore, classId: string, notices: DeadlineNotice[], targets: DeadlineTarget[], policy: DeadlineDeliveryPolicy, now = Date.now()): Promise<string[]> {
  const ids: string[] = [];
  // Each student's snapshot fits one Firestore transaction, even in a large class.
  for (const studentId of new Set(targets.map(t => t.studentId))) {
    ids.push(...await syncStudentNotices(db, classId, studentId, notices.filter(n => n.studentId === studentId), targets, policy, now));
  }
  return ids;
}
async function syncStudentNotices(db: Firestore, classId: string, studentId: string, notices: DeadlineNotice[], targets: DeadlineTarget[], policy: DeadlineDeliveryPolicy, now: number): Promise<string[]> {
  if (notices.length > 400) throw new Error('Quá nhiều việc; cần thu gọn danh sách trước khi gửi.');
  const stateRef = snapshotRef(db, policy.botId, classId, studentId);
  return db.runTransaction(async tx => {
    const state = (await tx.get(stateRef)).data();
    if (state && state.updatedAt >= now) return [];
    const versions: Record<string, string> = {};
    const jobs = new Map<string, { notice: DeadlineNotice; target: DeadlineTarget }>();
    for (const notice of notices) {
      if (notice.classId !== classId || !notice.version || !notice.taskId) continue;
      const key = hash([notice.taskId, notice.studentId]); versions[key] = notice.version;
      if (!policy.enabled || !state || state.versions?.[key] === notice.version) continue;
      const target = targets.filter(t => t.classId === classId && t.studentId === notice.studentId && t.teacherId === notice.teacherId).sort((a, b) => a.linkId.localeCompare(b.linkId))[0];
      if (!target || !deadlineRecipientAllowed(policy, target.userId)) continue;
      const id = deliveryId(policy.botId, classId, notice.studentId, notice.taskId, notice.version);
      jobs.set(id, { notice, target });
    }
    // Firestore reads precede all writes. Deterministic ids prevent concurrent snapshots from duplicating deliveries.
    const existing = await Promise.all([...jobs.keys()].map(id => tx.get(outbox(db, id))));
    let index = 0;
    for (const [id, job] of jobs) {
      if (!existing[index++].exists) tx.set(outbox(db, id), { ...job.target, botId: policy.botId, taskId: job.notice.taskId, version: job.notice.version, kind: 'notice', text: noticeText(job.notice), state: 'pending', attempts: 0, createdAt: now, nextAt: now });
    }
    tx.set(stateRef, { versions, initializedAt: state?.initializedAt ?? now, updatedAt: now });
    return [...jobs.keys()];
  });
}

/** Default off; the caller supplies freshly loaded data, never a stale cached "all clear". */
export async function enqueueDeadlineDigest(db: Firestore, target: DeadlineTarget, items: DeadlineItem[], policy: DeadlineDeliveryPolicy, now = Date.now()): Promise<string | null> {
  if (!deadlineRecipientAllowed(policy, target.userId) || !digestWindow(now)) return null;
  const date = vietnamDate(now), id = deliveryId(policy.botId, target.classId, target.studentId, 'digest', date), ref = outbox(db, id);
  await db.runTransaction(async tx => {
    if ((await tx.get(ref)).exists) return;
    tx.set(ref, { ...target, botId: policy.botId, taskId: 'digest', version: date, kind: 'digest', text: digestText(items, now, true), state: 'pending', attempts: 0, createdAt: now, nextAt: now });
  });
  return id;
}

/** Inject fresh task/config validation as well as transport. A claimed-but-crashed send never becomes retryable. */
export async function drainDeadlineOutbox(db: Firestore, ids: string[], policy: DeadlineDeliveryPolicy, send: DeadlineSender, stillCurrent: (job: Record<string, any>) => Promise<boolean>, now = Date.now()): Promise<void> {
  if (!policy.enabled) return;
  for (const id of [...new Set(ids)].slice(0, 100)) {
    const ref = outbox(db, id), attemptId = randomUUID();
    const observed = (await ref.get()).data();
    if (!observed || observed.botId !== policy.botId || !deadlineRecipientAllowed(policy, String(observed.userId))
      || !['pending', 'rejected'].includes(observed.state) || observed.attempts >= 3 || observed.nextAt > now) continue;
    let currentTask: boolean;
    try { currentTask = now - observed.createdAt < 24 * 3600_000 && await stillCurrent(observed); }
    catch { continue; } // No send attempted: a source outage remains safely retryable.
    const job = await db.runTransaction(async tx => {
      const snap = await tx.get(ref), job = snap.data();
      if (!job || job.botId !== policy.botId || !deadlineRecipientAllowed(policy, String(job.userId))
        || !['pending', 'rejected'].includes(job.state) || job.attempts >= 3 || job.nextAt > now) return null;
      if (job.text !== observed.text || job.version !== observed.version || job.sequence !== observed.sequence || job.linkId !== observed.linkId) return null;
      if (!currentTask) { tx.update(ref, { state: 'cancelled', updatedAt: now }); return null; }
      const link = (await tx.get(db.collection('channelLinks').doc(job.linkId))).data();
      const cls = (await tx.get(db.collection('classes').doc(job.classId))).data();
      const student = (await tx.get(db.collection('classes').doc(job.classId).collection('students').doc(job.studentId))).data();
      const state = job.kind === 'notice' ? (await tx.get(snapshotRef(db, policy.botId, job.classId, job.studentId))).data() : undefined;
      const key = hash([job.taskId, job.studentId]);
      if (!link?.active || link.channel !== 'zalo_bot' || link.channelAccountId !== policy.botId || link.role !== 'student'
        || link.classId !== job.classId || link.studentId !== job.studentId || link.channelUserId !== job.userId
        || link.channelChatId && link.channelChatId !== job.userId || link.expiresAt && link.expiresAt <= now
        || deadlineOwner(cls || {}) !== job.teacherId || !student
        || job.kind === 'notice' && state?.versions?.[key] !== job.version) {
        tx.update(ref, { state: 'cancelled', updatedAt: now }); return null;
      }
      tx.update(ref, { state: 'sending', attemptId, attempts: job.attempts + 1, updatedAt: now });
      return { ...job, attempts: job.attempts + 1 } as Record<string, any>;
    });
    if (!job) continue;
    let receipt: DeliveryReceipt;
    try {
      receipt = await send(job.userId, job.text);
    } catch { receipt = { state: 'unknown' }; }
    await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (current?.attemptId !== attemptId || current.state !== 'sending') return;
      tx.update(ref, { state: receipt.state === 'rejected' && job.attempts >= 3 ? 'failed' : receipt.state, resultCode: receipt.code ?? null, updatedAt: now,
        nextAt: now + 60_000 * 2 ** (job.attempts - 1) });
    });
  }
}

/** One bounded message per job. No transport fallback/retry on a network timeout or server error. */
export const zaloDeadlineSender = (token: string): DeadlineSender => async (userId, text) => {
  text = quoteChatCommands(text);
  if (!token || text.length > 2000) return { state: 'rejected', code: 400 };
  try {
    const response = await fetch(`https://bot-api.zaloplatforms.com/bot${encodeURIComponent(token)}/sendMessage`, {
      method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: userId, text }), signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json().catch(() => null);
    if (response.ok && result?.ok === true) return { state: 'sent' };
    if (response.status >= 400 && response.status < 500 || response.ok && result?.ok === false) return { state: 'rejected', code: Number(result?.error_code) || response.status };
    return { state: 'unknown' };
  } catch { return { state: 'unknown' }; }
};
