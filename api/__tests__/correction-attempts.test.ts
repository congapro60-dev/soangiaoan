import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../classroom';
import gradeHandler from '../grade-homework';
import { handleReviewCorrectionAttempt, buildCorrectionReviewPrompt } from '../_correction-attempts';
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
const parent = { role: 'parent', joinCode: 'CODE', studentId: 'student', pin: '2468' };
const grant = async (credentials: Data = {}) => {
 const result = await call({ ...credentials, action: 'issueSubmissionUpload', assignmentId: 'a', submissionId: 's', purpose: 'correction', files: [{ name: 'chua.jpg', mimeType: 'image/jpeg', size: 100 }] });
 expect(result.status).toBe(200); const uploadGrantId = result.payload.uploadGrantId;
 for (const file of store[`submissionUploadGrants/${uploadGrantId}`].files) h.metadata[file.path] = { name: file.path, contentType: file.mimeType, size: String(file.size), generation: '1' };
 return uploadGrantId;
};
const save = async (uploadGrantId: string) => call({ action: 'saveCorrectionAttempt', submissionId: 's', uploadGrantId, score: 10, studentId: 'forged' });
const review = async (correctionAttemptId: string, assess: (submission: any, attempt: any) => Promise<string>, credentials: Data = {}) => {
 const state = { status: 0, payload: {} as Data }; const res = { status(code: number) { state.status = code; return res; }, json(data: Data) { state.payload = data; return res; } };
 await handleReviewCorrectionAttempt(h.db, { idToken: 't', ...credentials, submissionId: 's', correctionAttemptId }, res as never, { assess }); return state;
};
describe('correction practice attempts are independent from official evidence', () => {
 it.each([undefined, 'invalid', NaN])('invalid review lease %s projects retryable while preserving pictures', async lease => {
  const attempt = (await save(await grant())).payload.attempt;
  store[`correctionAttempts/${attempt.id}`].status = 'reviewing'; store[`correctionAttempts/${attempt.id}`].reviewLeaseUntil = lease;
  const list = await call({ action: 'correctionAttempts', submissionId: 's' }); expect(list.payload.attempts[0]).toMatchObject({ status: 'error', fileUrls: attempt.fileUrls, errorMessage: expect.any(String) });
 });
 it.each(['done','skipped'])('includes finalized clarification photos once in correction review context (%s)', async state => {
  store['submissions/s'].fileUrls = ['https://source/original.jpg'];
  store['submissions/s'].grade.questionResults[0].clarify = { kind: 'photo', state, photoUrls: ['https://source/clear.jpg', 'https://source/original.jpg'] };
  const attempt = (await save(await grant())).payload.attempt;
  const fetch = vi.fn(async (_url: unknown) => ({ ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => new Uint8Array([1,2,3]).buffer })); vi.stubGlobal('fetch', fetch);
  const result = { status: 0 }; const res = { status(code: number) { result.status = code; return res; }, json() { return res; } };
  try {
   await gradeHandler({ method: 'POST', body: { action: 'reviewCorrectionAttempt', idToken: 't', submissionId: 's', correctionAttemptId: attempt.id } } as never, res as never);
   expect(result.status).toBe(200); expect(h.ai.mock.calls[0][0]).toContain('Ảnh1–2');
   expect(fetch.mock.calls.filter(args => args[0] === 'https://source/clear.jpg')).toHaveLength(1);
   expect(fetch.mock.calls.filter(args => args[0] === 'https://source/original.jpg')).toHaveLength(1);
  } finally { vi.unstubAllGlobals(); }
 });
 it('recalculates the model budget after key and quota preparation', async () => {
  const attempt = (await save(await grant())).payload.attempt;
  const start = Date.now(); let now = start; const clock = vi.spyOn(Date, 'now').mockImplementation(() => now); h.afterQuota = () => { now = start + 260000; };
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => new Uint8Array([1,2,3]).buffer })));
  const result = { status: 0 }; const res = { status(code: number) { result.status = code; return res; }, json() { return res; } };
  try {
   await gradeHandler({ method: 'POST', body: { action: 'reviewCorrectionAttempt', idToken: 't', submissionId: 's', correctionAttemptId: attempt.id } } as never, res as never);
   expect(result.status).toBe(200); expect(h.ai.mock.calls[0][4].timeoutMs).toBe(25000);
  } finally { h.afterQuota = undefined; clock.mockRestore(); vi.unstubAllGlobals(); }
 });
 it('locked assignment saves correction photos separately, unchanged original, no score allowed', async () => {
  store['assignments/a'].submissionLocked = true; const original = structuredClone(store['submissions/s']);
  const uploaded = await grant(); const saved = await save(uploaded); expect(saved.status).toBe(200);
  expect(saved.payload.attempt).toMatchObject({ studentId: 'student', status: 'saved', submissionId: 's' }); expect(saved.payload.attempt).not.toHaveProperty('score');
  expect(store['submissions/s']).toEqual(original); expect((await call({ action: 'correctionAttempts', submissionId: 's' })).payload.attempts).toHaveLength(1);
  expect((await save(uploaded)).status).toBe(422);
 });
 it('unpublished grade, wrong student and parent cannot upload corrections', async () => {
  store['submissions/s'].grade.teacherApproved = false;
  expect((await call({ action: 'issueSubmissionUpload', assignmentId: 'a', submissionId: 's', purpose: 'correction', files: [{ name: 'x.jpg', mimeType: 'image/jpeg', size: 100 }] })).status).toBe(409);
  store['submissions/s'].grade.teacherApproved = true; h.uid = 'other'; expect((await call({ action: 'correctionAttempts', submissionId: 's' })).status).toBe(403);
 });
 it('submission grant cannot be reused as correction; teacher cannot finalize a forged grant', async () => {
  const result = await call({ action: 'issueSubmissionUpload', assignmentId: 'a', files: [{ name: 'x.jpg', mimeType: 'image/jpeg', size: 100 }] });
  expect((await save(result.payload.uploadGrantId)).status).toBe(422);
  h.uid = 'teacher'; expect((await call({ action: 'correctionAttempts', role: 'teacher', submissionId: 's' })).status).toBe(200);
  expect((await call({ action: 'saveCorrectionAttempt', role: 'teacher', submissionId: 's', uploadGrantId: 'forged' })).status).toBe(422);
 });
 it('optional AI returns descriptive outcome, ignores fabricated score and never mutates grade', async () => {
  const attempt = (await save(await grant())).payload.attempt; const original = structuredClone(store['submissions/s']);
  const model = vi.fn(async () => JSON.stringify({ outcome: 'achieved', feedback: 'Em đã sửa đúng bước kết luận.', score: 10, maxScore: 10 }));
  const done = await review(attempt.id, model); expect(done.status).toBe(200); expect(done.payload.attempt.assessment).toEqual({ outcome: 'achieved', feedback: 'Em đã sửa đúng bước kết luận.' });
  expect(store['submissions/s']).toEqual(original); expect(await review(attempt.id, model)).toMatchObject({ status: 200 }); expect(model).toHaveBeenCalledTimes(1);
 });
 it.each(['student','parent'])('%s save/list/review DTO strips actor UIDs but retains provenance',async role=>{
  const credentials=role==='parent'?parent:{};const grantId=await grant(credentials);
  const result=await call({action:'saveCorrectionAttempt',...credentials,submissionId:'s',uploadGrantId:grantId});
  const attempt=result.payload.attempt;expect(attempt.submittedBy.role).toBe(role);expect(attempt.submittedBy).not.toHaveProperty('uid');
  const reviewed=await review(attempt.id,async()=>'{"outcome":"achieved","feedback":"Bài chữa đã đầy đủ các bước."}',credentials);
  expect(reviewed.status).toBe(200);expect(reviewed.payload.attempt.reviewedBy.role).toBe(role);expect(reviewed.payload.attempt.reviewedBy).not.toHaveProperty('uid');
  expect((await review(attempt.id,async()=>{throw new Error('cached');},credentials)).payload.attempt.reviewedBy).not.toHaveProperty('uid');
  const list=await call({action:'correctionAttempts',...credentials,submissionId:'s'});expect(list.payload.attempts[0].submittedBy).not.toHaveProperty('uid');expect(list.payload.attempts[0].reviewedBy).not.toHaveProperty('uid');
 });
 it('failed review preserves saved photos and supports retry without upload', async () => {
  const attempt = (await save(await grant())).payload.attempt;
  expect((await review(attempt.id, async () => { throw new Error('offline'); })).status).toBe(422);
  expect(store[`correctionAttempts/${attempt.id}`]).toMatchObject({ status: 'error', fileUrls: attempt.fileUrls });
  expect((await review(attempt.id, async () => '{"outcome":"uncertain","feedback":"Ảnh chưa đọc rõ, em kiểm tra ánh sáng."}')).status).toBe(200);
 });
 it('deletion claim rejects correction save and AI finalization without consuming the grant or changing grade', async () => {
  const attempt = (await save(await grant())).payload.attempt;
  const originalGrade = structuredClone(store['submissions/s'].grade);
  const uploadGrantId = await grant();
  h.copy.mockImplementation(async () => { store['submissions/s'].deletionRunId = 'deleting'; return []; });
  expect((await save(uploadGrantId)).status).toBe(409);
  expect(store[`submissionUploadGrants/${uploadGrantId}`].consumed).toBe(false);
  expect(Object.keys(store).filter(path => path.startsWith('correctionAttempts/'))).toHaveLength(1);
  delete store['submissions/s'].deletionRunId;
  const result = await review(attempt.id, async () => { store['submissions/s'].deletionRunId = 'deleting'; return '{"outcome":"achieved","feedback":"Không được lưu sau khi xóa bắt đầu."}'; });
  expect(result.status).toBe(409);
  expect(store[`correctionAttempts/${attempt.id}`].assessment).toBeUndefined();
  expect(store['submissions/s'].grade).toEqual(originalGrade);
 });
 it('concurrent clicks claim only one review and revoked enrollment cannot finalize a correction', async () => {
  const attempt = (await save(await grant())).payload.attempt; let release: (result: string) => void = () => undefined;
  const model = vi.fn(() => new Promise<string>(resolve => { release = resolve; }));
  const pending = review(attempt.id, model); await vi.waitFor(() => expect(model).toHaveBeenCalledTimes(1));
  expect((await review(attempt.id, model)).status).toBe(409); release('{"outcome":"needs_work","feedback":"Em cần ghi bước kiểm tra điều kiện."}'); await pending;
  const uploaded = await grant(); h.copy.mockImplementation(async () => { delete store['classes/class/students/student']; return []; });
  expect((await save(uploaded)).status).toBe(403);
 }); it('review prompt explains corrected steps, remaining mistakes, reasons and next action without score', () => {
  const prompt = buildCorrectionReviewPrompt(store['submissions/s'] as any, { note: 'Em sửa câu 1' } as any, 1);
  for (const requirement of ['So sánh với bài gốc', 'từng câu/bước', 'VÌ SAO', 'điều kiện/kết luận', 'bước kiểm tra tiếp theo', 'Đúng/Sai', 'thiếu ảnh/mờ', 'Không sinh điểm số']) expect(prompt).toContain(requirement);
 });
 it('correction grant binds exact submission and fresh approval; only image objects accepted', async () => {
  const uploadGrantId = await grant(); store['submissions/other'] = { ...store['submissions/s'], id: 'other' };
  expect((await call({ action: 'saveCorrectionAttempt', submissionId: 'other', uploadGrantId })).status).toBe(422);
  store['submissions/s'].grade.teacherApproved = false; expect((await save(uploadGrantId)).status).toBe(409);
 });
it('parent can list/save/review corrections for their linked child only', async () => {
  expect((await call({ action: 'correctionAttempts', ...parent, submissionId: 's' })).status).toBe(200);
  const grantId = await grant(parent); const attempt = (await call({ action: 'saveCorrectionAttempt', ...parent, submissionId: 's', uploadGrantId: grantId })).payload.attempt;
  expect(attempt.submittedBy.role).toBe('parent');
  expect((await review(attempt.id, async () => '{"outcome":"achieved","feedback":"Bố mẹ cùng đối chiếu bài chữa."}', parent)).status).toBe(200);
  store['classes/class/students/other'] = {name:'HS khác'};
  store['classes/class/parentSecrets/other'] = {pinHash:hashPin('2468'),pinSetBy:'parent',updatedAt:'now'};
  expect((await call({ action: 'correctionAttempts', ...parent, studentId: 'other', submissionId: 's' })).status).toBe(403);
 });
 it('parent PIN reset during AI rejects commit and preserves saved photos and grade', async()=>{
  const grantId=await grant(parent); const attempt=(await call({action:'saveCorrectionAttempt',...parent,submissionId:'s',uploadGrantId:grantId})).payload.attempt;
  const original=structuredClone(store['submissions/s']);
  const done=await review(attempt.id,async()=>{store['classes/class/parentSecrets/student'].pinHash=hashPin('9999');return '{"outcome":"achieved","feedback":"Nhận xét không được công bố sau thu hồi PIN."}';},parent);
  expect(done.status).toBe(401);expect(store['submissions/s']).toEqual(original);expect(store[`correctionAttempts/${attempt.id}`]).toMatchObject({status:'error',fileUrls:attempt.fileUrls});
 });
 it.each(['student','teacher','parent'])('review prompt names %s provenance without claiming authorship',role=>{
  const prompt=buildCorrectionReviewPrompt(store['submissions/s'] as any,{submittedBy:{role}} as any,1);
  expect(prompt).toContain(role==='teacher'?'do giáo viên nộp hộ học sinh':role==='parent'?'do phụ huynh nộp hộ học sinh':'do học sinh gửi');
  expect(prompt).toContain('không suy ra ai viết hoặc chụp');expect(prompt).toContain('Không sinh điểm số');
 });
 it.each(['image','pdf'])('manual-only published %s supports corrections without leaking unpublished grade',async kind=>{
  store['submissions/s'].grade={teacherApproved:false,score:9,maxScore:10,questionResults:[{questionNumber:'SECRET QUESTION',expectedAnswer:'SECRET KEY',explanation:'SECRET FEEDBACK'}]};
  store['submissions/s'].status='submitted';
  store['submissions/s'].handMarkedPublished=true;
  store['submissions/s'].handMarkedEvidence={id:'review',note:'GV lưu ý bước kết luận',files:[{id:'file',kind}],submittedBy:{role:'teacher',studentId:'student',at:'now'},createdAt:'now'};
  store['submissionHandMarkedReviews/review']={submissionId:'s',classId:'class',studentId:'student',teacherId:'teacher',files:[{id:'file',kind,path:'hand-marked-homework/class/student/private'}]};
  const original=structuredClone(store['submissions/s']);const grantId=await grant(parent);
  const attempt=(await call({action:'saveCorrectionAttempt',...parent,submissionId:'s',uploadGrantId:grantId})).payload.attempt;
  expect(attempt.submittedBy.role).toBe('parent');
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,headers:{get:()=> 'image/jpeg'},arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer})));
  const result={status:0,payload:{} as Data};const res={status(code:number){result.status=code;return res;},json(data:Data){result.payload=data;return res;}};
  await gradeHandler({method:'POST',body:{action:'reviewCorrectionAttempt',...parent,submissionId:'s',correctionAttemptId:attempt.id}} as never,res as never);
  expect(result.status).toBe(200);expect(store['submissions/s']).toEqual(original);
  if(kind==='image'){expect(h.ai).toHaveBeenCalledTimes(1);const prompt=h.ai.mock.calls[0][0];expect(prompt).toContain('GV lưu ý bước kết luận');expect(prompt).not.toContain('SECRET');}
  else{expect(h.ai).not.toHaveBeenCalled();expect(result.payload.attempt.assessment.outcome).toBe('uncertain');expect(result.payload.attempt.assessment.feedback).toContain('PDF');}
  store['submissions/s'].handMarkedPublished=false;
  expect((await call({action:'correctionAttempts',...parent,submissionId:'s'})).payload.attempts[0].fileUrls).toEqual(attempt.fileUrls);
  expect((await call({action:'correctionAttempts',submissionId:'s'})).status).toBe(200);
  vi.unstubAllGlobals();
 });
 it('real grade-homework dispatcher uses student quota once and never modifies official evidence', async () => {
  const attempt = (await save(await grant())).payload.attempt;
  const before = structuredClone(store['submissions/s']);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => new Uint8Array([1,2,3]).buffer })));
  const result = { status: 0, payload: {} as Data }; const res = { status(code: number) { result.status = code; return res; }, json(data: Data) { result.payload = data; return res; } };
  await gradeHandler({ method: 'POST', body: { action: 'reviewCorrectionAttempt', idToken: 't', submissionId: 's', correctionAttemptId: attempt.id } } as never, res as never);
  expect(result.status).toBe(200); expect(result.payload.attempt.status).toBe('reviewed'); expect(h.ai).toHaveBeenCalledTimes(1);
  expect(store['gradingQuota/teacher'].selfCount).toBe(1); expect(store['submissions/s']).toEqual(before);
  expect(h.ai.mock.calls[0][0]).toContain('ĐÁNH GIÁ BÀI CHỮA');
  vi.unstubAllGlobals();
 });
 it('grade edits while AI runs reject stale correction feedback, keeping images and original edited grade', async () => {
  const attempt = (await save(await grant())).payload.attempt;
  const result = await review(attempt.id, async () => { store['submissions/s'].grade.score = 9; return '{"outcome":"achieved","feedback":"Em đã sửa đúng."}'; });
  expect(result.status).toBe(409); expect(store['submissions/s'].grade.score).toBe(9); expect(store[`correctionAttempts/${attempt.id}`].status).toBe('error'); expect(store[`correctionAttempts/${attempt.id}`].fileUrls).toEqual(attempt.fileUrls);
 });
 it('stale reviewing lease is projected retryable and resumes with saved photos', async () => {
  const attempt = (await save(await grant())).payload.attempt; store[`correctionAttempts/${attempt.id}`].status = 'reviewing'; store[`correctionAttempts/${attempt.id}`].reviewLeaseUntil = Date.now() - 1;
  const list = await call({ action: 'correctionAttempts', submissionId: 's' }); expect(list.payload.attempts[0]).toMatchObject({ status: 'error', fileUrls: attempt.fileUrls });
  expect((await review(attempt.id, async () => '{"outcome":"achieved","feedback":"Bài chữa đã có đủ bước kiểm tra."}')).status).toBe(200);
 });
 it('changed original grade hides old assessment and reruns explicit review; teacher still reads history after unpublish', async () => {
  const attempt = (await save(await grant())).payload.attempt; const model = vi.fn(async () => '{"outcome":"achieved","feedback":"Bài chữa đã có đủ bước kiểm tra."}');
  await review(attempt.id, model); store['submissions/s'].grade.score = 9;
  const list = await call({ action: 'correctionAttempts', submissionId: 's' }); expect(list.payload.attempts[0].assessment).toBeUndefined(); expect(list.payload.attempts[0].status).toBe('error');
  expect((await review(attempt.id, model)).status).toBe(200); expect(model).toHaveBeenCalledTimes(2);
  store['submissions/s'].grade.teacherApproved = false; h.uid = 'teacher'; expect((await call({ action: 'correctionAttempts', role: 'teacher', submissionId: 's' })).status).toBe(200);
 });
 it('failed retry cannot re-expose stale assessment from before original grade edit', async () => {
  const attempt = (await save(await grant())).payload.attempt; await review(attempt.id, async () => '{"outcome":"achieved","feedback":"Bài chữa đã đủ bước."}');
  store['submissions/s'].grade.score = 9; await review(attempt.id, async () => { throw new Error('offline'); });
  const list = await call({ action: 'correctionAttempts', submissionId: 's' }); expect(list.payload.attempts[0].assessment).toBeUndefined(); expect(list.payload.attempts[0].status).toBe('error');
 });
 it('AI correction review uses shared worked solution context without writing it into official grade', async () => {
  store['assignments/a'].questionCatalog = [{ questionNumber: 'Câu 1', content: 'Tính 1+1', expectedAnswer: 'B' }];
  store['assignments/a'].sourceText = 'Tính 1+1'; store['assignments/a'].answerKey = 'Câu 1: B';
  const version = workedSolutionVersion(assignmentSolutionInput(store['assignments/a']));
  store['assignments/a'].workedSolutions = { version, generatedAt: 'now', status: 'ready', questions: [{ questionNumber: 'Câu 1', workedSolution: 'LỜI GIẢI CHUNG KIỂM CHỨNG', status: 'ready' }] };
  const attempt = (await save(await grant())).payload.attempt; const before = structuredClone(store['submissions/s']);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => new Uint8Array([1,2,3]).buffer })));
  const result = { status: 0 }; const res = { status(code: number) { result.status = code; return res; }, json() { return res; } };
  await gradeHandler({ method: 'POST', body: { action: 'reviewCorrectionAttempt', idToken: 't', submissionId: 's', correctionAttemptId: attempt.id } } as never, res as never);
  expect(result.status).toBe(200); expect(h.ai.mock.calls[0][0]).toContain('LỜI GIẢI CHUNG KIỂM CHỨNG'); expect(store['submissions/s']).toEqual(before); vi.unstubAllGlobals();
  store['assignments/a'].workedSolutions.questions[0].workedSolution = 'GV vừa sửa lời giải';
  expect((await call({ action: 'correctionAttempts', submissionId: 's' })).payload.attempts[0].assessment).toBeUndefined();
 });

});
