import { describe, expect, it } from 'vitest';
import { generateLinkCode, hashLinkCode, validateChannelIdentity } from '../_assistant-auth';

describe('assistant channel linking helpers', () => {
  it('hashes codes deterministically and generates non-empty random codes', () => {
    const code = generateLinkCode();
    expect(code).toBeTruthy();
    expect(hashLinkCode(code)).toBe(hashLinkCode(code));
    expect(hashLinkCode(code)).not.toBe(code);
  });

  it('requires a private Telegram chat and scopes Zalo identity to its OA', () => {
    expect(() => validateChannelIdentity({ channel: 'telegram', channelAccountId: 'bot', channelUserId: 'u', channelChatId: 'group' })).toThrow('private chat');
    expect(() => validateChannelIdentity({ channel: 'telegram', channelAccountId: 'bot', channelUserId: 'u', channelChatId: 'u' })).not.toThrow();
    expect(() => validateChannelIdentity({ channel: 'zalo_oa', channelAccountId: 'oa-1', channelUserId: 'uid-1', verifiedChannelAccountId: 'oa-1' })).not.toThrow();
    expect(() => validateChannelIdentity({ channel: 'zalo_oa', channelAccountId: 'oa-1', channelUserId: 'uid-1', verifiedChannelAccountId: 'oa-2' })).toThrow('not verified');
    expect(() => validateChannelIdentity({ channel: 'zalo_oa', channelAccountId: '', channelUserId: 'uid-1' })).toThrow();
  });
});
