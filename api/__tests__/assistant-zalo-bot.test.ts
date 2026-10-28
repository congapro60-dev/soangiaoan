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
  PHOTO_REPLIES: { noSession: 'NO_SESSION_REPLY', max: 'MAX_REPLY', badImage: 'BAD_IMAGE_REPLY', assistIncomplete: 'ASSIST_INCOMPLETE_REPLY' },
  cancelPhotoSession: vi.fn(async () => undefined),
  finishPhotoSession: vi.fn(async () => 'FINISH_OK'),
  openPhotoSession: vi.fn(async () => 'OPEN_OK'),
  assistStartReply: vi.fn(async () => 'ASSIST_START_OK'),
  assistOpenReply: vi.fn(async () => 'ASSIST_OPEN_OK'),
  assistChooseReply: vi.fn(async () => 'ASSIST_CHOOSE_OK'),
  assistFreeTextReply: vi.fn(async () => null),
  parsePhotoCommand: vi.fn((raw: string) => {
    const plain = raw.normalize('NFC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim().toLowerCase();
    if (/^cham$/.test(plain)) return { kind: 'list' };
    const pick = /^cham\s*(\d{1,2})$/.exec(plain);
    if (pick) return { kind: 'pick', n: Number(pick[1]) };
    if (/^(xong|gui)$/.test(plain)) return { kind: 'done' };
    const assist = /^nop\s+ho(?:\s+(\d{1,2}))?$/.exec(plain);
    if (assist) return assist[1] ? { kind: 'assistPick', n: Number(assist[1]) } : { kind: 'assist' };
    const choose = /^chon\s*(\d{1,2})$/.exec(plain);
    if (choose) return { kind: 'assistChoose', n: Number(choose[1]) };
    return null;
  }),
  pendingAssignmentsForStudent: vi.fn(async () => ({ teacherId: 't-1', items: [{ id: 'a-1', title: 'Bài 1' }] })),
  photoListReply: vi.fn((items: unknown[]) => `LIST_${items.length}`),
  photoReceivedReply: vi.fn(async () => 'PHOTO_OK'),
}));
vi.mock('../_assistant-ph-hs-menu', async () => ({
  ...await vi.importActual<typeof import('../_assistant-ph-hs-menu')>('../_assistant-ph-hs-menu'),
  parentMenuReply: vi.fn(async () => 'MENU_DUNG_HO_SO'),
  loadParentReport: vi.fn(async () => ({ report: { className: 'Lớp test', results: [] }, periodicIds: new Set<string>() })),
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
import { parentMenuReply, loadParentReport } from '../_assistant-ph-hs-menu';
import { assistChooseReply, assistFreeTextReply, assistOpenReply, assistStartReply, cancelPhotoSession, finishPhotoSession, openPhotoSession, pendingAssignmentsForStudent, photoListReply, photoReceivedReply } from '../_assistant-ph-hs-photo';

const { answerDetailed, sendGeometryPhotoMock, sendMathFormulaPhotoMock } = vi.hoisted(() => ({ answerDetailed: vi.fn(), sendGeometryPhotoMock: vi.fn(), sendMathFormulaPhotoMock: vi.fn() }));
// Chat AI + vẽ hình/ảnh công thức mock TOÀN BỘ file này: nhánh AI chat chưa từng có test — mock giữ
// đúng bộ export mà zalo-bot dùng (AI_CHAT_REPLIES, answerParentQuestionDetailed, vilaoCaller).
vi.mock('../_assistant-ph-hs-chat', () => ({
  AI_CHAT_REPLIES: { unavailable: 'AI_BAN', empty: 'AI_RONG' },
  answerParentQuestionDetailed: (...args: unknown[]) => answerDetailed(...(args as [])),
  vilaoCaller: vi.fn(() => async () => ''),
}));
vi.mock('../_assistant-geometry-render', () => ({
  sendGeometryPhoto: (...args: unknown[]) => sendGeometryPhotoMock(...(args as [])),
  sendMathFormulaPhoto: (...args: unknown[]) => sendMathFormulaPhotoMock(...(args as [])),
}));

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
  it('người lạ nhắn lệnh / (vd /start): vẫn nhận hướng dẫn liên kết, không im lặng', async () => {
    vi.stubEnv('ZALO_BOT_ALLOWED_USER_IDS', '');
    vi.mocked(resolveChannelActor).mockRejectedValueOnce(new Error('Channel is not linked'));
    expect((await request(event('/start'))).code).toBe(200);
    expect(sent()).toHaveLength(1);
    expect(JSON.parse(sent()[0][1].body).text).toContain('liên kết');
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
    if (invalid === 'event') body.result.event_name = 'message.unknown.received';
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

  it.each(['message.sticker.received', 'message.voice.received', 'message.unsupported.received'])('người lạ gửi %s: nhận gợi ý liên kết đúng 1 lần/5 phút', async eventName => {
    vi.mocked(resolveChannelActor).mockRejectedValue(new Error('Channel is not linked'));
    vi.mocked(canReplyToStranger).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const first = event('', 'm-1'); first.result.event_name = eventName;
    const second = event('', 'm-2'); second.result.event_name = eventName;
    expect((await request(first)).code).toBe(200);
    expect((await request(second)).code).toBe(200);
    expect(sent()).toHaveLength(1);
    expect(JSON.parse(sent()[0][1].body).text).toContain('phụ huynh');
    expect(canReplyToStranger).toHaveBeenCalledTimes(2);
  });

  it('HS đã liên kết gửi sticker: nhận hướng dẫn dùng văn bản/ảnh, không coi là người lạ', async () => {
    vi.mocked(resolveChannelActor).mockResolvedValue({ firebaseUid: 'pinlink:student:c:s', channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'user-1', channelChatId: 'user-1', linkId: 'slink', active: true, role: 'student', classId: 'c', studentId: 's' } as any);
    const body = event('', 'm-1'); body.result.event_name = 'message.sticker.received';
    expect((await request(body)).code).toBe(200);
    expect(JSON.parse(sent()[0][1].body).text).toContain('Nhắn 0');
    expect(canReplyToStranger).not.toHaveBeenCalled();
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
    // GV-1: dispatch thử resolve teacher (lệnh GV) TRƯỚC luồng PH/HS — lượt đầu phải từ chối
    // để tin 'web' của phụ huynh rơi đúng về luồng menu PH/HS.
    vi.mocked(resolveChannelActor).mockRejectedValueOnce(new Error('Channel is not linked'));
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
  it('người lạ gửi ảnh → nhận hướng dẫn liên kết (guard chống spam), không vào luồng HS', async () => {
    vi.mocked(resolveChannelActor).mockRejectedValue(new Error('Channel is not linked'));
    const result = await request(imageEvent('https://photo.zalo/abc.jpg', 'image-4'));
    expect(result.code).toBe(200);
    expect(photoReceivedReply).not.toHaveBeenCalled();
    expect(canReplyToStranger).toHaveBeenCalledWith(expect.anything(), 'bot-1', 'user-1');
    expect(sent()).toHaveLength(1);
    expect(JSON.parse(sent()[0][1].body).text).toContain('liên kết');
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
  it('HS nhắn nộp hộ → hỏi tên bạn (assistStartReply)', async () => {
    mockStudent();
    const result = await request(event('nộp hộ', 'm-14'));
    expect(result.code).toBe(200);
    expect(assistStartReply).toHaveBeenCalledWith('bot-1', 'user-1', 'c', 's');
    expect(JSON.parse(sent()[0][1].body).text).toBe('ASSIST_START_OK');
  });
  it('HS nhắn nộp hộ 1 → mở phiên nộp hộ bài số 1', async () => {
    mockStudent();
    await request(event('nop ho 1', 'm-15'));
    expect(assistOpenReply).toHaveBeenCalledWith('bot-1', 'user-1', 'c', 's', 1);
    expect(JSON.parse(sent()[0][1].body).text).toBe('ASSIST_OPEN_OK');
  });
  it('HS nhắn chọn 2 (trùng tên) → assistChooseReply', async () => {
    mockStudent();
    await request(event('chọn 2', 'm-16'));
    expect(assistChooseReply).toHaveBeenCalledWith('bot-1', 'user-1', 'c', 2);
    expect(JSON.parse(sent()[0][1].body).text).toBe('ASSIST_CHOOSE_OK');
  });
  it('HS gõ tên bạn khi đang giữa luồng nộp hộ → bot trả lời, không rơi vào AI chat', async () => {
    mockStudent();
    vi.mocked(assistFreeTextReply).mockResolvedValueOnce('HỎI_TÊN_OK');
    await request(event('Minh Anh', 'm-17'));
    expect(assistFreeTextReply).toHaveBeenCalledWith('bot-1', 'user-1', 'c', 'Minh Anh');
    expect(JSON.parse(sent()[0][1].body).text).toBe('HỎI_TÊN_OK');
  });
  it('HS nhắn tự do ngoài luồng nộp hộ → rơi tiếp luồng AI chat như thường', async () => {
    mockStudent();
    await request(event('xin chào', 'm-18'));
    expect(assistFreeTextReply).toHaveBeenCalledWith('bot-1', 'user-1', 'c', 'xin chào');
    expect(sent()[0][1]).toBeTruthy(); // vẫn có câu trả lời (AI chat) — không im lặng, không crash
  });
  it('PH nhắn nộp hộ → KHÔNG vào luồng photo/assist', async () => {
    vi.mocked(resolveChannelActor).mockResolvedValueOnce(parentActor);
    await request(event('nộp hộ', 'm-19'));
    expect(assistStartReply).not.toHaveBeenCalled();
    expect(assistFreeTextReply).not.toHaveBeenCalled();
    expect(finishPhotoSession).not.toHaveBeenCalled();
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

describe('nhánh chat AI — gửi ảnh hình học qua sendPhoto (chốt 28/10)', () => {
  const studentActor = { firebaseUid: 'pinlink:student:c:s', channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'user-1', channelChatId: 'user-1', linkId: 'slink', active: true, role: 'student', classId: 'c-1', studentId: 's-1' } as any;

  beforeEach(() => {
    vi.stubEnv('PH_CHAT_VILAO_KEY', 'vilao-key');
    vi.mocked(resolveChannelActor).mockResolvedValue(studentActor);
    vi.mocked(loadParentReport).mockResolvedValue({ report: { className: '11A', results: [] } as any, periodicIds: new Set<string>(), joinCode: 'R6RCFC' });
  });

  it('AI trả khối geometry → sendGeometryPhoto nhận caption có link ĐÚNG lớp, KHÔNG gửi text fallback', async () => {
    answerDetailed.mockResolvedValue({ text: 'Thể tích chóp: V = ⅓·a²·h.', geometry: { shape: 'pyramid', base: 'square' }, hasMath: false });
    sendGeometryPhotoMock.mockResolvedValue(true);
    const result = await request(event('The tich hinh chop?', 'm-geo-1'));
    expect(result.code).toBe(200);
    expect(sendGeometryPhotoMock).toHaveBeenCalledTimes(1);
    const [token, chatId, spec, caption, classId] = sendGeometryPhotoMock.mock.calls[0] as unknown as string[];
    expect(spec).toEqual({ shape: 'pyramid', base: 'square' });
    expect(caption).toContain('V = ⅓·a²·h');
    expect(caption).toContain('/lop/R6RCFC');
    expect(caption.endsWith('Nhắn 0 để xem lại menu.')).toBe(true);
    expect(classId).toBe('c-1');
    expect(token).toBe('fake-token');
    expect(chatId).toBe('user-1');
    expect(sent()).toHaveLength(0);
  });

  it('sendPhoto thất bại → fallback gửi text THUẦN (vẫn có link + hint, bot không im lặng)', async () => {
    answerDetailed.mockResolvedValue({ text: 'Lời giải hình nón.', geometry: { shape: 'cone' }, hasMath: false });
    sendGeometryPhotoMock.mockResolvedValue(false);
    await request(event('Hinh non?', 'm-geo-2'));
    expect(sendGeometryPhotoMock).toHaveBeenCalledTimes(1);
    expect(sent()).toHaveLength(1);
    const body = JSON.parse(sent()[0][1].body);
    expect(body.text).toContain('Lời giải hình nón.');
    expect(body.text).toContain('/lop/R6RCFC');
  });

  it('câu hỏi không vẽ được (geometry null) → không gọi vẽ ảnh, gửi text như luồng cũ', async () => {
    answerDetailed.mockResolvedValue({ text: 'Điểm của em đang tiến bộ.', geometry: null, hasMath: false });
    await request(event('Con em hoc the nao?', 'm-geo-3'));
    expect(sendGeometryPhotoMock).not.toHaveBeenCalled();
    expect(sendMathFormulaPhotoMock).not.toHaveBeenCalled();
    expect(sent()).toHaveLength(1);
    expect(JSON.parse(sent()[0][1].body).text).toContain('Điểm của em đang tiến bộ.');
  });

  it('câu trả lời có công thức LaTeX → gửi ẢNH công thức KaTeX, không gửi text riêng', async () => {
    answerDetailed.mockResolvedValue({
      text: 'Áp dụng công thức, em có ⅓·a²·h.\n\nNhắn 0 để xem lại menu.',
      mathSource: 'Áp dụng công thức, em có $$\\dfrac{1}{3}a^2 h$$.\n\nNhắn 0 để xem lại menu.',
      geometry: null,
      hasMath: true,
    });
    sendMathFormulaPhotoMock.mockResolvedValue(true);
    const result = await request(event('Tinh the tich chop?', 'm-math-1'));
    expect(result.code).toBe(200);
    expect(sendGeometryPhotoMock).not.toHaveBeenCalled();
    expect(sendMathFormulaPhotoMock).toHaveBeenCalledTimes(1);
    const [, , mathSource, caption, classId] = sendMathFormulaPhotoMock.mock.calls[0] as unknown as string[];
    // BẢN RENDER phải còn LaTeX (bug 28/10: truyền bản đã convert → không bao giờ render)
    expect(mathSource).toContain('$$\\dfrac{1}{3}a^2 h$$');
    // CAPTION là bản Unicode đầy đủ + link đúng lớp
    expect(caption).toContain('⅓·a²·h');
    expect(caption).not.toContain('$$');
    expect(caption).toContain('/lop/R6RCFC');
    expect(caption.endsWith('Nhắn 0 để xem lại menu.')).toBe(true);
    expect(classId).toBe('c-1');
    expect(sent()).toHaveLength(0);
  });

  it('ảnh công thức lỗi → fallback text THUẦN (HS vẫn có lời giải đầy đủ)', async () => {
    answerDetailed.mockResolvedValue({ text: 'Lời giải có phân thức.\n\nNhắn 0 để xem lại menu.', geometry: null, hasMath: true });
    sendMathFormulaPhotoMock.mockResolvedValue(false);
    await request(event('Phan thuc?', 'm-math-2'));
    expect(sendMathFormulaPhotoMock).toHaveBeenCalledTimes(1);
    expect(sent()).toHaveLength(1);
    expect(JSON.parse(sent()[0][1].body).text).toContain('Lời giải có phân thức.');
  });
});
