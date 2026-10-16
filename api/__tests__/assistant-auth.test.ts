import { describe, expect, it } from 'vitest';
import { canUseAssistantShare, isUsableChannelLink, type AssistantShareDoc, type ChannelLinkDoc } from '../_assistant-types';

const now = 1_000;
const link: ChannelLinkDoc = {
  firebaseUid: 'teacher-1', channel: 'zalo_oa', channelAccountId: 'oa-1', channelUserId: 'uid-1',
  createdAt: 900, updatedAt: 900, active: true,
};
const share: AssistantShareDoc = {
  resourceType: 'class', resourceId: 'class-1', ownerUid: 'owner', granteeUid: 'grantee',
  role: 'read', status: 'active', createdAt: 900,
};

describe('assistant authorization contracts', () => {
  it('accepts active links and rejects expired or revoked links', () => {
    expect(isUsableChannelLink(link, now)).toBe(true);
    expect(isUsableChannelLink(link, now, { channel: 'telegram', channelAccountId: 'bot-1', channelUserId: 'unknown' })).toBe(false);
    expect(isUsableChannelLink({ ...link, createdAt: 1_100 }, now)).toBe(false);
    expect(isUsableChannelLink({ ...link, expiresAt: 999 }, now)).toBe(false);
    expect(isUsableChannelLink({ ...link, active: false }, now)).toBe(false);
    expect(isUsableChannelLink({ ...link, revokedAt: 950 }, now)).toBe(false);
  });

  it('authorizes owner and grantee reads, but respects revocation and role escalation', () => {
    expect(canUseAssistantShare(share, 'owner', 'class', 'class-1', 'read', now)).toBe(true);
    expect(canUseAssistantShare(share, 'grantee', 'class', 'class-1', 'read', now)).toBe(true);
    expect(canUseAssistantShare(share, 'unknown', 'class', 'class-1', 'read', now)).toBe(false);
    expect(canUseAssistantShare({ ...share, status: 'revoked' }, 'grantee', 'class', 'class-1', 'read', now)).toBe(false);
    expect(canUseAssistantShare(share, 'grantee', 'class', 'class-1', 'write', now)).toBe(false);
    expect(canUseAssistantShare({ ...share, expiresAt: now }, 'grantee', 'class', 'class-1', 'read', now)).toBe(false);
    expect(canUseAssistantShare({ ...share, expiresAt: Number.NaN }, 'grantee', 'class', 'class-1', 'read', now)).toBe(false);
    expect(canUseAssistantShare({ ...share, resourceType: 'lessonPlan' }, 'grantee', 'class', 'class-1', 'read', now)).toBe(false);
    expect(canUseAssistantShare({ ...share, resourceId: 'class-2' }, 'grantee', 'class', 'class-1', 'read', now)).toBe(false);
    expect(canUseAssistantShare({ ...share, createdAt: Number.NaN }, 'grantee', 'class', 'class-1', 'read', now)).toBe(false);
  });

  it('keeps the same Zalo UID scoped to its OA', () => {
    expect(isUsableChannelLink(link, now, { channel: 'zalo_oa', channelAccountId: 'oa-2', channelUserId: 'uid-1' })).toBe(false);
    expect(isUsableChannelLink({ ...link, channelAccountId: 'oa-2' }, now, link)).toBe(false);
  });
});
