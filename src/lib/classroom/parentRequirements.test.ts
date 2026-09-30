import { describe, expect, it } from 'vitest';
import { aggregateRequirementLines, groupRequirementLines, levelOf, sanitizeRequirementLines, type EvidenceSubmission } from './parentRequirements';
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
  it('bảng YCCĐ lớp 10: mã duy nhất, đánh số liền theo thứ tự, không có chữ rác', () => {
    const list = yccdForGrade('Lớp 10');
    expect(list).toHaveLength(75);
    expect(list.map(item => item.id)).toEqual(list.map((_, index) => `T10.${String(index + 1).padStart(2, '0')}`));
    for (const item of list) {
      expect(item.text.length).toBeGreaterThan(20);
      expect(item.text).toMatch(/[.)]$/);
      expect(item.text).not.toMatch(/\s{2,}|Thực hành trong phòng máy/);
    }
    expect(list[0].text).toContain('∀, ∃');
    expect(yccdForGrade('12')).toEqual([]);
  });

  it('mức theo tỉ lệ điểm các câu căn cứ', () => {
    expect(levelOf(80)).toBe('vung');
    expect(levelOf(79.9)).toBe('dang');
    expect(levelOf(50)).toBe('dang');
    expect(levelOf(49.9)).toBe('chua');
  });

  it('gộp bản ghép của AI: bỏ mã YCCĐ ngoài khối, mã câu lạ, câu thang 0; ghi chú bỏ markdown', () => {
    const lines = aggregateRequirementLines(10, evidence, {
      ghep: [
        { cau: 'b1q1', yccd: 'T10.03' },
        { cau: 'b1q2', yccd: 'T10.03' },
        { cau: 'b1q2', yccd: 'T10.03' },
        { cau: 'b1q3', yccd: 'T10.04' },
        { cau: 'b2', yccd: 'T10.01' },
        { cau: 'b7q1', yccd: 'T10.01' },
        { cau: 'b1q1', yccd: 'T11.01' },
        'rác',
      ],
      ghiChu: [{ yccd: 'T10.03', ghiChu: '  Dùng **đúng** biểu đồ Ven  ' }, { yccd: 'T10.40', ghiChu: 'không có câu nào' }],
    });
    expect(lines).toEqual([
      { id: 'T10.01', level: 'chua', evidence: 1, percent: 30, note: '' },
      { id: 'T10.03', level: 'dang', evidence: 2, percent: 75, note: 'Dùng đúng biểu đồ Ven' },
    ]);
  });

  it('AI trả sai dạng thì không có dòng nào', () => {
    expect(aggregateRequirementLines(10, evidence, { ghep: 'x', ghiChu: null })).toEqual([]);
    expect(aggregateRequirementLines(12, evidence, { ghep: [{ cau: 'b1q1', yccd: 'T10.03' }] })).toEqual([]);
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
