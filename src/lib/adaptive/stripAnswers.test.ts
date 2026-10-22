import { describe, expect, it } from 'vitest';
import { sampleAdaptiveLesson } from './sampleAdaptiveLesson';
import { stripAnswers } from './stripAnswers';

const makeLesson = () => {
  const lesson = structuredClone(sampleAdaptiveLesson) as any;
  lesson.discoverSeedId = 'discover-seed-1';
  lesson.practiceSet = {
    recognition: [{ prompt: 'MCQ prompt', options: ['A'], correctIndex: 0, explanation: 'MCQ explanation', hints: ['MCQ hint'] }],
    comprehension: [{ context: 'TF context', statements: [{ text: 'TF text', correct: true, hint: 'TF hint' }], explanation: 'TF explanation' }],
    application: {
      short: [{ prompt: 'Short prompt', answer: 'Short answer', tolerance: 1, explanation: 'Short explanation', hints: ['Short hint'] }],
      essay: { prompt: 'Essay prompt', parts: [{ prompt: 'Essay part prompt', hint: 'Essay hint', answer: 'Essay answer' }] },
    },
  };
  lesson.bonusChallenge = {
    advancedProblem: { prompt: 'Advanced prompt', solution: 'Advanced solution' },
    applicationProblem: { prompt: 'Application prompt', solution: 'Application solution' },
    readingProblem: 'Reading prompt',
  };
  lesson.objectives[0].commonMisconceptions = [{ id: 'mis-1', title: 'Misconception', description: 'Description', remediationHint: 'Remediation hint' }];
  lesson.fiveStepFlow.steps = [{ id: 'step-1', name: 'Step', purpose: 'Purpose', estimatedMinutes: 1, teacherRole: 'Teacher role', studentAction: 'Student action', systemSupport: 'System support' }];
  lesson.generationWarnings = ['Generation warning'];
  return lesson;
};

const values = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value.flatMap(values);
  if (!value || typeof value !== 'object') return [value];
  return Object.values(value).flatMap(values);
};

describe('stripAnswers', () => {
  it('removes known secrets by path and value while preserving unknown keys', () => {
    const lesson = makeLesson();
    lesson.unknownExtra = { keepMe: 'unknown-value' };
    const stripped = stripAnswers(lesson);

    for (const secret of [
      lesson.diagnosticTest.questions[0].explanation,
      lesson.diagnosticTest.questions[0].hints?.[0],
      'MCQ explanation', 'MCQ hint', 'Short answer', 'Short explanation', 'Short hint',
      'TF explanation', 'TF hint', 'Essay answer', 'Essay hint', 'Advanced solution',
      'Application solution', 'Remediation hint', 'Teacher role', 'System support',
      'Generation warning',
    ]) expect(values(stripped)).not.toContain(secret);
    expect(stripped.diagnosticTest.questions[0]).not.toHaveProperty('correctAnswer');
    expect(stripped.practiceSet.recognition[0]).not.toHaveProperty('correctIndex');
    expect(stripped.practiceSet.comprehension[0]).not.toHaveProperty('explanation');
    expect(stripped.practiceSet.comprehension[0].statements[0]).not.toHaveProperty('correct');
    expect(stripped.practiceSet.comprehension[0].statements[0]).not.toHaveProperty('hint');
    expect(stripped.bonusChallenge.advancedProblem).toEqual({ prompt: 'Advanced prompt' });
    expect(stripped.bonusChallenge.applicationProblem).toEqual({ prompt: 'Application prompt' });
    expect((stripped as any).unknownExtra).toEqual({ keepMe: 'unknown-value' });
  });

  it('preserves route teaching text, prompts, seed, and render fields', () => {
    const lesson = makeLesson();
    const stripped = stripAnswers(lesson);
    const route = stripped.knowledgeUnits[0].routes[0];

    expect(route.explanation).toBe(lesson.knowledgeUnits[0].routes[0].explanation);
    expect(route.guidingQuestions).toEqual(lesson.knowledgeUnits[0].routes[0].guidingQuestions);
    expect(stripped.bonusChallenge.readingProblem).toBe('Reading prompt');
    expect(stripped.discoverSeedId).toBe('discover-seed-1');
    expect(stripped.diagnosticTest.questions[0]).toMatchObject({
      id: lesson.diagnosticTest.questions[0].id,
      type: lesson.diagnosticTest.questions[0].type,
      prompt: lesson.diagnosticTest.questions[0].prompt,
      options: lesson.diagnosticTest.questions[0].options,
    });
  });

  it('does not mutate the input', () => {
    const lesson = makeLesson();
    const before = structuredClone(lesson);

    stripAnswers(lesson);

    expect(lesson).toEqual(before);
  });
});
