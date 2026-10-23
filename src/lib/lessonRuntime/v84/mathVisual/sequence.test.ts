import { describe, expect, it } from 'vitest';
import { sequenceRows, sequenceTerm, validateSequenceInvariants } from './sequence';

describe('deterministic sequence model', () => {
  it('maps index to arithmetic term and preserves the recurrence', () => {
    const model = { family: 'arithmetic' as const, firstIndex: 1, firstTerm: 18, difference: 2, count: 6 };
    expect(sequenceTerm(model, 1)).toBe(18);
    expect(sequenceTerm(model, 25)).toBe(66);
    expect(sequenceRows(model)).toEqual([
      { index: 1, value: 18 }, { index: 2, value: 20 }, { index: 3, value: 22 },
      { index: 4, value: 24 }, { index: 5, value: 26 }, { index: 6, value: 28 },
    ]);
    expect(validateSequenceInvariants(model)).toEqual([]);
  });

  it('maps index to geometric term without changing the first index', () => {
    const model = { family: 'geometric' as const, firstIndex: 0, firstTerm: 3, ratio: 2, count: 4 };
    expect(sequenceRows(model)).toEqual([
      { index: 0, value: 3 }, { index: 1, value: 6 },
      { index: 2, value: 12 }, { index: 3, value: 24 },
    ]);
    expect(sequenceTerm(model, 5)).toBe(96);
    expect(validateSequenceInvariants(model)).toEqual([]);
  });

  it('rejects impossible domains instead of rendering misleading data', () => {
    expect(() => sequenceRows({ family: 'arithmetic', firstIndex: 1, firstTerm: 1,
      difference: Number.NaN, count: 5 })).toThrow('SEQUENCE_MODEL_INVALID');
    expect(() => sequenceTerm({ family: 'geometric', firstIndex: 1, firstTerm: 1,
      ratio: 2, count: 5 }, 0)).toThrow('SEQUENCE_INDEX_OUT_OF_DOMAIN');
  });
});
