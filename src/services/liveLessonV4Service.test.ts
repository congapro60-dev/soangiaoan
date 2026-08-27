import { describe, expect, it } from 'vitest';
import {
  evidenceId,
  evidencePath,
  groupPath,
  groupProposalsPath,
  groupStudentPath,
  isEvidenceDocument,
  isGroupDocument,
  isGroupProposalDocument,
  isPublicStatsDocument,
  isPublicTvStateDocument,
  publicStatePath,
  publicStatsPath,
  responseId,
  responsePath,
  sanitizeChoiceCounts,
  sanitizeErrorCategoryCounts,
  sanitizeRouteCounts,
  sessionPath,
  buildEmptyChoiceCounts,
  buildEmptyErrorCategoryCounts,
  buildEmptyRouteCounts,
  VALID_CHOICE_KEYS,
  VALID_ERROR_CATEGORIES,
  VALID_ROUTES,
} from '../lib/liveLesson/v4/firestoreContracts';

describe('liveLessonV4Service · doc path contracts match rules', () => {
  it('session path is liveLessonSessions/{sessionId}', () => {
    expect(sessionPath('abc')).toBe('liveLessonSessions/abc');
  });

  it('response path is liveLessonSessions/{sessionId}/responses/{responseId}', () => {
    expect(responsePath('s1', 'r1')).toBe('liveLessonSessions/s1/responses/r1');
  });

  it('response id is participantUid__stepId', () => {
    expect(responseId('stu-1', 'warmup')).toBe('stu-1__warmup');
    expect(responseId('stu-2', 'ai-error-w01')).toBe('stu-2__ai-error-w01');
  });

  it('evidence path is liveLessonSessions/{sessionId}/evidence/{evidenceId}', () => {
    expect(evidencePath('s1', 'e1')).toBe('liveLessonSessions/s1/evidence/e1');
  });

  it('evidence id is studentId__stepId', () => {
    expect(evidenceId('stu-1', 'model')).toBe('stu-1__model');
  });

  it('groupProposals path is liveLessonSessions/{sessionId}/groupProposals/current', () => {
    expect(groupProposalsPath('s1')).toBe('liveLessonSessions/s1/groupProposals/current');
  });

  it('group path is liveLessonSessions/{sessionId}/groups/{groupId}', () => {
    expect(groupPath('s1', 'g1')).toBe('liveLessonSessions/s1/groups/g1');
  });

  it('group student path is liveLessonSessions/{sessionId}/groups/{groupId}/students/{studentId}', () => {
    expect(groupStudentPath('s1', 'g1', 'stu-1')).toBe('liveLessonSessions/s1/groups/g1/students/stu-1');
  });

  it('public state/stats paths are under liveLessonSessions/{sessionId}/public/', () => {
    expect(publicStatePath('s1')).toBe('liveLessonSessions/s1/public/state');
    expect(publicStatsPath('s1')).toBe('liveLessonSessions/s1/public/stats');
  });
});

describe('liveLessonV4Service · evidence shape guard', () => {
  it('accepts valid evidence', () => {
    expect(isEvidenceDocument({
      studentId: 'stu-1',
      stepId: 'warmup',
      confidence: 0.5,
      signal: 'choice_correct',
      privateReason: 'reason',
      createdAt: 1000,
      updatedAt: 2000,
    })).toBe(true);
  });

  it('accepts boundary confidence values', () => {
    expect(isEvidenceDocument({
      studentId: 's', stepId: 's', confidence: 0,
      signal: 'x', privateReason: '', createdAt: 0, updatedAt: 0,
    })).toBe(true);
    expect(isEvidenceDocument({
      studentId: 's', stepId: 's', confidence: 1,
      signal: 'x', privateReason: '', createdAt: 0, updatedAt: 0,
    })).toBe(true);
  });

  it('rejects out-of-range confidence', () => {
    expect(isEvidenceDocument({
      studentId: 's', stepId: 's', confidence: -0.1,
      signal: 'x', privateReason: '', createdAt: 0, updatedAt: 0,
    })).toBe(false);
    expect(isEvidenceDocument({
      studentId: 's', stepId: 's', confidence: 1.1,
      signal: 'x', privateReason: '', createdAt: 0, updatedAt: 0,
    })).toBe(false);
  });
});

describe('liveLessonV4Service · group proposal shape guard', () => {
  it('accepts valid proposal with items', () => {
    expect(isGroupProposalDocument({
      proposals: [{
        groupId: 'g1', purpose: 'same_need_workshop',
        memberIds: ['s1', 's2'], scaffold: 'card',
        reason: 'emerging', checkpointId: 'cp-1',
      }],
      updatedAt: 1000,
    })).toBe(true);
  });

  it('accepts empty proposals list', () => {
    expect(isGroupProposalDocument({ proposals: [], updatedAt: 1000 })).toBe(true);
  });

  it('rejects > 10 proposals', () => {
    const many = Array.from({ length: 11 }, () => ({
      groupId: 'g', purpose: 'p', memberIds: [],
      scaffold: '', reason: '', checkpointId: '',
    }));
    expect(isGroupProposalDocument({ proposals: many, updatedAt: 1000 })).toBe(false);
  });

  it('rejects proposal with missing required fields', () => {
    expect(isGroupProposalDocument({
      proposals: [{ groupId: 'g1', memberIds: [] }],
      updatedAt: 1000,
    })).toBe(false);
  });
});

describe('liveLessonV4Service · group document shape guard', () => {
  it('accepts valid group', () => {
    expect(isGroupDocument({
      groupId: 'g1', memberIds: ['s1'],
      scaffold: 'scaffold', startedAt: 1000, updatedAt: 2000,
    })).toBe(true);
  });

  it('rejects group with non-string groupId', () => {
    expect(isGroupDocument({
      groupId: 123, memberIds: ['s1'],
      scaffold: '', startedAt: 1, updatedAt: 2,
    })).toBe(false);
  });

  it('rejects group with memberIds > 12', () => {
    expect(isGroupDocument({
      groupId: 'g1', memberIds: Array.from({ length: 13 }, (_, i) => `s${i}`),
      scaffold: '', startedAt: 1, updatedAt: 2,
    })).toBe(false);
  });
});

describe('liveLessonV4Service · public TV state shape guard', () => {
  it('accepts all valid statuses', () => {
    for (const status of ['lobby', 'running', 'paused', 'closed']) {
      expect(isPublicTvStateDocument({
        cueId: 'c1', tvScreenId: 'tv1', status,
        showStats: true, updatedAt: 1000,
      })).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    expect(isPublicTvStateDocument({
      cueId: 'c1', tvScreenId: 'tv1', status: 'invalid',
      showStats: true, updatedAt: 1000,
    })).toBe(false);
  });
});

describe('liveLessonV4Service · public stats shape guard', () => {
  it('accepts valid stats', () => {
    expect(isPublicStatsDocument({
      stepId: 'warmup', participantCount: 10, submittedCount: 8,
      choiceCounts: { A: 3 }, routeCounts: { M: 5, S: 2, C: 1 },
      errorCategoryCounts: { Conceptual: 2, Algebraic: 1, Logical: 3, 'Missing condition': 2 },
      hintUseCount: 0, updatedAt: 1000,
    })).toBe(true);
  });

  it('rejects missing stepId', () => {
    expect(isPublicStatsDocument({
      stepId: '', participantCount: 10, submittedCount: 8,
      choiceCounts: {}, routeCounts: {}, errorCategoryCounts: {},
      hintUseCount: 0, updatedAt: 1000,
    })).toBe(false);
  });
});

describe('liveLessonV4Service · stat sanitizers match rules allowlist', () => {
  it('sanitizeChoiceCounts only keeps VALID_CHOICE_KEYS', () => {
    const result = sanitizeChoiceCounts({ A: 1, PII: 5, x: 2.7, NaN: NaN });
    expect(Object.keys(result).sort()).toEqual(['A', 'x']);
    expect(result.A).toBe(1);
    expect(result.x).toBe(2);
  });

  it('sanitizeRouteCounts only keeps M/S/C', () => {
    const result = sanitizeRouteCounts({ M: 3, S: 1, C: 2, X: 5 });
    expect(Object.keys(result).sort()).toEqual(['C', 'M', 'S']);
  });

  it('sanitizeErrorCategoryCounts only keeps 4 categories', () => {
    const result = sanitizeErrorCategoryCounts({
      Conceptual: 5, Algebraic: 0, Logical: 3, 'Missing condition': 2, PII: 10,
    });
    expect(Object.keys(result).sort()).toEqual([...VALID_ERROR_CATEGORIES].sort());
  });

  it('all empty stat builders match rules allowlist', () => {
    const choice = buildEmptyChoiceCounts();
    expect(Object.keys(choice).sort()).toEqual([...VALID_CHOICE_KEYS].sort());
    const route = buildEmptyRouteCounts();
    expect(Object.keys(route).sort()).toEqual([...VALID_ROUTES].sort());
    const error = buildEmptyErrorCategoryCounts();
    expect(Object.keys(error).sort()).toEqual([...VALID_ERROR_CATEGORIES].sort());
  });
});
