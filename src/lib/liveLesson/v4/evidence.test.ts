import { describe, expect, it } from 'vitest';
import { buildEvidenceVectors, deduplicateResponses } from './evidence';
import type { EvidenceRule } from './types';
import type { LiveResponse } from '../types';

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
  { id: 'er-concept', sourceStepId: 'P03', dimension: 'concept', minConfidence: 0.5 },
  { id: 'er-reason', sourceStepId: 'P16', dimension: 'reasoning', minConfidence: 0.6 },
];

const NOW = 100 + 60 * 1000; // 1 phút sau response (submittedAt=100) — fresh evidence

describe('deduplicateResponses', () => {
  it('keeps the latest response when nonce is duplicated', () => {
    const responses = [
      makeResponse({ id: 'r1', participantUid: 's1', stepId: 'P03', clientNonce: 'dup', submittedAt: 100, updatedAt: 100 }),
      makeResponse({ id: 'r2', participantUid: 's1', stepId: 'P03', clientNonce: 'dup', submittedAt: 200, updatedAt: 200 }),
    ];
    const result = deduplicateResponses(responses);
    expect(result).toHaveLength(1);
    expect(result[0].submittedAt).toBe(200);
  });

  it('rejects reversed response order', () => {
    const responses = [
      makeResponse({ id: 'r2', participantUid: 's1', stepId: 'P03', clientNonce: 'n2', submittedAt: 200, updatedAt: 200 }),
      makeResponse({ id: 'r1', participantUid: 's1', stepId: 'P03', clientNonce: 'n1', submittedAt: 100, updatedAt: 100 }),
    ];
    const result = deduplicateResponses(responses);
    expect(result).toHaveLength(1);
    expect(result[0].submittedAt).toBe(200);
  });

  it('keeps distinct nonces for different steps from same student', () => {
    const responses = [
      makeResponse({ id: 'r1', participantUid: 's1', stepId: 'P03', clientNonce: 'n1', submittedAt: 100, updatedAt: 100 }),
      makeResponse({ id: 'r2', participantUid: 's1', stepId: 'P16', clientNonce: 'n2', submittedAt: 200, updatedAt: 200 }),
    ];
    const result = deduplicateResponses(responses);
    expect(result).toHaveLength(2);
  });
});

describe('buildEvidenceVectors', () => {
  it('builds evidence vector with correct choice signal', () => {
    const responses = [
      makeResponse({ id: 'r1', participantUid: 's1', stepId: 'P03', responseType: 'choice', value: 'C', clientNonce: 'n1', submittedAt: NOW - 30_000, updatedAt: NOW - 30_000 }),
    ];
    const result = buildEvidenceVectors({ responses, evidenceRules: RULES, now: NOW });
    expect(result).toHaveLength(1);
    const { vector } = result[0];
    expect(vector.concept).toBe('emerging');
    expect(vector.points).toHaveLength(1);
    expect(vector.points[0].signal).toBe('correct_choice');
  });

  it('maps incorrect choice to lower confidence', () => {
    const responses = [
      makeResponse({ id: 'r1', participantUid: 's1', stepId: 'P03', responseType: 'choice', value: 'A', clientNonce: 'n1', submittedAt: NOW - 30_000, updatedAt: NOW - 30_000 }),
    ];
    const { vector } = buildEvidenceVectors({ responses, evidenceRules: RULES, now: NOW })[0];
    expect(vector.points[0].signal).toBe('incorrect_choice');
    expect(vector.points[0].confidence).toBeLessThan(0.55);
  });

  it('maps text response to reasoning dimension', () => {
    const responses = [
      makeResponse({ id: 'r1', participantUid: 's1', stepId: 'P16', responseType: 'text', value: 'Đáp án của em là 3', clientNonce: 'n1', submittedAt: NOW - 30_000, updatedAt: NOW - 30_000 }),
    ];
    const { vector } = buildEvidenceVectors({ responses, evidenceRules: RULES, now: NOW })[0];
    expect(vector.reasoning).toBe('emerging');
    expect(vector.points[0].signal).toBe('text_response');
  });

  it('stale evidence gets low confidence', () => {
    const staleTime = NOW - 15 * 60 * 1000; // 15 phút trước — stale
    const responses = [
      makeResponse({ id: 'r1', participantUid: 's1', stepId: 'P03', responseType: 'choice', value: 'C', clientNonce: 'n1', submittedAt: staleTime, updatedAt: staleTime }),
    ];
    const { vector } = buildEvidenceVectors({ responses, evidenceRules: RULES, now: NOW })[0];
    expect(vector.points[0].confidence).toBeLessThanOrEqual(0.3);
  });

  it('returns empty array when no responses exist', () => {
    const result = buildEvidenceVectors({ responses: [], evidenceRules: RULES, now: NOW });
    expect(result).toHaveLength(0);
  });

  it('language preference does NOT change concept score', () => {
    const base = buildEvidenceVectors({
      responses: [
        makeResponse({ id: 'r1', participantUid: 's1', stepId: 'P03', responseType: 'choice', value: 'C', clientNonce: 'n1', submittedAt: NOW - 30_000, updatedAt: NOW - 30_000 }),
      ],
      evidenceRules: RULES,
      now: NOW,
    })[0];
    const combined = buildEvidenceVectors({
      responses: [
        makeResponse({ id: 'r1', participantUid: 's1', stepId: 'P03', responseType: 'choice', value: 'C', clientNonce: 'n1', submittedAt: NOW - 30_000, updatedAt: NOW - 30_000 }),
        makeResponse({ id: 'r-lang', participantUid: 's1', stepId: 'lang-pref', responseType: 'choice', value: 'en', clientNonce: 'lang-n1', submittedAt: NOW - 29_000, updatedAt: NOW - 29_000 }),
      ],
      evidenceRules: RULES,
      now: NOW,
    })[0];
    expect(base.vector.concept).toBe('emerging');
    expect(combined.vector.concept).toBe('emerging');
  });

  it('handles route, hint, and boolean responses', () => {
    const responses = [
      makeResponse({ id: 'r1', participantUid: 's1', stepId: 'P03', responseType: 'route', value: 'M', clientNonce: 'n1', submittedAt: NOW - 30_000, updatedAt: NOW - 30_000 }),
      makeResponse({ id: 'r2', participantUid: 's1', stepId: 'P16', responseType: 'hint', value: 'hint-1', clientNonce: 'n2', submittedAt: NOW - 20_000, updatedAt: NOW - 20_000 }),
      makeResponse({ id: 'r3', participantUid: 's1', stepId: 'P03', responseType: 'boolean', value: true, clientNonce: 'n3', submittedAt: NOW - 15_000, updatedAt: NOW - 15_000 }),
    ];
    const { vector } = buildEvidenceVectors({ responses, evidenceRules: RULES, now: NOW })[0];
    // route+boolean at P03 (dedup: only latest kept = boolean), hint at P16
    expect(vector.points.length).toBeGreaterThanOrEqual(2);
    expect(vector.autonomyCollaboration).toBeDefined();
  });

  it('processes multiple students independently', () => {
    const responses = [
      makeResponse({ id: 'r1', participantUid: 's1', stepId: 'P03', responseType: 'choice', value: 'C', clientNonce: 'n1', submittedAt: NOW - 30_000, updatedAt: NOW - 30_000 }),
      makeResponse({ id: 'r2', participantUid: 's2', stepId: 'P03', responseType: 'choice', value: 'A', clientNonce: 'n2', submittedAt: NOW - 30_000, updatedAt: NOW - 30_000 }),
    ];
    const results = buildEvidenceVectors({ responses, evidenceRules: RULES, now: NOW });
    expect(results).toHaveLength(2);
    expect(results[0].vector.points[0].signal).toBe('correct_choice');
    expect(results[1].vector.points[0].signal).toBe('incorrect_choice');
  });
});
