import { describe, expect, it } from 'vitest';
import { aggregateRequirementLines, applyRequirementNotes, groupRequirementLines, levelOf, parentActionsForRequirements, sanitizeRequirementLines, type EvidenceSubmission } from './parentRequirements';
import { yccdForGrade } from '../curriculum/yccdToan';

const evidence: EvidenceSubmission[] = [
  { ma: 'b1', ten: 'BTVN 1', ngay: '2026-09-05', cau: [
    { ma: 'b1q1', diem: 2, toiDa: 2, ketQua: 'đúng' },
    { ma: 'b1q2', diem: 1, toiDa: 2, ketQua: 'đúng một phần' },
    { ma: 'b1q3', diem: 0, toiDa: 0, ketQua: 'sai' },
  ] },
  { ma: 'b2', ten: 'BTVN 2', ngay: '2026-09-12', cau: [{ ma: 'b2', diem: 3, toiDa: 10, ketQua: 'cả bài' }] },
];

describe('kết quả theo yêu cầu cần đạt', () => {
  it.each([[10, 75], [11, 128], [12, 46]])('bảng YCCĐ lớp %i: %i mục, mã đánh số liền, không chữ rác, chủ đề không bị tách', (grade, count) => {
    const list = yccdForGrade(`Lớp ${grade}`);
    expect(list).toHaveLength(count);
    expect(list.map(item => item.id)).toEqual(list.map((_, index) => `T${grade}.${String(index + 1).padStart(2, '0')}`));
    for (const item of list) {
      expect(item.text.length).toBeGreaterThan(20);
      expect(item.text).toMatch(/[.)]$/);
      expect(item.text).not.toMatch(/\s{2,}|Thực hành trong phòng máy|được được|[-]/);
    }
    // Một chủ đề chỉ xuất hiện thành một khối liền (báo cáo nhóm theo chủ đề liên tiếp).
    const topics = list.map(item => item.topic).filter((topic, i, all) => i === 0 || all[i - 1] !== topic);
    expect(new Set(topics).size).toBe(topics.length);
  });

  it('kí hiệu và công thức đã khôi phục đúng', () => {
    expect(yccdForGrade(10)[0].text).toContain('∀, ∃');
    expect(yccdForGrade(11).find(item => item.text.startsWith('Nhận biết được khái niệm lôgarit'))!.text).toContain('a ≠ 1');
    expect(yccdForGrade(12).some(item => item.text.startsWith('Vận dụng được đạo hàm và khảo sát hàm số'))).toBe(true);
    expect(yccdForGrade(9)).toEqual([]);
  });

  it('mức theo tỉ lệ điểm các câu căn cứ', () => {
    expect(levelOf(80)).toBe('vung');
    expect(levelOf(79.9)).toBe('dang');
    expect(levelOf(50)).toBe('dang');
    expect(levelOf(49.9)).toBe('chua');
  });

  it('gộp bản ghép của AI: bỏ mã YCCĐ ngoài khối, mã câu lạ, câu thang 0; ghi chú bỏ markdown', () => {
    const lines = aggregateRequirementLines(10, evidence, {
      yccd: [
        { ma: 'T10.03', cau: ['b1q1', 'b1q2', 'b1q2'], ghiChu: '  Dùng **đúng** biểu đồ Ven  ' },
        { ma: 'T10.04', cau: ['b1q3'], ghiChu: 'thang 0' },
        { ma: 'T10.01', cau: ['b2', 'b7q1'] },
        { ma: 'T11.01', cau: ['b1q1'], ghiChu: 'khối khác' },
        { ma: 'T10.40', cau: [], ghiChu: 'không có câu nào' },
        'rác',
      ],
    });
    expect(lines).toEqual([
      { id: 'T10.01', level: 'chua', evidence: 1, percent: 30, note: '' },
      { id: 'T10.03', level: 'dang', evidence: 2, percent: 75, note: 'Dùng đúng biểu đồ Ven' },
    ]);
  });

  it('ghi chú bước sau: gắn đúng mã, bỏ mã lạ, làm sạch markdown', () => {
    const lines = [{ id: 'T10.03', level: 'dang' as const, evidence: 2, percent: 60, note: '' }];
    expect(applyRequirementNotes(lines, { ghiChu: [{ ma: 'T10.03', ghiChu: '**Nhầm** giao với hợp' }, { ma: 'T10.09', ghiChu: 'x' }] })[0].note).toBe('Nhầm giao với hợp');
    expect(applyRequirementNotes(lines, null)).toEqual(lines);
  });

  it('AI trả sai dạng thì không có dòng nào', () => {
    expect(aggregateRequirementLines(10, evidence, { yccd: 'x' })).toEqual([]);
    expect(aggregateRequirementLines(10, evidence, { yccd: [{ ma: 'T10.03', cau: 'b1q1' }] })).toEqual([]);
    expect(aggregateRequirementLines(12, evidence, { yccd: [{ ma: 'T10.03', cau: ['b1q1'] }] })).toEqual([]);
  });

  it('dòng giáo viên sửa: kiểm khối, mức, trùng; xếp theo thứ tự Chương trình', () => {
    const lines = sanitizeRequirementLines('10', [
      { id: 'T10.20', level: 'vung', evidence: 2.4, percent: 140, note: 'a'.repeat(400) },
      { id: 'T10.02', level: 'chua', evidence: -1, percent: 10, note: 5 },
      { id: 'T10.02', level: 'vung', evidence: 1, percent: 90, note: '' },
      { id: 'T10.05', level: 'tot', evidence: 1, percent: 90, note: '' },
    ]);
    expect(lines.map(line => [line.id, line.level, line.evidence, line.percent])).toEqual([['T10.02', 'chua', 0, 10], ['T10.20', 'vung', 2, 100]]);
    expect(lines[1].note).toHaveLength(300);
    expect(sanitizeRequirementLines('10', 'không phải mảng')).toEqual([]);
  });

  it('gợi ý ở nhà: có dòng YCCĐ thì không trỏ tới "Cần rèn thêm" nữa', () => {
    const actions = ['Hỏi con mỗi ngày.', 'Luyện lại phần ở mục “Cần rèn thêm”.', 'Giữ liên lạc.'];
    const weak = [{ id: 'T10.01', level: 'chua' as const, evidence: 1, percent: 10, note: '' }];
    const out = parentActionsForRequirements(actions, weak);
    expect(out.join(' ')).not.toContain('Cần rèn thêm');
    expect(out[1]).toContain('“Chưa đạt” hoặc “Đang hình thành”');
    expect(parentActionsForRequirements(actions, [{ ...weak[0], level: 'vung' }])).toEqual(['Hỏi con mỗi ngày.', 'Giữ liên lạc.']);
    expect(parentActionsForRequirements(actions, [])).toEqual(actions);
  });

  it('nhóm theo chủ đề, giữ thứ tự Chương trình', () => {
    const groups = groupRequirementLines([
      { id: 'T10.03', level: 'vung', evidence: 1, percent: 90, note: '' },
      { id: 'T10.01', level: 'chua', evidence: 1, percent: 10, note: '' },
      { id: 'T10.02', level: 'dang', evidence: 1, percent: 60, note: '' },
    ]);
    expect(groups.map(group => [group.topic, group.rows.map(row => row.line.id)])).toEqual([
      ['Mệnh đề', ['T10.01', 'T10.02']],
      ['Tập hợp và các phép toán trên tập hợp', ['T10.03']],
    ]);
  });
});
