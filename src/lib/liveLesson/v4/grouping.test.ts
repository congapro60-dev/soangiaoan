import { describe, expect, it } from 'vitest';
import { proposeGroups } from './grouping';
import type { StudentEvidence } from './evidence';
import type { GroupingCheckpoint } from './types';

function makeStudent(
  id: string,
  points: StudentEvidence['vector']['points'],
  confidence = 0.5,
): StudentEvidence {
  return {
    participantUid: id,
    vector: {
      concept: 'emerging',
      procedure: 'not_observed',
      reasoning: 'not_observed',
      modeling: 'not_observed',
      languageAccess: 'not_observed',
      autonomyCollaboration: 'not_observed',
      points,
      confidence,
      freshestAt: Date.now(),
    },
  };
}

const CHECKPOINT: GroupingCheckpoint = {
  id: 'grp-1',
  stepId: 'P19',
  purpose: 'same_need_workshop',
  minGroupSize: 3,
  maxGroupSize: 4,
  sharedQuestion: 'Mô tả điều kiện.',
  rubric: ['Xác định đúng miền'],
  postCheckId: 'cp-postcheck',
};

function recentPoints(count: number, signals: string[] = ['correct_choice', 'text_response']): StudentEvidence['vector']['points'] {
  return Array.from({ length: count }, (_, i) => ({
    sourceStepId: `step-${i}`,
    observedAt: Date.now() - i * 1000,
    signal: signals[i % signals.length],
    confidence: 0.6,
    privateReason: `Point ${i}`,
  }));
}

describe('proposeGroups', () => {
  it('returns teacher_defined when fewer than 3 students', () => {
    const students = [
      makeStudent('s1', recentPoints(2)),
      makeStudent('s2', recentPoints(2)),
    ];
    const result = proposeGroups({ checkpoint: CHECKPOINT, students });
    expect(result).toHaveLength(1);
    expect(result[0].purpose).toBe('teacher_defined');
    expect(result[0].memberIds).toEqual(['s1', 's2']);
  });

  it('returns teacher_defined when insufficient evidence', () => {
    const students = [
      makeStudent('s1', []),
      makeStudent('s2', []),
      makeStudent('s3', []),
    ];
    const result = proposeGroups({ checkpoint: CHECKPOINT, students });
    expect(result).toHaveLength(1);
    expect(result[0].purpose).toBe('teacher_defined');
    expect(result[0].reason).toContain('cần ít nhất 2');
  });

  it('proposes same_need_workshop when enough evidence', () => {
    const students = [
      makeStudent('s1', recentPoints(2)),
      makeStudent('s2', recentPoints(2)),
      makeStudent('s3', recentPoints(2)),
      makeStudent('s4', recentPoints(2)),
    ];
    const result = proposeGroups({ checkpoint: CHECKPOINT, students });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].purpose).toBe('same_need_workshop');
    expect(result[0].memberIds).toHaveLength(4);
    // Students with avg confidence 0.6 are "enrichment" tier
    expect(result[0].scaffold).toContain('liên hệ hai biểu diễn');
  });

  it('proposes mixed_reasoning for that checkpoint purpose', () => {
    const mixedCheckpoint: GroupingCheckpoint = {
      ...CHECKPOINT,
      purpose: 'mixed_reasoning',
    };
    const students = [
      makeStudent('s1', recentPoints(2), 0.8),
      makeStudent('s2', recentPoints(2), 0.6),
      makeStudent('s3', recentPoints(2), 0.4),
      makeStudent('s4', recentPoints(2), 0.2),
    ];
    const result = proposeGroups({ checkpoint: mixedCheckpoint, students });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].purpose).toBe('mixed_reasoning');
  });

  it('accepts high-confidence teacher observation as sufficient evidence', () => {
    const students = [
      makeStudent('s1', [{ sourceStepId: 'P16', observedAt: Date.now(), signal: 'teacher_obs', confidence: 0.8, privateReason: 'GV nhận xét' }], 0.8),
      makeStudent('s2', []),
      makeStudent('s3', []),
    ];
    const result = proposeGroups({ checkpoint: CHECKPOINT, students });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].purpose).not.toBe('teacher_defined');
  });

  it('groups stay within 3-4 members', () => {
    const students = Array.from({ length: 10 }, (_, i) =>
      makeStudent(`s${i}`, recentPoints(3)),
    );
    const result = proposeGroups({ checkpoint: CHECKPOINT, students });
    for (const group of result) {
      expect(group.memberIds.length).toBeGreaterThanOrEqual(3);
      expect(group.memberIds.length).toBeLessThanOrEqual(4);
    }
  });

  it('no student repeats the same role across groups', () => {
    const mixedCheckpoint: GroupingCheckpoint = {
      ...CHECKPOINT,
      purpose: 'mixed_reasoning',
    };
    const students = Array.from({ length: 8 }, (_, i) =>
      makeStudent(`s${i}`, recentPoints(3)),
    );
    const result = proposeGroups({ checkpoint: mixedCheckpoint, students });
    const allIds = result.flatMap(g => g.memberIds);
    const uniqueIds = new Set(allIds);
    expect(allIds.length).toBe(uniqueIds.size);
  });

  it('output has no ability labels — only purpose, memberIds, scaffold', () => {
    const students = [
      makeStudent('s1', recentPoints(2)),
      makeStudent('s2', recentPoints(2)),
      makeStudent('s3', recentPoints(2)),
    ];
    const result = proposeGroups({ checkpoint: CHECKPOINT, students });
    for (const group of result) {
      expect(group).toHaveProperty('groupId');
      expect(group).toHaveProperty('purpose');
      expect(group).toHaveProperty('memberIds');
      expect(group).toHaveProperty('scaffold');
      expect(group).toHaveProperty('reason');
      // No ability label in purpose, scaffold, or reason
      expect(group.purpose).not.toMatch(/yếu|giỏi|weak|strong|ability/i);
      expect(group.scaffold).not.toMatch(/yếu|giỏi|weak|strong|ability/i);
      expect(group.reason).not.toMatch(/yếu|giỏi|weak|strong|ability/i);
    }
  });

  it('student repeating a role does not break grouping', () => {
    const existingRoles = new Map<string, string>([
      ['s1', 'explainer'],
      ['s2', 'explainer'],
    ]);
    const students = [
      makeStudent('s1', recentPoints(2)),
      makeStudent('s2', recentPoints(2)),
      makeStudent('s3', recentPoints(2)),
      makeStudent('s4', recentPoints(2)),
    ];
    const result = proposeGroups({ checkpoint: CHECKPOINT, students, existingRoles });
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

// --- Nhóm xoay tua tự động (Gate D mini, thầy duyệt 29/10) ---
import { isGroupDone, isGroupSlow, type LiveGroupCounters } from './grouping';

describe('Nhóm xoay tua tự động (Gate D mini)', () => {
  const counters = (members: Record<string, number>, submitted: Record<string, number>): LiveGroupCounters => ({ members, submitted });

  it('R1 — nhóm xong sớm: members > 0 và submitted ≥ members', () => {
    expect(isGroupDone(counters({ '3': 4 }, { '3': 4 }), '3')).toBe(true);
    expect(isGroupDone(counters({ '3': 4 }, { '3': 5 }), '3')).toBe(true);
  });

  it('R1 — nhóm chưa xong: thiếu thành viên gửi hoặc nhóm trống', () => {
    expect(isGroupDone(counters({ '3': 4 }, { '3': 2 }), '3')).toBe(false);
    expect(isGroupDone(counters({ '3': 0 }, { '3': 0 }), '3')).toBe(false);
    expect(isGroupDone(counters({}, { '3': 3 }), '3')).toBe(false);
  });

  it('R2 — nhóm chậm: quá 80% thời lượng và tỷ lệ gửi < 50%', () => {
    expect(isGroupSlow(counters({ '5': 4 }, { '5': 1 }), '5', 0.85)).toBe(true);
    expect(isGroupSlow(counters({ '5': 4 }, { '5': 1 }), '5', 0.7)).toBe(false);
    expect(isGroupSlow(counters({ '5': 4 }, { '5': 3 }), '5', 0.9)).toBe(false);
  });

  it('R2 — nhóm trống hoặc tỷ lệ ≥ 50% không báo chậm', () => {
    expect(isGroupSlow(counters({ '5': 0 }, { '5': 0 }), '5', 0.9)).toBe(false);
    expect(isGroupSlow(counters({ '5': 2 }, { '5': 2 }), '5', 0.9)).toBe(false);
  });

  it('R3 — hàm thuần không thay đổi counters (không tự di chuyển HS)', () => {
    const c = counters({ '2': 3 }, { '2': 1 });
    isGroupDone(c, '2');
    isGroupSlow(c, '2', 0.9);
    expect(c).toEqual(counters({ '2': 3 }, { '2': 1 }));
  });
});
