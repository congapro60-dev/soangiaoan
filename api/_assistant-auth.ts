/// <reference types="node" />
import crypto from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import type { Channel, ChannelLinkDoc, LinkCodeDoc } from './_assistant-types.js';
import { getAdminDb } from './_exam-core.js';

export const LINK_CODE_TTL_MS = 10 * 60 * 1000;

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

export const validateChannelIdentity = (identity: ChannelIdentity): void => {
  if (!identity || (identity.channel !== 'telegram' && identity.channel !== 'zalo_oa')) throw new Error('Unsupported channel');
  if (!identity.channelAccountId?.trim() || !identity.channelUserId?.trim()) throw new Error('Channel account and user are required');
  if (identity.channel === 'telegram' && (!identity.channelChatId || identity.channelChatId !== identity.channelUserId)) {
    throw new Error('Telegram linking requires a private chat');
  }
  if (identity.channel === 'zalo_oa' && identity.verifiedChannelAccountId !== identity.channelAccountId) {
    throw new Error('Zalo OA identity is not verified');
  }
};

const adminDb = (db?: Firestore) => db || getAdminDb();

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

const cancelConfirmations = async (tx: Transaction, db: Firestore, identity: ChannelIdentity, actorUid: string) => {
  const query = db.collection('assistantConfirmations')
    .where('channel', '==', identity.channel)
    .where('channelAccountId', '==', identity.channelAccountId)
    .where('channelUserId', '==', identity.channelUserId)
    .where('status', '==', 'pending');
  const snapshot = await tx.get(query);
  snapshot.docs.forEach(doc => tx.update(doc.ref, { status: 'cancelled', cancelledAt: Date.now(), actorUid }));
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

    const existing = await tx.get(firestore.collection('channelLinks')
      .where('channel', '==', identity.channel)
      .where('channelAccountId', '==', identity.channelAccountId)
      .where('channelUserId', '==', identity.channelUserId)
      .where('active', '==', true));
    await cancelConfirmations(tx, firestore, identity, value.firebaseUid);
    existing.docs.forEach(doc => tx.update(doc.ref, { active: false, revokedAt: now, updatedAt: now }));

    const linkRef = firestore.collection('channelLinks').doc(codeDoc.id);
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
    await cancelConfirmations(tx, firestore, link, firebaseUid);
    tx.update(ref, { active: false, revokedAt: now, updatedAt: now });
  });
};

export const revokeLink = revokeChannelLink;
