import { describe, expect, it } from 'vitest';
import { SKILL_CATALOG } from './skillCatalog';
import { reduceSkillState, reduceSkillStates } from './skillMastery';
import type { SkillEvidence } from './skillTypes';

const lineSkill = SKILL_CATALOG.find(skill => skill.skillId === 'math.line-equation')!;

const evidence = (overrides: Partial<SkillEvidence> = {}): SkillEvidence => ({
  evidenceId: 'evidence-1',
  skillId: lineSkill.skillId,
  source: 'homework',
  signal: 'partial',
  scoreRatio: 0.5,
  confidence: 0.8,
  assessedAt: '2026-08-24T10:00:00.000Z',
  approved: true,
  ...overrides,
});

describe('skillMastery — reducer deterministic theo bằng chứng', () => {
  it('skill không có evidence vẫn tồn tại ở not_seen và không bị tăng vì skill khác', () => {
    const states = reduceSkillStates(SKILL_CATALOG, [evidence({ skillId: 'math.linear-function' })]);
    expect(states.find(state => state.skillId === lineSkill.skillId)).toMatchObject({
      status: 'not_seen',
      masteryEstimate: 0,
      evidenceCount: 0,
    });
  });

  it('một homework yếu chỉ là developing; hai assignment độc lập mới là weak', () => {
    const one = reduceSkillState(lineSkill, [evidence({ signal: 'weak', scoreRatio: 0.1, assignmentId: 'a1' })]);
    expect(one.status).toBe('developing');

    const two = reduceSkillState(lineSkill, [
      evidence({ evidenceId: 'e1', signal: 'weak', scoreRatio: 0.1, assignmentId: 'a1' }),
      evidence({ evidenceId: 'e2', signal: 'weak', scoreRatio: 0.2, assignmentId: 'a2', assessedAt: '2026-08-25T10:00:00.000Z' }),
    ]);
    expect(two.status).toBe('weak');
  });

  it('practice có thể nâng estimate nhưng không tự cấp mastered nếu thiếu evidence chất lượng cao', () => {
    const state = reduceSkillState(lineSkill, [evidence({
      source: 'practice',
      attemptId: 'attempt-1',
      evidenceId: 'attempt-1',
      signal: 'strong',
      scoreRatio: 1,
      confidence: 1,
      assignmentId: undefined,
      approved: undefined,
    })]);
    expect(state.masteryEstimate).toBeGreaterThan(0);
    expect(state.status).toBe('developing');
  });

  it('resubmission cùng assignment chỉ giữ evidence mới nhất, không đếm đôi', () => {
    const state = reduceSkillState(lineSkill, [
      evidence({ evidenceId: 'old', assignmentId: 'a1', signal: 'weak', scoreRatio: 0.1 }),
      evidence({ evidenceId: 'new', assignmentId: 'a1', signal: 'strong', scoreRatio: 1, assessedAt: '2026-08-25T10:00:00.000Z' }),
    ]);
    expect(state.evidenceCount).toBe(1);
    expect(state.masteryEstimate).toBe(1);
    expect(state.status).toBe('mastered');
  });

  it('retry cùng attemptId không làm tăng evidenceCount', () => {
    const state = reduceSkillState(lineSkill, [
      evidence({ source: 'practice', evidenceId: 'attempt-1-old', attemptId: 'attempt-1', scoreRatio: 0.3, confidence: 0.3 }),
      evidence({ source: 'practice', evidenceId: 'attempt-1-new', attemptId: 'attempt-1', scoreRatio: 0.9, confidence: 0.9, assessedAt: '2026-08-25T10:00:00.000Z' }),
    ]);
    expect(state.evidenceCount).toBe(1);
    expect(state.masteryEstimate).toBe(0.9);
  });

  it('tính trend theo evidence gần nhất, misconception counts và kẹp số liệu', () => {
    const state = reduceSkillState(lineSkill, [
      evidence({ evidenceId: 'e1', scoreRatio: 0.2, confidence: -3, misconceptionCodes: ['line-sign-error'] }),
      evidence({ evidenceId: 'e2', scoreRatio: 1.4, confidence: 3, misconceptionCodes: ['line-sign-error'], assessedAt: '2026-08-25T10:00:00.000Z' }),
    ]);
    expect(state.trend).toBe('up');
    expect(state.misconceptionCounts).toEqual({ 'line-sign-error': 2 });
    expect(state.masteryEstimate).toBeLessThanOrEqual(1);
    expect(state.confidence).toBeLessThanOrEqual(1);
  });
});
