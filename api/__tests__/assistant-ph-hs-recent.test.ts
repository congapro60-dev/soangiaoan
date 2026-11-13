import { describe, expect, it } from 'vitest';
import { recentPromptContext, refersToProblem } from '../_assistant-ph-hs-recent';

describe('ngữ cảnh ảnh/chữ gần nhất', () => {
  it('nhận ra tin chữ nói về đề trong ảnh', () => {
    expect(refersToProblem('Chữa câu 1-2')).toBe(true);
    expect(refersToProblem('câu 3 làm sao ạ')).toBe(true);
    expect(refersToProblem('em cảm ơn')).toBe(false);
    expect(refersToProblem('giải thích giúp em vì sao điểm thấp')).toBe(false);
  });
  it('chỉ gắn ngữ cảnh khi đã có đề/bài luyện', () => {
    const base = { classId: 'c', studentId: 's', role: 'student', startedAt: 0, updatedAt: 0, instruction: '', instructionUsed: true };
    expect(recentPromptContext(null)).toBe('');
    expect(recentPromptContext({ ...base, kind: 'photo', status: 'solving', text: '' })).toBe('');
    expect(recentPromptContext({ ...base, kind: 'photo', status: 'done', text: 'Câu 1: ...' })).toContain('ĐỀ BÀI TRONG ẢNH');
    expect(recentPromptContext({ ...base, kind: 'practice', status: 'done', text: 'Câu 1: ...' })).toContain('BÀI LUYỆN');
  });
});

describe('Zalo không hiển thị markdown', () => {
  it('bỏ dấu đậm và tiêu đề, giữ phép nhân', async () => {
    const { stripMarkdown, composeAiReply } = await import('../_assistant-ph-hs-chat');
    expect(stripMarkdown('**Câu 1:** Vì f(x) ≤ 0\n**Đáp án: B.**\n### Giải\n2 * 3 = 6')).toBe('Câu 1: Vì f(x) ≤ 0\nĐáp án: B.\nGiải\n2 * 3 = 6');
    expect(composeAiReply('**Giải:** ok')).not.toContain('**');
  });
});
