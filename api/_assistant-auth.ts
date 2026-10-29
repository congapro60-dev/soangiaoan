/// <reference types="node" />
import crypto from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { canUseAssistantShare, isUsableChannelLink, isValidAssistantShareExpiry, type AssistantActor, type AssistantRequestNonceDoc, type AssistantShareDoc, type AssistantResourceType, type AssistantRole, type Channel, type ChannelLinkDoc, type LinkCodeDoc } from './_assistant-types.js';
import { getAdminDb } from './_exam-core.js';

export const LINK_CODE_TTL_MS = 10 * 60 * 1000;
export const ASSISTANT_SIGNATURE_WINDOW_SECONDS = 300;
export const ASSISTANT_SERVICE_ID = 'smartplan-assistant';

export const assistantSignaturePayload = (rawBody: string, timestamp: string, nonce: string): string =>
  `${timestamp}.${nonce}.${rawBody}.${ASSISTANT_SERVICE_ID}`;

/** Verifies adapter requests over the exact request body bytes. */
export const verifyAssistantServiceSignature = (
  rawBody: string,
  timestamp: string,
  nonce: string,
  signature: string,
  secret: string | undefined,
  now = Date.now(),
): boolean => {
  if (!secret?.trim() || !rawBody || !timestamp || !nonce || !signature) return false;
  const timestampSeconds = Number(timestamp);
  if (!Number.isInteger(timestampSeconds) || Math.abs(Math.floor(now / 1000) - timestampSeconds) > ASSISTANT_SIGNATURE_WINDOW_SECONDS) return false;
  if (!/^[0-9a-f]{64}$/.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(assistantSignaturePayload(rawBody, timestamp, nonce), 'utf8').digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
};

export const hashLinkCode = (code: string): string =>
  crypto.createHash('sha256').update(code, 'utf8').digest('hex');

export const generateLinkCode = (): string => crypto.randomBytes(24).toString('base64url');

export interface ChannelIdentity {
  channel: Channel;
  channelAccountId: string;
  channelUserId: string;
  channelChatId?: string;
  /** Supplied by the authenticated Zalo adapter after webhook signature validation. */
  verifiedChannelAccountId?: string;
}

export const allowedZaloOaIds = (value = process.env.ZALO_OA_ALLOWED_IDS): Set<string> =>
  new Set((value || '').split(',').map(id => id.trim()).filter(Boolean));

export const isAllowedZaloOaId = (oaId: string, value = process.env.ZALO_OA_ALLOWED_IDS): boolean =>
  Boolean(oaId?.trim() && allowedZaloOaIds(value).has(oaId));

export const allowedZaloBotIds = (value = process.env.ZALO_BOT_ALLOWED_IDS): Set<string> =>
  new Set((value || '').split(',').map(id => id.trim()).filter(Boolean));

export const isAllowedZaloBotId = (botId: string, value = process.env.ZALO_BOT_ALLOWED_IDS): boolean =>
  Boolean(botId?.trim() && allowedZaloBotIds(value).has(botId));

export const validateChannelIdentity = (identity: ChannelIdentity): void => {
  if (!identity || !['telegram', 'zalo_oa', 'zalo_bot'].includes(identity.channel)) throw new Error('Unsupported channel');
  if (!identity.channelAccountId?.trim() || !identity.channelUserId?.trim()) throw new Error('Channel account and user are required');
  if (identity.channel === 'telegram' && (!identity.channelChatId || identity.channelChatId !== identity.channelUserId)) {
    throw new Error('Telegram linking requires a private chat');
  }
  if (identity.channel === 'zalo_oa' && identity.verifiedChannelAccountId !== identity.channelAccountId) {
    throw new Error('Zalo OA identity is not verified');
  }
  if (identity.channel === 'zalo_bot') {
    if (identity.verifiedChannelAccountId !== identity.channelAccountId) throw new Error('Zalo Bot identity is not verified');
    if (!identity.channelChatId || identity.channelChatId !== identity.channelUserId) throw new Error('Zalo Bot linking requires a private chat');
  }
};

export const canRelinkActiveChannel = (existingFirebaseUid: string, targetFirebaseUid: string): boolean =>
  Boolean(existingFirebaseUid?.trim() && targetFirebaseUid?.trim() && existingFirebaseUid === targetFirebaseUid);

const adminDb = (db?: Firestore) => db || getAdminDb();

export const resolveChannelActor = async (channel: Channel, accountId: string, userId: string, chatId?: string, db?: Firestore, selector?: {
  preferredRole?: 'teacher' | 'parent' | 'student'; classId?: string; studentId?: string;
}): Promise<AssistantActor> => {
  validateChannelIdentity({ channel, channelAccountId: accountId, channelUserId: userId, channelChatId: chatId, verifiedChannelAccountId: channel === 'zalo_oa' || channel === 'zalo_bot' ? accountId : undefined });
  const firestore = adminDb(db);
  const snapshot = await firestore.collection('channelLinks').where('channel', '==', channel).where('channelAccountId', '==', accountId).where('channelUserId', '==', userId).where('active', '==', true).get();
  const now = Date.now();
  let matches = snapshot.docs.filter(doc => {
    const value = doc.data() as ChannelLinkDoc;
    return isUsableChannelLink(value, now, { channel, channelAccountId: accountId, channelUserId: userId, channelChatId: chatId })
      && value.channelChatId === chatId
      && (value.role === undefined || value.role === 'teacher' || value.firebaseUid === `pinlink:${value.role}:${value.classId}:${value.studentId}`)
      && (channel === 'zalo_bot' || (value.role ?? 'teacher') === 'teacher');
  });
  if (selector !== undefined) {
    matches = matches.filter(doc => {
      const link = doc.data() as ChannelLinkDoc;
      return (selector.preferredRole === undefined || (link.role ?? 'teacher') === selector.preferredRole)
        && (selector.classId === undefined || link.classId === selector.classId)
        && (selector.studentId === undefined || link.studentId === selector.studentId);
    });
  } else {
    const teachers = matches.filter(doc => (doc.data().role ?? 'teacher') === 'teacher');
    if (teachers.length) matches = teachers;
  }
  if (matches.length > 1) throw new Error('Ambiguous channel links: specify role, classId and studentId');
  const match = matches[0];
  if (!match) throw new Error('Channel is not linked');
  const link = match.data() as ChannelLinkDoc;
  return { firebaseUid: link.firebaseUid, channel, channelAccountId: accountId, channelUserId: userId, ...(link.channelChatId ? { channelChatId: link.channelChatId } : {}), linkId: match.id, active: true,
    role: link.role ?? 'teacher', ...(link.classId !== undefined ? { classId: link.classId } : {}), ...(link.studentId !== undefined ? { studentId: link.studentId } : {}),
  };
};

/**
 * Giữ chỗ 1 yêu cầu theo `nonce` — trùng thì throw 'Replay detected'.
 * `ttlMs` cho phép dùng nonce NGẮN HẠN (khoá chống gửi trùng theo nội dung tin): mặc định
 * bằng cửa sổ chữ ký 300s; truyền 90s để vẫn cho phép người dùng cố ý gửi lại cùng nội dung.
 */
export const claimAssistantRequestNonce = async (nonce: string, now = Date.now(), db?: Firestore, ttlMs?: number): Promise<void> => {
  if (!/^[A-Za-z0-9._~-]{1,256}$/.test(nonce)) throw new Error('Invalid request');
  const firestore = adminDb(db);
  const ref = firestore.collection('assistantRequestNonces').doc(nonce);
  const ttl = Number.isFinite(ttlMs) && (ttlMs as number) > 0 ? (ttlMs as number) : ASSISTANT_SIGNATURE_WINDOW_SECONDS * 1000;
  await firestore.runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (existing.exists) throw new Error('Replay detected');
    tx.set(ref, { createdAt: now, expiresAt: now + ttl } satisfies AssistantRequestNonceDoc);
  });
};

export const verifyFirebaseIdToken = async (idToken: string): Promise<string> => {
  if (!idToken?.trim()) throw new Error('Missing Firebase ID token');
  getAdminDb();
  const decoded = await getAuth().verifyIdToken(idToken);
  return decoded.uid;
};

export const createLinkCode = async (idToken: string, now = Date.now(), db?: Firestore) => {
  const firebaseUid = await verifyFirebaseIdToken(idToken);
  const code = generateLinkCode();
  const expiresAt = now + LINK_CODE_TTL_MS;
  const ref = adminDb(db).collection('assistantLinkCodes').doc();
  await ref.set({
    codeHash: hashLinkCode(code), firebaseUid, createdAt: now, expiresAt,
  } satisfies LinkCodeDoc);
  return { code, expiresAt, linkId: ref.id };
};

const cancelConfirmations = async (tx: Transaction, db: Firestore, identity: ChannelIdentity, actorUid: string, linkId?: string, now = Date.now(), ignoreChat = false) => {
  const query = db.collection('assistantConfirmations')
    .where('channel', '==', identity.channel)
    .where('channelAccountId', '==', identity.channelAccountId)
    .where('channelUserId', '==', identity.channelUserId)
    .where('status', '==', 'pending')
    .limit(100);
  const snapshot = await tx.get(query);
  snapshot.docs.forEach(doc => {
    const value = doc.data() as { channelChatId?: string; linkId?: string };
    const sameChat = ignoreChat || value.channelChatId === identity.channelChatId;
    const sameLink = linkId === undefined || value.linkId === linkId;
    if (sameChat && sameLink) {
      const confirmation = doc.data() as { actorUid?: string; channel?: Channel; channelAccountId?: string; channelUserId?: string; channelChatId?: string; toolName?: string; requestHash?: string; resourceScopes?: Array<{ resourceId?: string }> };
      tx.update(doc.ref, { status: 'cancelled', cancelledAt: now, actorUid, payload: FieldValue.delete(), resourceScopes: FieldValue.delete(), recipients: FieldValue.delete() });
      tx.set(db.collection('assistantAuditLogs').doc(), {
        actorUid: confirmation.actorUid || actorUid,
        channel: confirmation.channel || identity.channel,
        channelAccountId: confirmation.channelAccountId || identity.channelAccountId,
        channelUserId: confirmation.channelUserId || identity.channelUserId,
        ...(confirmation.channelChatId ? { channelChatId: confirmation.channelChatId } : {}),
        toolName: confirmation.toolName || 'getAssistantJobStatus',
        resourceIds: (confirmation.resourceScopes || []).map(scope => scope.resourceId).filter((resourceId): resourceId is string => typeof resourceId === 'string').slice(0, 50),
        resultStatus: 'cancelled', confirmationId: doc.id, requestHash: confirmation.requestHash || '', createdAt: now,
      });
    }
  });
};

export const consumeLinkCode = async (
  code: string,
  identity: ChannelIdentity,
  now = Date.now(),
  db?: Firestore,
): Promise<{ linkId: string; firebaseUid: string }> => {
  validateChannelIdentity(identity);
  if (!code?.trim()) throw new Error('Invalid link code');
  const firestore = adminDb(db);
  return firestore.runTransaction(async tx => {
    const matches = await tx.get(firestore.collection('assistantLinkCodes').where('codeHash', '==', hashLinkCode(code)).limit(1));
    if (matches.empty) throw new Error('Invalid or used link code');
    const codeDoc = matches.docs[0];
    const value = codeDoc.data() as LinkCodeDoc;
    if (value.usedAt || !value.expiresAt || value.expiresAt <= now) throw new Error('Expired or used link code');

    const existingSnapshot = await tx.get(firestore.collection('channelLinks')
      .where('channel', '==', identity.channel)
      .where('channelAccountId', '==', identity.channelAccountId)
      .where('channelUserId', '==', identity.channelUserId)
      .where('active', '==', true));
    const linkRef = firestore.collection('channelLinks').doc(codeDoc.id);
    const linkSnapshot = await tx.get(linkRef);
    const existing = existingSnapshot.docs.filter(doc => (doc.data()?.role ?? 'teacher') === 'teacher');
    existing.forEach(doc => {
      const existingUid = String(doc.data()?.firebaseUid || '');
      if (!canRelinkActiveChannel(existingUid, value.firebaseUid)) throw new Error('Channel is already linked to another account');
    });
    if (linkSnapshot.exists && linkSnapshot.data()?.active === true && linkSnapshot.data()?.firebaseUid !== value.firebaseUid) {
      throw new Error('Link is already used');
    }
    await cancelConfirmations(tx, firestore, identity, value.firebaseUid, undefined, now, true);
    existing.forEach(doc => tx.update(doc.ref, { active: false, revokedAt: now, updatedAt: now }));

    const link: ChannelLinkDoc = {
      firebaseUid: value.firebaseUid,
      channel: identity.channel,
      channelAccountId: identity.channelAccountId,
      channelUserId: identity.channelUserId,
      ...(identity.channelChatId ? { channelChatId: identity.channelChatId } : {}),
      createdAt: now, updatedAt: now, active: true,
    };
    tx.set(linkRef, link);
    tx.update(codeDoc.ref, { usedAt: now, usedBy: { channel: identity.channel, channelAccountId: identity.channelAccountId, channelUserId: identity.channelUserId } });
    return { linkId: codeDoc.id, firebaseUid: value.firebaseUid };
  });
};

export const revokeChannelLink = async (
  idToken: string,
  linkId: string,
  now = Date.now(),
  db?: Firestore,
): Promise<void> => {
  const firebaseUid = await verifyFirebaseIdToken(idToken);
  const firestore = adminDb(db);
  await firestore.runTransaction(async tx => {
    const ref = firestore.collection('channelLinks').doc(linkId);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists || snapshot.data()?.firebaseUid !== firebaseUid) throw new Error('Link not found');
    const link = snapshot.data() as ChannelLinkDoc;
    await cancelConfirmations(tx, firestore, link, firebaseUid, linkId, now, true);
    tx.update(ref, { active: false, revokedAt: now, updatedAt: now });
  });
};

export const revokeLink = revokeChannelLink;

export interface ChannelLinkSummary {
  linkId: string;
  channel: Channel;
  channelAccountId: string;
  channelUserId: string;
  createdAt: number;
}

export const listActiveChannelLinks = async (idToken: string, db?: Firestore): Promise<ChannelLinkSummary[]> => {
  const firebaseUid = await verifyFirebaseIdToken(idToken);
  const snapshot = await adminDb(db).collection('channelLinks')
    .where('firebaseUid', '==', firebaseUid)
    .where('active', '==', true)
    .get();
  return snapshot.docs.map(doc => {
    const value = doc.data() as ChannelLinkDoc;
    return {
      linkId: doc.id,
      channel: value.channel,
      channelAccountId: value.channelAccountId,
      channelUserId: value.channelUserId,
      createdAt: value.createdAt,
    };
  });
};

export const cancelLinkCode = async (
  idToken: string,
  linkId: string,
  now = Date.now(),
  db?: Firestore,
): Promise<void> => {
  const firebaseUid = await verifyFirebaseIdToken(idToken);
  if (!linkId?.trim()) throw new Error('Link not found');
  const firestore = adminDb(db);
  await firestore.runTransaction(async tx => {
    const ref = firestore.collection('assistantLinkCodes').doc(linkId);
    const snapshot = await tx.get(ref);
    const value = snapshot.data() as LinkCodeDoc | undefined;
    if (!snapshot.exists || !value || value.firebaseUid !== firebaseUid || value.usedAt || value.expiresAt <= now) throw new Error('Link not found');
    tx.update(ref, { usedAt: now });
  });
};

export const createAssistantShare = async (idToken: string, input: { resourceType: AssistantResourceType; resourceId: string; granteeUid: string; role: AssistantRole; expiresAt?: number }, now = Date.now(), db?: Firestore) => {
  const ownerUid = await verifyFirebaseIdToken(idToken);
  const { resourceType, resourceId, granteeUid, role, expiresAt } = input;
  if (!['class', 'lessonPlan'].includes(resourceType) || !resourceId?.trim() || !granteeUid?.trim() || !['read', 'write'].includes(role) || ownerUid === granteeUid || !isValidAssistantShareExpiry(expiresAt, now)) throw new Error('Invalid share');
  const firestore = adminDb(db);
  const collection = resourceType === 'class' ? 'classes' : 'lessonPlans';
  const ownerField = resourceType === 'class' ? 'teacherId' : 'userId';
  const resource = await firestore.collection(collection).doc(resourceId).get();
  if (!resource.exists || resource.data()?.[ownerField] !== ownerUid) throw new Error('Resource not found');
  const user = await getAuth().getUser(granteeUid);
  if (!user.uid) throw new Error('Grantee not found');
  const ref = firestore.collection('assistantShares').doc();
  const share: AssistantShareDoc = { resourceType, resourceId, ownerUid, granteeUid, role, status: 'active', createdAt: now, ...(expiresAt === undefined ? {} : { expiresAt }) };
  await ref.set(share);
  return { shareId: ref.id, ...share };
};

export const listAssistantShares = async (idToken: string, db?: Firestore) => {
  const ownerUid = await verifyFirebaseIdToken(idToken);
  const snapshot = await adminDb(db).collection('assistantShares').where('ownerUid', '==', ownerUid).get();
  return snapshot.docs.map(doc => ({ shareId: doc.id, ...doc.data() as AssistantShareDoc }));
};

export const revokeAssistantShare = async (idToken: string, shareId: string, now = Date.now(), db?: Firestore): Promise<void> => {
  const ownerUid = await verifyFirebaseIdToken(idToken);
  if (!shareId?.trim()) throw new Error('Share not found');
  const firestore = adminDb(db);
  await firestore.runTransaction(async tx => {
    const ref = firestore.collection('assistantShares').doc(shareId);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists || snapshot.data()?.ownerUid !== ownerUid) throw new Error('Share not found');
    const share = snapshot.data() as AssistantShareDoc;
    const pending = await tx.get(firestore.collection('assistantConfirmations')
      .where('actorUid', '==', share.granteeUid)
      .where('status', '==', 'pending')
      .limit(100));
    pending.docs.forEach(doc => {
      const confirmation = doc.data() as { resourceScopes?: Array<{ resourceType?: string; resourceId?: string; ownerUid?: string }>; channel?: Channel; channelAccountId?: string; channelUserId?: string; channelChatId?: string; actorUid?: string; toolName?: string; requestHash?: string };
      const matches = (confirmation.resourceScopes || []).some(scope => scope.resourceType === share.resourceType && scope.resourceId === share.resourceId && scope.ownerUid === share.ownerUid);
      if (!matches) return;
      tx.update(doc.ref, { status: 'cancelled', cancelledAt: now, payload: FieldValue.delete(), resourceIds: FieldValue.delete(), resourceScopes: FieldValue.delete(), recipients: FieldValue.delete() });
      tx.set(firestore.collection('assistantAuditLogs').doc(), {
        actorUid: confirmation.actorUid || share.granteeUid,
        channel: confirmation.channel || 'telegram',
        channelAccountId: confirmation.channelAccountId || 'unknown',
        channelUserId: confirmation.channelUserId || 'unknown',
        ...(confirmation.channelChatId ? { channelChatId: confirmation.channelChatId } : {}),
        toolName: confirmation.toolName || 'getAssistantJobStatus', resourceIds: [share.resourceId], resultStatus: 'cancelled',
        confirmationId: doc.id, requestHash: confirmation.requestHash || '', createdAt: now,
      });
    });
    tx.update(ref, { status: 'revoked', revokedAt: now });
  });
};

export const canActorAccessSharedResource = async (actorUid: string, ownerUid: string, resourceType: AssistantResourceType, resourceId: string, role: AssistantRole, db?: Firestore, now = Date.now()): Promise<boolean> => {
  if (actorUid === ownerUid) return true;
  const snapshot = await adminDb(db).collection('assistantShares').where('resourceType', '==', resourceType).where('resourceId', '==', resourceId).where('ownerUid', '==', ownerUid).where('granteeUid', '==', actorUid).where('status', '==', 'active').get();
  return snapshot.docs.some(doc => canUseAssistantShare(doc.data() as AssistantShareDoc, actorUid, resourceType, resourceId, role, now));
};
