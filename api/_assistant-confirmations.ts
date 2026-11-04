import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { getAdminDb } from './_exam-core.js';
import {
  ASSISTANT_CONFIRMATION_TTL_MS,
  buildAssistantRequestHash,
  classifyAssistantTool,
  confirmationIdForRequest,
  normalizeAssistantConfirmationPayload,
  normalizeAssistantConfirmationResult,
  requiresAssistantConfirmation,
  sanitizeAssistantPreview,
} from './_assistant-core.js';
import {
  canUseAssistantShare,
  isUsableChannelLink,
  type AssistantActor,
  type AssistantAuditLogDoc,
  type AssistantConfirmationDoc,
  type AssistantResourceType,
  type AssistantRole,
  type AssistantToolName,
  type ChannelLinkDoc,
} from './_assistant-types.js';
import { ASSISTANT_EXECUTABLE_TOOLS } from './_assistant-executors.js';

export const isAssistantToolExecutable = (toolName: AssistantToolName): boolean => ASSISTANT_EXECUTABLE_TOOLS.has(toolName);

export const ASSISTANT_EXECUTION_LEASE_MS = 60 * 1000;

type ResourceScope = { resourceType: AssistantResourceType; resourceId: string; requiredRole: AssistantRole; ownerUid: string };
type ConfirmationDb = Firestore;

const dbOf = (db?: Firestore): ConfirmationDb => db || getAdminDb();
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown, max = 256): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const sameOptional = (left: string | undefined, right: string | undefined): boolean => left === right;
const sameIdentity = (actor: AssistantActor, value: Pick<AssistantConfirmationDoc, 'actorUid' | 'channel' | 'channelAccountId' | 'channelUserId' | 'channelChatId' | 'linkId'>): boolean =>
  actor.firebaseUid === value.actorUid && actor.channel === value.channel && actor.channelAccountId === value.channelAccountId
  && actor.channelUserId === value.channelUserId && sameOptional(actor.channelChatId, value.channelChatId) && actor.linkId === value.linkId;

const validStatuses = new Set<AssistantConfirmationDoc['status']>(['pending', 'executing', 'cancelled', 'expired', 'executed', 'outcome_unknown']);
const validStoredConfirmation = (value: unknown): value is AssistantConfirmationDoc => {
  try {
    if (!isRecord(value) || !isText(value.actorUid) || (value.channel !== 'telegram' && value.channel !== 'zalo_oa' && value.channel !== 'zalo_bot')
      || !isText(value.channelAccountId) || !isText(value.channelUserId) || (value.channelChatId !== undefined && !isText(value.channelChatId))
      || (value.channel === 'zalo_bot' && value.channelChatId !== value.channelUserId)
      || !isText(value.linkId) || !isText(value.toolName) || !validStatuses.has(value.status as AssistantConfirmationDoc['status'])
      || !isText(value.requestHash, 128) || !isText(value.preview, 1200) || !isFiniteNumber(value.createdAt) || !isFiniteNumber(value.expiresAt)
      || value.expiresAt <= value.createdAt) return false;
    classifyAssistantTool(value.toolName);
    if (!requiresAssistantConfirmation(value.toolName)) return false;
    if (value.payload !== undefined) normalizeAssistantConfirmationPayload(value.payload);
    if (value.resourceIds !== undefined && (!Array.isArray(value.resourceIds) || value.resourceIds.some(resourceId => !isText(resourceId)))) return false;
    if (value.resourceScopes !== undefined && (!Array.isArray(value.resourceScopes) || value.resourceScopes.some(scope => !isRecord(scope) || (scope.resourceType !== 'class' && scope.resourceType !== 'lessonPlan') || !isText(scope.resourceId) || (scope.requiredRole !== 'read' && scope.requiredRole !== 'write') || !isText(scope.ownerUid)))) return false;
    if (value.recipients !== undefined && (!Array.isArray(value.recipients) || value.recipients.some(recipient => !isText(recipient)))) return false;
    for (const key of ['executionStartedAt', 'executionLeaseExpiresAt', 'executedAt'] as const) if (value[key] !== undefined && !isFiniteNumber(value[key])) return false;
    const active = value.status === 'pending' || value.status === 'executing';
    if (active) {
      if (!isRecord(value.payload) || !Array.isArray(value.resourceIds) || value.resourceIds.length === 0 || !Array.isArray(value.resourceScopes) || value.resourceScopes.length === 0) return false;
      const resourceIds = value.resourceIds as string[];
      if (value.resourceScopes.some(scope => !resourceIds.includes(scope.resourceId))) return false;
    } else if (value.payload !== undefined || value.resourceIds !== undefined || value.resourceScopes !== undefined || value.recipients !== undefined) return false;
    if (value.result !== undefined) {
      const normalized = normalizeAssistantConfirmationResult(value.result);
      if (isRecord(normalized) && normalized.code === 'RESULT_REDACTED' && !(isRecord(value.result) && value.result.code === 'RESULT_REDACTED')) return false;
    }
    return true;
  } catch {
    return false;
  }
};

const publicConfirmation = (id: string, value: AssistantConfirmationDoc, replay = false) => ({
  confirmationId: id,
  status: value.status,
  toolName: value.toolName,
  preview: value.preview,
  expiresAt: value.expiresAt,
  requestHash: value.requestHash,
  ...(value.result !== undefined ? { result: value.result } : {}),
  ...(isRecord(value.result) && typeof value.result.code === 'string' ? { code: value.result.code } : {}),
  ...(replay ? { replay: true } : {}),
});

const safeErrorClass = (error: unknown): string => {
  const raw = error instanceof Error ? error.name : 'Error';
  return /^[A-Za-z0-9_.:-]{1,80}$/.test(raw) ? raw : 'Error';
};

const auditRef = (db: ConfirmationDb) => db.collection('assistantAuditLogs').doc();
const writeAudit = (tx: Transaction, db: ConfirmationDb, event: AssistantAuditLogDoc) => tx.set(auditRef(db), event);

const deletePayload = () => ({ payload: FieldValue.delete(), resourceIds: FieldValue.delete(), resourceScopes: FieldValue.delete(), recipients: FieldValue.delete() });

const normalizeStringList = (value: unknown, label: string): string[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 500 || !value.every(item => isText(item))) throw new Error(`Invalid ${label}`);
  return [...value];
};

const normalizeScopes = (value: unknown): Array<Omit<ResourceScope, 'ownerUid' | 'requiredRole'> & { ownerUid?: string; requiredRole?: AssistantRole }> => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 50) throw new Error('Invalid resource scopes');
  return value.map(scope => {
    if (!isRecord(scope)) throw new Error('Invalid resource scope');
    const resourceType = scope.resourceType;
    const resourceId = scope.resourceId;
    const requiredRole = scope.requiredRole;
    const ownerUid = scope.ownerUid;
    if ((resourceType !== 'class' && resourceType !== 'lessonPlan')
      || !isText(resourceId) || (requiredRole !== undefined && requiredRole !== 'read' && requiredRole !== 'write')
      || (ownerUid !== undefined && !isText(ownerUid))) throw new Error('Invalid resource scope');
    return {
      resourceType: resourceType as AssistantResourceType,
      resourceId: String(resourceId),
      ...(requiredRole === undefined ? {} : { requiredRole: requiredRole as AssistantRole }),
      ...(ownerUid === undefined ? {} : { ownerUid: String(ownerUid) }),
    };
  });
};

const scopeTypesForTool = (toolName: AssistantToolName): AssistantResourceType[] => {
  if (toolName === 'draftLesson') return ['class', 'lessonPlan'];
  if (['patchLessonSection', 'exportLesson', 'uploadLessonToDrive', 'replaceDriveFile'].includes(toolName)) return ['lessonPlan'];
  if (['createAssignment', 'startAssignmentGrading', 'approveGrade', 'editGrade', 'sendTeacherMessage', 'sendParentMessage', 'revokeStudentAccess'].includes(toolName)) return ['class'];
  return [];
};

const resolveResourceScopes = async (db: ConfirmationDb, toolName: AssistantToolName, scopes: Array<Omit<ResourceScope, 'ownerUid' | 'requiredRole'> & { ownerUid?: string; requiredRole?: AssistantRole }>): Promise<ResourceScope[]> => {
  const requiredRole: AssistantRole = toolName === 'exportLesson' ? 'read' : 'write';
  const allowedTypes = scopeTypesForTool(toolName);
  if (allowedTypes.length && !scopes.some(scope => allowedTypes.includes(scope.resourceType))) throw new Error('Confirmation scope type mismatch');
  return Promise.all(scopes.map(async scope => {
    const collection = scope.resourceType === 'class' ? 'classes' : 'lessonPlans';
    const ownerField = scope.resourceType === 'class' ? 'teacherId' : 'userId';
    const resource = await db.collection(collection).doc(scope.resourceId).get();
    const ownerUid = resource.exists ? resource.data()?.[ownerField] : undefined;
    if (!isText(ownerUid)) throw new Error('Resource scope not found');
    return { resourceType: scope.resourceType, resourceId: scope.resourceId, ownerUid, requiredRole };
  }));
};

const authorizePreparedScopes = async (db: ConfirmationDb, actor: AssistantActor, scopes: ResourceScope[], now: number) => {
  for (const scope of scopes) {
    if (actor.firebaseUid === scope.ownerUid) continue;
    const shares = await db.collection('assistantShares')
      .where('resourceType', '==', scope.resourceType)
      .where('resourceId', '==', scope.resourceId)
      .where('ownerUid', '==', scope.ownerUid)
      .where('granteeUid', '==', actor.firebaseUid)
      .where('status', '==', 'active')
      .get();
    if (!shares.docs.some(doc => canUseAssistantShare(doc.data() as any, actor.firebaseUid, scope.resourceType, scope.resourceId, scope.requiredRole, now))) throw new Error('Share grant is not active');
  }
};

const validatePreparedTargets = async (db: ConfirmationDb, actor: AssistantActor, payload: Record<string, unknown>, resourceIds: string[], scopes: ResourceScope[]) => {
  const classScopes = scopes.filter(scope => scope.resourceType === 'class');
  for (const key of ['classId', 'lessonPlanId', 'assignmentId', 'studentId', 'examId', 'jobId']) {
    const target = payload[key];
    if (target !== undefined && (typeof target !== 'string' || !resourceIds.includes(target))) throw new Error('Payload resource scope mismatch');
  }
  const assignmentId = typeof payload.assignmentId === 'string' ? payload.assignmentId : undefined;
  if (assignmentId) {
    const assignment = await db.collection('assignments').doc(assignmentId).get();
    if (!assignment.exists || !classScopes.some(scope => scope.resourceId === assignment.data()?.classId && scope.ownerUid === assignment.data()?.teacherId)) throw new Error('Assignment scope mismatch');
  }
  const studentId = typeof payload.studentId === 'string' ? payload.studentId : undefined;
  if (studentId) {
    const classId = typeof payload.classId === 'string' ? payload.classId : undefined;
    const scope = classScopes.find(candidate => candidate.resourceId === classId);
    if (!scope || !classId) throw new Error('Student scope mismatch');
    const student = await db.collection('classes').doc(classId).collection('students').doc(studentId).get();
    if (!student.exists || student.data()?.teacherId !== scope.ownerUid || student.data()?.classId !== classId) throw new Error('Student scope mismatch');
  }
  const examId = typeof payload.examId === 'string' ? payload.examId : undefined;
  if (examId) {
    const exam = await db.collection('exams').doc(examId).get();
    if (!exam.exists || !scopes.some(scope => scope.ownerUid === exam.data()?.teacherId)) throw new Error('Exam scope mismatch');
  }
  const jobId = typeof payload.jobId === 'string' ? payload.jobId : undefined;
  if (jobId) {
    const job = await db.collection('assistantJobs').doc(jobId).get();
    if (!job.exists || job.data()?.actorUid !== actor.firebaseUid) throw new Error('Job scope mismatch');
  }
};

const readConfirmation = async (tx: Transaction, db: ConfirmationDb, id: string): Promise<{ ref: FirebaseFirestore.DocumentReference; value: AssistantConfirmationDoc } | null> => {
  const ref = db.collection('assistantConfirmations').doc(id);
  const snapshot = await tx.get(ref);
  if (!snapshot.exists) return null;
  const value = snapshot.data();
  if (!validStoredConfirmation(value)) throw new Error('Invalid confirmation record');
  return { ref, value };
};

const auditBase = (actor: AssistantActor, toolName: AssistantToolName, requestHash: string, resourceIds: string[], confirmationId: string, resultStatus: AssistantAuditLogDoc['resultStatus'], createdAt: number): AssistantAuditLogDoc => ({
  actorUid: actor.firebaseUid,
  channel: actor.channel,
  channelAccountId: actor.channelAccountId,
  channelUserId: actor.channelUserId,
  ...(actor.channelChatId ? { channelChatId: actor.channelChatId } : {}),
  toolName,
  resourceIds: resourceIds.slice(0, 50),
  resultStatus,
  ...(confirmationId ? { confirmationId } : {}),
  requestHash,
  createdAt,
});

const auditDeniedAttempt = async (db: ConfirmationDb, actor: AssistantActor, confirmationId: string, requestHash: string, error: unknown, now = Date.now()) => {
  try {
    const snapshot = await db.collection('assistantConfirmations').doc(confirmationId).get();
    const value = snapshot.exists && validStoredConfirmation(snapshot.data()) ? snapshot.data() as AssistantConfirmationDoc : undefined;
    const toolName = value?.toolName || 'getAssistantJobStatus';
    await db.collection('assistantAuditLogs').add({
      ...auditBase(actor, toolName, requestHash || value?.requestHash || '', (value?.resourceIds || value?.resourceScopes || []).map(resource => typeof resource === 'string' ? resource : resource.resourceId).slice(0, 50), confirmationId, 'denied', now),
      errorClass: safeErrorClass(error),
    });
  } catch {
    // Audit failure must not turn a denied request into an executable one.
  }
};

const expirePending = (tx: Transaction, db: ConfirmationDb, ref: FirebaseFirestore.DocumentReference, value: AssistantConfirmationDoc, now: number, actor: AssistantActor) => {
  tx.update(ref, { status: 'expired', ...deletePayload() });
  writeAudit(tx, db, auditBase(actor, value.toolName, value.requestHash, (value.resourceScopes || []).map(scope => scope.resourceId), ref.id, 'expired', now));
};

export interface CreateAssistantConfirmationInput {
  actor: AssistantActor;
  requestId: string;
  toolName: string;
  payload: Record<string, unknown>;
  preview: string;
  resourceIds?: string[];
  recipients?: string[];
  resourceScopes?: unknown;
  now?: number;
}

export async function createAssistantConfirmation(input: CreateAssistantConfirmationInput, db?: Firestore) {
  const now = input.now ?? Date.now();
  if (!isFiniteNumber(now) || !isText(input.requestId, 128)) throw new Error('Invalid confirmation request');
  if (!requiresAssistantConfirmation(input.toolName)) throw new Error('Read tools do not require confirmation');
  const normalizedPayload = normalizeAssistantConfirmationPayload(input.payload);
  const resourceIds = normalizeStringList(input.resourceIds, 'resource IDs');
  const recipients = normalizeStringList(input.recipients, 'recipients');
  const toolName = input.toolName as AssistantToolName;
  const firestore = dbOf(db);
  const scopeCandidates = normalizeScopes(input.resourceScopes);
  if (!scopeCandidates.length) throw new Error('Confirmation resource scope required');
  const resourceScopes = await resolveResourceScopes(firestore, toolName, scopeCandidates);
  await authorizePreparedScopes(firestore, input.actor, resourceScopes, now);
  await validatePreparedTargets(firestore, input.actor, normalizedPayload, resourceIds, resourceScopes);
  if (resourceScopes.some(scope => !resourceIds.includes(scope.resourceId))) throw new Error('Resource IDs and scopes do not match');
  for (const key of ['classId', 'lessonPlanId']) {
    const value = normalizedPayload[key];
    if (value !== undefined && (typeof value !== 'string' || !resourceScopes.some(scope => scope.resourceId === value && ((key === 'classId' && scope.resourceType === 'class') || (key === 'lessonPlanId' && scope.resourceType === 'lessonPlan'))))) throw new Error('Payload resource scope mismatch');
  }
  const requestHash = buildAssistantRequestHash({ actor: input.actor, toolName, resourceIds, payload: normalizedPayload, recipients, resourceScopes });
  const id = confirmationIdForRequest(input.actor, input.requestId);
  const value: AssistantConfirmationDoc = {
    channel: input.actor.channel, channelAccountId: input.actor.channelAccountId, channelUserId: input.actor.channelUserId,
    ...(input.actor.channelChatId ? { channelChatId: input.actor.channelChatId } : {}), linkId: input.actor.linkId,
    actorUid: input.actor.firebaseUid, toolName, requestHash, payload: normalizedPayload, resourceIds, resourceScopes, recipients,
    preview: sanitizeAssistantPreview(input.preview), createdAt: now, expiresAt: now + ASSISTANT_CONFIRMATION_TTL_MS, status: 'pending',
  };
  return firestore.runTransaction(async tx => {
    const existing = await readConfirmation(tx, firestore, id);
    if (existing) {
      if (!sameIdentity(input.actor, existing.value) || existing.value.requestHash !== requestHash || existing.value.toolName !== toolName) throw new Error('Request ID reused with different content');
      if (existing.value.status === 'pending' && existing.value.expiresAt <= now) {
        expirePending(tx, firestore, existing.ref, existing.value, now, input.actor);
        return publicConfirmation(id, { ...existing.value, status: 'expired', payload: undefined, resourceScopes: undefined, recipients: undefined });
      }
      writeAudit(tx, firestore, auditBase(input.actor, existing.value.toolName, existing.value.requestHash, (existing.value.resourceScopes || []).map(scope => scope.resourceId), id, 'replayed', now));
      return publicConfirmation(id, existing.value);
    }
    tx.create(firestore.collection('assistantConfirmations').doc(id), value);
    writeAudit(tx, firestore, auditBase(input.actor, toolName, requestHash, resourceIds, id, 'pending', now));
    return publicConfirmation(id, value);
  });
}

const verifyLinkInTransaction = async (tx: Transaction, db: ConfirmationDb, actor: AssistantActor, value: AssistantConfirmationDoc, now: number) => {
  const linkSnapshot = await tx.get(db.collection('channelLinks').doc(actor.linkId));
  if (!linkSnapshot.exists || !isUsableChannelLink(linkSnapshot.data() as ChannelLinkDoc, now, actor) || !sameIdentity(actor, { ...value, linkId: actor.linkId })) throw new Error('Channel link is no longer active');
  const link = linkSnapshot.data() as ChannelLinkDoc;
  if (link.firebaseUid !== actor.firebaseUid || !sameOptional(link.channelChatId, actor.channelChatId)) throw new Error('Channel identity changed');
};

const verifyScopesInTransaction = async (tx: Transaction, db: ConfirmationDb, actor: AssistantActor, scopes: ResourceScope[], now: number) => {
  for (const scope of scopes) {
    const collection = scope.resourceType === 'class' ? 'classes' : 'lessonPlans';
    const ownerField = scope.resourceType === 'class' ? 'teacherId' : 'userId';
    const resource = await tx.get(db.collection(collection).doc(scope.resourceId));
    if (!resource.exists || resource.data()?.[ownerField] !== scope.ownerUid) throw new Error('Resource scope changed');
    if (actor.firebaseUid === scope.ownerUid) continue;
    const shares = await tx.get(db.collection('assistantShares').where('resourceType', '==', scope.resourceType).where('resourceId', '==', scope.resourceId).where('ownerUid', '==', scope.ownerUid).where('granteeUid', '==', actor.firebaseUid).where('status', '==', 'active'));
    if (!shares.docs.some(doc => canUseAssistantShare(doc.data() as any, actor.firebaseUid, scope.resourceType, scope.resourceId, scope.requiredRole, now))) throw new Error('Share grant is no longer active');
  }
};

const verifyPreparedTargetsInTransaction = async (tx: Transaction, db: ConfirmationDb, actor: AssistantActor, payload: Record<string, unknown>, resourceIds: string[], scopes: ResourceScope[]) => {
  for (const key of ['classId', 'lessonPlanId', 'assignmentId', 'studentId', 'examId', 'jobId']) {
    const target = payload[key];
    if (target !== undefined && (typeof target !== 'string' || !resourceIds.includes(target))) throw new Error('Payload resource scope mismatch');
  }
  const classScopes = scopes.filter(scope => scope.resourceType === 'class');
  const assignmentId = typeof payload.assignmentId === 'string' ? payload.assignmentId : undefined;
  if (assignmentId) {
    const assignment = await tx.get(db.collection('assignments').doc(assignmentId));
    if (!assignment.exists || !classScopes.some(scope => scope.resourceId === assignment.data()?.classId && scope.ownerUid === assignment.data()?.teacherId)) throw new Error('Assignment scope mismatch');
  }
  const studentId = typeof payload.studentId === 'string' ? payload.studentId : undefined;
  if (studentId) {
    const classId = typeof payload.classId === 'string' ? payload.classId : undefined;
    const scope = classScopes.find(candidate => candidate.resourceId === classId);
    if (!scope || !classId) throw new Error('Student scope mismatch');
    const student = await tx.get(db.collection('classes').doc(classId).collection('students').doc(studentId));
    if (!student.exists || student.data()?.teacherId !== scope.ownerUid || student.data()?.classId !== classId) throw new Error('Student scope mismatch');
  }
  const examId = typeof payload.examId === 'string' ? payload.examId : undefined;
  if (examId) {
    const exam = await tx.get(db.collection('exams').doc(examId));
    if (!exam.exists || !scopes.some(scope => scope.ownerUid === exam.data()?.teacherId)) throw new Error('Exam scope mismatch');
  }
  const jobId = typeof payload.jobId === 'string' ? payload.jobId : undefined;
  if (jobId) {
    const job = await tx.get(db.collection('assistantJobs').doc(jobId));
    if (!job.exists || job.data()?.actorUid !== actor.firebaseUid) throw new Error('Job scope mismatch');
  }
};

export async function claimAssistantConfirmation(input: { actor: AssistantActor; confirmationId: string; requestHash: string; now?: number }, db?: Firestore) {
  const now = input.now ?? Date.now();
  if (!isText(input.confirmationId, 128) || !isText(input.requestHash, 128)) throw new Error('Invalid confirmation');
  const firestore = dbOf(db);
  try {
    return await firestore.runTransaction(async tx => {
    const found = await readConfirmation(tx, firestore, input.confirmationId);
    if (!found) throw new Error('Confirmation not found');
    const { ref, value } = found;
    if (!requiresAssistantConfirmation(value.toolName)) throw new Error('Read tools do not require confirmation');
    if (!sameIdentity(input.actor, value) || value.requestHash !== input.requestHash) throw new Error('Confirmation identity or payload changed');
    if (value.status === 'executed' || value.status === 'outcome_unknown') {
      writeAudit(tx, firestore, auditBase(input.actor, value.toolName, value.requestHash, (value.resourceScopes || []).map(scope => scope.resourceId), ref.id, 'replayed', now));
      return { ...publicConfirmation(ref.id, value, true), payload: undefined };
    }
    if (value.status === 'executing') {
      if (value.executionLeaseExpiresAt !== undefined && value.executionLeaseExpiresAt > now) return { confirmationId: ref.id, status: 'executing' as const, code: 'IN_PROGRESS' as const };
      const result = { code: 'OUTCOME_UNKNOWN' as const };
      tx.update(ref, { status: 'outcome_unknown', result, ...deletePayload() });
      writeAudit(tx, firestore, auditBase(input.actor, value.toolName, value.requestHash, (value.resourceScopes || []).map(scope => scope.resourceId), ref.id, 'outcome_unknown', now));
      return { confirmationId: ref.id, status: 'outcome_unknown' as const, code: 'OUTCOME_UNKNOWN' as const };
    }
    if (value.status === 'cancelled') throw new Error('Confirmation cancelled');
    if (value.status === 'expired' || value.expiresAt <= now) {
      if (value.status === 'pending') expirePending(tx, firestore, ref, value, now, input.actor);
      throw new Error('Confirmation expired');
    }
    await verifyLinkInTransaction(tx, firestore, input.actor, value, now);
    await verifyScopesInTransaction(tx, firestore, input.actor, (value.resourceScopes || []) as ResourceScope[], now);
    await verifyPreparedTargetsInTransaction(tx, firestore, input.actor, value.payload || {}, value.resourceIds || [], (value.resourceScopes || []) as ResourceScope[]);
    tx.update(ref, { status: 'executing', executionStartedAt: now, executionLeaseExpiresAt: now + ASSISTANT_EXECUTION_LEASE_MS });
    writeAudit(tx, firestore, auditBase(input.actor, value.toolName, value.requestHash, (value.resourceScopes || []).map(scope => scope.resourceId), ref.id, 'executing', now));
    return { confirmationId: ref.id, status: 'executing' as const, toolName: value.toolName, payload: value.payload || {}, requestHash: value.requestHash };
    });
  } catch (error) {
    await auditDeniedAttempt(firestore, input.actor, input.confirmationId, input.requestHash, error, now);
    throw error;
  }
}

export async function executeAssistantConfirmation<T>(input: {
  actor: AssistantActor;
  confirmationId: string;
  requestHash: string;
  execute: (value: { confirmationId: string; toolName: AssistantToolName; payload: Record<string, unknown>; actor: AssistantActor }) => Promise<T> | T;
  now?: number;
}, db?: Firestore) {
  const claim = await claimAssistantConfirmation({ actor: input.actor, confirmationId: input.confirmationId, requestHash: input.requestHash, now: input.now }, db);
  if (claim.status !== 'executing' || !('payload' in claim) || !claim.payload) return claim;
  try {
    const result = await input.execute({ confirmationId: claim.confirmationId, toolName: claim.toolName, payload: claim.payload, actor: input.actor });
    return finalizeAssistantConfirmation({ actor: input.actor, confirmationId: claim.confirmationId, success: true, result, now: input.now === undefined ? undefined : input.now }, db);
  } catch (error) {
    return finalizeAssistantConfirmation({ actor: input.actor, confirmationId: claim.confirmationId, success: false, error, now: input.now === undefined ? undefined : input.now }, db);
  }
}

export async function finalizeAssistantConfirmation(input: { actor: AssistantActor; confirmationId: string; success: boolean; result?: unknown; error?: unknown; now?: number }, db?: Firestore) {
  const now = input.now ?? Date.now();
  const firestore = dbOf(db);
  return firestore.runTransaction(async tx => {
    const found = await readConfirmation(tx, firestore, input.confirmationId);
    if (!found) throw new Error('Confirmation not found');
    const { ref, value } = found;
    if (!sameIdentity(input.actor, value)) throw new Error('Confirmation identity changed');
    if (value.status !== 'executing') return publicConfirmation(ref.id, value, true);
    if (input.success) {
      const result = normalizeAssistantConfirmationResult(input.result === undefined ? {} : input.result);
      tx.update(ref, { status: 'executed', executedAt: now, result, ...deletePayload() });
      writeAudit(tx, firestore, auditBase(input.actor, value.toolName, value.requestHash, (value.resourceScopes || []).map(scope => scope.resourceId), ref.id, 'success', now));
      return { confirmationId: ref.id, status: 'executed' as const, result };
    }
    const result = { code: 'OUTCOME_UNKNOWN' as const };
    tx.update(ref, { status: 'outcome_unknown', result, ...deletePayload() });
    writeAudit(tx, firestore, { ...auditBase(input.actor, value.toolName, value.requestHash, (value.resourceScopes || []).map(scope => scope.resourceId), ref.id, 'outcome_unknown', now), errorClass: safeErrorClass(input.error) });
    return { confirmationId: ref.id, status: 'outcome_unknown' as const, code: 'OUTCOME_UNKNOWN' as const };
  });
}

export async function cancelAssistantConfirmation(input: { actor: AssistantActor; confirmationId: string; requestHash?: string; now?: number }, db?: Firestore) {
  const now = input.now ?? Date.now();
  const firestore = dbOf(db);
  try {
    return await firestore.runTransaction(async tx => {
    const found = await readConfirmation(tx, firestore, input.confirmationId);
    if (!found) throw new Error('Confirmation not found');
    const { ref, value } = found;
    if (!sameIdentity(input.actor, value) || (input.requestHash && input.requestHash !== value.requestHash)) throw new Error('Confirmation identity or payload changed');
    if (value.status === 'pending' && value.expiresAt <= now) { expirePending(tx, firestore, ref, value, now, input.actor); throw new Error('Confirmation expired'); }
    if (value.status === 'pending') {
      tx.update(ref, { status: 'cancelled', ...deletePayload() });
      writeAudit(tx, firestore, auditBase(input.actor, value.toolName, value.requestHash, (value.resourceScopes || []).map(scope => scope.resourceId), ref.id, 'cancelled', now));
      return { confirmationId: ref.id, status: 'cancelled' as const };
    }
    if (value.status === 'executing') throw new Error('Confirmation already executing');
    writeAudit(tx, firestore, auditBase(input.actor, value.toolName, value.requestHash, (value.resourceScopes || []).map(scope => scope.resourceId), ref.id, 'replayed', now));
    return publicConfirmation(ref.id, value, true);
    });
  } catch (error) {
    await auditDeniedAttempt(firestore, input.actor, input.confirmationId, input.requestHash || '', error, now);
    throw error;
  }
}

export async function inspectAssistantConfirmation(input: { actor: AssistantActor; confirmationId: string; now?: number }, db?: Firestore) {
  const firestore = dbOf(db);
  const now = input.now ?? Date.now();
  try {
    return await firestore.runTransaction(async tx => {
    const found = await readConfirmation(tx, firestore, input.confirmationId);
    if (!found) throw new Error('Confirmation not found');
    const { ref, value } = found;
    if (!sameIdentity(input.actor, value)) throw new Error('Confirmation identity changed');
    if (value.status === 'pending' && value.expiresAt <= now) {
      expirePending(tx, firestore, ref, value, now, input.actor);
      return publicConfirmation(ref.id, { ...value, status: 'expired', payload: undefined, resourceScopes: undefined, recipients: undefined });
    }
    if (value.status === 'executing' && (value.executionLeaseExpiresAt === undefined || value.executionLeaseExpiresAt <= now)) {
      const result = { code: 'OUTCOME_UNKNOWN' as const };
      tx.update(ref, { status: 'outcome_unknown', result, ...deletePayload() });
      writeAudit(tx, firestore, auditBase(input.actor, value.toolName, value.requestHash, (value.resourceScopes || []).map(scope => scope.resourceId), ref.id, 'outcome_unknown', now));
      return publicConfirmation(ref.id, { ...value, status: 'outcome_unknown', result, payload: undefined, resourceScopes: undefined, recipients: undefined });
    }
    return publicConfirmation(ref.id, value);
    });
  } catch (error) {
    await auditDeniedAttempt(firestore, input.actor, input.confirmationId, '', error, now);
    throw error;
  }
}

export async function expirePendingAssistantConfirmations(now = Date.now(), db?: Firestore, limit = 100) {
  if (!isFiniteNumber(now) || !Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error('Invalid confirmation cleanup input');
  const firestore = dbOf(db);
  const snapshot = await firestore.collection('assistantConfirmations').where('status', '==', 'pending').where('expiresAt', '<=', now).limit(limit).get();
  const executingSnapshot = await firestore.collection('assistantConfirmations').where('status', '==', 'executing').where('executionLeaseExpiresAt', '<=', now).limit(limit).get();
  let expired = 0;
  let outcomeUnknown = 0;
  for (const doc of snapshot.docs) {
    const changed = await firestore.runTransaction(async tx => {
      const current = await tx.get(doc.ref);
      if (!current.exists) return false;
      const value = current.data() as AssistantConfirmationDoc;
      if (value.status !== 'pending' || value.expiresAt > now) return false;
      const actor: AssistantActor = {
        firebaseUid: value.actorUid, channel: value.channel, channelAccountId: value.channelAccountId,
        channelUserId: value.channelUserId, ...(value.channelChatId ? { channelChatId: value.channelChatId } : {}), linkId: value.linkId, active: true,
      };
      expirePending(tx, firestore, current.ref, value, now, actor);
      return true;
    });
    if (changed) expired += 1;
  }
  for (const doc of executingSnapshot.docs) {
    const changed = await firestore.runTransaction(async tx => {
      const current = await tx.get(doc.ref);
      if (!current.exists) return false;
      const value = current.data() as AssistantConfirmationDoc;
      if (value.status !== 'executing' || value.executionLeaseExpiresAt === undefined || value.executionLeaseExpiresAt > now) return false;
      const actor: AssistantActor = {
        firebaseUid: value.actorUid, channel: value.channel, channelAccountId: value.channelAccountId,
        channelUserId: value.channelUserId, ...(value.channelChatId ? { channelChatId: value.channelChatId } : {}), linkId: value.linkId, active: true,
      };
      const result = { code: 'OUTCOME_UNKNOWN' as const };
      tx.update(current.ref, { status: 'outcome_unknown', result, ...deletePayload() });
      writeAudit(tx, firestore, auditBase(actor, value.toolName, value.requestHash, (value.resourceScopes || []).map(scope => scope.resourceId), current.ref.id, 'outcome_unknown', now));
      return true;
    });
    if (changed) outcomeUnknown += 1;
  }
  return { expired, outcomeUnknown };
}

export async function auditAssistantRead(actor: AssistantActor, toolName: AssistantToolName, resourceIds: string[], requestHash: string, now = Date.now(), db?: Firestore) {
  const firestore = dbOf(db);
  await firestore.collection('assistantAuditLogs').add(auditBase(actor, toolName, requestHash, resourceIds, '', 'success', now));
}

export async function auditAssistantEvent(actor: AssistantActor, toolName: AssistantToolName, resultStatus: AssistantAuditLogDoc['resultStatus'], requestHash: string, confirmationId = '', resourceIds: string[] = [], errorClass?: string, now = Date.now(), db?: Firestore) {
  const firestore = dbOf(db);
  await firestore.collection('assistantAuditLogs').add({
    ...auditBase(actor, toolName, requestHash, resourceIds, confirmationId, resultStatus, now),
    ...(errorClass ? { errorClass: safeErrorClass(errorClass) } : {}),
  });
}
