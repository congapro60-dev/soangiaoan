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
