export const numberLatex = (value: number, locale: 'vi' | 'en' | 'ja' = 'en'): string => {
  if (!Number.isFinite(value)) throw new Error('TRIG_NUMBER_INVALID');
  const [coefficient, exponent] = String(value).split('e');
  const decimal = locale === 'vi' ? coefficient.replace('.', '{,}') : coefficient;
  return exponent === undefined ? decimal : `${decimal}\\cdot 10^{${Number(exponent)}}`;
};

export const angleLatex = (angle: number, locale: 'vi' | 'en' | 'ja' = 'en'): string => {
  if (angle === 0) return '0';
  for (let denominator = 1; denominator <= 12; denominator++) {
    const numerator = Math.round(angle / Math.PI * denominator);
    const candidate = numerator * Math.PI / denominator;
    if (numerator && Math.abs(angle - candidate) <= 4 * Number.EPSILON * Math.max(1, Math.abs(angle))) {
      const sign = numerator < 0 ? '-' : '';
      const top = `${Math.abs(numerator) === 1 ? '' : Math.abs(numerator)}\\pi`;
      return denominator === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${denominator}}`;
    }
  }
  return numberLatex(angle, locale);
};
