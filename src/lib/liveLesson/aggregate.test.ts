import { describe, expect, it } from 'vitest';
import {
  aggregateLiveResponses,
  mergeLatestResponse,
  toPublicStats,
} from './aggregate';
import type { LivePublicStats, LiveResponse } from './types';

const response = (overrides: Partial<LiveResponse> = {}): LiveResponse => ({
  id: 'response-1',
  participantUid: 'u-a',
  classId: 'class-1',
  stepId: 'warmup',
  responseType: 'choice',
  value: 'A',
  clientNonce: 'nonce-1',
  submittedAt: 100,
  updatedAt: 100,
  ...overrides,
});

describe('mergeLatestResponse', () => {
  it('keeps the newest route response per participant and step without mutating input', () => {
    const responses = [
      response({ participantUid: 'u-a', responseType: 'route', value: 'M' }),
      response({ participantUid: 'u-b', responseType: 'route', value: 'S' }),
      response({ participantUid: 'u-c', responseType: 'route', value: 'S' }),
    ];
    const snapshot = structuredClone(responses);

    const result = aggregateLiveResponses(responses, 'warmup');

    expect(result).toEqual({
      stepId: 'warmup',
      participantCount: 3,
      submittedCount: 3,
      choiceCounts: {},
      routeCounts: { M: 1, S: 2, C: 0 },
      errorCategoryCounts: {
        Conceptual: 0,
        Algebraic: 0,
        Logical: 0,
        'Missing condition': 0,
      },
      hintUseCount: 0,
      updatedAt: 100,
    });
    expect(JSON.stringify(result)).not.toContain('u-a');
    expect(responses).toEqual(snapshot);
  });

  it('selects the latest response and counts only the selected error category', () => {
    const oldResponse = response({
      id: 'old',
      stepId: 'ai-error-w01',
      responseType: 'text',
      value: 'Logical',
      updatedAt: 100,
    });
    const newResponse = response({
      id: 'new',
      stepId: 'ai-error-w01',
      responseType: 'text',
      value: 'Missing condition',
      updatedAt: 200,
    });

    expect(aggregateLiveResponses([oldResponse, newResponse], 'ai-error-w01')).toMatchObject({
      participantCount: 1,
      submittedCount: 1,
      errorCategoryCounts: {
        Conceptual: 0,
        Algebraic: 0,
        Logical: 0,
        'Missing condition': 1,
      },
      updatedAt: 200,
    });
  });

  it('uses a deterministic tie-break for identical retries regardless of input order', () => {
    const first = response({ id: 'a', clientNonce: 'z', value: 'first' });
    const second = response({ id: 'b', clientNonce: 'a', value: 'second' });

    expect(mergeLatestResponse([first, second])).toEqual(mergeLatestResponse([second, first]));
    expect(mergeLatestResponse([first, second])).toEqual([second]);
  });

  it('uses later tie-break fields when both updatedAt values are non-finite', () => {
    const first = response({ id: 'a', updatedAt: Number.NaN, submittedAt: 100 });
    const second = response({ id: 'b', updatedAt: Number.NaN, submittedAt: 100 });

    expect(mergeLatestResponse([first, second]).map(({ id }) => id))
      .toEqual(mergeLatestResponse([second, first]).map(({ id }) => id));
    expect(mergeLatestResponse([first, second])).toEqual([second]);
  });
});

describe('aggregateLiveResponses', () => {
  it('initializes zero categories and isolates the requested step', () => {
    const result = aggregateLiveResponses([
      response({ stepId: 'other-step', updatedAt: 999 }),
    ], 'warmup');

    expect(result).toEqual({
      stepId: 'warmup',
      participantCount: 0,
      submittedCount: 0,
      choiceCounts: {},
      routeCounts: { M: 0, S: 0, C: 0 },
      errorCategoryCounts: {
        Conceptual: 0,
        Algebraic: 0,
        Logical: 0,
        'Missing condition': 0,
      },
      hintUseCount: 0,
      updatedAt: 0,
    });
  });

  it('counts choices, booleans, hints, and ignores raw text or exit tickets', () => {
    const result = aggregateLiveResponses([
      response({ participantUid: 'choice', value: 'Yes' }),
      response({ participantUid: 'boolean', responseType: 'boolean', value: true }),
      response({ participantUid: 'text', responseType: 'text', value: 'secret text' }),
      response({ participantUid: 'exit', responseType: 'exit_ticket', value: 'private exit' }),
      response({ participantUid: 'hint', responseType: 'hint', value: 'used' }),
    ], 'warmup');

    expect(result.choiceCounts).toEqual({ Yes: 1, true: 1 });
    expect(result.hintUseCount).toBe(1);
    expect(result.participantCount).toBe(5);
    expect(result.submittedCount).toBe(5);
    expect(JSON.stringify(result)).not.toContain('secret text');
    expect(JSON.stringify(result)).not.toContain('private exit');
    expect(JSON.stringify(result)).not.toContain('u-a');
  });

  it('counts ai-error categories without exposing the category as a choice value', () => {
    const result = aggregateLiveResponses([
      response({
        stepId: 'ai-error-w01',
        responseType: 'choice',
        value: 'Conceptual',
      }),
    ], 'ai-error-w01');

    expect(result.errorCategoryCounts).toEqual({
      Conceptual: 1,
      Algebraic: 0,
      Logical: 0,
      'Missing condition': 0,
    });
    expect(result.choiceCounts).toEqual({});
  });
});

describe('toPublicStats', () => {
  it('explicitly projects only public fields and defensively copies maps', () => {
    const malformed = {
      stepId: 'warmup',
      participantCount: 2,
      submittedCount: 2,
      choiceCounts: { Yes: 2 },
      routeCounts: { M: 1, S: 0, C: 1, privateRoute: 8 },
      errorCategoryCounts: {
        Conceptual: 1,
        Algebraic: 0,
        Logical: 0,
        'Missing condition': 1,
        secret: 5,
      },
      hintUseCount: 1,
      updatedAt: 123,
      responses: [{ participantUid: 'u-secret', value: 'raw' }],
      responseCount: 99,
      lastUpdatedAt: 999,
      showStats: true,
    } as unknown as LivePublicStats;

    const result = toPublicStats(malformed) as LivePublicStats & Record<string, unknown>;

    expect(result).toEqual({
      stepId: 'warmup',
      participantCount: 2,
      submittedCount: 2,
      choiceCounts: { Yes: 2 },
      routeCounts: { M: 1, S: 0, C: 1 },
      errorCategoryCounts: {
        Conceptual: 1,
        Algebraic: 0,
        Logical: 0,
        'Missing condition': 1,
      },
      hintUseCount: 1,
      updatedAt: 123,
    });
    expect(Object.keys(result).sort()).toEqual([
      'choiceCounts',
      'errorCategoryCounts',
      'hintUseCount',
      'participantCount',
      'routeCounts',
      'stepId',
      'submittedCount',
      'updatedAt',
    ]);
  });
});
