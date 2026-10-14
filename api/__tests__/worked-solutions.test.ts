import { expect, it, vi } from 'vitest';
import { generateWorkedSolutions, workedSolutionVersion } from '../_worked-solutions';
const input = { answerKey: 'Câu 1: B', assignmentText: 'Câu 1. Tính 1+1.', maxScore: 1,
  questions: [{ questionNumber: 'Câu 1', expectedAnswer: 'B' }], sourceUrls: ['https://host/file?token=one'] };
it('versions keys, code, teacher corrections, rubric and file identity, ignores transient tokens', () => {
  const version = workedSolutionVersion(input);
  expect(workedSolutionVersion({ ...input, sourceUrls: ['https://host/file?token=two'] })).toBe(version);
  for (const change of [{ examCode: '102' }, { answerKey: 'Câu 1: C' }, { contentVersion: 'v2' }, { rubric: 'mới' },
    { sourceUrls: ['https://host/new-file'] }, { answerKeyFixes: [{ questionNumber: 'Câu 1', expectedAnswer: 'A' }] }]) {
    expect(workedSolutionVersion({ ...input, ...change })).not.toBe(version);
  }
});
it('reuses exact cache without another AI call; insufficient context stays incomplete', async () => {
  const callModel = vi.fn().mockResolvedValue('{"questions":[{"questionNumber":"Câu 1","workedSolution":"Cộng hai đơn vị: $1+1=2$. Chọn B.","status":"ready"}]}');
  const cache = await generateWorkedSolutions({ input, now: 'now', callModel });
  expect(await generateWorkedSolutions({ input, existing: cache, now: 'later', callModel })).toBe(cache);
  expect(callModel).toHaveBeenCalledTimes(1);
  const incomplete = await generateWorkedSolutions({ input: { ...input, assignmentText: '', sourceUrls: [] }, now: 'now', callModel });
  expect(incomplete.status).toBe('incomplete');
  expect(callModel).toHaveBeenCalledTimes(1);
});
