import crypto from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { getAdminDb } from './_exam-core.js';
import { requiresAssistantConfirmation } from './_assistant-core.js';
import type { AssistantActor, AssistantJobDoc, AssistantToolName } from './_assistant-types.js';

export type AssistantJobStatus = AssistantJobDoc['status'];
export const ASSISTANT_LONG_RUNNING_TOOLS = new Set<AssistantToolName>([
  'exportLesson', 'uploadLessonToDrive', 'startAssignmentGrading', 'sendTeacherMessage', 'sendParentMessage',
]);
const dbOf = (db?: Firestore): Firestore => db || getAdminDb();
const isText = (value: unknown, max = 256): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isBoundedInteger = (value: unknown, max: number): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;
const isOpaqueResultRef = (value: unknown): value is string => isText(value, 128) && /^[A-Za-z0-9._:-]+$/.test(value);
const safeErrorClass = (value: unknown): string => {
  const raw = value instanceof Error ? value.name : typeof value === 'string' ? value : 'Error';
  return /^[A-Za-z0-9_.:-]{1,80}$/.test(raw) ? raw : 'Error';
};
const validStatuses = new Set<AssistantJobStatus>(['queued', 'running', 'succeeded', 'failed', 'cancelled']);
const sameOptional = (left: string | undefined, right: string | undefined): boolean => left === right;
const isValidActor = (actor: AssistantActor): boolean => Boolean(actor && actor.active === true
  && isText(actor.firebaseUid) && (actor.channel === 'telegram' || actor.channel === 'zalo_oa')
  && isText(actor.channelAccountId) && isText(actor.channelUserId) && isText(actor.linkId)
  && (actor.channelChatId === undefined || isText(actor.channelChatId)));
const isValidJobDoc = (value: unknown): value is AssistantJobDoc => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const job = value as Partial<AssistantJobDoc>;
  const retryCount = job.retryCount;
  const maxRetries = job.maxRetries;
  return isText(job.actorUid) && isText(job.linkId) && (job.channel === 'telegram' || job.channel === 'zalo_oa')
    && isText(job.channelAccountId) && isText(job.channelUserId)
    && (job.channelChatId === undefined || isText(job.channelChatId))
    && isAssistantLongRunningTool(job.toolName || '') && /^[0-9a-f]{64}$/.test(job.requestHash || '')
    && validStatuses.has(job.status as AssistantJobStatus)
    && isFiniteNumber(job.createdAt) && isFiniteNumber(job.updatedAt) && job.createdAt <= job.updatedAt
    && isFiniteNumber(job.progress) && job.progress >= 0 && job.progress <= 100
    && isBoundedInteger(retryCount, 5)
    && isBoundedInteger(maxRetries, 5) && retryCount <= maxRetries
    && (job.confirmationId === undefined || isText(job.confirmationId, 128))
    && (job.resultRef === undefined || isOpaqueResultRef(job.resultRef))
    && (job.errorClass === undefined || /^[A-Za-z0-9_.:-]{1,80}$/.test(job.errorClass));
};
const sameActor = (actor: AssistantActor, job: AssistantJobDoc): boolean =>
  actor.firebaseUid === job.actorUid && actor.linkId === job.linkId && actor.channel === job.channel && actor.channelAccountId === job.channelAccountId
  && actor.channelUserId === job.channelUserId && sameOptional(actor.channelChatId, job.channelChatId);
const actorKey = (actor: AssistantActor): Record<string, unknown> => ({
  firebaseUid: actor.firebaseUid, channel: actor.channel, channelAccountId: actor.channelAccountId,
  channelUserId: actor.channelUserId, channelChatId: actor.channelChatId ?? null, linkId: actor.linkId,
});

export const isAssistantLongRunningTool = (toolName: string): toolName is AssistantToolName => ASSISTANT_LONG_RUNNING_TOOLS.has(toolName as AssistantToolName);

export const jobIdForRequest = (actor: AssistantActor, toolName: AssistantToolName, requestHash: string): string => {
  if (!isValidActor(actor) || !isAssistantLongRunningTool(toolName) || !requiresAssistantConfirmation(toolName) || !/^[0-9a-f]{64}$/.test(requestHash)) throw new Error('Invalid assistant job request');
  return crypto.createHash('sha256').update(JSON.stringify({ actor: actorKey(actor), toolName, requestHash }), 'utf8').digest('hex');
};

const publicJob = (id: string, job: AssistantJobDoc) => ({
  jobId: id, toolName: job.toolName, status: job.status, progress: job.progress || 0,
  retryCount: job.retryCount || 0, maxRetries: job.maxRetries || 0, createdAt: job.createdAt, updatedAt: job.updatedAt,
  ...(isOpaqueResultRef(job.resultRef) ? { resultRef: job.resultRef } : {}), ...(job.errorClass && /^[A-Za-z0-9_.:-]{1,80}$/.test(job.errorClass) ? { errorClass: job.errorClass } : {}),
});

const readJob = async (tx: Transaction, db: Firestore, jobId: string) => {
  const ref = db.collection('assistantJobs').doc(jobId);
  const snapshot = await tx.get(ref);
  if (!snapshot.exists) return null;
  const job = snapshot.data();
  return isValidJobDoc(job) ? { ref, job } : null;
};

export async function createAssistantJob(input: {
  actor: AssistantActor; toolName: AssistantToolName; requestHash: string; confirmationId: string; now?: number; maxRetries?: number;
}, db?: Firestore) {
  const now = input.now ?? Date.now();
  const jobId = jobIdForRequest(input.actor, input.toolName, input.requestHash);
  if (!isText(input.confirmationId, 128) || !isFiniteNumber(now)) throw new Error('Invalid assistant job request');
  const firestore = dbOf(db);
  return firestore.runTransaction(async tx => {
    const existing = await readJob(tx, firestore, jobId);
    if (existing) {
      if (!sameActor(input.actor, existing.job) || existing.job.toolName !== input.toolName || existing.job.requestHash !== input.requestHash) throw new Error('Job identity changed');
      return publicJob(jobId, existing.job);
    }
    const maxRetries = Number.isInteger(input.maxRetries) && (input.maxRetries as number) >= 0 && (input.maxRetries as number) <= 5 ? input.maxRetries as number : 2;
    const job: AssistantJobDoc = {
      actorUid: input.actor.firebaseUid, linkId: input.actor.linkId, channel: input.actor.channel, channelAccountId: input.actor.channelAccountId,
      channelUserId: input.actor.channelUserId, ...(input.actor.channelChatId ? { channelChatId: input.actor.channelChatId } : {}),
      toolName: input.toolName, requestHash: input.requestHash, status: 'queued', progress: 0, retryCount: 0,
      maxRetries,
      createdAt: now, updatedAt: now, confirmationId: input.confirmationId,
    };
    tx.create(firestore.collection('assistantJobs').doc(jobId), job);
    return publicJob(jobId, job);
  });
}

export async function getAssistantJobStatus(input: { actor: AssistantActor; jobId: string }, db?: Firestore) {
  if (!isText(input.jobId, 128)) throw new Error('Job not found');
  const snapshot = await dbOf(db).collection('assistantJobs').doc(input.jobId).get();
  if (!snapshot.exists) throw new Error('Job not found');
  const job = snapshot.data();
  if (!isValidJobDoc(job)) throw new Error('Job not found');
  if (!sameActor(input.actor, job)) throw new Error('Job not found');
  return publicJob(snapshot.id, job);
}

export async function transitionAssistantJob(input: {
  actor: AssistantActor; jobId: string; status: AssistantJobStatus; progress?: number; resultRef?: string; error?: unknown; now?: number;
}, db?: Firestore) {
  const now = input.now ?? Date.now();
  if (!isText(input.jobId, 128) || !isFiniteNumber(now) || (input.progress !== undefined && (!isFiniteNumber(input.progress) || input.progress < 0 || input.progress > 100)) || (input.resultRef !== undefined && !isOpaqueResultRef(input.resultRef))) throw new Error('Invalid assistant job update');
  const firestore = dbOf(db);
  return firestore.runTransaction(async tx => {
    const found = await readJob(tx, firestore, input.jobId);
    if (!found || !sameActor(input.actor, found.job)) throw new Error('Job not found');
    const current = found.job;
    const allowed = (current.status === 'queued' && (input.status === 'running' || input.status === 'cancelled'))
      || (current.status === 'running' && (input.status === 'succeeded' || input.status === 'failed' || input.status === 'cancelled'))
      || (current.status === 'failed' && input.status === 'running' && (current.retryCount || 0) < (current.maxRetries || 0));
    if (!allowed) {
      if (current.status === input.status) return publicJob(found.ref.id, current);
      throw new Error('Invalid assistant job transition');
    }
    const retryCount = input.status === 'running' && current.status === 'failed' ? (current.retryCount || 0) + 1 : current.retryCount || 0;
    const patch: Record<string, unknown> = {
      status: input.status, updatedAt: now, progress: input.progress === undefined ? (input.status === 'succeeded' ? 100 : current.progress || 0) : input.progress, retryCount,
      ...(input.resultRef ? { resultRef: input.resultRef.slice(0, 500) } : {}),
      ...(input.status === 'failed' && input.error ? { errorClass: safeErrorClass(input.error) } : {}),
    };
    tx.update(found.ref, patch as any);
    return publicJob(found.ref.id, { ...current, ...patch } as AssistantJobDoc);
  });
}

export const startAssistantJob = (input: Omit<Parameters<typeof transitionAssistantJob>[0], 'status'>, db?: Firestore) => transitionAssistantJob({ ...input, status: 'running' }, db);
export const cancelAssistantJob = (input: Omit<Parameters<typeof transitionAssistantJob>[0], 'status'>, db?: Firestore) => transitionAssistantJob({ ...input, status: 'cancelled' }, db);
export const completeAssistantJob = (input: Omit<Parameters<typeof transitionAssistantJob>[0], 'status'>, db?: Firestore) => transitionAssistantJob({ ...input, status: 'succeeded' }, db);
export const failAssistantJob = (input: Omit<Parameters<typeof transitionAssistantJob>[0], 'status'>, db?: Firestore) => transitionAssistantJob({ ...input, status: 'failed' }, db);
