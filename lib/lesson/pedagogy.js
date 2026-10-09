// ponytail: compares literal numeric tokens, not mathematical equivalence; adapted data need teacher review.
const numbers = text => new Set((String(text || '').replace(/[−–]/g, '-').replace(/\bT(?:10|11|12)\.\d+\b/g, '').match(/-?\d+(?:[.,]\d+)?/g) || []).map(value => String(Number(value.replace(',', '.')))));
export function sourceNumericDrift(task, quote) {
  const labels = ['options', 'representations', 'cards'].flatMap(key => (Array.isArray(task.inputSchema?.[key]) ? task.inputSchema[key] : []).map(item => item?.label || ''));
  const sourceNumbers = numbers(quote);
  return [...numbers([task.prompt, ...labels].join(' '))].some(value => !sourceNumbers.has(value));
}
