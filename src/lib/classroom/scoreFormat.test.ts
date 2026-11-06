import { describe, expect, it } from 'vitest';
import { formatScore, roundScore } from './scoreFormat';

describe('làm tròn điểm', () => {
  it('bỏ sai số số thực nhưng giữ điểm lẻ thầy cô cho', () => {
    expect(formatScore(9.129999999999999)).toBe('9.13');
    expect(formatScore(9.169999999999998)).toBe('9.17');
    expect(formatScore(9.999999999999998)).toBe('10');
    expect(formatScore(4.85)).toBe('4.85');
    expect(formatScore(3.25)).toBe('3.25');
    expect(formatScore(10)).toBe('10');
    expect(roundScore(0.1 + 0.2)).toBe(0.3);
  });

  it('không phải số thì trả rỗng, không in NaN', () => {
    expect(formatScore(undefined)).toBe('');
    expect(formatScore(NaN)).toBe('');
    expect(formatScore('9.1')).toBe('');
  });
});
