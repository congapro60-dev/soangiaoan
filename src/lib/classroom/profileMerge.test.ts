import { describe, it, expect } from 'vitest';
import { NGUONG_YEU, applyEvidence, applyPracticeEvidence, mergeTopics, removeEvidence } from './profileMerge';
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
    const sau1 = mergeTopics({ existing: [], weakTopics: ['dấu khi thay toạ độ'], submissionId: 'b1', assignmentId: 'a1', now: NOW });
    const sau2 = mergeTopics({ existing: sau1, weakTopics: ['dấu khi thay toạ độ'], submissionId: 'b2', assignmentId: 'a2', now: NOW });

    expect(sau2[0].level).toBe('weak');
    expect(sau2[0].evidenceSubmissionIds).toEqual(['b1', 'b2']);
  });

  it('cùng một bài gộp hai lần không làm tăng bằng chứng', () => {
    const sau1 = mergeTopics({ existing: [], weakTopics: ['tích vô hướng'], submissionId: 'b1', now: NOW });
    const lai = mergeTopics({ existing: sau1, weakTopics: ['tích vô hướng'], submissionId: 'b1', now: NOW });

    expect(lai[0].evidenceSubmissionIds).toEqual(['b1']);
    expect(lai[0].level).toBe('developing');
  });

  it('nộp lại cùng một assignment không tạo thêm bằng chứng độc lập', () => {
    const lan1 = mergeTopics({ existing: [], weakTopics: ['tích phân từng phần'], submissionId: 'b1', assignmentId: 'a1', now: NOW });
    const lan2 = mergeTopics({ existing: lan1, weakTopics: ['tích phân từng phần'], submissionId: 'b2', assignmentId: 'a1', now: NOW });

    expect(lan2[0].level).toBe('developing');
    expect(lan2[0].evidenceSubmissionIds).toEqual(['b2']);
    expect(lan2[0].evidenceRefs).toEqual([
      expect.objectContaining({ assignmentId: 'a1', submissionId: 'b2', evidenceType: 'homework' }),
    ]);
  });

  it('hai assignment khác nhau mới đủ bằng chứng yếu dù học sinh đã nộp lại một bài', () => {
    const lan1 = mergeTopics({ existing: [], weakTopics: ['hệ thức lượng'], submissionId: 'b1', assignmentId: 'a1', now: NOW });
    const lan1Retry = mergeTopics({ existing: lan1, weakTopics: ['hệ thức lượng'], submissionId: 'b2', assignmentId: 'a1', now: NOW });
    const lan2 = mergeTopics({ existing: lan1Retry, weakTopics: ['hệ thức lượng'], submissionId: 'b3', assignmentId: 'a2', now: NOW });

    expect(lan2[0].level).toBe('weak');
    expect(lan2[0].evidenceRefs).toHaveLength(2);
  });

  it('ghi nhận strength đã được duyệt nhưng không biến topic chưa đánh giá thành solid', () => {
    const ket = mergeTopics({
      existing: [], weakTopics: [], strengths: ['biến đổi tương đương'],
      submissionId: 'b1', assignmentId: 'a1', now: NOW,
    });

    expect(ket).toHaveLength(1);
    expect(ket[0]).toMatchObject({ topic: 'biến đổi tương đương', level: 'solid' });
    expect(ket[0].evidenceRefs).toEqual([
      expect.objectContaining({ evidenceType: 'strength', assignmentId: 'a1' }),
    ]);
  });
});

describe('mergeTopics — không đánh đồng không được hỏi với đã thành thạo', () => {
  it('chủ đề không bị nêu ở bài mới vẫn giữ nguyên vì bài mới không đánh giá topic đó', () => {
    const existing = [chuDe('phương trình đoạn chắn', ['b1', 'b2'], 'weak')];
    const ket = mergeTopics({ existing, weakTopics: ['chủ đề khác'], submissionId: 'b3', assignmentId: 'a3', now: NOW });

    const cu = ket.find(t => t.topic === 'phương trình đoạn chắn');
    expect(cu?.level).toBe('weak');
    expect(cu?.evidenceSubmissionIds).toEqual(['b1', 'b2']);
  });

  it('topic không được đánh giá không tự biến mất khỏi hồ sơ', () => {
    const existing = [chuDe('vectơ pháp tuyến', ['b1'])];
    const ket = mergeTopics({ existing, weakTopics: [], submissionId: 'b2', now: NOW });

    expect(ket.find(t => t.topic === 'vectơ pháp tuyến')).toMatchObject({ level: 'developing' });
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

describe('applyEvidence — sửa chủ đề lần hai không chồng lên lần một', () => {
  it('duyệt lần đầu thì gộp chủ đề vào hồ sơ', () => {
    const ket = applyEvidence({ existing: [], weakTopics: ['dấu toạ độ'], submissionId: 'b1', approved: true, now: NOW });

    expect(ket.map(t => t.topic)).toEqual(['dấu toạ độ']);
    expect(ket[0].evidenceSubmissionIds).toEqual(['b1']);
  });

  it('GIÁO VIÊN ĐỔI CHỦ ĐỀ: nhãn cũ của chính bài đó phải biến mất', () => {
    const sauLan1 = applyEvidence({ existing: [], weakTopics: ['AI đoán sai'], submissionId: 'b1', approved: true, now: NOW });
    const sauLan2 = applyEvidence({ existing: sauLan1, weakTopics: ['thầy cô sửa lại'], submissionId: 'b1', approved: true, now: NOW });

    expect(sauLan2.map(t => t.topic)).toEqual(['thầy cô sửa lại']);
    expect(sauLan2.find(t => t.topic === 'AI đoán sai')).toBeUndefined();
  });

  it('giáo viên xoá sạch chủ đề thì hồ sơ không còn nhãn nào của bài đó', () => {
    const sauLan1 = applyEvidence({ existing: [], weakTopics: ['nhãn oan'], submissionId: 'b1', approved: true, now: NOW });
    const sauLan2 = applyEvidence({ existing: sauLan1, weakTopics: [], submissionId: 'b1', approved: true, now: NOW });

    expect(sauLan2).toEqual([]);
  });

  it('gỡ đúng bằng chứng của bài đang sửa, không gỡ của bài khác', () => {
    // Chủ đề dùng chung bằng chứng của hai bài: sửa b1 thì chỉ b1 rời đi.
    const chung = [chuDe('dùng chung', ['b1', 'b9'], 'weak')];
    const ket = applyEvidence({ existing: chung, weakTopics: [], submissionId: 'b1', approved: true, now: NOW });

    expect(ket.find(t => t.topic === 'dùng chung')?.evidenceSubmissionIds).toEqual(['b9']);
  });

  it('bỏ duyệt thì chỉ gỡ, không gộp lại', () => {
    const sauLan1 = applyEvidence({ existing: [], weakTopics: ['x'], submissionId: 'b1', approved: true, now: NOW });
    const boDuyet = applyEvidence({ existing: sauLan1, weakTopics: ['x'], submissionId: 'b1', approved: false, now: NOW });

    expect(boDuyet).toEqual([]);
  });

  it('gọi lại nhiều lần với cùng dữ liệu cho cùng kết quả', () => {
    const mot = applyEvidence({ existing: [], weakTopics: ['a'], submissionId: 'b1', approved: true, now: NOW });
    const hai = applyEvidence({ existing: mot, weakTopics: ['a'], submissionId: 'b1', approved: true, now: NOW });

    expect(hai).toEqual(mot);
  });

  it('duyệt lại cùng assignment thay thế evidence cũ thay vì cộng thêm', () => {
    const lan1 = applyEvidence({
      existing: [], weakTopics: ['hàm số'], submissionId: 'b1', assignmentId: 'a1', approved: true, now: NOW,
    });
    const lan2 = applyEvidence({
      existing: lan1, weakTopics: ['hàm số'], submissionId: 'b2', assignmentId: 'a1', approved: true, now: NOW,
    });

    expect(lan2[0].level).toBe('developing');
    expect(lan2[0].evidenceSubmissionIds).toEqual(['b2']);
  });

  it('nâng evidence legacy của chính submission lên dạng assignment mà không đếm đôi', () => {
    const existing = [chuDe('hàm số', ['b1'])];

    const ket = applyEvidence({
      existing,
      weakTopics: ['hàm số'],
      submissionId: 'b1',
      assignmentId: 'a1',
      approved: true,
      now: NOW,
    });

    expect(ket[0].level).toBe('developing');
    expect(ket[0].evidenceSubmissionIds).toEqual(['b1']);
    expect(ket[0].evidenceRefs).toEqual([
      expect.objectContaining({ submissionId: 'b1', assignmentId: 'a1' }),
    ]);
  });

  it('hợp nhất evidenceRefs và legacy IDs thay vì bỏ qua một nửa dữ liệu', () => {
    const existing: ProfileTopic[] = [{
      ...chuDe('hàm số', ['b1', 'b2']),
      evidenceRefs: [{
        submissionId: 'b2', assignmentId: 'a2', evidenceType: 'homework', assessedAt: NOW,
      }],
    }];

    const ket = mergeTopics({
      existing,
      weakTopics: ['hàm số'],
      submissionId: 'b3',
      assignmentId: 'a3',
      now: NOW,
    });

    expect(ket[0].evidenceRefs?.map(ref => ref.submissionId)).toEqual(['b1', 'b2', 'b3']);
    expect(ket[0].level).toBe('weak');
  });

  it('xoá một assignment chỉ gỡ evidence của assignment đó', () => {
    const asg1 = applyEvidence({
      existing: [], weakTopics: ['hàm số'], submissionId: 'b1', assignmentId: 'a1', approved: true, now: NOW,
    });
    const asg2 = applyEvidence({
      existing: asg1, weakTopics: ['hàm số'], submissionId: 'b2', assignmentId: 'a2', approved: true, now: NOW,
    });

    const ket = removeEvidence(asg2, 'b1', NOW, 'a1');

    expect(ket[0].evidenceSubmissionIds).toEqual(['b2']);
    expect(ket[0].evidenceRefs).toEqual([
      expect.objectContaining({ assignmentId: 'a2', submissionId: 'b2' }),
    ]);
    expect(ket[0].level).toBe('developing');
  });

  it('xoá submission cũ không được xoá evidence của lượt nộp mới cùng assignment', () => {
    const existing = [{
      ...chuDe('hàm số', ['b-new']),
      evidenceRefs: [{
        submissionId: 'b-new', assignmentId: 'a1', evidenceType: 'homework' as const, assessedAt: NOW,
      }],
    }];

    const ket = removeEvidence(existing, 'b-old', NOW, 'a1');

    expect(ket[0].evidenceSubmissionIds).toEqual(['b-new']);
    expect(ket[0].evidenceRefs).toEqual([
      expect.objectContaining({ submissionId: 'b-new', assignmentId: 'a1' }),
    ]);
  });
});

describe('applyEvidence — chỉ cập nhật bằng chứng đã được đánh giá', () => {
  it('bài mới KHÔNG nêu chủ đề cũ thì không làm tụt chủ đề đó', () => {
    const cu = [chuDe('chủ đề cũ', ['b1', 'b2'], 'weak')];
    const ket = applyEvidence({ existing: cu, weakTopics: ['chủ đề mới'], submissionId: 'b3', approved: true, now: NOW });

    expect(ket.find(t => t.topic === 'chủ đề cũ')?.level).toBe('weak');
  });

  it('SỬA LẠI bài đã tính thì KHÔNG làm tụt chủ đề của bài khác', () => {
    // Chủ đề của bài khác có ĐỦ 2 bằng chứng nên sống sót phép làm tụt ở lần duyệt đầu.
    const lan1 = applyEvidence({
      existing: [chuDe('của bài khác', ['b8', 'b9'], 'weak')],
      weakTopics: ['AI đoán'], submissionId: 'b1', approved: true, now: NOW,
    });
    const conLai = lan1.find(t => t.topic === 'của bài khác')?.evidenceSubmissionIds;

    const lan2 = applyEvidence({ existing: lan1, weakTopics: ['thầy cô sửa'], submissionId: 'b1', approved: true, now: NOW });

    // Lần sửa KHÔNG được làm tụt thêm lần nữa.
    expect(lan2.find(t => t.topic === 'của bài khác')?.evidenceSubmissionIds).toEqual(conLai);
    expect(lan2.find(t => t.topic === 'thầy cô sửa')?.evidenceSubmissionIds).toEqual(['b1']);
    expect(lan2.find(t => t.topic === 'AI đoán')).toBeUndefined();
  });
});

describe('applyPracticeEvidence — formative, không tự nâng mastery', () => {
  it('ghi evidence practice có confidence thấp nhưng giữ nguyên level', () => {
    const existing = [chuDe('hàm số', ['b1'], 'developing')];

    const ket = applyPracticeEvidence({
      existing,
      topics: ['hàm số'],
      attemptId: 'attempt-1',
      confidence: 0.5,
      now: NOW,
    });

    expect(ket[0].level).toBe('developing');
    expect(ket[0].evidenceRefs).toEqual([
      expect.objectContaining({ submissionId: 'b1', evidenceType: 'homework' }),
      expect.objectContaining({ submissionId: 'attempt-1', evidenceType: 'practice', confidence: 0.5 }),
    ]);
  });

  it('retry cùng attempt không nhân đôi formative evidence', () => {
    const existing = [chuDe('hàm số', ['b1'], 'developing')];
    const once = applyPracticeEvidence({
      existing,
      topics: ['hàm số'],
      attemptId: 'attempt-1',
      confidence: 0.4,
      now: NOW,
    });
    const twice = applyPracticeEvidence({
      existing: once,
      topics: ['hàm số'],
      attemptId: 'attempt-1',
      confidence: 0.8,
      now: NOW,
    });

    expect(twice[0].evidenceRefs?.filter(ref => ref.submissionId === 'attempt-1')).toHaveLength(1);
    expect(twice[0].evidenceRefs?.find(ref => ref.submissionId === 'attempt-1')?.confidence).toBe(0.8);
    expect(twice[0].level).toBe('developing');
  });
});
