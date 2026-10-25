import crypto from 'node:crypto';
import type { AssistantActor, AssistantToolName } from './_assistant-types.js';

export const ASSISTANT_CONFIRMATION_TTL_MS = 5 * 60 * 1000;

export type AssistantToolCategory = 'read' | 'draft' | 'write' | 'send' | 'destructive' | 'billable';

const TOOL_CATEGORIES: Record<AssistantToolName, AssistantToolCategory> = {
  listClasses: 'read', getClassSummary: 'read', listStudents: 'read', getStudentTeacherSummary: 'read',
  listAssignments: 'read', getAssignmentSubmissionSummary: 'read', getStudentSubmissionHistory: 'read',
  getApprovedGradeSummary: 'read', searchLessonPlans: 'read', getLessonPlan: 'read', searchExams: 'read',
  getAdaptiveProgressSummary: 'read', getAssistantJobStatus: 'read', draftLesson: 'draft',
  patchLessonSection: 'write', exportLesson: 'write', uploadLessonToDrive: 'write', createAssignment: 'write',
  startAssignmentGrading: 'billable', approveGrade: 'write', editGrade: 'write', sendTeacherMessage: 'send',
  sendParentMessage: 'send', revokeStudentAccess: 'destructive', replaceDriveFile: 'destructive',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isNonEmptyString = (value: unknown, max = 256): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
const SENSITIVE_KEYS = /^(?:api[-_]?key|password|passwd|secret|access[-_]?token|refresh[-_]?token|token|pin|(?:file|download)[-_]?url|authorization|credentials?|student[-_]?submission|(?:student|submission)[-_]?(?:text|content|body|data|raw)|answer[-_]?(?:text|content|body|data|raw)|raw[-_]?(?:text|content|data)|teacher[-_]?note|private[-_]?(?:text|content|data)|phone|email|full[-_]?name)$/i;
const PRIVATE_URL = /https?:\/\/[^\s<>'"]*(?:[?&](?:amp;)?(?:token|signature|sig|expires|expiry|x-amz-[^=]+)=|%2F[^\s<>'"]*\?(?:alt|token)=)[^\s<>'"]*/i;
const SENSITIVE_TEXT = /(?:m[aã]\s*pin|access\s*token|api\s*key|private\s*key|b[aà]i\s*l[aà]m|n[oộ]i\s*dung\s*b[aà]i\s*n[oộ]p|ghi\s*ch[uú]\s*ri[eê]ng|student\s*submission)/i;
const PII_TEXT = /(?:\b\d{3}[ .-]?\d{3}[ .-]?\d{3,4}\b|\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b)/i;

export function classifyAssistantTool(toolName: string): AssistantToolCategory {
  if (!Object.hasOwn(TOOL_CATEGORIES, toolName)) throw new Error('Unsupported assistant tool');
  return TOOL_CATEGORIES[toolName as AssistantToolName];
}

export const requiresAssistantConfirmation = (toolName: string): boolean => classifyAssistantTool(toolName) !== 'read';

function normalizeJson(value: unknown, depth: number): unknown {
  if (depth > 10) throw new Error('Confirmation payload too deep');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > 8000 || PRIVATE_URL.test(value) || SENSITIVE_TEXT.test(value) || PII_TEXT.test(value)) throw new Error('Sensitive confirmation payload');
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid confirmation payload');
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 200) throw new Error('Confirmation payload too large');
    return value.map(item => normalizeJson(item, depth + 1));
  }
  if (!isRecord(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new Error('Invalid confirmation payload');
  }
  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length > 200) throw new Error('Confirmation payload too large');
  const result: Record<string, unknown> = {};
  for (const [key, item] of entries) {
    if (SENSITIVE_KEYS.test(key)) throw new Error('Sensitive confirmation payload');
    result[key] = normalizeJson(item, depth + 1);
  }
  return result;
}

export function normalizeAssistantConfirmationPayload(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('Invalid confirmation payload');
  try {
    const normalized = normalizeJson(value, 0) as Record<string, unknown>;
    if (Buffer.byteLength(JSON.stringify(normalized), 'utf8') > 16_000) throw new Error('Confirmation payload too large');
    return normalized;
  } catch (error) {
    if (error instanceof Error && /^(?:Sensitive|Invalid|Confirmation payload)/.test(error.message)) throw error;
    throw new Error('Invalid confirmation payload');
  }
}

export function normalizeAssistantConfirmationResult(value: unknown): unknown {
  try {
    const normalized = normalizeJson(value, 0);
    if (Buffer.byteLength(JSON.stringify(normalized), 'utf8') > 8000) throw new Error('Confirmation result too large');
    return normalized;
  } catch {
    return { code: 'RESULT_REDACTED' };
  }
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  throw new Error('Invalid assistant request hash input');
}

const actorIdentity = (actor: AssistantActor) => {
  if (!isRecord(actor) || actor.active !== true || !isNonEmptyString(actor.firebaseUid)
    || (actor.channel !== 'telegram' && actor.channel !== 'zalo_oa' && actor.channel !== 'zalo_bot')
    || !isNonEmptyString(actor.channelAccountId) || !isNonEmptyString(actor.channelUserId)
    || !isNonEmptyString(actor.linkId) || (actor.channelChatId !== undefined && !isNonEmptyString(actor.channelChatId))) {
    throw new Error('Invalid assistant actor');
  }
  return {
    firebaseUid: actor.firebaseUid, channel: actor.channel, channelAccountId: actor.channelAccountId,
    channelUserId: actor.channelUserId, channelChatId: actor.channelChatId || null, linkId: actor.linkId,
  };
};

function stringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length > 500 || !value.every(item => isNonEmptyString(item))) throw new Error(`Invalid ${label}`);
  return [...value];
}

export function buildAssistantRequestHash(input: {
  actor: AssistantActor; toolName: string; resourceIds: string[]; payload: Record<string, unknown>; recipients: string[];
  resourceScopes?: Array<{ resourceType: 'class' | 'lessonPlan'; resourceId: string; requiredRole: 'read' | 'write'; ownerUid: string }>;
}): string {
  const toolName = input.toolName;
  classifyAssistantTool(toolName);
  const normalized = {
    toolName,
    actor: actorIdentity(input.actor),
    resourceIds: stringList(input.resourceIds, 'resource IDs'),
    resourceScopes: (input.resourceScopes || []).map(scope => ({
      resourceType: scope.resourceType, resourceId: scope.resourceId, requiredRole: scope.requiredRole,
      ownerUid: scope.ownerUid,
    })).sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b))),
    payload: normalizeAssistantConfirmationPayload(input.payload),
    recipients: stringList(input.recipients, 'recipients'),
  };
  return crypto.createHash('sha256').update(canonicalJson(normalized), 'utf8').digest('hex');
}

export function confirmationIdForRequest(actor: AssistantActor, requestId: string): string {
  if (!isNonEmptyString(requestId, 128)) throw new Error('Invalid request ID');
  return crypto.createHash('sha256').update(canonicalJson({ actor: actorIdentity(actor), requestId }), 'utf8').digest('hex');
}

export function sanitizeAssistantPreview(preview: unknown): string {
  if (typeof preview !== 'string' || !preview.trim()) throw new Error('Invalid confirmation preview');
  if (SENSITIVE_TEXT.test(preview) || PII_TEXT.test(preview)) throw new Error('Sensitive confirmation preview');
  return preview.slice(0, 2000).replace(/https?:\/\/[^\s<>'"]+/gi, url => {
    const trailing = url.match(/[)\].,!?:;]+$/)?.[0] || '';
    const link = trailing ? url.slice(0, -trailing.length) : url;
    return PRIVATE_URL.test(link) ? '[liên kết riêng tư đã ẩn]' + trailing : url;
  }).slice(0, 1200);
}
