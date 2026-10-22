import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handleStudentWorkspaceAction } from '../_student-workspace.js';
import { sampleAdaptiveLesson } from '../../src/lib/adaptive/sampleAdaptiveLesson.js';

type Data = Record<string, any>;
const auth = vi.hoisted(() => ({ uid: 'student-a', valid: true }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: async (token: string) => { if (!auth.valid || token !== 'valid-token') throw new Error('invalid'); return { uid: auth.uid }; } }) }));
const makeDb = (store: Record<string, Data>) => {
  const doc = (path: string) => ({ path, id: path.split('/').at(-1), get: async () => ({ id: path.split('/').at(-1), exists: path in store, data: () => store[path], ref: doc(path) }), set: async (value: Data) => { store[path] = { ...value }; }, update: async (value: Data) => { store[path] = { ...(store[path] || {}), ...value }; }, collection: (name: string) => collection(`${path}/${name}`) });
  const collection = (path: string, filters: Array<[string, unknown]> = []) => ({ doc: (id: string = `event-${Object.keys(store).length}`) => doc(`${path}/${id}`), where: (field: string, _op: string, value: unknown) => collection(path, [...filters, [field, value]]), get: async () => ({ docs: Object.entries(store).filter(([key, value]) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/') && filters.every(([field, expected]) => value[field] === expected)).map(([key, value]) => ({ id: key.split('/').at(-1)!, data: () => value, ref: doc(key) })) }), add: async (value: Data) => { const id = `event-${Object.keys(store).length}`; store[`${path}/${id}`] = { ...value }; return { id }; } });
  return { collection, runTransaction: async (work: (tx: any) => Promise<any>) => work({ get: (ref: any) => ref.get(), set: (ref: any, value: Data) => { store[ref.path || `adaptiveAssignmentProgress/${ref.id}`] = { ...value }; }, create: (ref: any, value: Data) => { store[ref.path] = { ...value }; } }) };
};
const response = () => { const result = { statusCode: 0, payload: {} as Data }; const res = { status(code: number) { result.statusCode = code; return res; }, json(payload: Data) { result.payload = payload; return res; } }; return { result, res }; };
const lesson = { ...sampleAdaptiveLesson, id: 'lesson-1', teacherId: 'teacher-a', status: 'published' as const };
const diagnostic = lesson.diagnosticTest.questions[0];
const unitId = lesson.knowledgeUnits[0].id;
const quick = lesson.knowledgeUnits[0].quickCheck!.questions[0];
const exit = lesson.exitTicket.questions[0];
const baseStore = (assignment: Data = {}) => ({ 'studentLinks/student-a': { studentId: 'roster-a', classId: 'class-a', teacherId: 'teacher-a' }, 'classes/class-a': { teacherId: 'teacher-a' }, 'classes/class-a/students/roster-a': { name: 'Student A' }, 'adaptiveLessons/lesson-1': lesson, 'adaptiveAssignments/assignment-1': { classId: 'class-a', teacherId: 'teacher-a', lessonId: 'lesson-1', isOpen: true, ...assignment } });
const invoke = async (store: Record<string, Data>, body: Data, token = 'valid-token') => { const { result, res } = response(); await handleStudentWorkspaceAction(makeDb(store) as never, { idToken: token, action: 'studentAdaptiveSubmit', ...body }, res as never, { projectStudentAssignment: vi.fn(), projectStudentSubmission: vi.fn() }); return result; };
const submit = (kind: string, answers: Data, extra: Data = {}) => ({ assignmentId: 'assignment-1', kind, answers, ...extra });
beforeEach(() => { auth.uid = 'student-a'; auth.valid = true; });

describe('studentAdaptiveSubmit', () => {
  it('grades on the server, ignores client score fields, stores progress, and hides unrelated correct answers', async () => {
    const store = baseStore(); const result = await invoke(store, submit('diagnostic', { [diagnostic.id]: diagnostic.correctAnswer }, { isCorrect: false, score: 0 }));
    expect(result.statusCode).toBe(200); expect(result.payload.scored).toBe(true); expect(result.payload.attempt.answers[0].isCorrect).toBe(true);
    expect(store['adaptiveAssignmentProgress/assignment-1_roster-a'].attempts.diagnostic.answers[0].score).toBeGreaterThan(0);
    expect(JSON.stringify(result.payload)).not.toContain(quick.correctAnswer); expect(JSON.stringify(result.payload)).not.toContain(exit.correctAnswer);
  });
  it('does not rescore retries, logs exactly one retry event, and never stores raw event answers', async () => {
    const store = baseStore(); const first = await invoke(store, submit('diagnostic', { [diagnostic.id]: 'wrong answer' })); const second = await invoke(store, submit('diagnostic', { [diagnostic.id]: diagnostic.correctAnswer }));
    expect(first.payload.scored).toBe(true); expect(second.payload.scored).toBe(false); expect(second.payload.attempt.answers[0].isCorrect).toBe(true);
    expect(store['adaptiveAssignmentProgress/assignment-1_roster-a'].attempts.diagnostic.answers[0].isCorrect).toBe(false);
    const events = Object.entries(store).filter(([key]) => key.startsWith('adaptiveEvents/')).map(([, value]) => value); expect(events).toHaveLength(2); expect(events[1].type).toBe('retry'); expect(JSON.stringify(events)).not.toContain('wrong answer');
  });
  it('requires diagnostic first; only exit ticket completes', async () => {
    const store = baseStore(); expect((await invoke(store, submit('quickCheck', { [quick.id]: quick.correctAnswer }, { unitId }))).statusCode).toBe(409);
    expect((await invoke(store, submit('diagnostic', { [diagnostic.id]: diagnostic.correctAnswer }))).payload.status).toBe('in_progress');
    expect((await invoke(store, submit('quickCheck', { [quick.id]: quick.correctAnswer }, { unitId }))).payload.status).toBe('in_progress');
    const exitResult = await invoke(store, submit('exitTicket', { [exit.id]: exit.correctAnswer })); expect(exitResult.payload.status).toBe('completed'); expect(store['adaptiveAssignmentProgress/assignment-1_roster-a'].status).toBe('completed');
  });
  it('blocks invisible, excluded, and closed assignments', async () => {
    for (const assignment of [{ classId: 'class-b' }, { targetStudentIds: ['other'] }, { isOpen: false }]) expect((await invoke(baseStore(assignment), submit('diagnostic', {}))).statusCode).toBe(404);
  });
  it('rejects a first submission with no answered question so an empty send cannot lock the score', async () => {
    const store = baseStore(); const empty = await invoke(store, submit('diagnostic', { [diagnostic.id]: '   ' }));
    expect(empty.statusCode).toBe(422); expect(Object.keys(store).some(key => key.startsWith('adaptiveAssignmentProgress/'))).toBe(false);
  });
  it('does not return explanations for questions the student did not answer', async () => {
    const second = lesson.diagnosticTest.questions[1]; const store = baseStore();
    const result = await invoke(store, submit('diagnostic', { [diagnostic.id]: 'wrong answer' }));
    expect(result.statusCode).toBe(200); const unanswered = result.payload.attempt.answers.find((answer: Data) => answer.questionId === second.id);
    expect(unanswered?.feedback).toBeUndefined(); expect(JSON.stringify(store['adaptiveAssignmentProgress/assignment-1_roster-a'])).not.toContain(second.explanation);
  });
  it('rejects non-string answers with a clear message and ignores inherited object keys', async () => {
    const bad = await invoke(baseStore(), submit('diagnostic', { [diagnostic.id]: 5 })); expect(bad.statusCode).toBe(422); expect(String(bad.payload.error)).not.toContain('2000');
    const proto = await invoke(baseStore(), submit('diagnostic', { constructor: 'x', [diagnostic.id]: diagnostic.correctAnswer })); expect(proto.statusCode).toBe(200);
  });
  it('returns 401 for missing or invalid tokens', async () => { expect((await invoke(baseStore(), submit('diagnostic', {}), '')).statusCode).toBe(401); expect((await invoke(baseStore(), submit('diagnostic', {}), 'bad')).statusCode).toBe(401); });
  it('rejects unknown unit and oversized answers', async () => { expect((await invoke(baseStore(), submit('quickCheck', {}, { unitId: 'missing' }))).statusCode).toBe(422); expect((await invoke(baseStore(), submit('diagnostic', { [diagnostic.id]: 'x'.repeat(2001) }))).statusCode).toBe(422); });
  it('caps answer count and ignores unknown answer keys', async () => { const tooMany = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`x${index}`, 'a'])); expect((await invoke(baseStore(), submit('diagnostic', tooMany))).statusCode).toBe(422); const result = await invoke(baseStore(), submit('diagnostic', { unknown: 'secret', [diagnostic.id]: diagnostic.correctAnswer })); expect(result.statusCode).toBe(200); expect(result.payload.attempt.answers).toHaveLength(lesson.diagnosticTest.questions.length); });
});
