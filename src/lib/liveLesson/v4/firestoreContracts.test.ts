import { describe, expect, it } from 'vitest';
import {
  buildEmptyChoiceCounts,
  buildEmptyErrorCategoryCounts,
  buildEmptyRouteCounts,
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
  VALID_CHOICE_KEYS,
  VALID_ERROR_CATEGORIES,
  VALID_ROUTES,
} from './firestoreContracts';

describe('firestoreContracts · path builders', () => {
  it('builds session path', () => {
    expect(sessionPath('s1')).toBe('liveLessonSessions/s1');
  });

  it('builds response path', () => {
    expect(responsePath('s1', 'r1')).toBe('liveLessonSessions/s1/responses/r1');
  });

  it('builds response id from participant and step', () => {
    expect(responseId('stu-1', 'warmup')).toBe('stu-1__warmup');
  });

  it('builds evidence path', () => {
    expect(evidencePath('s1', 'e1')).toBe('liveLessonSessions/s1/evidence/e1');
  });

  it('builds evidence id from student and step', () => {
    expect(evidenceId('stu-1', 'model')).toBe('stu-1__model');
  });

  it('builds groupProposals path', () => {
    expect(groupProposalsPath('s1')).toBe('liveLessonSessions/s1/groupProposals/current');
  });

  it('builds group path', () => {
    expect(groupPath('s1', 'g1')).toBe('liveLessonSessions/s1/groups/g1');
  });

  it('builds group student path', () => {
    expect(groupStudentPath('s1', 'g1', 'stu-1')).toBe('liveLessonSessions/s1/groups/g1/students/stu-1');
  });

  it('builds public state and stats paths', () => {
    expect(publicStatePath('s1')).toBe('liveLessonSessions/s1/public/state');
    expect(publicStatsPath('s1')).toBe('liveLessonSessions/s1/public/stats');
  });
});

describe('firestoreContracts · shape guards', () => {
  it('isEvidenceDocument validates correct shape', () => {
    expect(isEvidenceDocument({
      studentId: 'stu-1',
      stepId: 'warmup',
      confidence: 0.8,
      signal: 'choice_correct',
      privateReason: 'Identified boundary',
      createdAt: 1000,
      updatedAt: 2000,
    })).toBe(true);
  });

  it('isEvidenceDocument rejects missing fields', () => {
    expect(isEvidenceDocument({ studentId: 'stu-1' })).toBe(false);
    expect(isEvidenceDocument(null)).toBe(false);
    expect(isEvidenceDocument({})).toBe(false);
  });

  it('isEvidenceDocument rejects invalid confidence', () => {
    expect(isEvidenceDocument({
      studentId: 'stu-1', stepId: 'warmup', confidence: 2,
      signal: 'x', privateReason: '', createdAt: 1, updatedAt: 1,
    })).toBe(false);
  });

  it('isGroupProposalDocument validates correct shape', () => {
    expect(isGroupProposalDocument({
      proposals: [{
        groupId: 'g1', purpose: 'same_need_workshop',
        memberIds: ['s1', 's2'], scaffold: 'scaffold text',
        reason: 'emerging evidence', checkpointId: 'cp-1',
      }],
      updatedAt: 1000,
    })).toBe(true);
  });

  it('isGroupProposalDocument rejects empty proposals', () => {
    expect(isGroupProposalDocument({ proposals: [], updatedAt: 1000 })).toBe(true);
  });

  it('isGroupProposalDocument rejects too many proposals', () => {
    expect(isGroupProposalDocument({
      proposals: Array.from({ length: 11 }, () => ({
        groupId: 'g', purpose: 'p', memberIds: [], scaffold: '', reason: '', checkpointId: '',
      })),
      updatedAt: 1000,
    })).toBe(false);
  });

  it('isGroupDocument validates correct shape', () => {
    expect(isGroupDocument({
      groupId: 'g1', memberIds: ['s1'], scaffold: 'scaffold',
      startedAt: 1000, updatedAt: 2000,
    })).toBe(true);
  });

  it('isGroupDocument rejects non-array memberIds', () => {
    expect(isGroupDocument({
      groupId: 'g1', memberIds: 'not-array', scaffold: '',
      startedAt: 1, updatedAt: 2,
    })).toBe(false);
  });

  it('isPublicTvStateDocument validates correct shape', () => {
    expect(isPublicTvStateDocument({
      cueId: 'c1', tvScreenId: 'tv1', status: 'running',
      showStats: true, updatedAt: 1000,
    })).toBe(true);
  });

  it('isPublicTvStateDocument rejects invalid status', () => {
    expect(isPublicTvStateDocument({
      cueId: 'c1', tvScreenId: 'tv1', status: 'invalid',
      showStats: true, updatedAt: 1000,
    })).toBe(false);
  });

  it('isPublicStatsDocument validates correct shape', () => {
    expect(isPublicStatsDocument({
      stepId: 'warmup', participantCount: 10, submittedCount: 8,
      choiceCounts: {}, routeCounts: { M: 1, S: 0, C: 0 },
      errorCategoryCounts: { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 },
      hintUseCount: 2, updatedAt: 1000,
    })).toBe(true);
  });

  it('isPublicStatsDocument rejects missing stepId', () => {
    expect(isPublicStatsDocument({
      stepId: '', participantCount: 10, submittedCount: 8,
      choiceCounts: {}, routeCounts: {}, errorCategoryCounts: {},
      hintUseCount: 0, updatedAt: 1000,
    })).toBe(false);
  });
});

describe('firestoreContracts · stat map builders', () => {
  it('buildEmptyChoiceCounts has all valid keys', () => {
    const counts = buildEmptyChoiceCounts();
    expect(Object.keys(counts).sort()).toEqual([...VALID_CHOICE_KEYS].sort());
    for (const value of Object.values(counts)) {
      expect(value).toBe(0);
    }
  });

  it('buildEmptyRouteCounts has M/S/C', () => {
    const counts = buildEmptyRouteCounts();
    expect(counts).toEqual({ M: 0, S: 0, C: 0 });
  });

  it('buildEmptyErrorCategoryCounts has all 4 categories', () => {
    const counts = buildEmptyErrorCategoryCounts();
    expect(Object.keys(counts).sort()).toEqual([...VALID_ERROR_CATEGORIES].sort());
  });

  it('sanitizeChoiceCounts keeps only valid keys and floors values', () => {
    const result = sanitizeChoiceCounts({ A: 3.7, B: -1, PII: 5, C: 10001 });
    expect(result).toEqual({ A: 3 });
    expect(result.B).toBeUndefined();
    expect(result.PII).toBeUndefined();
    expect(result.C).toBeUndefined();
  });

  it('sanitizeRouteCounts keeps only M/S/C and floors', () => {
    const result = sanitizeRouteCounts({ M: 2.5, S: -1, C: 0, X: 3 });
    expect(result).toEqual({ M: 2, S: 0, C: 0 });
  });

  it('sanitizeErrorCategoryCounts keeps only 4 categories', () => {
    const result = sanitizeErrorCategoryCounts({
      Conceptual: 5.9, Algebraic: 0, Logical: -1, 'Missing condition': 3, PII: 10,
    });
    expect(result).toEqual({ Conceptual: 5, Algebraic: 0, Logical: 0, 'Missing condition': 3 });
  });

  it('sanitizeChoiceCounts handles NaN and Infinity', () => {
    const result = sanitizeChoiceCounts({ A: NaN, B: Infinity, C: -Infinity });
    expect(result).toEqual({});
  });
});
