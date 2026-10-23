import { describe, expect, it } from 'vitest';
import type { SsmCriteriaLoad } from './loSsmParser';
import { buildLoWriteBody, diffLoGrid, verifyWritten, withClassAndCriteria, type LoDiff } from './loSsmWrite';
import type { LoMark } from './loScore';

const load = (overrides: Partial<SsmCriteriaLoad> = {}): SsmCriteriaLoad => ({
  quarterHasBranchId: 5871,
  resultAssessmentFormId: null,
  isApproved: false,
  canEdit: true,
  scale: [
    { id: 901, point: 'null', isNumber: false, isCalculateScore: false },
    { id: 902, point: '4', isNumber: true, isCalculateScore: true },
    { id: 903, point: '3.5', isNumber: true, isCalculateScore: true },
    { id: 904, point: '3', isNumber: true, isCalculateScore: true },
    { id: 905, point: '0', isNumber: true, isCalculateScore: true },
  ],
  los: [
    { loId: 34745, loCode: 'LO_DIS_TO_34745', text: 'A', focalPointId: 8774, powerStandardId: 20478 },
    { loId: 34746, loCode: 'LO_DIS_TO_34746', text: 'B', focalPointId: 8774, powerStandardId: 20478 },
  ],
  students: [
    { id: 551, maHS: '11C-001', name: 'Minh Anh', existingPointId: new Map([['8774_20478_34745', 904]]), existingGradingId: new Map([['8774_20478_34745', 123]]), },
    { id: 552, maHS: '11C-002', name: 'Trần Bảo', existingPointId: new Map(), existingGradingId: new Map() },
  ],
  ...overrides,
});

describe('diffLoGrid', () => {
  it('ô trống + web có điểm = thêm mới; ô đã có + trùng = không đổi', () => {
    const grid = new Map<string, Map<string, LoMark>>([
      ['11C-001', new Map<string, LoMark>([['LO_DIS_TO_34745', 3], ['LO_DIS_TO_34746', 4]])],
      ['11C-002', new Map<string, LoMark>([['LO_DIS_TO_34745', 0]])],
    ]);
    const d = diffLoGrid(load(), grid);
    const cell = (ma: string, lo: string) => d.cells.find((c) => c.maHS === ma && c.loCode === lo)!;
    expect(cell('11C-001', 'LO_DIS_TO_34745')).toMatchObject({ existing: '3', proposed: '3', changed: false, overwrite: false });
    expect(cell('11C-001', 'LO_DIS_TO_34746')).toMatchObject({ existing: null, proposed: '4', changed: true, overwrite: false });
    expect(cell('11C-002', 'LO_DIS_TO_34745')).toMatchObject({ existing: null, proposed: '0', changed: true, overwrite: false });
    expect(d.changedCount).toBe(2);
    expect(d.overwriteCount).toBe(0);
  });

  it('ghi đè ô đã có khác mức → overwrite + cảnh báo', () => {
    const grid = new Map<string, Map<string, LoMark>>([['11C-001', new Map<string, LoMark>([['LO_DIS_TO_34745', 4]])]]);
    const d = diffLoGrid(load(), grid);
    const cell = d.cells.find((c) => c.maHS === '11C-001' && c.loCode === 'LO_DIS_TO_34745')!;
    expect(cell).toMatchObject({ existing: '3', proposed: '4', changed: true, overwrite: true });
    expect(d.overwriteCount).toBe(1);
  });

  it('web không có căn cứ (N) → không đề xuất, không đụng', () => {
    const grid = new Map<string, Map<string, LoMark>>([
      ['11C-001', new Map<string, LoMark>([['LO_DIS_TO_34746', 'N']])],
      ['11C-002', new Map<string, LoMark>([['LO_DIS_TO_34745', 'N']])],
    ]);
    const d = diffLoGrid(load(), grid);
    expect(d.cells.every((c) => !c.changed)).toBe(true);
    expect(d.changedCount).toBe(0);
  });

  it('mức không có trong thang → nằm trong unmappedMarks, không badge sai', () => {
    const bad = load({ scale: load().scale.filter((row) => row.point !== '2.5' && row.point !== 'null') });
    const grid = new Map<string, Map<string, LoMark>>([['11C-002', new Map<string, LoMark>([['LO_DIS_TO_34745', 4]])]]);
    const d = diffLoGrid(bad, grid);
    // 4 vẫn hợp lệ — dùng thang có 4 nên unmapped rỗng; giờ thử mức 2.5
    const grid2 = new Map<string, Map<string, LoMark>>([['11C-002', new Map<string, LoMark>([['LO_DIS_TO_34745', 2.5]])]]);
    const d2 = diffLoGrid(bad, grid2);
    expect(d.unmappedMarks).toEqual([]);
    expect(d2.unmappedMarks).toEqual(['2.5']);
  });

  it('HS ở SSM mà app không có grid → unmatchedStudents', () => {
    const d = diffLoGrid(load(), new Map<string, Map<string, LoMark>>([['11C-001', new Map<string, LoMark>([['LO_DIS_TO_34745', 3]])]]));
    expect(d.unmatchedStudents).toEqual(['11C-002']);
  });
});

describe('buildLoWriteBody', () => {
  it('chỉ chứa ô khác; grading_student_id chỉ với ô đã có', () => {
    const grid = new Map<string, Map<string, LoMark>>([
      ['11C-001', new Map<string, LoMark>([['LO_DIS_TO_34745', 4], ['LO_DIS_TO_34746', 3.5]])],
      ['11C-002', new Map<string, LoMark>([['LO_DIS_TO_34745', 0]])],
    ]);
    const d = diffLoGrid(load(), grid);
    const body = buildLoWriteBody(load(), grid, d)!;
    expect(body.quarter_has_branch_id).toBe(5871);
    expect(body.students).toHaveLength(2);
    const minh = body.students.find((s) => s.id === 551)!;
    expect(minh.result).toEqual([
      { learning_outcome_id: 34745, scoring_setting_id: 902, is_number: true, point: '4', grading_student_id: 123 },
      { learning_outcome_id: 34746, scoring_setting_id: 903, is_number: true, point: '3.5' },
    ]);
    const bao = body.students.find((s) => s.id === 552)!;
    expect(bao.result).toEqual([{ learning_outcome_id: 34745, scoring_setting_id: 905, is_number: true, point: '0' }]);
  });

  it('không có ô khác / có mức lạ → null (không gọi SSM)', () => {
    const grid = new Map<string, Map<string, LoMark>>([
      ['11C-001', new Map<string, LoMark>([['LO_DIS_TO_34745', 3]])],
    ]);
    const d = diffLoGrid(load(), grid);
    expect(buildLoWriteBody(load(), grid, d)).toBe(null);
    const grid2 = new Map<string, Map<string, LoMark>>([['11C-002', new Map<string, LoMark>([['LO_DIS_TO_34745', 2.5]])]]);
    const d2: LoDiff = { ...diffLoGrid(load(), grid2), unmappedMarks: ['2.5'] };
    expect(buildLoWriteBody(load(), grid2, d2)).toBe(null);
  });
});

describe('verifyWritten', () => {
  it('đọc lại khớp → rỗng; lệch → liệt kê', () => {
    const grid = new Map<string, Map<string, LoMark>>([
      ['11C-001', new Map<string, LoMark>([['LO_DIS_TO_34745', 4]])],
      ['11C-002', new Map<string, LoMark>([['LO_DIS_TO_34745', 0]])],
    ]);
    const d = diffLoGrid(load(), grid);
    const body = buildLoWriteBody(load(), grid, d)!;
    // Sau khi ghi: SSM lưu đúng các hàng thang đã gọi
    const savedOk = load({
      students: [
        { ...load().students[0], existingPointId: new Map([['8774_20478_34745', 902], ['8774_20478_34746', 903]]), existingGradingId: new Map([['8774_20478_34745', 123], ['8774_20478_34746', 456]]) },
        { ...load().students[1], existingPointId: new Map([['8774_20478_34745', 905]]), existingGradingId: new Map([['8774_20478_34745', 789]]) },
      ],
    });
    expect(verifyWritten(savedOk, body)).toEqual([]);
    // SSM lưu nhầm ô của Bảo (lưu mức 4 thay vì 0)
    const savedWrong = load({
      students: [
        { ...load().students[0], existingPointId: new Map([['8774_20478_34745', 902], ['8774_20478_34746', 903]]), existingGradingId: new Map([['8774_20478_34745', 123], ['8774_20478_34746', 456]]) },
        { ...load().students[1], existingPointId: new Map([['8774_20478_34745', 902]]) },
      ],
    });
    expect(verifyWritten(savedWrong, body)).toEqual(['Trần Bảo · LO_DIS_TO_34745']);
  });
});

describe('withClassAndCriteria', () => {
  it('điền class_id + criteria_id thật vào body', () => {
    const body = { class_id: 0, criteria_id: 0, quarter_has_branch_id: 1, students: [] };
    const full = withClassAndCriteria(body, load(), 9681, 7);
    expect(full.class_id).toBe(9681);
    expect(full.criteria_id).toBe(7);
  });
});
