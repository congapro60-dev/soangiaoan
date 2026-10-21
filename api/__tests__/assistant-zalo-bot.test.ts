import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../_assistant-auth', async () => ({
  ...await vi.importActual<typeof import('../_assistant-auth')>('../_assistant-auth'),
  claimAssistantRequestNonce: vi.fn(async () => undefined),
  consumeLinkCode: vi.fn(async () => undefined),
  resolveChannelActor: vi.fn(async () => ({ firebaseUid: 'teacher', channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'user-1', channelChatId: 'user-1', linkId: 'link', active: true })),
}));
vi.mock('../_assistant-tools', () => ({ runAssistantReadTool: vi.fn(async () => ({ data: { items: [{ name: 'Lớp 10A', id: 'class-1' }] } })) }));
vi.mock('../_assistant-confirmations', () => ({
  inspectAssistantConfirmation: vi.fn(async () => ({ requestHash: 'a'.repeat(64), toolName: 'exportLesson' })),
  isAssistantToolExecutable: vi.fn(() => true),
  executeAssistantConfirmation: vi.fn(async () => ({ status: 'executed', privateToken: 'do-not-echo' })),
  cancelAssistantConfirmation: vi.fn(async () => ({ status: 'cancelled' })),
  auditAssistantEvent: vi.fn(), auditAssistantRead: vi.fn(), createAssistantConfirmation: vi.fn(),
}));
vi.mock('../_assistant-jobs', () => ({ getAssistantJobStatus: vi.fn(async () => ({ status: 'succeeded', result: { url: 'https://private.test/?token=secret' } })) }));

import handler from '../assistant';
import { claimAssistantRequestNonce, consumeLinkCode } from '../_assistant-auth';
import { executeAssistantConfirmation, cancelAssistantConfirmation } from '../_assistant-confirmations';
import { runAssistantReadTool } from '../_assistant-tools';

const event = (text = '/help') => ({ ok: true, result: { event_name: 'message.text.received', message: { from: { id: 'user-1', is_bot: false }, chat: { id: 'user-1', chat_type: 'PRIVATE' }, text, message_id: 'message-1', date: Date.now() } } });
let fetchMock: ReturnType<typeof vi.fn>;
async function request(body: unknown = event(), secret: string | undefined = 'webhook-secret', transport = 'zalo_bot') {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  await handler({ method: 'POST', query: { transport }, headers: secret === undefined ? {} : { 'x-bot-api-secret-token': secret }, rawBody: typeof body === 'string' ? body : JSON.stringify(body) } as any, res as any);
  return { code: res.status.mock.calls.at(-1)?.[0], body: res.json.mock.calls.at(-1)?.[0] };
}
const sent = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/sendMessage'));
beforeEach(() => {
  vi.restoreAllMocks(); vi.clearAllMocks();
  vi.stubEnv('ZALO_BOT_TOKEN', 'fake-token'); vi.stubEnv('ZALO_BOT_ID', 'bot-1');
  vi.stubEnv('ZALO_BOT_ALLOWED_IDS', 'bot-1'); vi.stubEnv('ZALO_BOT_ALLOWED_USER_IDS', 'user-1');
  vi.stubEnv('ZALO_BOT_WEBHOOK_SECRET', 'webhook-secret');
  fetchMock = vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('/getMe') ? { ok: true, result: { id: 'bot-1' } } : { ok: true, result: { message_id: 'sent' } } }));
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(claimAssistantRequestNonce).mockResolvedValue(undefined);
});

describe('official Zalo Bot webhook through assistant HTTP route', () => {
  it.each(['wrong', undefined])('rejects invalid or missing webhook secret %s', async secret => {
    // Passing undefined explicitly must omit the header rather than use the helper default.
    const result = await request(event(), secret === undefined ? '' : secret);
    expect(result.code).toBe(401); expect(fetchMock).not.toHaveBeenCalled(); expect(claimAssistantRequestNonce).not.toHaveBeenCalled();
  });
  it.each(['ZALO_BOT_TOKEN', 'ZALO_BOT_ID', 'ZALO_BOT_ALLOWED_IDS', 'ZALO_BOT_ALLOWED_USER_IDS', 'ZALO_BOT_WEBHOOK_SECRET'])('fails closed without %s', async key => {
    vi.stubEnv(key, ''); expect((await request()).code).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects unallowed bot ID before sending credentials', async () => {
    vi.stubEnv('ZALO_BOT_ALLOWED_IDS', 'other'); expect((await request()).code).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['group', 'bot', 'sender', 'chat', 'stale', 'future', 'missing-id', 'oversized', 'event', 'seconds'])('rejects invalid event: %s', async invalid => {
    const body = event(); const m = body.result.message;
    if (invalid === 'group') m.chat.chat_type = 'GROUP';
    if (invalid === 'bot') m.from.is_bot = true;
    if (invalid === 'sender') m.from.id = m.chat.id = 'other';
    if (invalid === 'chat') m.chat.id = 'other';
    if (invalid === 'stale') m.date -= 301_000;
    if (invalid === 'future') m.date += 61_000;
    if (invalid === 'missing-id') m.message_id = '';
    if (invalid === 'oversized') m.text = 'x'.repeat(2001);
    if (invalid === 'event') body.result.event_name = 'message.image.received';
    if (invalid === 'seconds') m.date = Math.floor(m.date / 1000);
    expect([400, 403]).toContain((await request(body)).code);
    expect(fetchMock).not.toHaveBeenCalled(); expect(claimAssistantRequestNonce).not.toHaveBeenCalled();
  });
  it('requires an explicit human sender flag', async () => {
    const body = event(); delete body.result.message.from.is_bot;
    expect((await request(body)).code).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('reads a raw async request stream when the platform does not expose rawBody', async () => {
    const payload = JSON.stringify(event('/help'));
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const req = {
      method: 'POST', query: { transport: 'zalo_bot' },
      headers: { 'x-bot-api-secret-token': 'webhook-secret' },
      async *[Symbol.asyncIterator]() { yield payload; },
    };
    await handler(req as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(200); expect(sent()).toHaveLength(1);
  });
  it.each(['{', '[]', 'x'.repeat(17_000)])('rejects malformed/oversized raw payload', async raw => {
    expect((await request(raw)).code).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('verifies configured bot identity using getMe before claiming or replying', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, result: { id: 'another-bot' } }) });
    expect((await request()).code).toBe(503); expect(claimAssistantRequestNonce).not.toHaveBeenCalled(); expect(sent()).toHaveLength(0);
  });
  it('replies only to inbound chat using fixed origin without redirects', async () => {
    expect((await request()).code).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('https://bot-api.zaloplatforms.com/botfake-token/getMe');
    expect(claimAssistantRequestNonce).toHaveBeenCalledWith(expect.stringMatching(/^zalo_bot_[0-9a-f]{64}$/));
    expect(sent()).toHaveLength(1);
    const [url, options] = sent()[0];
    expect(url).toBe('https://bot-api.zaloplatforms.com/botfake-token/sendMessage');
    expect(options.redirect).toBe('error');
    expect(JSON.parse(options.body)).toEqual({ chat_id: 'user-1', text: expect.stringContaining('/link') });
  });
  it('acknowledges duplicate without dispatch or resend', async () => {
    vi.mocked(claimAssistantRequestNonce).mockRejectedValue(new Error('Replay detected'));
    expect((await request(event('/classes'))).code).toBe(200); expect(runAssistantReadTool).not.toHaveBeenCalled(); expect(sent()).toHaveLength(0);
  });
  it('distinguishes durable claim infrastructure failure from duplicate', async () => {
    vi.mocked(claimAssistantRequestNonce).mockRejectedValue(new Error('Firestore unavailable'));
    expect((await request()).code).toBe(503); expect(sent()).toHaveLength(0);
  });
  it('uses verified server identity to consume one-use link', async () => {
    expect((await request(event('/link one_use-code'))).code).toBe(200);
    expect(consumeLinkCode).toHaveBeenCalledWith('one_use-code', { channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'user-1', channelChatId: 'user-1', verifiedChannelAccountId: 'bot-1' });
    expect(JSON.parse(sent()[0][1].body).text).toContain('liên kết');
  });
  it('routes classes through per-teacher gateway read tool and formats bounded text', async () => {
    expect((await request(event('/classes'))).code).toBe(200);
    expect(runAssistantReadTool).toHaveBeenCalledWith('listClasses', {}, expect.objectContaining({ firebaseUid: 'teacher', channel: 'zalo_bot' }));
    expect(JSON.parse(sent()[0][1].body).text).toContain('Lớp 10A');
  });
  it.each(['/confirm', '/cancel'])('routes explicit confirmation ID and hash: %s', async command => {
    expect((await request(event(`${command} confirmation-1 ${'a'.repeat(64)}`))).code).toBe(200);
    const mock = command === '/confirm' ? executeAssistantConfirmation : cancelAssistantConfirmation;
    expect(mock).toHaveBeenCalledWith(expect.objectContaining({ confirmationId: 'confirmation-1', requestHash: 'a'.repeat(64), actor: expect.objectContaining({ channelChatId: 'user-1' }) }));
    expect(JSON.parse(sent()[0][1].body).text).not.toContain('do-not-echo');
  });
  it('status never returns private result URLs', async () => {
    await request(event('/status job-1')); const output = JSON.parse(sent()[0][1].body).text;
    expect(output).toContain('succeeded'); expect(output).not.toMatch(/private|token|https/);
  });
  it('natural language reports unavailable chat honestly', async () => {
    await request(event('Hãy soạn bài')); expect(JSON.parse(sent()[0][1].body).text).toContain('chưa'); expect(runAssistantReadTool).not.toHaveBeenCalled();
  });
  it('redacts URLs and tokens from data, bounds output at 2000 characters', async () => {
    vi.mocked(runAssistantReadTool).mockResolvedValueOnce({ data: { items: [{ name: 'fake-token https://private.test/?token=secret ' + 'x'.repeat(4000) }] } } as any);
    await request(event('/classes')); const output = JSON.parse(sent()[0][1].body).text;
    expect(output.length).toBeLessThanOrEqual(2000); expect(output).not.toMatch(/fake-token|https|secret/);
  });
  it('does not retry ambiguous send or expose provider token error', async () => {
    fetchMock.mockImplementation(async url => { if (url.endsWith('/sendMessage')) throw new Error('request https://bot-api.zaloplatforms.com/botfake-token failed'); return { ok: true, json: async () => ({ ok: true, result: { id: 'bot-1' } }) }; });
    const log = vi.spyOn(console, 'error'); const result = await request();
    expect(result.code).toBe(200); expect(sent()).toHaveLength(1); expect(JSON.stringify(result)).not.toContain('fake-token'); expect(log).not.toHaveBeenCalled();
  });
  it('standard HTTP route cannot bypass HMAC with webhook headers or body flags', async () => {
    const result = await request({ action: 'readTool', requestId: 'injected', channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'user-1', channelChatId: 'user-1', toolName: 'listClasses', authenticated: true }, 'webhook-secret', '');
    expect(result.code).toBe(401); expect(runAssistantReadTool).not.toHaveBeenCalled();
  });
});
