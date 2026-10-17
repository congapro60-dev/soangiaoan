import { describe, expect, it, vi } from 'vitest';
import { handleAssignAdaptiveLesson } from '../_classroom-teacher';
import { handleStudentWorkspaceAction } from '../_student-workspace';

 type Data = Record<string, any>;

const auth = vi.hoisted(() => ({ uid: 'teacher-a', valid: true }));
vi.mock('../_exam-core.js', () => ({ getAdminDb: () => null, getAdminStorage: () => ({}) }));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async (token: string) => {
      if (!auth.valid || token !== 'valid-token') throw new Error('invalid token');
      return { uid: auth.uid, email: `${auth.uid}@example.com` };
    },
    getUser: async (uid: string) => ({ uid, email: `${uid}@example.com` }),
  }),
}));

const makeDb = (store: Record<string, Data>) => {
  const doc = (path: string) => ({
    id: path.split('/').at(-1),
    get: async () => ({
      id: path.split('/').at(-1),
      exists: Object.prototype.hasOwnProperty.call(store, path),
      data: () => store[path],
      ref: doc(path),
    }),
    set: async (value: Data) => { store[path] = { ...value }; },
    collection: (name: string) => collection(`${path}/${name}`),
  });
  const collection = (path: string, filters: Array<[string, unknown]> = []) => ({
    doc: (id: string) => doc(`${path}/${id}`),
    where: (field: string, _operator: string, value: unknown) => collection(path, [...filters, [field, value]]),
    get: async () => ({
      docs: Object.entries(store)
        .filter(([key, value]) => key.startsWith(`${path}/`)
          && !key.slice(path.length + 1).includes('/')
          && filters.every(([field, expected]) => value[field] === expected))
        .map(([key, value]) => ({ id: key.split('/').at(-1)!, data: () => value, ref: doc(key) })),
    }),
  });
  return { collection };
};

const response = () => {
  const result = { statusCode: 0, payload: {} as Data };
  const res = {
    status(code: number) { result.statusCode = code; return res; },
    json(payload: Data) { result.payload = payload; return res; },
  };
  return { result, res };
};

const invokeStudent = async (store: Record<string, Data>, body: Data, token = 'valid-token') => {
  auth.uid = 'student-a';
  const { result, res } = response();
  await handleStudentWorkspaceAction(makeDb(store) as never, { idToken: token, ...body }, res as never, {
    projectStudentAssignment: vi.fn(),
    projectStudentSubmission: vi.fn(),
  });
  return result;
};

const invokeTeacher = async (store: Record<string, Data>, body: Data, token = 'valid-token') => {
  auth.uid = 'teacher-a';
  const { result, res } = response();
  await handleAssignAdaptiveLesson(makeDb(store) as never, { idToken: token, ...body }, res as never);
  return result;
};

const lesson = (patch: Data = {}): Data => ({
  id: 'lesson-1', teacherId: 'teacher-a', title: 'Adaptive fractions', subjectId: 'math', grade: '10',
  durationMinutes: 40, status: 'published', createdAt: '2026-10-01', updatedAt: '2026-10-01',
  preparation: { materials: [] },
  fiveStepFlow: { steps: [{ id: 'step-1', title: 'Prompt', description: 'route prompt', teacherRole: 'TEACHER_SECRET', systemSupport: 'system' }] },
  objectives: [{ id: 'objective-1', title: 'Objective', objectiveIds: [], commonMisconceptions: [{ id: 'misconception-1', description: 'misconception', remediationHint: 'REMEDIATION_SECRET' }] }],
  knowledgeUnits: [{ id: 'unit-1', title: 'Unit', objectiveIds: ['objective-1'], estimatedMinutes: 10, routes: [{ route: 'on_track', explanation: 'ROUTE_EXPLANATION_PRESENT', guidingQuestions: ['ROUTE_PROMPT_PRESENT'], guidingAnswers: ['GUIDING_ANSWER_SECRET'], workedExamples: [{ id: 'example-1', title: 'Example', problem: 'problem', solution: 'SOLUTION_SECRET', explanation: 'EXPLANATION_SECRET', objectiveIds: [], hints: ['HINT_SECRET'], aiRubric: 'RUBRIC_SECRET' }], practiceTasks: [{ id: 'task-1', prompt: 'PRACTICE_PROMPT_PRESENT', expectedAnswer: 'EXPECTED_SECRET', hints: ['TASK_HINT_SECRET'], objectiveIds: [], difficulty: 'easy' }] }], quickCheck: { id: 'check-1', title: 'Check', purpose: 'diagnostic', durationMinutes: 5, questions: [{ id: 'question-1', type: 'short_text', prompt: 'QUESTION_PROMPT_PRESENT', correctAnswer: 'CORRECT_SECRET', explanation: 'QUESTION_EXPLANATION_SECRET', hints: ['QUESTION_HINT_SECRET'], objectiveIds: [], difficulty: 'easy', points: 1 }] } }],
  diagnosticTest: { id: 'diagnostic-1', title: 'Diagnostic', purpose: 'diagnostic', durationMinutes: 5, questions: [{ id: 'diagnostic-q', type: 'short_text', prompt: 'DIAGNOSTIC_PROMPT_PRESENT', correctAnswer: 'DIAGNOSTIC_SECRET', explanation: 'DIAGNOSTIC_EXPLANATION_SECRET', hints: ['DIAGNOSTIC_HINT_SECRET'], objectiveIds: [], difficulty: 'easy', points: 1 }] },
  exitTicket: { id: 'exit-1', title: 'Exit', purpose: 'exit_ticket', durationMinutes: 5, questions: [{ id: 'exit-q', type: 'short_text', prompt: 'EXIT_PROMPT_PRESENT', correctAnswer: 'EXIT_SECRET', explanation: 'EXIT_EXPLANATION_SECRET', hints: ['EXIT_HINT_SECRET'], objectiveIds: [], difficulty: 'easy', points: 1 }] },
  practiceSet: { recognition: [{ prompt: 'MCQ_PROMPT_PRESENT', options: ['A'], correctIndex: 0, explanation: 'MCQ_EXPLANATION_SECRET', hints: ['MCQ_HINT_SECRET'] }], comprehension: [{ context: 'TF_CONTEXT_PRESENT', statements: [{ text: 'TF_STATEMENT_PRESENT', correct: true, hint: 'TF_HINT_SECRET' }], explanation: 'TF_EXPLANATION_SECRET' }], application: { short: [{ prompt: 'SHORT_PROMPT_PRESENT', answer: 'SHORT_ANSWER_SECRET', explanation: 'SHORT_EXPLANATION_SECRET', hints: ['SHORT_HINT_SECRET'] }], essay: { prompt: 'ESSAY_PROMPT_PRESENT', parts: [{ prompt: 'ESSAY_PART_PROMPT_PRESENT', hint: 'ESSAY_HINT_SECRET', answer: 'ESSAY_ANSWER_SECRET' }] } } },
  ...patch,
});

const baseStore = () => ({
  'studentLinks/student-a': { studentId: 'roster-a', classId: 'class-a', teacherId: 'teacher-a' },
  'classes/class-a': { teacherId: 'teacher-a', name: 'Class A' },
  'classes/class-a/students/roster-a': { name: 'Student A' },
  'studentLinks/student-b': { studentId: 'roster-b', classId: 'class-b', teacherId: 'teacher-b' },
  'classes/class-b': { teacherId: 'teacher-b', name: 'Class B' },
  'classes/class-b/students/roster-b': { name: 'Student B' },
  'classes/class-c': { teacherId: 'teacher-c', name: 'Class C' },
  'adaptiveLessons/lesson-1': lesson(),
});

beforeEach(() => { auth.uid = 'teacher-a'; auth.valid = true; });

describe('adaptive assignment actions', () => {
  it('lists only open, visible metadata and blocks excluded, closed, and cross-class assignments', async () => {
    const store = { ...baseStore(),
      'adaptiveAssignments/class-a_lesson-1': { classId: 'class-a', teacherId: 'teacher-a', lessonId: 'lesson-1', title: 'Visible', discoverSeedId: 'seed-1', createdAt: '2026-10-02', isOpen: true },
      'adaptiveAssignments/class-a_excluded': { classId: 'class-a', teacherId: 'teacher-a', lessonId: 'lesson-1', title: 'Excluded', targetStudentIds: ['other'], isOpen: true },
      'adaptiveAssignments/class-a_closed': { classId: 'class-a', teacherId: 'teacher-a', lessonId: 'lesson-1', title: 'Closed', isOpen: false },
      'adaptiveAssignments/class-b_lesson-1': { classId: 'class-b', teacherId: 'teacher-b', lessonId: 'lesson-1', title: 'Other class', isOpen: true },
    };
    const listed = await invokeStudent(store, { action: 'studentAdaptiveList' });
    expect(listed.statusCode).toBe(200);
    expect(listed.payload.assignments).toEqual([{ assignmentId: 'class-a_lesson-1', lessonId: 'lesson-1', title: 'Visible', discoverSeedId: 'seed-1', createdAt: '2026-10-02' }]);
    expect(JSON.stringify(listed.payload)).not.toContain('Adaptive fractions');

    for (const assignmentId of ['class-a_excluded', 'class-a_closed', 'class-b_lesson-1']) {
      const opened = await invokeStudent(store, { action: 'studentAdaptiveOpen', assignmentId });
      expect(opened.statusCode).toBe(404);
    }
  });

  it('opens published lessons without answer-bearing values while keeping prompts and route explanation', async () => {
    const store = { ...baseStore(), 'adaptiveAssignments/class-a_lesson-1': { classId: 'class-a', teacherId: 'teacher-a', lessonId: 'lesson-1', title: 'Visible', isOpen: true } };
    const result = await invokeStudent(store, { action: 'studentAdaptiveOpen', assignmentId: 'class-a_lesson-1' });
    expect(result.statusCode).toBe(200);
    const serialized = JSON.stringify(result.payload);
    for (const secret of ['CORRECT_SECRET', 'EXPLANATION_SECRET', 'HINT_SECRET', 'SOLUTION_SECRET', 'EXPECTED_SECRET', 'RUBRIC_SECRET', 'TEACHER_SECRET', 'REMEDIATION_SECRET', 'GUIDING_ANSWER_SECRET', 'TASK_HINT_SECRET', 'QUESTION_EXPLANATION_SECRET', 'QUESTION_HINT_SECRET', 'DIAGNOSTIC_SECRET', 'DIAGNOSTIC_EXPLANATION_SECRET', 'DIAGNOSTIC_HINT_SECRET', 'EXIT_SECRET', 'EXIT_EXPLANATION_SECRET', 'EXIT_HINT_SECRET', 'MCQ_EXPLANATION_SECRET', 'MCQ_HINT_SECRET', 'TF_HINT_SECRET', 'TF_EXPLANATION_SECRET', 'SHORT_ANSWER_SECRET', 'SHORT_EXPLANATION_SECRET', 'SHORT_HINT_SECRET', 'ESSAY_HINT_SECRET', 'ESSAY_ANSWER_SECRET']) expect(serialized).not.toContain(secret);
    expect(serialized).toContain('ROUTE_EXPLANATION_PRESENT');
    expect(serialized).toContain('PRACTICE_PROMPT_PRESENT');
    expect(serialized).toContain('QUESTION_PROMPT_PRESENT');
  });

  it('returns 401 for missing or invalid idToken on both student actions and teacher assignment', async () => {
    const store = baseStore();
    for (const action of ['studentAdaptiveList', 'studentAdaptiveOpen']) {
      expect((await invokeStudent(store, { action, assignmentId: 'class-a_lesson-1' }, '')).statusCode).toBe(401);
      expect((await invokeStudent(store, { action, assignmentId: 'class-a_lesson-1' }, 'bad')).statusCode).toBe(401);
    }
    expect((await invokeTeacher(store, { classId: 'class-a', lessonId: 'lesson-1' }, '')).statusCode).toBe(401);
    expect((await invokeTeacher(store, { classId: 'class-a', lessonId: 'lesson-1' }, 'bad')).statusCode).toBe(401);
  });

  it('rejects assignment to an unowned class, foreign lesson, or unpublished lesson', async () => {
    const store = { ...baseStore(),
      'adaptiveLessons/foreign': lesson({ id: 'foreign', teacherId: 'teacher-other' }),
      'adaptiveLessons/draft': lesson({ id: 'draft', status: 'draft' }),
    };
    expect((await invokeTeacher(store, { classId: 'class-c', lessonId: 'lesson-1' })).statusCode).toBe(403);
    expect((await invokeTeacher(store, { classId: 'class-a', lessonId: 'foreign' })).statusCode).toBe(403);
    expect((await invokeTeacher(store, { classId: 'class-a', lessonId: 'draft' })).statusCode).toBe(403);
  });

  it('upserts one class+lesson document and can close it', async () => {
    const store = baseStore();
    const first = await invokeTeacher(store, { classId: 'class-a', lessonId: 'lesson-1', targetStudentIds: ['roster-a'], title: 'First' });
    const second = await invokeTeacher(store, { classId: 'class-a', lessonId: 'lesson-1', targetStudentIds: ['roster-a'], title: 'Second', isOpen: false });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(Object.keys(store).filter(key => key.startsWith('adaptiveAssignments/'))).toEqual(['adaptiveAssignments/class-a_lesson-1']);
    expect(store['adaptiveAssignments/class-a_lesson-1']).toMatchObject({ title: 'Second', isOpen: false, targetStudentIds: ['roster-a'] });
    expect(store['adaptiveAssignments/class-a_lesson-1'].createdAt).toBe(first.payload.assignment.createdAt);
  });

  it('opens legacy lessons nested under lesson', async () => {
    const store = { ...baseStore(),
      'adaptiveLessons/legacy': { lesson: lesson({ id: 'legacy', title: 'Legacy lesson' }) },
      'adaptiveAssignments/class-a_legacy': { classId: 'class-a', teacherId: 'teacher-a', lessonId: 'legacy', isOpen: true },
    };
    const result = await invokeStudent(store, { action: 'studentAdaptiveOpen', assignmentId: 'class-a_legacy' });
    expect(result.statusCode).toBe(200);
    expect(result.payload.lesson.title).toBe('Legacy lesson');
  });
});

