import type {
  AdaptiveAssessment,
  AdaptiveLesson,
  AdaptiveQuestion,
  CommonMisconception,
  FiveStepItem,
  LearningRouteContent,
  PracticeEssay,
  PracticeEssayPart,
  PracticeMCQ,
  PracticeSet,
  PracticeShort,
  PracticeTask,
  PracticeTFGroup,
  PracticeTFStatement,
  WorkedExample,
} from './types.js';

export type StudentWorkedExample = Omit<WorkedExample, 'solution' | 'explanation' | 'hints' | 'aiRubric'>;
export type StudentPracticeTask = Omit<PracticeTask, 'expectedAnswer' | 'hints'>;
export type StudentLearningRouteContent = Omit<LearningRouteContent, 'guidingAnswers' | 'aiTutorPrompt' | 'workedExamples' | 'practiceTasks'> & {
  workedExamples: StudentWorkedExample[];
  practiceTasks: StudentPracticeTask[];
};
export type StudentAdaptiveQuestion = Omit<AdaptiveQuestion, 'correctAnswer' | 'explanation' | 'hints'>;
export type StudentAdaptiveAssessment = Omit<AdaptiveAssessment, 'questions'> & {
  questions: StudentAdaptiveQuestion[];
};
export type StudentPracticeMCQ = Omit<PracticeMCQ, 'correctIndex' | 'explanation' | 'hints'>;
export type StudentPracticeTFStatement = Omit<PracticeTFStatement, 'correct' | 'hint'>;
export type StudentPracticeTFGroup = Omit<PracticeTFGroup, 'explanation' | 'statements'> & {
  statements: StudentPracticeTFStatement[];
};
export type StudentPracticeShort = Omit<PracticeShort, 'answer' | 'explanation' | 'hints' | 'tolerance'>;
export type StudentPracticeEssayPart = Omit<PracticeEssayPart, 'answer' | 'hint'>;
export type StudentPracticeEssay = Omit<PracticeEssay, 'parts'> & {
  parts: StudentPracticeEssayPart[];
};
export type StudentPracticeSet = Omit<PracticeSet, 'recognition' | 'comprehension' | 'application'> & {
  recognition: StudentPracticeMCQ[];
  comprehension: StudentPracticeTFGroup[];
  application: {
    short: StudentPracticeShort[];
    essay: StudentPracticeEssay | null;
  };
};
export type StudentFiveStepItem = Omit<FiveStepItem, 'teacherRole' | 'systemSupport'>;
export type StudentCommonMisconception = Omit<CommonMisconception, 'remediationHint'>;
export type StudentKnowledgeUnit = Omit<AdaptiveLesson['knowledgeUnits'][number], 'routes' | 'quickCheck' | 'supportTasks' | 'enrichmentTasks'> & {
  routes: StudentLearningRouteContent[];
  quickCheck: StudentAdaptiveAssessment;
  supportTasks?: StudentPracticeTask[];
  enrichmentTasks?: StudentPracticeTask[];
};
export type StudentAdaptiveLesson = Omit<AdaptiveLesson, 'fiveStepFlow' | 'objectives' | 'knowledgeUnits' | 'diagnosticTest' | 'exitTicket' | 'practiceSet' | 'bonusChallenge' | 'generationWarnings'> & {
  fiveStepFlow: { steps: StudentFiveStepItem[] };
  objectives: Array<Omit<AdaptiveLesson['objectives'][number], 'commonMisconceptions'> & { commonMisconceptions: StudentCommonMisconception[] }>;
  knowledgeUnits: StudentKnowledgeUnit[];
  diagnosticTest: StudentAdaptiveAssessment;
  exitTicket: StudentAdaptiveAssessment;
  practiceSet?: StudentPracticeSet;
  bonusChallenge?: Omit<NonNullable<AdaptiveLesson['bonusChallenge']>, 'advancedProblem' | 'applicationProblem'> & {
    advancedProblem?: { prompt: string };
    applicationProblem?: { prompt: string };
  };
};

const clone = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(clone) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, clone(nested)])) as T;
};

const remove = (value: object, keys: readonly string[]) => {
  keys.forEach(key => delete (value as Record<string, unknown>)[key]);
};

const stripQuestion = (question: object) => remove(question, ['correctAnswer', 'explanation', 'hints']);
const stripAssessment = (assessment: { questions: object[] }) => assessment.questions.forEach(stripQuestion);
const stripWorkedExample = (example: WorkedExample) => remove(example, ['solution', 'explanation', 'hints', 'aiRubric']);
const stripPracticeTask = (task: PracticeTask) => remove(task, ['expectedAnswer', 'hints']);

export const stripAnswers = (lesson: AdaptiveLesson): StudentAdaptiveLesson => {
  const studentLesson = clone(lesson);

  stripAssessment(studentLesson.diagnosticTest);
  stripAssessment(studentLesson.exitTicket);
  studentLesson.knowledgeUnits.forEach(unit => {
    stripAssessment(unit.quickCheck);
    unit.routes.forEach(route => {
      remove(route, ['guidingAnswers', 'aiTutorPrompt']);
      route.workedExamples.forEach(stripWorkedExample);
      route.practiceTasks.forEach(stripPracticeTask);
    });
    unit.supportTasks?.forEach(stripPracticeTask);
    unit.enrichmentTasks?.forEach(stripPracticeTask);
  });
  studentLesson.objectives.forEach(objective => objective.commonMisconceptions.forEach(misconception => remove(misconception, ['remediationHint'])));
  studentLesson.fiveStepFlow.steps.forEach(step => remove(step, ['teacherRole', 'systemSupport']));

  studentLesson.practiceSet?.recognition.forEach(item => remove(item, ['correctIndex', 'explanation', 'hints']));
  studentLesson.practiceSet?.comprehension.forEach(group => {
    remove(group, ['explanation']);
    group.statements.forEach(statement => remove(statement, ['correct', 'hint']));
  });
  studentLesson.practiceSet?.application.short.forEach(item => remove(item, ['answer', 'explanation', 'hints', 'tolerance']));
  studentLesson.practiceSet?.application.essay?.parts.forEach(part => remove(part, ['answer', 'hint']));

  if (studentLesson.bonusChallenge) {
    delete (studentLesson.bonusChallenge.advancedProblem as Record<string, unknown> | undefined)?.solution;
    delete (studentLesson.bonusChallenge.applicationProblem as Record<string, unknown> | undefined)?.solution;
  }
  delete (studentLesson as Partial<AdaptiveLesson>).generationWarnings;

  return studentLesson as unknown as StudentAdaptiveLesson;
};



