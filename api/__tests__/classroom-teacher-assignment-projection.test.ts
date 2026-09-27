import { describe, expect, it } from 'vitest';
import { teacherAssignmentProjection } from '../_classroom-teacher';

/**
 * Projection bài giao PHẢI giữ nhãn năng lực. Bỏ sót `competencyTags` là hồ sơ năng lực luôn trống
 * dù giáo viên đã gắn/duyệt (lỗi này lọt hết test cũ, chỉ lộ khi QA thật). Khoá lại tại đây.
 */
describe('teacherAssignmentProjection · nhãn năng lực', () => {
  it('giữ competencyTags + cờ đã duyệt', () => {
    const out = teacherAssignmentProjection('bai-1', {
      teacherId: 'gv-1', classId: 'lop-1', title: 'BTVN', type: 'assignment', isOpen: true,
      competencyTags: [{ competencyId: 'g10-vecto-va-phep-toan', confidence: 1, reason: '' }],
      competencyTagsApproved: true,
    });
    expect(out.competencyTags).toEqual([{ competencyId: 'g10-vecto-va-phep-toan', confidence: 1, reason: '' }]);
    expect(out.competencyTagsApproved).toBe(true);
  });

  it('bài chưa gắn thì không có field (compact bỏ undefined)', () => {
    const out = teacherAssignmentProjection('bai-2', {
      teacherId: 'gv-1', classId: 'lop-1', title: 'BTVN', type: 'assignment', isOpen: true,
    });
    expect(out.competencyTags).toBeUndefined();
  });
});
