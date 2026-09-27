import { describe, expect, it } from 'vitest';
import { buildPublicTvState, isPrivateFieldLeaked, projectToPublicTvState, type PublicProjectionInput } from './publicProjection';

describe('publicProjection', () => {
  const BASE_INPUT: PublicProjectionInput = {
    cueId: 'P16',
    screenId: 'S4',
    status: 'running',
    showStats: true,
    participantCount: 32,
    submittedCount: 21,
    routeCounts: { M: 8, S: 17, C: 7 },
    errorCategoryCounts: { Conceptual: 2, Algebraic: 4, Logical: 11, 'Missing condition': 4 },
    groupProgress: { G1: 0.5, G2: 0.75 },
    updatedAt: 1_787_827_200_000,
  };

  it('builds a valid PublicTvState with correct counts', () => {
    const state = buildPublicTvState(BASE_INPUT);
    expect(state.cueId).toBe('P16');
    expect(state.screenId).toBe('S4');
    expect(state.status).toBe('running');
    expect(state.showStats).toBe(true);
    expect(state.participantCount).toBe(32);
    expect(state.submittedCount).toBe(21);
    expect(state.routeCounts).toEqual({ M: 8, S: 17, C: 7 });
    expect(state.errorCategoryCounts).toEqual({ Conceptual: 2, Algebraic: 4, Logical: 11, 'Missing condition': 4 });
    expect(state.groupProgress).toEqual({ G1: 0.5, G2: 0.75 });
    expect(state.updatedAt).toBe(1_787_827_200_000);
  });

  it('defaults invalid status to running', () => {
    const state = buildPublicTvState({ ...BASE_INPUT, status: 'invalid' });
    expect(state.status).toBe('running');
  });

  it('defaults missing counts to zero', () => {
    const state = buildPublicTvState({ cueId: 'P00', screenId: 'S0' });
    expect(state.participantCount).toBe(0);
    expect(state.submittedCount).toBe(0);
    expect(state.routeCounts).toEqual({ M: 0, S: 0, C: 0 });
    expect(state.errorCategoryCounts).toEqual({ Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 });
  });

  it('strips private fields when projecting from raw document', () => {
    const raw: Record<string, unknown> = {
      cueId: 'P16',
      screenId: 'S4',
      status: 'running',
      showStats: true,
      participantCount: 32,
      submittedCount: 21,
      routeCounts: { M: 8, S: 17, C: 7 },
      errorCategoryCounts: { Conceptual: 2, Algebraic: 4, Logical: 11, 'Missing condition': 4 },
      updatedAt: 1_787_827_200_000,
      name: 'Nguyễn Văn A',
      studentId: 'student-001',
      languageSupportPlan: 'tier intensive private support plan',
      rawText: 'Em chọn tiếng Anh vì em cần hỗ trợ riêng',
      privateReason: 'HS chưa phân biệt đường biên',
      teacherScript: 'GV nói: ...',
      participantUid: 'uid-123',
    };
    const state = projectToPublicTvState(raw);
    const json = JSON.stringify(state);

    expect(json).not.toContain('Nguyễn Văn A');
    expect(json).not.toContain('student-001');
    expect(json).not.toContain('private support plan');
    expect(json).not.toContain('Em chọn tiếng Anh');
    expect(json).not.toContain('HS chưa phân biệt đường biên');
    expect(json).not.toContain('GV nói');
    expect(json).not.toContain('uid-123');
    expect(state.cueId).toBe('P16');
    expect(state.participantCount).toBe(32);
  });

  it('JSON-stringified output contains no name, studentId, languageSupportPlan, raw text, or private reason', () => {
    const raw: Record<string, unknown> = {
      cueId: 'P20',
      screenId: 'S8',
      status: 'running',
      showStats: true,
      participantCount: 25,
      submittedCount: 18,
      routeCounts: { M: 5, S: 12, C: 8 },
      errorCategoryCounts: { Conceptual: 1, Algebraic: 3, Logical: 6, 'Missing condition': 8 },
      updatedAt: Date.now(),
      name: 'Trần Thị B',
      studentId: 'student-002',
      languageSupportPlan: 'confidential tier data',
      rawText: 'This is private student response',
      privateReason: 'Private teacher grouping rationale',
      teacherScript: 'GV private script',
      participantUid: 'uid-456',
      someOtherPrivateField: 'should not appear',
    };
    const state = projectToPublicTvState(raw);
    const json = JSON.stringify(state);

    expect(isPrivateFieldLeaked(json)).toBeNull();
    expect(json).not.toContain('Trần Thị B');
    expect(json).not.toContain('student-002');
    expect(json).not.toContain('confidential');
    expect(json).not.toContain('private student response');
    expect(json).not.toContain('Private teacher grouping');
    expect(json).not.toContain('GV private script');
    expect(json).not.toContain('uid-456');
    expect(json).not.toContain('someOtherPrivateField');
  });

  it('does not mutate original routeCounts object', () => {
    const routeCounts = { M: 1, S: 2, C: 3 };
    buildPublicTvState({ ...BASE_INPUT, routeCounts });
    expect(routeCounts).toEqual({ M: 1, S: 2, C: 3 });
  });

  it('does not mutate original groupProgress object', () => {
    const groupProgress = { G1: 0.5 };
    buildPublicTvState({ ...BASE_INPUT, groupProgress });
    expect(groupProgress).toEqual({ G1: 0.5 });
  });

  it('isPrivateFieldLeaked catches all private field patterns', () => {
    expect(isPrivateFieldLeaked('{"name":"Test"}')).not.toBeNull();
    expect(isPrivateFieldLeaked('{"studentId":"x"}')).not.toBeNull();
    expect(isPrivateFieldLeaked('{"languageSupportPlan":"x"}')).not.toBeNull();
    expect(isPrivateFieldLeaked('{"rawText":"x"}')).not.toBeNull();
    expect(isPrivateFieldLeaked('{"privateReason":"x"}')).not.toBeNull();
    expect(isPrivateFieldLeaked('{"teacherScript":"x"}')).not.toBeNull();
    expect(isPrivateFieldLeaked('{"participantUid":"x"}')).not.toBeNull();
  });

  it('isPrivateFieldLeaked returns null for clean public output', () => {
    const clean = JSON.stringify({
      cueId: 'P16',
      screenId: 'S4',
      status: 'running',
      showStats: true,
      participantCount: 10,
      submittedCount: 5,
      routeCounts: { M: 2, S: 3, C: 0 },
      errorCategoryCounts: { Conceptual: 1, Algebraic: 0, Logical: 4, 'Missing condition': 0 },
      updatedAt: 1000,
    });
    expect(isPrivateFieldLeaked(clean)).toBeNull();
  });
});
