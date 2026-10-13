// ponytail: compares literal numeric tokens, not mathematical equivalence; adapted data need teacher review.
// ponytail: four-plus integer items mean a list; decimal lists need semicolons, grouped thousands stay literal.
const integerLists = text => text.replace(/(?<![\d.,])-?\d+(?:\s*,\s*-?\d+){3,}(?!\d|[.,]\d)/g, list => /^-?\d{1,3}(?:,\s*\d{3}){3,}$/.test(list) ? list : list.replace(/,/g, ' '));
const numbers = text => new Set((integerLists(String(text || '').replace(/[−–]/g, '-').replace(/\bT(?:10|11|12)\.\d+\b/g, '')).match(/-?\d+(?:[.,]\d+)?/g) || []).map(value => String(Number(value.replace(',', '.')))));
export function sourceNumericDrift(task, quote) {
  const labels = ['options', 'representations', 'cards'].flatMap(key => (Array.isArray(task.inputSchema?.[key]) ? task.inputSchema[key] : []).map(item => item?.label || ''));
  const sourceNumbers = numbers(quote);
  return [...numbers([task.prompt, ...labels].join(' '))].some(value => !sourceNumbers.has(value));
}
