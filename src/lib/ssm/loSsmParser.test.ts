import { describe, expect, it } from 'vitest';
import { findScaleRow, parseSsmCriteriaLoad, parseSsmQuarters } from './loSsmParser';
import type { SsmScoreConfig } from './loSsmParser';

/**
 * Fixture bám cấu trúc thật của SSM (đối chiếu mã JS công khai, 2026-10-22).
 * Các tầng bọc {data: …} xen kẽ mảng trần — parser phải chịu được cả hai.
 */
const SCORES = {
  data: {
    quarter: { id: 4 },
    result_assessment_form_id: null,
    can_edit: true,
    is_approved: false,
    quarter_has_branch_id: 5871,
    class: { id: 9681 },
    subject: { id: 12, subject_name: 'VN TOÁN' },
    assessment_forms: {
      data: {
        focal_points: {
          data: [
            {
              id: 8774,
              code: 'FP_DIS_TO_8774',
              name: 'Focal 1',
              coefficient_type: 1,
              power_standards: {
                data: [
                  {
                    id: 20478,
                    code: 'PS_DIS_TO_20478',
                    name: 'Power 1',
                    coefficient_type: 1,
                    learning_outcomes: {
                      data: [
                        { id: 34745, code: 'LO_DIS_TO_34745', name: 'Giá trị LG', coefficient_type: 1 },
                        { id: 34746, code: 'LO_DIS_TO_34746', name: 'PTLG cơ bản', coefficient_type: 1 },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
        scoring_scale: {
          data: {
            score_configs: {
              data: [
                { id: 901, point: null, is_number: false, is_calculate_score: 0 },
                { id: 902, point: 4, is_number: true, is_calculate_score: 1 },
                { id: 903, point: 3.5, is_number: true, is_calculate_score: 1 },
                { id: 904, point: 3, is_number: true, is_calculate_score: 1 },
                { id: 905, point: 0, is_number: true, is_calculate_score: 1 },
              ],
            },
          },
        },
      },
    },
    students: [
      {
        id: 551,
        full_name: { vi: 'Nguyễn Minh Anh' },
        code: '11C-001',
        point: {
          focal_points: [
            {
              id: 8774,
              power_standards: [
                {
                  id: 20478,
                  learning_outcomes: [
                    { id: 34745, point_id: 904, grading_student_id: 12345 },
                    { id: 34746, point_id: null, grading_student_id: null },
                  ],
                },
              ],
            },
          ],
        },
      },
      { id: 552, full_name: { vi: 'Trần Bảo' }, code: '11C-002', point: null },
    ],
  },
};

describe('loSsmParser', () => {
  const load = parseSsmCriteriaLoad(SCORES);

  it('dẹt đúng cây FP→PS→LO', () => {
    expect(load.los).toEqual([
      { loId: 34745, loCode: 'LO_DIS_TO_34745', text: 'Giá trị LG', focalPointId: 8774, powerStandardId: 20478 },
      { loId: 34746, loCode: 'LO_DIS_TO_34746', text: 'PTLG cơ bản', focalPointId: 8774, powerStandardId: 20478 },
    ]);
  });

  it('đọc thang: point rỗng (N) + số dạng chuỗi', () => {
    expect(load.scale).toEqual([
      { id: 901, point: 'null', isNumber: false, isCalculateScore: false },
      { id: 902, point: '4', isNumber: true, isCalculateScore: true },
      { id: 903, point: '3.5', isNumber: true, isCalculateScore: true },
      { id: 904, point: '3', isNumber: true, isCalculateScore: true },
      { id: 905, point: '0', isNumber: true, isCalculateScore: true },
    ]);
    expect(load.scale[0]).toEqual({ id: 901, point: 'null', isNumber: false, isCalculateScore: false });
  });

  it('đọc điểm đã có: point_id + grading_student_id theo (fp_ps_lo)', () => {
    const [minh, bao] = load.students;
    expect(minh.name).toBe('Nguyễn Minh Anh');
    expect(minh.existingPointId.get('8774_20478_34745')).toBe(904);
    expect(minh.existingGradingId.get('8774_20478_34745')).toBe(12345);
    expect(minh.existingPointId.has('8774_20478_34746')).toBe(false);
    expect(bao.existingPointId.size).toBe(0);
  });

  it('trạng thái bài: chưa duyệt, có thể sửa', () => {
    expect(load.isApproved).toBe(false);
    expect(load.canEdit).toBe(true);
    expect(load.resultAssessmentFormId).toBe(null);
    expect(load.quarterHasBranchId).toBe(5871);
  });

  it('chọn đúng hàng thang cho mức cần ghi', () => {
    expect(findScaleRow(load.scale, '3.5')).toEqual({ id: 903, point: '3.5', isNumber: true, isCalculateScore: true });
    expect(findScaleRow(load.scale, '4')?.id).toBe(902);
    expect(findScaleRow(load.scale, '2.5')).toBe(null); // thang thật không có 2,5 trong fixture
    expect(findScaleRow(load.scale, 'N')?.isNumber).toBe(false);
  });

  it('báo lỗi rõ khi JSON lệch cấu trúc', () => {
    expect(() => parseSsmCriteriaLoad(null)).toThrow(/cấu trúc/);
  });

  it('parse danh sách quý + form kèm criteria_id', () => {
    const quarters = parseSsmQuarters({
      data: [
        {
          id: 5,
          name: 'Quý 1',
          assessment_forms: [{ id: 42, assessment_name: 'F1', criteria_id: 7, radio: 0, status: 'active' }],
        },
        {
          id: 6,
          name: 'Quý 2',
          assessment_forms: { data: [{ id: 43, assessment_name: 'IA2', criteria_id: 8 }] },
        },
      ],
    });
    expect(quarters).toEqual([
      { id: 5, name: 'Quý 1', forms: [{ id: 42, assessmentName: 'F1', criteriaId: 7 }] },
      { id: 6, name: 'Quý 2', forms: [{ id: 43, assessmentName: 'IA2', criteriaId: 8 }] },
    ]);
  });

  it('chịu được mảng trần (không bọc {data}) ở mọi tầng', () => {
    const bare = parseSsmCriteriaLoad({
      ...SCORES.data,
      assessment_forms: {
        focal_points: [
          {
            id: 1,
            power_standards: [
              { id: 2, learning_outcomes: [{ id: 3, code: 'LO_X_1', name: 'Lo 1' }] },
            ],
          },
        ],
        scoring_scale: { score_configs: [{ id: 10, point: 4, is_number: true }] },
      },
      students: [],
    });
    expect(bare.los.map((l) => l.loCode)).toEqual(['LO_X_1']);
    expect(bare.scale).toEqual([{ id: 10, point: '4', isNumber: true, isCalculateScore: false }]);
  });
});
