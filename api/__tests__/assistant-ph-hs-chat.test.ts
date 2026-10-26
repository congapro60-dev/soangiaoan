import { describe, expect, it, vi } from 'vitest';
import {
  AI_MENU_HINT,
  buildAiContext,
  buildSystemPrompt,
  composeAiReply,
  sanitizeAiReply,
  answerParentQuestion,
} from '../_assistant-ph-hs-chat.js';

const report = {
  studentId: 's1', studentName: 'Nguyễn Hoàng Bách', className: '11Columbus',
  results: [
    { assignmentId: 'a1', title: 'BTVN Đại số 24/08', status: 'official', score: 6.25, maxScore: 10 },
    { assignmentId: 'a2', title: 'BTVN Hình học 25/08', status: 'official', score: 3.5, maxScore: 10 },
    { assignmentId: 'kt1', title: 'Thi giữa HKI', status: 'official', score: 9.5, maxScore: 10 },
    { assignmentId: 'kt2', title: 'Kiểm tra cuối kì', status: 'not_submitted', score: null, maxScore: null },
  ],
  officialCount: 3, officialAveragePercent: 63, pendingCount: 1, missingCount: 5,
  strengths: ['Tính toán nhanh'], areasToPractice: ['Hình học không gian'],
  progress: { trend: 'up', firstPercent: 50, latestPercent: 63 },
  overallSummary: 'Có tiến bộ.', parentActions: ['Cho con làm bài tập đều đặn'],
  teacherActions: [],
} as any;

const periodic = new Set(['kt1', 'kt2']);

describe('chat AI — ngữ cảnh chỉ lấy dữ liệu an toàn', () => {
  it('C1: ngữ cảnh chứa điểm đã chấm, tách BTVN và kiểm tra định kì', () => {
    const ctx = buildAiContext(report, periodic);
    expect(ctx).toContain('Nguyễn Hoàng Bách');
    expect(ctx).toContain('BTVN Đại số 24/08: 6.25/10');
    expect(ctx).toContain('Thi giữa HKI: 9.5/10');
    expect(ctx).toContain('Kiểm tra cuối kì: chưa nộp');
    expect(ctx).toContain('Hình học không gian');
  });

  it('C2: ngữ cảnh KHÔNG chứa số điện thoại, mã HS, hay feedback từng bài', () => {
    const withSensitive = {
      ...report,
      results: [
        { ...report.results[0], feedback: 'Bài 2a thiếu điều kiện, em cần xem lại' },
      ],
      parentPhones: ['84902388588'],
      studentCode: 'GB0116011397',
    } as any;
    const ctx = buildAiContext(withSensitive, periodic);
    expect(ctx).not.toContain('84902388588');
    expect(ctx).not.toContain('GB0116011397');
    expect(ctx).not.toContain('Bài 2a thiếu điều kiện'); // feedback không bao giờ vào prompt
  });

  it('C3: prompt hệ thống khoá chống bịa là yêu cầu cứng', () => {
    const prompt = buildSystemPrompt('DỮ LIỆU GIẢ');
    expect(prompt).toContain('QUY TẮC BẮT BUỘC');
    expect(prompt).toContain('KHÔNG được suy đoán');
    expect(prompt).toContain('Không nhắc tên, điểm, hay thông tin của học sinh khác');
    expect(prompt).toContain('DỮ LIỆU GIẢ');
  });
});

describe('chat AI — lọc câu trả lời', () => {
  it('C4: lọc số điện thoại, mã HS, token, chuỗi hash', () => {
    const dirty = 'Con học tốt. Liên hệ 0902388588, mã GB0116011397, token pinlink:parent:c:s, hash 0123456789abcdef0123456789abcdef.';
    const clean = sanitizeAiReply(dirty);
    expect(clean).not.toContain('0902388588');
    expect(clean).not.toContain('GB0116011397');
    expect(clean).not.toContain('pinlink:');
    expect(clean).not.toContain('0123456789abcdef0123456789abcdef');
    expect(clean).toContain('Con học tốt');
  });

  it('C5: câu trả lời luôn kết thúc bằng nhắc menu; rỗng thì trả câu lịch sự', () => {
    expect(composeAiReply('Con có tiến bộ.').endsWith(AI_MENU_HINT)).toBe(true);
    expect(composeAiReply('   ')).not.toContain(AI_MENU_HINT); // rỗng: trả câu mặc định, không nhắc menu
  });
});

describe('chat AI — gọi model', () => {
  it('C6: gửi đúng system prompt + câu hỏi, cắt câu hỏi quá dài', async () => {
    const call = vi.fn().mockResolvedValue('Con đã học 3 bài, tiến bộ rõ.');
    const out = await answerParentQuestion(call, 'tuần này con học thế nào?', report, periodic);
    expect(call).toHaveBeenCalledTimes(1);
    const [systemPrompt, userText] = call.mock.calls[0];
    expect(systemPrompt).toContain('QUY TẮC BẮT BUỘC');
    expect(systemPrompt).toContain('BTVN Đại số 24/08');
    expect(userText).toBe('tuần này con học thế nào?');
    expect(out).toContain('Con đã học 3 bài');
    expect(out!.endsWith(AI_MENU_HINT)).toBe(true);

    await answerParentQuestion(call, 'x'.repeat(3000), report, periodic);
    expect(call.mock.calls[1][1].length).toBe(1000);
  });

  it('C7: câu hỏi rỗng thì không gọi model', async () => {
    const call = vi.fn();
    expect(await answerParentQuestion(call, '   ', report, periodic)).toBeNull();
    expect(call).not.toHaveBeenCalled();
  });

  it('C8: vilaoCaller gửi đúng endpoint/model/khoá và đọc choices[0].message.content', async () => {
    const { vilaoCaller, PH_CHAT_MODEL, PH_CHAT_ENDPOINT } = await import('../_assistant-ph-hs-chat.js');
    expect(PH_CHAT_MODEL).toBe('cnt/glm-5.3-flash');
    expect(PH_CHAT_ENDPOINT).toBe('https://api.vilao.ai/v1/chat/completions');

    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Con tiến bộ rõ.' } }] }),
    } as any);
    try {
      const out = await vilaoCaller('sk-test')( 'SYS', 'Con em thế nào?');
      expect(out).toBe('Con tiến bộ rõ.');
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(PH_CHAT_ENDPOINT);
      expect((init.headers as any).Authorization).toBe('Bearer sk-test');
      const payload = JSON.parse(String(init.body));
      expect(payload.model).toBe('cnt/glm-5.3-flash');
      expect(payload.messages[0].role).toBe('system');
      expect(payload.messages[0].content).toBe('SYS');
      expect(payload.messages[1]).toEqual({ role: 'user', content: 'Con em thế nào?' });
      expect(payload.max_tokens).toBe(1200);
    } finally { spy.mockRestore(); }
  });

  it('C9: vilaoCaller ném lỗi khi HTTP không ok hoặc nội dung rỗng', async () => {
    const { vilaoCaller } = await import('../_assistant-ph-hs-chat.js');
    const bad = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 } as any);
    try { await expect(vilaoCaller('k')('s', 'u')).rejects.toThrow('AI HTTP 500'); } finally { bad.mockRestore(); }
    const empty = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: '  ' } }] }) } as any);
    try { await expect(vilaoCaller('k')('s', 'u')).rejects.toThrow('AI empty'); } finally { empty.mockRestore(); }
  });

  it('C10: content rỗng nhưng có reasoning_tokens thì báo hết token (không gửi tin trống cho PH)', async () => {
    const { vilaoCaller } = await import('../_assistant-ph-hs-chat.js');
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '', reasoning: 'suy luận dài...' } }],
        usage: { completion_tokens_details: { reasoning_tokens: 49 } },
      }),
    } as any);
    try {
      await expect(vilaoCaller('k')('s', '2+2 bằng mấy?')).rejects.toThrow('AI reasoning-only');
    } finally { spy.mockRestore(); }
  });
});

describe('chat AI theo vai trò (C11)', () => {
  it('C11a: prompt HS gọi "em", không xưng "anh/chị"; prompt PH giữ nguyên', () => {
    const hs = buildSystemPrompt('DỮ LIỆU GIẢ', 'student');
    expect(hs).toContain('trợ lý hỗ trợ học sinh');
    expect(hs).toContain('gọi người nhắn là "em"');
    expect(hs).not.toContain('anh/chị');
    const ph = buildSystemPrompt('DỮ LIỆU GIẢ');
    expect(ph).toContain('anh/chị');
  });

  it('C11b: ngữ cảnh HS có nhận xét GV đã duyệt; ngữ cảnh PH không có', () => {
    const withFeedback = {
      ...report,
      results: [{ ...report.results[0], feedback: 'Cần cẩn thận phép chia có dư' }],
    } as any;
    const hs = buildAiContext(withFeedback, periodic, 'student');
    expect(hs).toContain('Nhận xét của giáo viên theo bài');
    expect(hs).toContain('Cần cẩn thận phép chia có dư');
    const ph = buildAiContext(withFeedback, periodic);
    expect(ph).not.toContain('Cần cẩn thận phép chia có dư');
    expect(ph).toContain('Gợi ý cho phụ huynh');
  });

  it('C11c: answerParentQuestion role student → prompt gửi đi là bản HS', async () => {
    const call = vi.fn().mockResolvedValue('Bài của em làm tốt.');
    await answerParentQuestion(call, 'bài của em thế nào?', report, periodic, 'student');
    expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0][0]).toContain('gọi người nhắn là "em"');
  });
});
