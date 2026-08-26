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

  it('preserves value type when tie-breaking otherwise identical responses', () => {
    const numeric = response({ id: 'same', clientNonce: 'same', value: 1 });
    const string = response({ id: 'same', clientNonce: 'same', value: '1' });

    expect(mergeLatestResponse([numeric, string]))
      .toEqual(mergeLatestResponse([string, numeric]));
    expect(mergeLatestResponse([numeric, string])).toEqual([string]);
  });

  it('distinguishes NaN and Infinity in the value tie-break', () => {
    const nan = response({ id: 'same', clientNonce: 'same', value: Number.NaN });
    const infinite = response({ id: 'same', clientNonce: 'same', value: Number.POSITIVE_INFINITY });

    expect(mergeLatestResponse([nan, infinite]))
      .toEqual(mergeLatestResponse([infinite, nan]));
    expect(mergeLatestResponse([nan, infinite])).toEqual([nan]);
  });

  it('totalizes NaN versus Infinity updatedAt tie-breaking regardless of input order', () => {
    const nan = response({ id: 'same', clientNonce: 'same', updatedAt: Number.NaN });
    const infinite = response({ id: 'same', clientNonce: 'same', updatedAt: Number.POSITIVE_INFINITY });

    expect(mergeLatestResponse([nan, infinite]))
      .toEqual(mergeLatestResponse([infinite, nan]));
    expect(mergeLatestResponse([nan, infinite])).toEqual([nan]);
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
      response({ participantUid: 'raw-choice', value: 'this is raw choice text' }),
      response({ participantUid: 'student-choice', value: 'student-12345' }),
      response({ participantUid: 'text', responseType: 'text', value: 'secret text' }),
      response({ participantUid: 'exit', responseType: 'exit_ticket', value: 'private exit' }),
      response({ participantUid: 'hint', responseType: 'hint', value: 'used' }),
    ], 'warmup');

    expect(result.choiceCounts).toEqual({ Yes: 1, true: 1 });
    expect(result.hintUseCount).toBe(1);
    expect(result.participantCount).toBe(7);
    expect(result.submittedCount).toBe(7);
    expect(JSON.stringify(result)).not.toContain('secret text');
    expect(JSON.stringify(result)).not.toContain('private exit');
    expect(JSON.stringify(result)).not.toContain('u-a');
  });

  it('ignores identifier-like and prototype choice keys during aggregation', () => {
    const result = aggregateLiveResponses([
      response({ participantUid: 'hs', value: 'HS001' }),
      response({ participantUid: 'constructor', value: 'constructor' }),
      response({ participantUid: 'to-string', value: 'toString' }),
      response({ participantUid: 'is-prototype-of', value: 'isPrototypeOf' }),
      response({ participantUid: 'property-is-enumerable', value: 'propertyIsEnumerable' }),
      response({ participantUid: 'to-locale-string', value: 'toLocaleString' }),
      response({ participantUid: 'alice', value: 'Alice' }),
      response({ participantUid: 'mssv', value: 'MSSV2026001' }),
      response({ participantUid: 'safe-a', value: 'A' }),
      response({ participantUid: 'safe-g1', value: 'G1' }),
      response({ participantUid: 'safe-yes', value: 'Yes' }),
      response({ participantUid: 'safe-true', responseType: 'boolean', value: true }),
    ], 'warmup');

    expect(result.choiceCounts).toEqual({ A: 1, G1: 1, Yes: 1, true: 1 });
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

  it('counts the safe third THINK choice without exposing personal responses', () => {
    const result = aggregateLiveResponses([
      response({ stepId: 'ai-think-w01', value: 'Unsure' }),
      response({ stepId: 'ai-think-w01', participantUid: 'private-student', value: 'private answer' }),
    ], 'ai-think-w01');

    expect(result.choiceCounts).toEqual({ Unsure: 1 });
    expect(JSON.stringify(result)).not.toContain('private-student');
    expect(JSON.stringify(result)).not.toContain('private answer');
  });
});

describe('toPublicStats', () => {
  it('explicitly projects only public fields and defensively copies maps', () => {
    const malformed = {
      stepId: 'warmup',
      participantCount: 2,
      submittedCount: 2,
      choiceCounts: {
        Yes: 2,
        B: 1,
        G1: 3,
        HS001: 4,
        constructor: 5,
        toString: 6,
        MSSV2026001: 7,
        isPrototypeOf: 8,
        propertyIsEnumerable: 9,
        toLocaleString: 10,
        Alice: 11,
        'raw free text': 8,
        'student-12345': 9,
        participantUid: 10,
      },
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
      choiceCounts: { Yes: 2, B: 1, G1: 3 },
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
