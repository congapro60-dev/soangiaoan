import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../classroom';
import gradeHandler from '../grade-homework';
import { hashPin } from '../_classroom-core';
import { projectStudentSubmission } from '../classroom';
type Data = Record<string, any>;
const h = vi.hoisted(() => ({ uid: 'student-uid', db: null as any, metadata: {} as Record<string, any>, setMetadata: vi.fn(async () => []), signed: vi.fn(async () => ['SIGNED']), copy: vi.fn(async () => []), beforeCommit: undefined as undefined | (() => void), afterQuota: undefined as undefined | (() => void), ai: vi.fn(async () => '{"outcome":"achieved","feedback":"Em đã sửa đúng bước kết luận."}') }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: async () => ({ uid: h.uid }), getUser: async () => ({ email: 'teacher@test.dev' }) }) }));
vi.mock('../_exam-core.js', () => ({ getAdminDb: () => h.db, getAdminStorage: () => ({ name: 'test.firebasestorage.app', file: (path: string) => ({ getMetadata: async () => [h.metadata[path]], getSignedUrl: h.signed, createResumableUpload: h.signed, setMetadata: h.setMetadata, copy: h.copy, delete: async () => undefined }) }), stripAnswerKey: (q: Data) => q }));
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
const call = async (body: Data) => { const result = { status: 0, payload: {} as Data }; const res = { setHeader() { return res; }, status(code: number) { result.status = code; return res; }, json(data: Data) { result.payload = data; return res; } }; await handler({ method: 'POST', body: { idToken: 't', ...body } } as never, res as never); return result; };
const callGrade = async (body: Data) => { const result = { status: 0, payload: {} as Data }; const res = { status(code: number) { result.status = code; return res; }, json(data: Data) { result.payload = data; return res; } }; await gradeHandler({ method:'POST', body:{idToken:'t',...body} } as never, res as never); return result; };
beforeEach(() => { h.uid = 'student-uid'; h.beforeCommit = undefined; h.copy.mockReset(); h.copy.mockResolvedValue([]); h.signed.mockClear(); h.ai.mockClear(); process.env.GRADING_GEMINI_API_KEY = 'test-key'; h.metadata = { 'homework/student-uid/a.jpg': { name: 'homework/student-uid/a.jpg', size: '100', contentType: 'image/jpeg', metadata: { firebaseStorageDownloadTokens: 'token' } } }; store = { 'studentLinks/student-uid': { classId: 'class', studentId: 'student', teacherId: 'teacher' }, 'classes/class': { teacherId: 'teacher', joinCode: 'CODE' }, 'classes/class/students/student': { name: 'HS' }, 'classes/class/parentSecrets/student': { pinHash: hashPin('2468'), pinSetBy: 'parent', updatedAt: 'now' }, 'assignments/a': { classId: 'class', teacherId: 'teacher', type: 'upload', title: 'Bài', isOpen: false }, 'submissions/s': { classId: 'class', teacherId: 'teacher', studentId: 'student', assignmentId: 'a', fileUrls: [], status: 'graded', grade: { teacherApproved: true, score: 8, maxScore: 10, questionResults: [{ questionNumber: 'Câu 1' }] } } }; h.db = makeDb(store); });
const parent = { role: 'parent', joinCode: 'CODE', studentId: 'student', pin: '2468' };
const upload = async () => {
 h.uid = 'teacher';
 const granted = await call({ action: 'issueSubmissionUpload', role: 'teacher', assignmentId: 'a', submissionId: 's', files: [{name:'cham.pdf',mimeType:'application/pdf',size:100}], purpose: 'hand_marked', studentId: 'student' });
 expect(granted.status).toBe(200);
 const uploadGrantId = granted.payload.uploadGrantId;
 for (const file of store[`submissionUploadGrants/${uploadGrantId}`].files) h.metadata[file.path] = { name: file.path, contentType: file.mimeType, size: String(file.size), generation:'1' };
 return uploadGrantId;
};
const save = async () => call({action:'saveHandMarkedWork',role:'teacher',submissionId:'s',uploadGrantId:await upload(),note:'Nhận xét GV'});
const visibility = (id:string,published:boolean) => call({action:'setHandMarkedVisibility',role:'teacher',submissionId:'s',expectedReviewId:id,published});
const read = (id:string,fileId:string,credentials:Data={}) => call({action:'readHandMarkedFile',submissionId:'s',reviewId:id,fileId,...credentials});
it('teacher private upload defaults hidden, contains no URLs, preserves raw submission and can publish without AI grade',async()=>{
 h.setMetadata.mockClear();
 delete store['submissions/s'].grade; store['submissions/s'].status='submitted'; const before=structuredClone(store['submissions/s']);
 const result=await save(); expect(result.status).toBe(200); const evidence=result.payload.handMarkedEvidence;
 expect(h.setMetadata).toHaveBeenCalledWith({ contentType: 'application/pdf', metadata: { firebaseStorageDownloadTokens: null } });
 expect(evidence.files[0]).toMatchObject({name:'cham.pdf',kind:'pdf'}); expect(JSON.stringify(evidence)).not.toMatch(/https:|path|token|SIGNED/);
 expect(store['submissions/s']).toMatchObject({...before,handMarkedPublished:false});
 h.uid='student-uid'; expect(projectStudentSubmission('s',store['submissions/s'])).toMatchObject({handMarkedPublished:false}); expect(projectStudentSubmission('s',store['submissions/s']).handMarkedEvidence).toBeUndefined(); expect((await read(evidence.id,evidence.files[0].id)).status).toBe(403);
 h.uid='teacher'; expect((await visibility(evidence.id,true)).status).toBe(200);
 const dto=projectStudentSubmission('s',store['submissions/s']); expect(dto.handMarkedEvidence?.id).toBe(evidence.id); expect(dto.handMarkedEvidence?.submittedBy).not.toHaveProperty('uid');
 h.uid='student-uid'; const opened=await read(evidence.id,evidence.files[0].id); expect(opened.status).toBe(200); expect(opened.payload.url).toBe('SIGNED');
 expect(h.signed).toHaveBeenLastCalledWith(expect.objectContaining({action:'read',expires:expect.any(Number)}));
 expect((await read(evidence.id,evidence.files[0].id,parent)).status).toBe(200);
});
it('unpublish/new upload revoke future file access, expected revision prevents wrong publication',async()=>{
 const first=(await save()).payload.handMarkedEvidence; await visibility(first.id,true);
 const next=(await save()).payload.handMarkedEvidence; expect(next.id).not.toBe(first.id); expect(store['submissions/s'].handMarkedPublished).toBe(false);
 expect((await visibility(first.id,true)).status).toBe(409); h.uid='student-uid'; expect((await read(first.id,first.files[0].id)).status).toBe(409);
 h.uid='teacher'; await visibility(next.id,true); await visibility(next.id,false); h.uid='student-uid'; expect((await read(next.id,next.files[0].id)).status).toBe(403);
 expect(Object.keys(store).filter(k=>k.startsWith('submissionHandMarkedReviews/'))).toHaveLength(2);
});
it('only teacher uploads/publishes; PIN revocation, wrong student, metadata mismatch and lock fail closed',async()=>{
 const grant=await upload(); const grantPath=store[`submissionUploadGrants/${grant}`].files[0].path; h.metadata[grantPath].size='101';
 expect((await call({action:'saveHandMarkedWork',role:'teacher',submissionId:'s',uploadGrantId:grant})).status).toBe(422);
 h.metadata[grantPath].size='100'; store['assignments/a'].submissionLocked=true;
 expect((await call({action:'saveHandMarkedWork',role:'teacher',submissionId:'s',uploadGrantId:grant})).status).toBe(409); store['assignments/a'].submissionLocked=false;
 const evidence=(await save()).payload.handMarkedEvidence; store['assignments/a'].submissionLocked=true; expect((await visibility(evidence.id,true)).status).toBe(200);
 h.uid='student-uid'; expect((await call({action:'setHandMarkedVisibility',submissionId:'s',expectedReviewId:evidence.id,published:false})).status).toBe(403);
 expect((await read(evidence.id,evidence.files[0].id,{...parent,pin:'9999'})).status).toBe(401);
 h.uid='other'; expect((await read(evidence.id,evidence.files[0].id)).status).toBe(403);
});
it('teacher may save and AI-review an HS correction with teacher provenance',async()=>{
 h.uid='teacher';
 const correctionGrant=await (async()=>{const granted=await call({action:'issueSubmissionUpload',role:'teacher',assignmentId:'a',submissionId:'s',purpose:'correction',files:[{name:'fix.jpg',mimeType:'image/jpeg',size:100}],studentId:'student'});expect(granted.status).toBe(200);for(const file of store[`submissionUploadGrants/${granted.payload.uploadGrantId}`].files)h.metadata[file.path]={name:file.path,contentType:file.mimeType,size:String(file.size),generation:'1'};return granted.payload.uploadGrantId;})();
 const saved=await call({action:'saveCorrectionAttempt',role:'teacher',submissionId:'s',uploadGrantId:correctionGrant});expect(saved.status).toBe(200);expect(saved.payload.attempt.submittedBy.role).toBe('teacher');expect((await call({action:'correctionAttempts',role:'teacher',submissionId:'s'})).payload.attempts[0].submittedBy.role).toBe('teacher');
 vi.stubGlobal('fetch', async()=>({ok:true,headers:{get:()=> 'image/jpeg'},arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer}));
 const reviewed=await callGrade({action:'reviewCorrectionAttempt',role:'teacher',submissionId:'s',correctionAttemptId:saved.payload.attempt.id});expect(reviewed.status).toBe(200);expect(reviewed.payload.attempt.assessment).toBeDefined();vi.unstubAllGlobals();
});
it('lock during finalize copies neither changes grade nor consumes grant',async()=>{
 const grant=await upload(); const before=structuredClone(store['submissions/s']); h.copy.mockImplementation(async()=>{store['assignments/a'].submissionLocked=true;return[];});
 expect((await call({action:'saveHandMarkedWork',role:'teacher',submissionId:'s',uploadGrantId:grant})).status).toBe(409);
 expect(store['submissions/s']).toEqual(before); expect(store[`submissionUploadGrants/${grant}`].consumed).toBe(false);
});
it('unpublish during signed URL mint refuses delivery and upload grants honor hard lock',async()=>{
 const evidence=(await save()).payload.handMarkedEvidence;await visibility(evidence.id,true);h.uid='student-uid';
 h.signed.mockImplementationOnce(async()=>{store['submissions/s'].handMarkedPublished=false;return ['SIGNED'];});
 expect((await read(evidence.id,evidence.files[0].id)).status).toBe(403);
 h.uid='teacher';store['assignments/a'].submissionLocked=true;
 expect((await call({action:'issueSubmissionUpload',role:'teacher',assignmentId:'a',submissionId:'s',studentId:'student',purpose:'hand_marked',files:[{name:'a.jpg',mimeType:'image/jpeg',size:100}]})).status).toBe(409);
});
