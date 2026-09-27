import { describe, expect, it } from 'vitest';
import { buildGroupingProposals } from './liveLessonV4GroupingService';
import type { EvidenceRule, GroupingCheckpoint } from '../lib/liveLesson/v4/types';
import type { LiveResponse } from '../lib/liveLesson/types';

function makeResponse(
  overrides: Partial<LiveResponse> & { participantUid: string; stepId: string; id: string },
): LiveResponse {
  return {
    participantUid: overrides.participantUid,
    classId: 'class-1',
    responseType: 'choice',
    value: 'A',
    clientNonce: `nonce-${overrides.id}`,
    submittedAt: overrides.submittedAt ?? 1_000_000,
    updatedAt: overrides.updatedAt ?? overrides.submittedAt ?? 1_000_000,
    ...overrides,
  };
}

const RULES: EvidenceRule[] = [
  { id: 'er-1', sourceStepId: 'P03', dimension: 'concept', minConfidence: 0.5 },
  { id: 'er-2', sourceStepId: 'P16', dimension: 'reasoning', minConfidence: 0.6 },
];

const CHECKPOINTS: GroupingCheckpoint[] = [{
  id: 'grp-1',
  stepId: 'P19',
  purpose: 'same_need_workshop',
  minGroupSize: 3,
  maxGroupSize: 4,
  sharedQuestion: 'Mô tả điều kiện.',
  rubric: ['Xác định đúng miền'],
  postCheckId: 'cp-postcheck',
}];

const NOW = 1_000_000 + 60_000;

describe('buildGroupingProposals', () => {
  it('deduplicates responses before building evidence', () => {
    const responses = [
      makeResponse({ id: 'r1', participantUid: 's1', stepId: 'P03', clientNonce: 'dup', submittedAt: 100, updatedAt: 100 }),
      makeResponse({ id: 'r2', participantUid: 's1', stepId: 'P03', clientNonce: 'dup', submittedAt: 200, updatedAt: 200 }),
      makeResponse({ id: 'r3', participantUid: 's2', stepId: 'P03', clientNonce: 'n2', submittedAt: 100, updatedAt: 100 }),
      makeResponse({ id: 'r4', participantUid: 's3', stepId: 'P03', clientNonce: 'n3', submittedAt: 100, updatedAt: 100 }),
      makeResponse({ id: 'r5', participantUid: 's4', stepId: 'P03', clientNonce: 'n4', submittedAt: 100, updatedAt: 100 }),
    ];
    const result = buildGroupingProposals({ responses, evidenceRules: RULES, checkpoints: CHECKPOINTS, now: NOW });
    expect(result.evidence).toHaveLength(4);
  });

  it('returns teacher_defined when evidence is missing', () => {
    const responses = [
      makeResponse({ id: 'r1', participantUid: 's1', stepId: 'P03', clientNonce: 'n1', submittedAt: 100, updatedAt: 100 }),
      makeResponse({ id: 'r2', participantUid: 's2', stepId: 'P03', clientNonce: 'n2', submittedAt: 100, updatedAt: 100 }),
      makeResponse({ id: 'r3', participantUid: 's3', stepId: 'P03', clientNonce: 'n3', submittedAt: 100, updatedAt: 100 }),
    ];
    const result = buildGroupingProposals({
      responses,
      evidenceRules: RULES,
      checkpoints: CHECKPOINTS,
      now: NOW,
    });
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].purpose).toBe('teacher_defined');
  });

  it('produces proposals for each checkpoint', () => {
    const checkpoints: GroupingCheckpoint[] = [
      CHECKPOINTS[0],
      {
        id: 'grp-2',
        stepId: 'P27',
        purpose: 'mixed_reasoning',
        minGroupSize: 3,
        maxGroupSize: 4,
        sharedQuestion: 'Phản biện.',
        rubric: ['Giải thích vì sao'],
        postCheckId: 'cp-postcheck',
      },
    ];
    const responses = Array.from({ length: 6 }, (_, i) =>
      makeResponse({
        id: `r${i}`,
        participantUid: `s${i}`,
        stepId: 'P03',
        responseType: 'choice',
        value: 'C',
        clientNonce: `n${i}`,
        submittedAt: 100 + i,
        updatedAt: 100 + i,
      }),
    );
    const result = buildGroupingProposals({ responses, evidenceRules: RULES, checkpoints, now: NOW });
    expect(result.proposals.length).toBeGreaterThanOrEqual(2);
  });

  it('no Firestore writes — pure function', () => {
    const responses = [
      makeResponse({ id: 'r1', participantUid: 's1', stepId: 'P03', clientNonce: 'n1', submittedAt: 100, updatedAt: 100 }),
    ];
    // Should not throw — pure computation
    const result = buildGroupingProposals({ responses, evidenceRules: RULES, checkpoints: CHECKPOINTS, now: NOW });
    expect(result.evidence).toBeDefined();
    expect(result.proposals).toBeDefined();
  });
});
