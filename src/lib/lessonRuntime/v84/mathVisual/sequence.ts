export type SequenceModel =
  | { family: 'arithmetic'; firstIndex: number; firstTerm: number; difference: number; count: number }
  | { family: 'geometric'; firstIndex: number; firstTerm: number; ratio: number; count: number };

export interface SequenceRow { index: number; value: number }

const validModel = (model: SequenceModel): boolean => Number.isInteger(model.firstIndex)
  && Number.isInteger(model.count) && model.count >= 1 && model.count <= 100
  && Number.isFinite(model.firstTerm)
  && (model.family === 'arithmetic' ? Number.isFinite(model.difference) : Number.isFinite(model.ratio));

export const sequenceTerm = (model: SequenceModel, index: number): number => {
  if (!validModel(model)) throw new Error('SEQUENCE_MODEL_INVALID');
  if (!Number.isInteger(index) || index < model.firstIndex) throw new Error('SEQUENCE_INDEX_OUT_OF_DOMAIN');
  const offset = index - model.firstIndex;
  const value = model.family === 'arithmetic'
    ? model.firstTerm + model.difference * offset : model.firstTerm * model.ratio ** offset;
  if (!Number.isFinite(value)) throw new Error('SEQUENCE_VALUE_INVALID');
  return value;
};

export const sequenceRows = (model: SequenceModel): SequenceRow[] => {
  if (!validModel(model)) throw new Error('SEQUENCE_MODEL_INVALID');
  return Array.from({ length: model.count }, (_, offset) => ({
    index: model.firstIndex + offset, value: sequenceTerm(model, model.firstIndex + offset),
  }));
};

export const validateSequenceInvariants = (model: SequenceModel): string[] => {
  const rows = sequenceRows(model);
  const issues: string[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1].value;
    const expected = model.family === 'arithmetic' ? previous + model.difference : previous * model.ratio;
    const actual = rows[index].value;
    if (Math.abs(actual - expected) > 1e-9 * Math.max(1, Math.abs(expected))) {
      issues.push(`SEQUENCE_RECURRENCE_FAILED:${rows[index].index}`);
    }
  }
  return issues;
};
