import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../_assistant-auth', async () => ({
  ...await vi.importActual<typeof import('../_assistant-auth')>('../_assistant-auth'),
  claimAssistantRequestNonce: vi.fn(async () => undefined),
  consumeLinkCode: vi.fn(async () => undefined),
  resolveChannelActor: vi.fn(async () => ({ firebaseUid: 'teacher', channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'user-1', channelChatId: 'user-1', linkId: 'link', active: true })),
}));
vi.mock('../_assistant-tools', () => ({ runAssistantReadTool: vi.fn(async () => ({ data: { items: [{ name: 'Lớp 10A', id: 'class-1' }] } })) }));
vi.mock('../_assistant-ph-hs-link', async () => ({
  ...await vi.importActual<typeof import('../_assistant-ph-hs-link')>('../_assistant-ph-hs-link'),
  linkByPin: vi.fn(async () => ({ status: 'linked', reply: 'Đã liên kết thành công.' })),
  switchBotRole: vi.fn(async () => ({ status: 'switched', reply: 'SWITCH_OK' })),
}));
vi.mock('../_bot-pin-guard', () => ({ canReplyToStranger: vi.fn(async () => true) }));
// Việc 4 — mock TOÀN BỘ photo module để không kéo grade-homework/_grading-core vào test bot.
vi.mock('../_assistant-ph-hs-photo', () => ({
  PHOTO_REPLIES: { noSession: 'NO_SESSION_REPLY', max: 'MAX_REPLY', badImage: 'BAD_IMAGE_REPLY' },
  cancelPhotoSession: vi.fn(async () => undefined),
  finishPhotoSession: vi.fn(async () => 'FINISH_OK'),
  openPhotoSession: vi.fn(async () => 'OPEN_OK'),
  parsePhotoCommand: vi.fn((raw: string) => {
    const plain = raw.normalize('NFC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim().toLowerCase();
    if (/^cham$/.test(plain)) return { kind: 'list' };
    const pick = /^cham\s*(\d{1,2})$/.exec(plain);
    if (pick) return { kind: 'pick', n: Number(pick[1]) };
    if (/^(xong|gui)$/.test(plain)) return { kind: 'done' };
    return null;
  }),
  pendingAssignmentsForStudent: vi.fn(async () => ({ teacherId: 't-1', items: [{ id: 'a-1', title: 'Bài 1' }] })),
  photoListReply: vi.fn((items: unknown[]) => `LIST_${items.length}`),
  photoReceivedReply: vi.fn(async () => 'PHOTO_OK'),
}));
vi.mock('../_assistant-ph-hs-menu', async () => ({
  ...await vi.importActual<typeof import('../_assistant-ph-hs-menu')>('../_assistant-ph-hs-menu'),
  parentMenuReply: vi.fn(async () => 'MENU_DUNG_HO_SO'),
}));
vi.mock('../_exam-core', () => ({ getAdminDb: () => ({}) }));
vi.mock('../_assistant-confirmations', () => ({
  inspectAssistantConfirmation: vi.fn(async () => ({ requestHash: 'a'.repeat(64), toolName: 'exportLesson' })),
  isAssistantToolExecutable: vi.fn(() => true),
  executeAssistantConfirmation: vi.fn(async () => ({ status: 'executed', privateToken: 'do-not-echo' })),
  cancelAssistantConfirmation: vi.fn(async () => ({ status: 'cancelled' })),
  auditAssistantEvent: vi.fn(), auditAssistantRead: vi.fn(), createAssistantConfirmation: vi.fn(),
}));
vi.mock('../_assistant-jobs', () => ({ getAssistantJobStatus: vi.fn(async () => ({ status: 'succeeded', result: { url: 'https://private.test/?token=secret' } })) }));

import handler from '../assistant';
import { claimAssistantRequestNonce, consumeLinkCode, resolveChannelActor } from '../_assistant-auth';
import { executeAssistantConfirmation, cancelAssistantConfirmation } from '../_assistant-confirmations';
import { linkByPin, switchBotRole } from '../_assistant-ph-hs-link';
import { canReplyToStranger } from '../_bot-pin-guard';
import { runAssistantReadTool } from '../_assistant-tools';
import { parentMenuReply } from '../_assistant-ph-hs-menu';
import { cancelPhotoSession, finishPhotoSession, openPhotoSession, pendingAssignmentsForStudent, photoListReply, photoReceivedReply } from '../_assistant-ph-hs-photo';

const event = (text = '/help', messageId = 'message-1') => ({ ok: true, result: { event_name: 'message.text.received', message: { from: { id: 'user-1', is_bot: false }, chat: { id: 'user-1', chat_type: 'PRIVATE' }, text, message_id: messageId, date: Date.now() } } });
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
  it.each(['ZALO_BOT_TOKEN', 'ZALO_BOT_ID', 'ZALO_BOT_ALLOWED_IDS', 'ZALO_BOT_WEBHOOK_SECRET'])('fails closed without %s', async key => {
    vi.stubEnv(key, ''); expect((await request()).code).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects unallowed bot ID before sending credentials', async () => {
    vi.stubEnv('ZALO_BOT_ALLOWED_IDS', 'other'); expect((await request()).code).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('allows one-use link bootstrap when the optional user allowlist is empty', async () => {
    vi.stubEnv('ZALO_BOT_ALLOWED_USER_IDS', '');
    expect((await request(event('/link one_use-code'))).code).toBe(200);
    expect(consumeLinkCode).toHaveBeenCalled(); expect(sent()).toHaveLength(1);
  });
  it('acks an unlinked sender without replying when no user allowlist is configured', async () => {
    vi.stubEnv('ZALO_BOT_ALLOWED_USER_IDS', '');
    vi.mocked(resolveChannelActor).mockRejectedValueOnce(new Error('Channel is not linked'));
    expect((await request(event('/classes'))).code).toBe(200); expect(sent()).toHaveLength(0);
  });
  it('acks senders outside an optional static allowlist without replying', async () => {
    vi.stubEnv('ZALO_BOT_ALLOWED_USER_IDS', 'other-user');
    expect((await request(event('/help'))).code).toBe(200); expect(sent()).toHaveLength(0);
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
    if (invalid === 'event') body.result.event_name = 'message.sticker.received';
    if (invalid === 'seconds') m.date = Math.floor(m.date / 1000);
    const result = await request(body);
    if (invalid === 'sender') expect(result.code).toBe(200); else {
      expect([400, 403]).toContain(result.code);
      expect(fetchMock).not.toHaveBeenCalled();
    }
    expect(claimAssistantRequestNonce).not.toHaveBeenCalled();
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
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', body: '{}', redirect: 'error' });
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

  it('A7 gate: vai phụ huynh/học sinh gửi lệnh của thầy cô bị chặn đúng một câu', async () => {
    vi.mocked(resolveChannelActor).mockResolvedValueOnce({ firebaseUid: 'pinlink:parent:c:s', channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'user-1', channelChatId: 'user-1', linkId: 'plink', active: true, role: 'parent', classId: 'c', studentId: 's' } as any);
    const result = await request(event('/classes', 'm-1'));
    expect(result.code).toBe(200);
    expect(JSON.parse(sent()[0][1].body).text).toContain('Chỉ thầy cô mới dùng được lệnh này');
    expect(runAssistantReadTool).not.toHaveBeenCalled();
  });

  it('người chưa liên kết nhắn tự nhiên: hướng dẫn đúng 1 lần/5 phút, còn lại im lặng', async () => {
    vi.mocked(resolveChannelActor).mockRejectedValue(new Error('Channel is not linked'));
    vi.mocked(canReplyToStranger).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await request(event('chào thầy cô ơi', 'm-1'))).code).toBe(200);
    expect((await request(event('giúp tôi với', 'm-2'))).code).toBe(200);
    expect(sent()).toHaveLength(1);
    expect(JSON.parse(sent()[0][1].body).text).toContain('phụ huynh');
    expect(canReplyToStranger).toHaveBeenCalledTimes(2);
  });

  it('tin mã PIN đi hết đường linkByPin và map đúng lỗi chạm trần', async () => {
    const message = 'phụ huynh ACDF47 1234';
    await request(event(message, 'm-1'));
    expect(linkByPin).toHaveBeenCalledWith(expect.anything(), 'bot-1', 'user-1', message);
    expect(JSON.parse(sent()[0][1].body).text).toBe('Đã liên kết thành công.');
    vi.mocked(linkByPin).mockRejectedValueOnce(new Error('PIN_LOCKED'));
    await request(event(message, 'm-2'));
    expect(JSON.parse(sent()[1][1].body).text).toContain('thử quá nhiều lần');
  });

  it('B4 (review MAJOR): PH có 2 link (Ambiguous) nhắn tự nhiên — không bị coi là người lạ', async () => {
    vi.mocked(resolveChannelActor).mockRejectedValue(new Error('Ambiguous channel links: specify role, classId and studentId'));
    const result = await request(event('cho tôi xem báo cáo', 'm-1'));
    expect(result.code).toBe(200);
    expect(JSON.parse(sent()[0][1].body).text).toContain('nhiều hồ sơ');
    expect(parentMenuReply).not.toHaveBeenCalled();
    expect(canReplyToStranger).not.toHaveBeenCalled();
  });

  it('B5 (review NIT): tin bắt đầu bằng / không bị nhấm thành tin mã PIN', async () => {
    vi.mocked(resolveChannelActor).mockRejectedValueOnce(new Error('Channel is not linked'));
    const result = await request(event('/status ACDF47 1234 phu huynh', 'm-1'));
    expect(result.code).toBe(200);
    expect(JSON.parse(sent()[0][1].body).text).toContain('Chỉ thầy cô mới dùng được lệnh này');
    expect(linkByPin).not.toHaveBeenCalled();
  });

  it.each(['0', '1', '7', 'menu'])('người lạ nhắn %s không thấy menu', async message => {
    vi.mocked(resolveChannelActor).mockRejectedValue(new Error('Channel is not linked'));
    await request(event(message));
    expect(parentMenuReply).not.toHaveBeenCalled();
    expect(JSON.parse(sent()[0][1].body).text).not.toContain('MENU_DUNG_HO_SO');
  });

  it.each(['parent', 'student'])('menu %s chỉ nhận học sinh/lớp từ link', async role => {
    const actor = { firebaseUid: `pinlink:${role}:c:s`, role, classId: 'c', studentId: 's' } as any;
    vi.mocked(resolveChannelActor).mockImplementation(async (...args) => {
      if ((args[5] as any)?.preferredRole !== role) throw new Error('Channel is not linked');
      return actor;
    });
    await request(event('7'));
    expect(parentMenuReply).toHaveBeenCalledWith(expect.anything(), 'c', 's', '7', role);
    expect(JSON.parse(sent()[0][1].body).text).toBe('MENU_DUNG_HO_SO');
  });

  const parentActor = { firebaseUid: 'pinlink:parent:c:s', channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'user-1', channelChatId: 'user-1', linkId: 'plink', active: true, role: 'parent', classId: 'c', studentId: 's' } as any;

  it('menu nhiều dòng gửi markdown (in đậm dòng đầu); link web gửi thuần nguyên URL', async () => {
    vi.mocked(resolveChannelActor).mockResolvedValueOnce(parentActor);
    vi.mocked(parentMenuReply).mockResolvedValueOnce('TIÊU ĐỀ\nDòng nội dung');
    await request(event('1', 'm-1'));
    expect(sent()[0][0]).toContain('/sendMessage');
    expect(JSON.parse(sent()[0][1].body).parse_mode).toBe('markdown');
    expect(JSON.parse(sent()[0][1].body).text).toContain('**TIÊU ĐỀ**');
    vi.mocked(resolveChannelActor).mockResolvedValueOnce(parentActor);
    vi.mocked(parentMenuReply).mockResolvedValueOnce('Link:\nhttps://giaoandewey.vercel.app/ph/AD4GKT');
    await request(event('web', 'm-2'));
    // Link phải nguyên URL, KHÔNG parse_mode, KHÔNG bị output() che thành [đã ẩn liên kết]
    expect(JSON.parse(sent()[1][1].body)).toEqual({ chat_id: 'user-1', text: 'Link:\nhttps://giaoandewey.vercel.app/ph/AD4GKT' });
  });

  it('markdown parse lỗi → tự gửi lại bản thuần đúng 1 lần', async () => {
    vi.mocked(resolveChannelActor).mockResolvedValueOnce(parentActor);
    vi.mocked(parentMenuReply).mockResolvedValueOnce('TIÊU ĐỀ\nDòng nội dung');
    fetchMock.mockImplementation(async (url: unknown) => {
      if (String(url).endsWith('/sendMessage')) return { ok: false, json: async () => ({ ok: false }) };
      return { ok: true, json: async () => ({ ok: true, result: { id: 'bot-1' } }) };
    });
    const result = await request(event('1', 'm-1'));
    expect(result.code).toBe(200);
    expect(sent()).toHaveLength(2);
    expect(JSON.parse(sent()[0][1].body).parse_mode).toBe('markdown');
    expect(JSON.parse(sent()[1][1].body)).toEqual({ chat_id: 'user-1', text: 'TIÊU ĐỀ\nDòng nội dung' });
  });
});

describe('việc 4 — HS nộp bài bằng ảnh qua bot', () => {
  const parentActor = { firebaseUid: 'pinlink:parent:c:s', channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'user-1', channelChatId: 'user-1', linkId: 'plink', active: true, role: 'parent', classId: 'c', studentId: 's' } as any;
  const studentActor = { firebaseUid: 'pinlink:student:c:s', channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'user-1', channelChatId: 'user-1', linkId: 'slink', active: true, role: 'student', classId: 'c', studentId: 's' } as any;
  const mockStudent = () => vi.mocked(resolveChannelActor).mockImplementation(async (...args) => {
    if ((args[5] as any)?.preferredRole === 'student') return studentActor;
    throw new Error('Channel is not linked');
  });
  const imageEvent = (photo: unknown, messageId = 'image-1') => ({ ok: true, result: { event_name: 'message.image.received', message: { from: { id: 'user-1', is_bot: false }, chat: { id: 'user-1', chat_type: 'PRIVATE' }, photo, message_id: messageId, date: Date.now() } } });

  it('HS gửi ảnh (m.photo chuỗi) → photoReceivedReply, gửi sendStyled', async () => {
    mockStudent();
    const result = await request(imageEvent('https://photo.zalo/abc.jpg'));
    expect(result.code).toBe(200);
    expect(photoReceivedReply).toHaveBeenCalledWith('bot-1', 'user-1', 'https://photo.zalo/abc.jpg');
    expect(JSON.parse(sent()[0][1].body).text).toBe('PHOTO_OK');
  });
  it('ảnh dạng object {url} và {attach_url} đều đọc được URL', async () => {
    mockStudent();
    await request(imageEvent({ url: 'https://photo.zalo/u1.jpg' }, 'image-2'));
    expect(photoReceivedReply).toHaveBeenLastCalledWith('bot-1', 'user-1', 'https://photo.zalo/u1.jpg');
    await request(imageEvent({ attach_url: 'https://photo.zalo/u2.jpg' }, 'image-3'));
    expect(photoReceivedReply).toHaveBeenLastCalledWith('bot-1', 'user-1', 'https://photo.zalo/u2.jpg');
  });
  it('ảnh thiếu URL hoặc sai giao thức → 400, không chạm getMe', async () => {
    expect((await request(imageEvent(null))).code).toBe(400);
    expect((await request(imageEvent('ftp://x'))).code).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('người lạ gửi ảnh → ack nhưng im lặng', async () => {
    vi.mocked(resolveChannelActor).mockRejectedValue(new Error('Channel is not linked'));
    const result = await request(imageEvent('https://photo.zalo/abc.jpg', 'image-4'));
    expect(result.code).toBe(200);
    expect(photoReceivedReply).not.toHaveBeenCalled();
    expect(sent()).toHaveLength(0);
  });
  it('PH gửi ảnh → đúng 1 câu dành cho PH, không vào luồng HS', async () => {
    vi.mocked(resolveChannelActor).mockImplementation(async (...args) => {
      if ((args[5] as any)?.preferredRole === 'parent') return parentActor;
      throw new Error('Channel is not linked');
    });
    await request(imageEvent('https://photo.zalo/abc.jpg', 'image-5'));
    expect(photoReceivedReply).not.toHaveBeenCalled();
    expect(JSON.parse(sent()[0][1].body).text).toContain('chức năng của học sinh');
  });
  it('HS nhắn 8 → danh sách bài chờ nộp, không qua parentMenuReply', async () => {
    mockStudent();
    await request(event('8', 'm-8'));
    expect(pendingAssignmentsForStudent).toHaveBeenCalledWith('c', 's');
    expect(photoListReply).toHaveBeenCalled();
    expect(JSON.parse(sent()[0][1].body).text).toBe('LIST_1');
    expect(parentMenuReply).not.toHaveBeenCalled();
  });
  it('HS nhắn chấm 1 → mở phiên đúng bài số 1 với teacherId từ lớp', async () => {
    mockStudent();
    await request(event('chấm 1', 'm-9'));
    expect(openPhotoSession).toHaveBeenCalledWith('bot-1', 'user-1', { studentId: 's', classId: 'c', teacherId: 't-1' }, { id: 'a-1', title: 'Bài 1' });
    expect(JSON.parse(sent()[0][1].body).text).toBe('OPEN_OK');
  });
  it('HS nhắn số vượt danh sách → trả lại danh sách, không mở phiên', async () => {
    mockStudent();
    await request(event('chấm 5', 'm-10'));
    expect(openPhotoSession).not.toHaveBeenCalled();
    expect(JSON.parse(sent()[0][1].body).text).toContain('Số không khớp');
  });
  it('HS nhắn xong → finishPhotoSession', async () => {
    mockStudent();
    await request(event('xong', 'm-11'));
    expect(finishPhotoSession).toHaveBeenCalledWith('bot-1', 'user-1');
    expect(JSON.parse(sent()[0][1].body).text).toBe('FINISH_OK');
  });
  it('HS nhắn 0 → hủy phiên ảnh rồi mới hiện menu', async () => {
    mockStudent();
    await request(event('0', 'm-12'));
    expect(cancelPhotoSession).toHaveBeenCalledWith('bot-1', 'user-1');
    expect(parentMenuReply).toHaveBeenCalled();
    expect(JSON.parse(sent()[0][1].body).text).toBe('MENU_DUNG_HO_SO');
  });
  it('PH nhắn lệnh chấm → KHÔNG vào luồng photo', async () => {
    vi.mocked(resolveChannelActor).mockResolvedValueOnce(parentActor);
    await request(event('chấm 1', 'm-13'));
    expect(pendingAssignmentsForStudent).not.toHaveBeenCalled();
    expect(openPhotoSession).not.toHaveBeenCalled();
    expect(finishPhotoSession).not.toHaveBeenCalled();
  });
});

describe('đổi vai — tài khoản test giữ song song 2 vai', () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(['đổi vai', 'Đổi VAI', 'doi  vai'])('nhận lệnh đổi vai (%s) cho tài khoản trong danh sách test', async text => {
    vi.stubEnv('ZALO_BOT_DUAL_ROLE_USER_IDS', 'user-1');
    const result = await request(event(text, 'm-20'));
    expect(result.code).toBe(200);
    expect(switchBotRole).toHaveBeenCalledWith({}, 'bot-1', 'user-1');
    expect(JSON.parse(sent()[0][1].body).text).toBe('SWITCH_OK');
  });

  it('không trong danh sách test → "đổi vai" rơi xuống luồng thường, không đổi vai', async () => {
    vi.mocked(resolveChannelActor).mockRejectedValue(new Error('Channel is not linked'));
    const result = await request(event('đổi vai', 'm-21'));
    expect(result.code).toBe(200);
    expect(switchBotRole).not.toHaveBeenCalled();
    // Rơi về luồng người lạ: đúng 1 câu hướng dẫn liên kết
    expect(JSON.parse(sent()[0][1].body).text).toContain('liên kết');
  });
});
