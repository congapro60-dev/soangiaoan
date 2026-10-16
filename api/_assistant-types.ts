export type Channel = 'telegram' | 'zalo_oa';

export type AssistantToolName =
  | 'listClasses' | 'getClassSummary' | 'listStudents' | 'getStudentTeacherSummary'
  | 'listAssignments' | 'getAssignmentSubmissionSummary' | 'getStudentSubmissionHistory'
  | 'getApprovedGradeSummary' | 'searchLessonPlans' | 'getLessonPlan' | 'searchExams'
  | 'getAdaptiveProgressSummary' | 'getAssistantJobStatus' | 'draftLesson'
  | 'patchLessonSection' | 'exportLesson' | 'uploadLessonToDrive' | 'createAssignment'
  | 'startAssignmentGrading' | 'approveGrade' | 'editGrade' | 'sendTeacherMessage'
  | 'sendParentMessage' | 'revokeStudentAccess' | 'replaceDriveFile';

export type AssistantResourceType = 'class' | 'lessonPlan';
export type AssistantRole = 'read' | 'write';
export type AssistantShareStatus = 'active' | 'revoked';
export type AssistantConfirmationStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'executed';

export interface AssistantActor {
  firebaseUid: string;
  channel: Channel;
  /** Telegram bot identity or Zalo OA ID. Always paired with channelUserId. */
  channelAccountId: string;
  /** Telegram numeric user ID or a Zalo UID scoped to channelAccountId. */
  channelUserId: string;
  channelChatId?: string;
  linkId: string;
  active: true;
}

export interface LinkCodeDoc {
  codeHash: string;
  firebaseUid: string;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
  usedBy?: Pick<AssistantActor, 'channel' | 'channelAccountId' | 'channelUserId'>;
}

export interface ChannelLinkDoc {
  firebaseUid: string;
  channel: Channel;
  /** Identity is the pair (channelAccountId, channelUserId), never the UID alone. */
  channelAccountId: string;
  channelUserId: string;
  channelChatId?: string;
  createdAt: number;
  updatedAt: number;
  active: boolean;
  expiresAt?: number;
  revokedAt?: number;
}

export interface AssistantShareDoc {
  resourceType: AssistantResourceType;
  resourceId: string;
  ownerUid: string;
  granteeUid: string;
  role: AssistantRole;
  status: AssistantShareStatus;
  createdAt: number;
  expiresAt?: number;
  revokedAt?: number;
}

export interface AssistantConfirmationDoc {
  channel: Channel;
  channelAccountId: string;
  channelUserId: string;
  channelChatId?: string;
  actorUid: string;
  toolName: AssistantToolName;
  requestHash: string;
  preview: string;
  createdAt: number;
  expiresAt: number;
  status: AssistantConfirmationStatus;
  executedAt?: number;
  resultRef?: string;
}

export interface AssistantAuditLogDoc {
  actorUid: string;
  channel: Channel;
  channelAccountId: string;
  channelUserId: string;
  channelChatId?: string;
  toolName: AssistantToolName;
  resourceIds: string[];
  resultStatus: 'success' | 'denied' | 'error' | 'queued';
  confirmationId?: string;
  requestHash: string;
  errorClass?: string;
  createdAt: number;
}

export interface AssistantJobDoc {
  actorUid: string;
  channel: Channel;
  channelAccountId: string;
  channelUserId: string;
  channelChatId?: string;
  toolName: AssistantToolName;
  requestHash: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
  confirmationId?: string;
  resultRef?: string;
  errorClass?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const isChannel = (value: unknown): value is Channel =>
  value === 'telegram' || value === 'zalo_oa';
const isRole = (value: unknown): value is AssistantRole =>
  value === 'read' || value === 'write';
const isResourceType = (value: unknown): value is AssistantResourceType =>
  value === 'class' || value === 'lessonPlan';
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isOptionalFiniteNumber = (value: unknown): boolean =>
  value === undefined || isFiniteNumber(value);

export function isUsableChannelLink(
  link: ChannelLinkDoc,
  now: number,
  identity?: Pick<ChannelLinkDoc, 'channel' | 'channelAccountId' | 'channelUserId'>,
): boolean {
  try {
    if (!isRecord(link) || !isFiniteNumber(now)) return false;
    const validIdentity = (value: unknown): value is Pick<ChannelLinkDoc, 'channel' | 'channelAccountId' | 'channelUserId'> =>
      isRecord(value) && isChannel(value.channel)
      && isNonEmptyString(value.channelAccountId) && isNonEmptyString(value.channelUserId);
    if (!validIdentity(link) || (identity !== undefined && !validIdentity(identity))) return false;
    return link.active === true
      && isFiniteNumber(link.createdAt) && isFiniteNumber(link.updatedAt)
      && link.createdAt <= now
      && isOptionalFiniteNumber(link.expiresAt) && (link.expiresAt === undefined || link.expiresAt > now)
      && isOptionalFiniteNumber(link.revokedAt) && link.revokedAt === undefined
      && (identity === undefined || (link.channel === identity.channel
        && link.channelAccountId === identity.channelAccountId
        && link.channelUserId === identity.channelUserId));
  } catch {
    return false;
  }
}

export function canUseAssistantShare(
  share: AssistantShareDoc,
  actorUid: string,
  resourceType: AssistantResourceType,
  resourceId: string,
  requiredRole: AssistantRole,
  now: number,
): boolean {
  try {
    if (!isRecord(share) || !isNonEmptyString(actorUid) || !isNonEmptyString(resourceId)
      || !isResourceType(resourceType) || !isRole(requiredRole) || !isFiniteNumber(now)
      || !isNonEmptyString(share.resourceId) || !isNonEmptyString(share.ownerUid)
      || !isNonEmptyString(share.granteeUid) || !isResourceType(share.resourceType)
      || !isRole(share.role) || (share.status !== 'active' && share.status !== 'revoked')
      || share.status !== 'active' || share.revokedAt !== undefined
      || share.resourceType !== resourceType || share.resourceId !== resourceId
      || !isFiniteNumber(share.createdAt) || share.createdAt > now
      || !isOptionalFiniteNumber(share.expiresAt)
      || (share.expiresAt !== undefined && share.expiresAt <= now)
      || !isOptionalFiniteNumber(share.revokedAt)) return false;
    if (share.ownerUid === actorUid) return true;
    return share.granteeUid === actorUid && (requiredRole === 'read' || share.role === 'write');
  } catch {
    return false;
  }
}
