import { describe, expect, it } from 'vitest';
import { buildParentGuidePrompt, normalizeParentGuideDraft, parseParentGuideDraft, publicParentGuide } from './parentGuide';
import type { ParentGuide } from './types';

const draft = { goal: 'Hiểu phép nhân', askFirst: ['Con nhớ bảng nhân không?'], steps: ['Đọc đề', 'Nhân 6 với 7'], commonMistakes: ['Nhầm phép cộng'], askTeacher: 'Khi con vẫn sai sau hai lần thử.' };

describe('parseParentGuideDraft', () => {
  it('lấy khối JSON từ chữ bao quanh', () => {
    expect(parseParentGuideDraft('Kết quả:\n```json\n' + JSON.stringify(draft) + '\n```')).toEqual(draft);
  });
  it('báo lỗi khi thiếu mục tiêu hoặc không có bước', () => {
    expect(() => parseParentGuideDraft(JSON.stringify({ ...draft, goal: '' }))).toThrow('Thiếu mục tiêu');
    expect(() => parseParentGuideDraft(JSON.stringify({ ...draft, steps: [] }))).toThrow('Thiếu các bước');
  });
  it('báo lỗi khi không có JSON', () => {
    expect(() => parseParentGuideDraft('không có gì')).toThrow('Không đọc được');
  });
});

describe('normalizeParentGuideDraft', () => {
  it('bỏ dòng trống và khoảng trắng thừa', () => {
    expect(normalizeParentGuideDraft({ ...draft, steps: ['  Đọc đề  ', '', '   '] }).steps).toEqual(['Đọc đề']);
  });
  it('chặn chuỗi quá dài thay vì cắt lặng lẽ', () => {
    expect(() => normalizeParentGuideDraft({ ...draft, steps: ['x'.repeat(1201)] })).toThrow('quá dài');
  });
  it('chặn quá nhiều mục', () => {
    expect(() => normalizeParentGuideDraft({ ...draft, steps: Array.from({ length: 7 }, (_, i) => 'Bước ' + (i + 1)) })).toThrow('tối đa 6 mục');
  });
  it('chặn kiểu dữ liệu sai', () => {
    expect(() => normalizeParentGuideDraft({ ...draft, askFirst: 'không phải danh sách' })).toThrow('phải là danh sách');
  });
});

describe('publicParentGuide', () => {
  const published: ParentGuide = { version: 'v1', status: 'published', generatedAt: 't', publishedAt: 't', ...draft };
  it('chỉ trả nội dung khi bản đã đăng khớp phiên bản hiện tại', () => {
    expect(publicParentGuide(published, 'v1')).toEqual(draft);
  });
  it('ẩn bản nháp, bản cũ hoặc khi chưa có', () => {
    expect(publicParentGuide({ ...published, status: 'draft' }, 'v1')).toBeUndefined();
    expect(publicParentGuide(published, 'v2')).toBeUndefined();
    expect(publicParentGuide(undefined, 'v1')).toBeUndefined();
  });
  it('không lộ trường nội bộ', () => {
    const shown = publicParentGuide(published, 'v1') as unknown as Record<string, unknown>;
    expect(shown).not.toHaveProperty('version');
    expect(shown).not.toHaveProperty('status');
    expect(shown).not.toHaveProperty('generatedAt');
  });
});

describe('buildParentGuidePrompt', () => {
  it('đưa đề, đáp án và khuôn JSON vào prompt', () => {
    const prompt = buildParentGuidePrompt({ assignmentText: 'Tính 6 × 7', answerKey: '42', questions: [{ questionNumber: '1' }] });
    expect(prompt).toContain('Tính 6 × 7');
    expect(prompt).toContain('42');
    expect(prompt).toContain('"askTeacher"');
  });
});
