import { describe, expect, it } from 'vitest';
import { applyDraftRevision, canCompileLessonPlan, type ReviewableLessonPlanDraft } from './planRevision';

const approvedDraft = (): ReviewableLessonPlanDraft => ({
  id: 'draft-1',
  sourceHash: 'source-a',
  revision: 3,
  status: 'design_approved',
  approval: { planApprovedAt: '2026-09-21T00:00:00.000Z', designApprovedAt: '2026-09-21T00:01:00.000Z' },
  content: { title: 'Dãy số', durationSec: 2400, activities: ['warmup'] },
});

describe('lesson plan revision lifecycle', () => {
  it('permits compile only after design approval with no unresolved issue', () => {
    expect(canCompileLessonPlan(approvedDraft())).toBe(true);
  });

  it('invalidates approvals when instructional content changes', () => {
    const revised = applyDraftRevision(approvedDraft(), { title: 'Dãy số và cách cho dãy' });
    expect(revised).toMatchObject({ revision: 4, status: 'review_ready', approval: {} });
    expect(canCompileLessonPlan(revised)).toBe(false);
  });

  it('preserves approvals for a non-instructional note change', () => {
    const revised = applyDraftRevision(approvedDraft(), {}, 'Sửa ghi chú nội bộ cho GV.');
    expect(revised.status).toBe('design_approved');
    expect(revised.approval).toEqual(approvedDraft().approval);
  });
});
