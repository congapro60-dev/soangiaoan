import { describe, expect, it } from 'vitest';
import { GEOMETRY_PROMPT_RULE, answerParentQuestion, answerParentQuestionDetailed, buildSystemPrompt } from '../_assistant-ph-hs-chat.js';
import type { ParentSafeReport } from '../../src/lib/classroom/parentSafeReport.js';

/** Caller giả: trả về chuỗi cấu hình sẵn, ghi lại prompt nhận được. */
const fakeCall = (reply: string) => {
  const seen: string[] = [];
  const call = async (systemPrompt: string) => { seen.push(systemPrompt); return reply; };
  return { call: call as never, seen };
};

const report = {
  studentName: 'An', className: '11A', officialCount: 3, pendingCount: 0, missingCount: 0,
  results: [], strengths: [], areasToPractice: [], parentActions: [],
} as unknown as ParentSafeReport;

describe('luồng chat có hình học (answerParentQuestionDetailed)', () => {
  it('C1: AI trả khối geometry → text sạch (không JSON) + spec tách riêng + hint cuối', async () => {
    const raw = [
      'Thể tích khối chóp V = 1/3 · S đáy · h. Với đáy vuông cạnh a: V = a³/3.',
      '',
      '```geometry',
      '{"shape":"pyramid","base":"square","note":"ABCD vuông cạnh a, SA ⊥ (ABCD)"}',
      '```',
    ].join('\n');
    const out = await answerParentQuestionDetailed(fakeCall(raw).call, 'Tính thể tích chóp?', report, new Set(), 'student');
    expect(out).not.toBeNull();
    expect(out?.text).toContain('V = a³/3');
    expect(out?.text).toContain('Nhắn 0 để xem lại menu.');
    expect(out?.text).not.toContain('geometry');
    expect(out?.geometry?.shape).toBe('pyramid');
    expect(out?.geometry?.base).toBe('square');
  });

  it('C2: câu hỏi thường (không hình) → geometry null, text như luồng cũ', async () => {
    const out = await answerParentQuestionDetailed(fakeCall('Em đang tiến bộ đều.').call, 'Con em học thế nào?', report, new Set(), 'parent');
    expect(out?.geometry).toBeNull();
    expect(out?.text).toContain('Em đang tiến bộ đều.');
  });

  it('C3: câu hỏi rỗng → null (caller dùng câu mặc định)', async () => {
    expect(await answerParentQuestionDetailed(fakeCall('x').call, '   ', report, new Set())).toBeNull();
    expect(await answerParentQuestion(fakeCall('x').call, '', report, new Set())).toBeNull();
  });

  it('C4: answerParentQuestion (bọc cũ) vẫn trả text thuần — không vỡ test/luồng hiện có', async () => {
    const raw = 'Lời giải.\n\n```geometry\n{"shape":"box"}\n```';
    const text = await answerParentQuestion(fakeCall(raw).call, 'Hộp?', report, new Set());
    expect(text).toContain('Lời giải.');
    expect(text).not.toContain('geometry');
  });

  it('C5: prompt hệ thống có rule vẽ hình và ví dụ DSL', () => {
    const prompt = buildSystemPrompt('DỮ LIỆU', 'student');
    expect(prompt).toContain(GEOMETRY_PROMPT_RULE);
    expect(prompt).toContain('"shape":"pyramid"');
  });

  it('C6: mathSource GIỮ LaTeX để render ảnh, text là bản Unicode sạch (bug 28/10)', async () => {
    const raw = 'Ta có $$\\dfrac{x+1}{x-2}$$ nên em rút gọn được.';
    const out = await answerParentQuestionDetailed(fakeCall(raw).call, 'Rut gon?', report, new Set(), 'student');
    expect(out).not.toBeNull();
    // Bản render còn nguyên LaTeX
    expect(out?.mathSource).toContain('$$\\dfrac{x+1}{x-2}$$');
    expect(out?.hasMath).toBe(true);
    // Bản hiển thị đã là Unicode, không còn lệnh LaTeX
    expect(out?.text).not.toContain('\\dfrac');
    expect(out?.text).not.toContain('$$');
    expect(out?.text).toContain('(x+1)/(x-2)');
  });

  it('C7: mathSource KHÔNG chứa dữ liệu rò rỉ (sanitize vẫn chạy trên bản render)', async () => {
    const raw = 'Gọi 0912345678 nhé. Công thức $$\\dfrac{1}{2}$$';
    const out = await answerParentQuestionDetailed(fakeCall(raw).call, 'Hoi?', report, new Set(), 'student');
    expect(out?.mathSource).not.toContain('0912345678');
    expect(out?.mathSource).toContain('[số điện thoại]');
  });
});
