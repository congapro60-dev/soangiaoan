import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { canRelinkActiveChannel, generateLinkCode, hashLinkCode, validateChannelIdentity, verifyAssistantServiceSignature } from '../_assistant-auth';

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

  it('verifies signed adapter payloads and rejects tampering, stale timestamps, replay inputs, and empty secrets', () => {
    const now = 1_700_000_000_000;
    const timestamp = String(Math.floor(now / 1000));
    const nonce = 'nonce-1';
    const rawBody = JSON.stringify({ action: 'consumeLinkCode', code: 'code' });
    const signature = crypto.createHmac('sha256', 'secret').update(`${timestamp}.${nonce}.${rawBody}`).digest('hex');
    expect(verifyAssistantServiceSignature(rawBody, timestamp, nonce, signature, 'secret', now)).toBe(true);
    expect(verifyAssistantServiceSignature(`${rawBody} `, timestamp, nonce, signature, 'secret', now)).toBe(false);
    expect(verifyAssistantServiceSignature(rawBody, String(Number(timestamp) - 301), nonce, signature, 'secret', now)).toBe(false);
    expect(verifyAssistantServiceSignature(rawBody, timestamp, nonce, signature, '', now)).toBe(false);
    expect(verifyAssistantServiceSignature(rawBody, timestamp, nonce, 'not-hex', 'secret', now)).toBe(false);
  });

  it('allows relinking only by the same Firebase owner', () => {
    expect(canRelinkActiveChannel('teacher-1', 'teacher-1')).toBe(true);
    expect(canRelinkActiveChannel('teacher-1', 'teacher-2')).toBe(false);
    expect(canRelinkActiveChannel('', 'teacher-1')).toBe(false);
  });
});
