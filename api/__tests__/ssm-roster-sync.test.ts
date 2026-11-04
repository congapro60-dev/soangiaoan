import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../classroom';
import { handleTeacherAction } from '../_classroom-teacher';
import { hashPin } from '../_classroom-core';
type Data = Record<string, any>;
const h = vi.hoisted(() => ({ uid: 'student-uid', db: null as any, metadata: {} as Record<string, any>, signed: vi.fn(async () => ['SIGNED']), copy: vi.fn(async () => []), beforeCommit: undefined as undefined | (() => void), ai: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: async () => ({ uid: h.uid }), getUser: async () => ({ email: 'teacher@test.dev' }) }) }));
vi.mock('../_exam-core.js', () => ({ getAdminDb: () => h.db, getAdminStorage: () => ({ name: 'test.firebasestorage.app', file: (path: string) => ({ getMetadata: async () => [h.metadata[path]], getSignedUrl: h.signed, createResumableUpload: h.signed, setMetadata: async () => [], copy: h.copy, delete: async () => undefined }) }), stripAnswerKey: (q: Data) => q }));
const makeDb = (store: Record<string, Data>) => {
  const doc = (path: string) => ({ id: path.split('/').at(-1)!, path, get: async () => ({ id: path.split('/').at(-1)!, exists: path in store, data: () => store[path] && structuredClone(store[path]), ref: doc(path) }), collection: (name: string) => collection(`${path}/${name}`), set: async (data: Data) => { store[path] = structuredClone(data); }, update: async (data: Data) => { store[path] = { ...store[path], ...structuredClone(data) }; } });
  const collection = (path: string, filters: Array<[string, unknown]> = []) => ({ doc: (id = `id-${Object.keys(store).length}`) => doc(`${path}/${id}`), where: (field: string, _op: string, value: unknown) => collection(path, [...filters, [field, value]]), limit() { return this; }, get: async () => ({ docs: Object.entries(store).filter(([key, data]) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/') && filters.every(([field, value]) => data[field] === value)).map(([key]) => ({ id: key.split('/').at(-1)!, data: () => structuredClone(store[key]), ref: doc(key) })) }) });
  return { collection, runTransaction: async (work: any) => { const writes: Array<() => Promise<void>> = []; h.beforeCommit?.(); h.beforeCommit = undefined; const result = await work({ get: (ref: any) => ref.get(), set: (ref: any, data: Data) => { writes.push(() => ref.set(data)); }, update: (ref: any, data: Data) => { writes.push(() => ref.update(data)); }, create: (ref: any, data: Data) => { if (store[ref.path]) throw new Error('exists'); writes.push(() => ref.set(data)); } }); for (const write of writes) await write(); return result; } };
};
let store: Record<string, Data>;
const call = async (body: Data) => { const result = { status: 0, payload: {} as Data }; const res = { status(code: number) { result.status = code; return res; }, json(data: Data) { result.payload = data; return res; } }; await handler({ method: 'POST', body: { idToken: 't', ...body } } as never, res as never); return result; };
beforeEach(() => { h.uid = 'student-uid'; h.beforeCommit = undefined; h.copy.mockReset(); h.copy.mockResolvedValue([]); h.signed.mockClear(); h.metadata = { 'homework/student-uid/a.jpg': { name: 'homework/student-uid/a.jpg', size: '100', contentType: 'image/jpeg', metadata: { firebaseStorageDownloadTokens: 'token' } } }; store = { 'studentLinks/student-uid': { classId: 'class', studentId: 'student', teacherId: 'teacher' }, 'classes/class': { teacherId: 'teacher', joinCode: 'CODE' }, 'classes/class/students/student': { name: 'HS' }, 'classes/class/parentSecrets/student': { pinHash: hashPin('2468'), pinSetBy: 'parent', updatedAt: 'now' }, 'assignments/a': { classId: 'class', teacherId: 'teacher', type: 'upload', title: 'Bài', isOpen: false }, 'submissions/s': { classId: 'class', teacherId: 'teacher', studentId: 'student', assignmentId: 'a', fileUrls: [], status: 'graded', grade: { teacherApproved: true, score: 8, maxScore: 10, questionResults: [{ questionNumber: 'Câu 1' }] } } }; h.db = makeDb(store); });

beforeEach(() => { h.uid='teacher'; store['classes/class'].studentCount=1; store['classes/class/students/student']={id:'student',name:'Tên đã được GV soát',code:'AB12',progress:70,status:'excellent'}; });
it('missing-only roster transaction preserves existing names/IDs/grades, normalizes codes and rejects duplicate source',async()=>{
 const before=structuredClone(store['classes/class/students/student']);
 const result=await call({action:'syncSsmRosterMissing',classId:'class',students:[{id:'ssm-a',name:'Tên khác',code:'ab12'},{id:'ssm-b',name:'HS mới',code:'AB13'},{id:'ssm-b2',name:'HS trùng',code:'ab13'}]});
 expect(result.status).toBe(200);expect(result.payload.added).toBe(1);expect(store['classes/class/students/student']).toEqual(before);expect(result.payload.students).toHaveLength(2);expect(store['classes/class'].studentCount).toBe(2);
 expect((await call({action:'syncSsmRosterMissing',classId:'class',students:[{id:'ssm-b',name:'newname',code:'AB13'}]})).payload.added).toBe(0);
});
it('wrong UID or revoked member cannot sync; malformed rows create no partial data',async()=>{
 h.uid='other';expect((await call({action:'syncSsmRosterMissing',classId:'class',students:[{id:'x',name:'X',code:'AB13'}]})).status).toBe(403);
 h.uid='teacher';const before=structuredClone(store);
 expect((await call({action:'syncSsmRosterMissing',classId:'class',students:[{id:'x',name:'X',code:'AB13'},{id:'y',name:'',code:'AB14'}]})).status).toBe(422);expect(store).toEqual(before);
});
