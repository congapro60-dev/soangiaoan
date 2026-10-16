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

export function isUsableChannelLink(
  link: ChannelLinkDoc,
  now: number,
  identity?: Pick<ChannelLinkDoc, 'channel' | 'channelAccountId' | 'channelUserId'>,
): boolean {
  return link.active === true && link.revokedAt === undefined && Number.isFinite(now)
    && Number.isFinite(link.createdAt) && link.createdAt <= now
    && (link.expiresAt === undefined || (Number.isFinite(link.expiresAt) && link.expiresAt > now))
    && (identity === undefined || (link.channel === identity.channel
      && link.channelAccountId === identity.channelAccountId
      && link.channelUserId === identity.channelUserId));
}

export function canUseAssistantShare(
  share: AssistantShareDoc,
  actorUid: string,
  resourceType: AssistantResourceType,
  resourceId: string,
  requiredRole: AssistantRole,
  now: number,
): boolean {
  if ((share.status !== 'active' && share.status !== 'revoked')
    || (share.role !== 'read' && share.role !== 'write')
    || (share.resourceType !== 'class' && share.resourceType !== 'lessonPlan')
    || share.status !== 'active' || share.revokedAt !== undefined
    || share.resourceType !== resourceType || share.resourceId !== resourceId
    || !Number.isFinite(now) || !Number.isFinite(share.createdAt) || share.createdAt > now
    || (share.expiresAt !== undefined
      && (!Number.isFinite(share.expiresAt) || share.expiresAt <= now))) return false;
  if (share.ownerUid === actorUid) return true;
  return share.granteeUid === actorUid && (requiredRole === 'read' || share.role === 'write');
}
