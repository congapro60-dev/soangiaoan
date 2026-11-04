import { describe, expect, it } from 'vitest';
import type { UnitCircleVisualContract } from './extension';
import { normalizeUnitCircleSubmission } from './submission';

const contract: UnitCircleVisualContract = {
  renderer: 'unit_circle', mathematicalAuthority: 'source_verified',
  purpose: { pedagogicalRole: 'evidence_task', learningValue: 'Định vị góc', linkedActivityRefs: ['A1'] },
  model: { minAngleRad: -Math.PI, maxAngleRad: Math.PI, defaultAngleRad: 0 },
  invariants: ['unit_radius_one', 'cardinal_axes'], answerBearingObjectIds: [], taskStateId: 'task', revealStateIds: ['reveal'],
  accessibility: { description: 'Đường tròn', keyboardAlternative: true }, fallback: { description: 'Nhập góc' },
  evidenceExtractor: { fields: ['angleRad', 'quadrant', 'cos', 'sin'], submissionRequired: true },
};

describe('Unit Circle evidence submission', () => {
  it('recomputes mathematical evidence from the submitted angle', () => {
    const evidence = normalizeUnitCircleSubmission(contract, JSON.stringify({ angleRad: Math.PI / 2, x: 999,
      explanation: 'Điểm P ở trục Oy dương.' }));
    expect(evidence).toEqual({ angleRad: Math.PI / 2, cos: 0, sin: 1, quadrant: 'axis',
      explanation: 'Điểm P ở trục Oy dương.' });
  });

  it('rejects a value outside the declared domain', () => {
    expect(() => normalizeUnitCircleSubmission(contract, JSON.stringify({ angleRad: 5 * Math.PI }))).toThrow('SIMULATION_ANGLE_OUT_OF_DOMAIN');
  });
});
