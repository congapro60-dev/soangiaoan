import type { QuestionRun } from './questionState.js';

export type PublicQuestionStats =
  | { kind: 'completion'; validResponses: number }
  | { kind: 'choice_distribution'; validResponses: number; choices: Array<{ id: string; count: number }> }
  | { kind: 'math_clusters'; validResponses: number; common: Array<{ answer: string; count: number }>; otherCount: number }
  | { kind: 'matrix_distribution'; validResponses: number; rows: Array<{
    id: string; trueCount: number; falseCount: number; unclassifiedCount: number }> };

const matrixTokens = (value: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(item => String(item));
  } catch { /* Plain classroom response below. */ }
  return value.split(/[,;\n|]+/).map(item => item.trim());
};
const truthValue = (value: string): boolean | null => {
  const normalized = value.trim().toLocaleLowerCase('vi');
  if (['đ', 'đúng', 'd', 't', 'true', '1'].includes(normalized)) return true;
  if (['s', 'sai', 'f', 'false', '0'].includes(normalized)) return false;
  return null;
};

export const finalizeQuestionStats = (run: QuestionRun, type: string, optionIds: readonly string[]): PublicQuestionStats => {
  const values = run.responseSet.map(studentId => run.responseValueByStudent[studentId]).filter((value): value is string => typeof value === 'string');
  if (type === 'mcq' || type === 'multi') {
    const choices = optionIds.map(id => ({
      id, count: values.filter(value => type === 'multi' ? value.split(',').map(item => item.trim()).includes(id) : value === id).length,
    }));
    return { kind: 'choice_distribution', validResponses: run.validResponses, choices };
  }
  if (type === 'math_input') {
    const counts = new Map<string, number>();
    for (const value of values) {
      const normalized = value.trim().replace(/\s+/g, ' ').slice(0, 160);
      if (!/^[+-]?\d{1,8}(?:[.,]\d{1,6})?(?:\/[1-9]\d{0,7})?$/.test(normalized)) continue;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
    const common = [...counts.entries()].filter(([, count]) => count >= 2)
      .sort((left, right) => right[1] - left[1]).slice(0, 5)
      .map(([answer, count]) => ({ answer, count }));
    return { kind: 'math_clusters', validResponses: run.validResponses,
      common, otherCount: run.validResponses - common.reduce((sum, item) => sum + item.count, 0) };
  }
  if (type === 'true_false_matrix' && optionIds.length > 0) {
    const tokens = values.map(matrixTokens);
    const rows = optionIds.map((id, index) => {
      const classified = tokens.map(items => truthValue(items[index] ?? ''));
      const trueCount = classified.filter(value => value === true).length;
      const falseCount = classified.filter(value => value === false).length;
      return { id, trueCount, falseCount,
        unclassifiedCount: run.validResponses - trueCount - falseCount };
    });
    return { kind: 'matrix_distribution', validResponses: run.validResponses, rows };
  }
  return { kind: 'completion', validResponses: run.validResponses };
};
