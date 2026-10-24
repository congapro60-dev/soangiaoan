import { describe, expect, it } from 'vitest';
import { getLearningPurposePlan, type LearningPurpose } from './learningPurpose';

describe('getLearningPurposePlan', () => {
  it.each([
    ['preparation', 'Chuẩn bị trước bài', 'preparation'],
    ['remediation', 'Ôn tập và bù lỗ hổng', 'remediation'],
    ['self_paced', 'Học trọn bài theo nhịp riêng', 'self_paced'],
  ] as const)('returns the plan for %s', (purpose, label, expected) => {
    expect(getLearningPurposePlan(purpose)).toMatchObject({ purpose: expected, label });
  });

  it('falls back to self-paced for unknown input', () => {
    expect(getLearningPurposePlan('unknown' as LearningPurpose)).toMatchObject({ purpose: 'self_paced' });
  });
});
