import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../classroom';
import gradeHandler from '../grade-homework';
import { handleAnnotateSubmissionPhotos } from '../_submission-annotations';
import { commitSubmissionGradeChange, GradeLifecycleConflictError } from '../_grade-lifecycle';
import { workedSolutionVersion } from '../_worked-solutions';
import { assignmentSolutionInput } from '../_assignment-solutions';
import { hashPin } from '../_classroom-core';
type Data = Record<string, any>;
const h = vi.hoisted(() => ({ uid: 'student-uid', db: null as any, metadata: {} as Record<string, any>, signed: vi.fn(async () => ['SIGNED']), copy: vi.fn(async () => []), beforeCommit: undefined as undefined | (() => void), afterQuota: undefined as undefined | (() => void), ai: vi.fn(async () => '{"outcome":"achieved","feedback":"Em đã sửa đúng bước kết luận."}') }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: async () => ({ uid: h.uid }), getUser: async () => ({ email: 'teacher@test.dev' }) }) }));
vi.mock('../_exam-core.js', () => ({ getAdminDb: () => h.db, getAdminStorage: () => ({ name: 'test.firebasestorage.app', file: (path: string) => ({ getMetadata: async () => [h.metadata[path]], getSignedUrl: h.signed, createResumableUpload: h.signed, setMetadata: async () => [], copy: h.copy, delete: async () => undefined }) }), stripAnswerKey: (q: Data) => q }));
vi.mock('../_grading-core.js', async importOriginal => {
 const original = await importOriginal<typeof import('../_grading-core.js')>();
 return { ...original, callGeminiVision: h.ai, reserveQuota: async (...args: Parameters<typeof original.reserveQuota>) => { const result = await original.reserveQuota(...args); h.afterQuota?.(); return result; } };
});
const makeDb = (store: Record<string, Data>) => {
  const doc = (path: string) => ({ id: path.split('/').at(-1)!, path, get: async () => ({ id: path.split('/').at(-1)!, exists: path in store, data: () => store[path] && structuredClone(store[path]), ref: doc(path) }), collection: (name: string) => collection(`${path}/${name}`), set: async (data: Data) => { store[path] = structuredClone(data); }, update: async (data: Data) => { store[path] = { ...store[path], ...structuredClone(data) }; } });
  const collection = (path: string, filters: Array<[string, unknown]> = []) => ({ doc: (id = `id-${Object.keys(store).length}`) => doc(`${path}/${id}`), where: (field: string, _op: string, value: unknown) => collection(path, [...filters, [field, value]]), limit() { return this; }, get: async () => ({ docs: Object.entries(store).filter(([key, data]) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/') && filters.every(([field, value]) => data[field] === value)).map(([key]) => ({ id: key.split('/').at(-1)!, data: () => structuredClone(store[key]), ref: doc(key) })) }) });
  return { collection, runTransaction: async (work: any) => { const writes: Array<() => Promise<void>> = []; h.beforeCommit?.(); h.beforeCommit = undefined; const result = await work({ get: (ref: any) => ref.get(), set: (ref: any, data: Data) => { writes.push(() => ref.set(data)); }, update: (ref: any, data: Data) => { writes.push(() => ref.update(data)); }, create: (ref: any, data: Data) => { if (store[ref.path]) throw new Error('exists'); writes.push(() => ref.set(data)); } }); for (const write of writes) await write(); return result; } };
};
let store: Record<string, Data>;
const call = async (body: Data) => { const result = { status: 0, payload: {} as Data }; const res = { status(code: number) { result.status = code; return res; }, json(data: Data) { result.payload = data; return res; } }; await handler({ method: 'POST', body: { idToken: 't', ...body } } as never, res as never); return result; };
beforeEach(() => { h.uid = 'student-uid'; h.beforeCommit = undefined; h.copy.mockReset(); h.copy.mockResolvedValue([]); h.signed.mockClear(); h.ai.mockClear(); process.env.GRADING_GEMINI_API_KEY = 'test-key'; h.metadata = { 'homework/student-uid/a.jpg': { name: 'homework/student-uid/a.jpg', size: '100', contentType: 'image/jpeg', metadata: { firebaseStorageDownloadTokens: 'token' } } }; store = { 'studentLinks/student-uid': { classId: 'class', studentId: 'student', teacherId: 'teacher' }, 'classes/class': { teacherId: 'teacher', joinCode: 'CODE' }, 'classes/class/students/student': { name: 'HS' }, 'classes/class/parentSecrets/student': { pinHash: hashPin('2468'), pinSetBy: 'parent', updatedAt: 'now' }, 'assignments/a': { classId: 'class', teacherId: 'teacher', type: 'upload', title: 'Bài', isOpen: false }, 'submissions/s': { classId: 'class', teacherId: 'teacher', studentId: 'student', assignmentId: 'a', fileUrls: [], status: 'graded', grade: { teacherApproved: true, score: 8, maxScore: 10, questionResults: [{ questionNumber: 'Câu 1' }] } } }; h.db = makeDb(store); });

const mark = { imageIndex: 1, x: .1, y: .2, width: .3, height: .1, confidence: .95, imageUrl: 'https://foreign' };
const row = (patch: Data = {}) => ({ questionNumber: 'Câu 1', status: 'incorrect', studentAnswer: 'x=3', expectedAnswer: 'x=2', score: 0, maxScore: 1, explanation: 'GV đã sửa nhận xét', correction: 'Kiểm tra dấu', needsTeacherReview: false, teacherEdited: true, ...patch });
const annotate = async (locate: (submission: any, targets: any[]) => Promise<any>, body: Data = {}) => {
 const result = { status: 0, payload: {} as Data }; const res = { status(code: number) { result.status = code; return res; }, json(data: Data) { result.payload = data; return res; } };
 await handleAnnotateSubmissionPhotos(h.db, { role: 'teacher', idToken: 't', submissionId: 's', ...body }, res as never, { locate }); return result;
};
beforeEach(() => { h.uid = 'teacher'; store['submissions/s'].fileUrls = ['https://source/original.jpg']; store['submissions/s'].grade.questionResults = [row()]; });
it('only geometry changes; score, approval, teacher texts and profile/history never mutate', async () => {
 const original = structuredClone(store['submissions/s']);
 const result = await annotate(async () => ({ raw: JSON.stringify({ questions: [{ questionNumber: 'Câu 1', score: 10, explanation: 'forged', photoMarks: [mark] }] }), urls: ['https://source/original.jpg'] }));
 expect(result.status).toBe(200); expect(result.payload).toMatchObject({ mapped: 1, unlocated: 0, total: 1 });
 const current = structuredClone(store['submissions/s']); delete current.grade.questionResults[0].photoMarks; delete current.annotationRunId; delete current.annotationLeaseUntil; delete current.annotationVersion; delete current.annotatedAt; delete current.updatedAt;
 expect(current).toEqual(original); expect(Object.keys(store).some(key => /Profile|Evidence|History/.test(key))).toBe(false);
 expect(store['submissions/s'].grade.questionResults[0].photoMarks[0].imageUrl).toBe('https://source/original.jpg');
});
it('neutral uncertainty geometry, malformed bounds and teacher-cleared marks preserve semantics', async () => {
 store['submissions/s'].grade.questionResults = [row({ status: 'unreadable', clarify: { kind: 'short', state: 'open', reading: '1 hay 7' } }), row({ questionNumber: 'Câu 2', photoMarksCleared: true }), row({ questionNumber: 'Câu 3', status: 'not_attempted', studentAnswer: '' })];
 const result = await annotate(async (_s, targets) => { expect(targets.map(q => q.questionNumber)).toEqual(['Câu 1']); return { raw: JSON.stringify({ questions: [{ questionNumber: 'Câu 1', photoMarks: [mark], readingRegions: [mark, { ...mark, x: .99 }] }] }), urls: ['https://source/original.jpg'] }; });
 expect(result.status).toBe(200); expect(store['submissions/s'].grade.questionResults[0].photoMarks).toBeUndefined(); expect(store['submissions/s'].grade.questionResults[0].readingRegions).toHaveLength(1); expect(store['submissions/s'].grade.questionResults[1]).toMatchObject({ photoMarksCleared: true });
});
it('successfully fetched photo indices cannot point at a failed PDF/photo or foreign URL', async () => {
 const result = await annotate(async () => ({ raw: JSON.stringify({ questions: [{ questionNumber: 'Câu 1', photoMarks: [mark, { ...mark, imageIndex: 2 }] }] }), urls: ['https://source/original.jpg'] }));
 expect(result.status).toBe(200); expect(store['submissions/s'].grade.questionResults[0].photoMarks).toHaveLength(1);
});
it('manual edit or assignment source change during vision aborts without overwriting grade', async () => {
 const result = await annotate(async () => { store['submissions/s'].grade.score = 9; return { raw: JSON.stringify({ questions: [{ questionNumber: 'Câu 1', photoMarks: [mark] }] }), urls: ['https://source/original.jpg'] }; });
 expect(result.status).toBe(409); expect(store['submissions/s'].grade.score).toBe(9); expect(store['submissions/s'].grade.questionResults[0].photoMarks).toBeUndefined();
});
it('manual save read before annotation cannot erase new geometry after annotation commits', async () => {
 store['submissions/s'].updatedAt = '2026-10-14T00:00:00.000Z';
 const previous = { id: 's', ...structuredClone(store['submissions/s']) };
 expect((await annotate(async () => ({ raw: JSON.stringify({ questions: [{ questionNumber: 'Câu 1', photoMarks: [mark] }] }), urls: ['https://source/original.jpg'] }))).status).toBe(200);
 await expect(commitSubmissionGradeChange(h.db, h.db.collection('submissions').doc('s'), previous as any, 'manual_edit', 'teacher', { ...previous, grade: { ...previous.grade, score: 9 }, updatedAt: new Date().toISOString() } as any, new Date().toISOString())).rejects.toBeInstanceOf(GradeLifecycleConflictError);
 expect(store['submissions/s'].grade.questionResults[0].photoMarks).toHaveLength(1); expect(store['submissions/s'].grade.score).toBe(8); expect(store['submissions/s'].grade.teacherApproved).toBe(true);
});
it('wrong role, foreign label and duplicate model labels are refused', async () => {
 h.uid = 'student-uid'; expect((await annotate(async () => { throw new Error('must not call'); }, { role: 'student' })).status).toBe(403); h.uid = 'teacher';
 for (const questions of [[{ questionNumber: 'Câu 99', photoMarks: [mark] }], [{ questionNumber: 'Câu 1', photoMarks: [mark] }, { questionNumber: 'Câu 1', photoMarks: [mark] }]]) expect((await annotate(async () => ({ raw: JSON.stringify({ questions }), urls: ['https://source/original.jpg'] }))).status).toBe(422);
});
it('cached located questions do not call AI; concurrent click is refused and failure keeps grade', async () => {
 store['submissions/s'].grade.questionResults[0].photoMarks = [{ ...mark, imageUrl: 'https://source/original.jpg' }];
 const model = vi.fn(async () => { throw new Error('must not call'); }); expect((await annotate(model)).payload.cached).toBe(true); expect(model).not.toHaveBeenCalled();
 delete store['submissions/s'].grade.questionResults[0].photoMarks;
 let release: (value: any) => void = () => undefined; const slow = vi.fn(() => new Promise(resolve => { release = resolve; })); const pending = annotate(slow); await vi.waitFor(() => expect(slow).toHaveBeenCalledTimes(1));
 expect((await annotate(slow)).status).toBe(409); release({ raw: '{"questions":[]}', urls: ['https://source/original.jpg'] }); expect((await pending).payload.unlocated).toBe(1);
 const grade = structuredClone(store['submissions/s'].grade); expect((await annotate(async () => { throw new Error('offline'); })).status).toBe(422); expect(store['submissions/s'].grade).toEqual(grade);
});
