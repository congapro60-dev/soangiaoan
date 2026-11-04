import { describe, expect, it } from 'vitest';
import { angleLatex, numberLatex } from './trigNotation';

describe('trig visual mathematical notation', () => {
  it('keeps powers of ten mathematical rather than rendering an e variable', () => {
    expect(numberLatex(1e-7)).toBe('1\\cdot 10^{-7}');
    expect(numberLatex(-2.5e-8, 'vi')).toBe('-2{,}5\\cdot 10^{-8}');
    expect(numberLatex(0.5, 'vi')).toBe('0{,}5');
  });
  it('writes simple pi-rational interval bounds exactly without rounding arbitrary bounds', () => {
    expect(angleLatex(2 * Math.PI)).toBe('2\\pi');
    expect(angleLatex(-Math.PI / 6)).toBe('-\\frac{\\pi}{6}');
    expect(angleLatex(0)).toBe('0');
    expect(angleLatex(0.123456789)).toBe('0.123456789');
  });
});
