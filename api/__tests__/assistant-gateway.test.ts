import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { normalizeGatewayEnvelope } from '../assistant';
import { ASSISTANT_SERVICE_ID, assistantSignaturePayload, verifyAssistantServiceSignature } from '../_assistant-auth';
describe('assistant gateway envelope', () => {
  it('normalizes identity and preserves request id', () => { const value = normalizeGatewayEnvelope({ action: 'chat', requestId: 'req-1', channel: 'telegram', channelAccountId: 'bot', channelUserId: '42', channelChatId: '42', text: 'hello' }); expect(value).toMatchObject({ action: 'chat', requestId: 'req-1', channel: 'telegram', channelAccountId: 'bot', channelUserId: '42', channelChatId: '42' }); });
  it('rejects malformed or unknown identity', () => { expect(() => normalizeGatewayEnvelope({ action: 'chat', channel: 'discord' })).toThrow('Unsupported channel'); expect(() => normalizeGatewayEnvelope({ action: 'chat', channel: 'telegram', channelAccountId: 'bot', channelUserId: '42', channelChatId: '99' })).toThrow('private chat'); expect(() => normalizeGatewayEnvelope({ action: 'chat', requestId: 'bad id' })).toThrow('Invalid request'); });
});
describe('assistant adapter authentication', () => {
  it('accepts exact HMAC envelope and rejects tampering/old timestamps', () => { const body = JSON.stringify({ action: 'chat', requestId: 'r1' }); const nonce = 'n1'; const timestamp = String(Math.floor(Date.now() / 1000)); const secret = 'test-secret'; const signature = crypto.createHmac('sha256', secret).update(assistantSignaturePayload(body, timestamp, nonce)).digest('hex'); expect(verifyAssistantServiceSignature(body, timestamp, nonce, signature, secret)).toBe(true); expect(verifyAssistantServiceSignature(body + 'x', timestamp, nonce, signature, secret)).toBe(false); expect(verifyAssistantServiceSignature(body, String(Number(timestamp) - 301), nonce, signature, secret)).toBe(false); expect(assistantSignaturePayload(body, timestamp, nonce)).toContain(ASSISTANT_SERVICE_ID); });
});
