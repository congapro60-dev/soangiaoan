import { describe, it, expect } from 'vitest';
import { NGUONG_YEU, mergeTopics, removeEvidence } from './profileMerge';
import type { ProfileTopic } from './types';

const NOW = '2026-08-20T10:00:00.000Z';
const chuDe = (topic: string, evidence: string[], level: ProfileTopic['level'] = 'developing'): ProfileTopic => ({
  topic, level, evidenceSubmissionIds: evidence, updatedAt: '2026-08-19T00:00:00.000Z',
});

describe('mergeTopics — một bài KHÔNG đủ để dán nhãn em yếu', () => {
  it('bài đầu tiên nêu chủ đề thì chỉ là developing, chưa phải weak', () => {
    const ket = mergeTopics({ existing: [], weakTopics: ['phương trình đường thẳng'], submissionId: 'b1', now: NOW });

    expect(ket).toHaveLength(1);
    expect(ket[0].level).toBe('developing');
    expect(ket[0].evidenceSubmissionIds).toEqual(['b1']);
  });

  it(`sai ở ${NGUONG_YEU} bài KHÁC NHAU mới thành weak`, () => {
    const sau1 = mergeTopics({ existing: [], weakTopics: ['dấu khi thay toạ độ'], submissionId: 'b1', now: NOW });
    const sau2 = mergeTopics({ existing: sau1, weakTopics: ['dấu khi thay toạ độ'], submissionId: 'b2', now: NOW });

    expect(sau2[0].level).toBe('weak');
    expect(sau2[0].evidenceSubmissionIds).toEqual(['b1', 'b2']);
  });

  it('cùng một bài gộp hai lần không làm tăng bằng chứng', () => {
    const sau1 = mergeTopics({ existing: [], weakTopics: ['tích vô hướng'], submissionId: 'b1', now: NOW });
    const lai = mergeTopics({ existing: sau1, weakTopics: ['tích vô hướng'], submissionId: 'b1', now: NOW });

    expect(lai[0].evidenceSubmissionIds).toEqual(['b1']);
    expect(lai[0].level).toBe('developing');
  });
});

describe('mergeTopics — làm đúng thì hồ sơ gỡ nhãn ra', () => {
  it('chủ đề không bị nêu ở bài mới thì tụt một mức', () => {
    const existing = [chuDe('phương trình đoạn chắn', ['b1', 'b2'], 'weak')];
    const ket = mergeTopics({ existing, weakTopics: ['chủ đề khác'], submissionId: 'b3', now: NOW });

    const cu = ket.find(t => t.topic === 'phương trình đoạn chắn');
    expect(cu?.level).toBe('developing');
    expect(cu?.evidenceSubmissionIds).toEqual(['b1']);
  });

  it('hết bằng chứng thì bỏ hẳn khỏi hồ sơ, không để lại nhãn mồ côi', () => {
    const existing = [chuDe('vectơ pháp tuyến', ['b1'])];
    const ket = mergeTopics({ existing, weakTopics: [], submissionId: 'b2', now: NOW });

    expect(ket.find(t => t.topic === 'vectơ pháp tuyến')).toBeUndefined();
  });
});

describe('mergeTopics — vệ sinh dữ liệu', () => {
  it('chuẩn hoá NFC và gộp chủ đề chỉ khác nhau ở khoảng trắng', () => {
    const existing = [chuDe('Tích vô hướng', ['b1'])];
    const ket = mergeTopics({ existing, weakTopics: ['  Tích   vô hướng '], submissionId: 'b2', now: NOW });

    expect(ket).toHaveLength(1);
    expect(ket[0].evidenceSubmissionIds).toEqual(['b1', 'b2']);
  });

  it('bỏ chủ đề rỗng do AI trả về', () => {
    const ket = mergeTopics({ existing: [], weakTopics: ['', '   ', 'đạo hàm'], submissionId: 'b1', now: NOW });

    expect(ket.map(t => t.topic)).toEqual(['đạo hàm']);
  });

  it('mọi chủ đề trong hồ sơ đều PHẢI có bằng chứng', () => {
    const existing = [chuDe('chủ đề ma', []), chuDe('có thật', ['b1'])];
    const ket = mergeTopics({ existing, weakTopics: ['có thật'], submissionId: 'b2', now: NOW });

    expect(ket.every(t => t.evidenceSubmissionIds.length > 0)).toBe(true);
    expect(ket.find(t => t.topic === 'chủ đề ma')).toBeUndefined();
  });

  it('xếp chủ đề yếu lên trước để giáo viên thấy ngay', () => {
    const existing = [chuDe('bê', ['b1']), chuDe('a-yeu', ['b1', 'b2'], 'weak')];
    const ket = mergeTopics({ existing, weakTopics: ['bê', 'a-yeu'], submissionId: 'b3', now: NOW });

    expect(ket[0].level).toBe('weak');
  });
});

describe('removeEvidence — bỏ duyệt thì gỡ luôn kết luận', () => {
  it('gỡ đúng bài đó khỏi bằng chứng và hạ cấp độ', () => {
    const existing = [chuDe('dấu toạ độ', ['b1', 'b2'], 'weak')];
    const ket = removeEvidence(existing, 'b2', NOW);

    expect(ket[0].evidenceSubmissionIds).toEqual(['b1']);
    expect(ket[0].level).toBe('developing');
  });

  it('chủ đề chỉ dựa vào bài bị bỏ duyệt thì biến mất khỏi hồ sơ', () => {
    const ket = removeEvidence([chuDe('đạo hàm', ['b1'])], 'b1', NOW);
    expect(ket).toEqual([]);
  });

  it('không đụng tới chủ đề không liên quan', () => {
    const existing = [chuDe('khác', ['b9'])];
    expect(removeEvidence(existing, 'b1', NOW)).toEqual(existing);
  });
});
