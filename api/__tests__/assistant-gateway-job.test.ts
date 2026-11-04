import { describe, expect, it, vi } from 'vitest';

const testActor = vi.hoisted(() => ({
  firebaseUid: 'teacher-1', channel: 'telegram' as const, channelAccountId: 'bot', channelUserId: '123', channelChatId: '123', linkId: 'link-1', active: true as const,
}));

vi.mock('../_assistant-auth', async () => {
  const actual = await vi.importActual<typeof import('../_assistant-auth')>('../_assistant-auth');
  return {
    ...actual,
    claimAssistantRequestNonce: vi.fn(async () => undefined),
    consumeLinkCode: vi.fn(async () => ({ linkId: 'internal-link', firebaseUid: 'internal-uid' })),
    resolveChannelActor: vi.fn(async () => testActor),
    validateChannelIdentity: vi.fn(() => undefined),
    verifyAssistantServiceSignature: vi.fn(() => true),
  };
});

vi.mock('../_assistant-jobs', () => ({
  getAssistantJobStatus: vi.fn(async ({ actor, jobId }: { actor: typeof testActor; jobId: string }) => ({
    jobId, toolName: 'exportLesson', status: 'running', progress: 40, actorUid: actor.firebaseUid,
  })),
}));

import handler from '../assistant';

function response() {
  const json = vi.fn();
  return { response: { status: vi.fn().mockReturnThis(), json } as any, json };
}

describe('assistant gateway jobStatus', () => {
  it('resolves status through the linked channel actor and returns a job envelope', async () => {
    const body = JSON.stringify({ action: 'jobStatus', requestId: 'job-status-1', channel: 'telegram', channelAccountId: 'bot', channelUserId: '123', channelChatId: '123', jobId: 'job-1' });
    const { response: res, json } = response();
    await handler({ method: 'POST', rawBody: body, headers: {} } as any, res);
    expect(json).toHaveBeenCalledWith({ kind: 'job', requestId: 'job-status-1', result: { jobId: 'job-1', toolName: 'exportLesson', status: 'running', progress: 40, actorUid: 'teacher-1' } });
  });

  it('returns only safe link status after consuming a code', async () => {
    const body = JSON.stringify({ action: 'consumeLinkCode', requestId: 'link-1', code: 'one-time', channel: 'telegram', channelAccountId: 'bot', channelUserId: '123', channelChatId: '123' });
    const { response: res, json } = response();
    await handler({ method: 'POST', rawBody: body, headers: {} } as any, res);
    expect(json).toHaveBeenCalledWith({ kind: 'answer', requestId: 'link-1', result: { linked: true } });
    expect(JSON.stringify(json.mock.calls[0][0])).not.toMatch(/firebaseUid|linkId/);
  });
});
