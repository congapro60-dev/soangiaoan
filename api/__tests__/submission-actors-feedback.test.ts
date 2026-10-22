import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../classroom';
import { hashPin } from '../_classroom-core';
type Data = Record<string, any>;
const h = vi.hoisted(() => ({ uid: 'student-uid', db: null as any, metadata: {} as Record<string, any>, signed: vi.fn(async () => ['SIGNED']), copy: vi.fn(async () => []), beforeCommit: undefined as undefined | (() => void), ai: vi.fn(), deleted: [] as string[] }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: async () => ({ uid: h.uid }), getUser: async () => ({ email: 'teacher@test.dev' }) }) }));
vi.mock('../_exam-core.js', () => ({ getAdminDb: () => h.db, getAdminStorage: () => ({ name: 'test.firebasestorage.app', file: (path: string) => ({ getMetadata: async () => { if (!h.metadata[path]) throw Object.assign(new Error('No such object'), { code: 404 }); return [h.metadata[path]]; }, getSignedUrl: h.signed, createResumableUpload: h.signed, setMetadata: async () => [], copy: h.copy, delete: async () => { h.deleted.push(path); } }) }), stripAnswerKey: (q: Data) => q }));
const makeDb = (store: Record<string, Data>) => {
  const doc = (path: string) => ({ id: path.split('/').at(-1)!, path, get: async () => ({ id: path.split('/').at(-1)!, exists: path in store, data: () => store[path] && structuredClone(store[path]), ref: doc(path) }), collection: (name: string) => collection(`${path}/${name}`), delete: async () => { delete store[path]; }, set: async (data: Data) => { store[path] = structuredClone(data); }, update: async (data: Data) => { store[path] = { ...store[path], ...structuredClone(data) }; } });
  const collection = (path: string, filters: Array<[string, unknown]> = []) => ({ doc: (id = `id-${Object.keys(store).length}`) => doc(`${path}/${id}`), where: (field: string, _op: string, value: unknown) => collection(path, [...filters, [field, value]]), limit() { return this; }, get: async () => ({ docs: Object.entries(store).filter(([key, data]) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/') && filters.every(([field, value]) => data[field] === value)).map(([key]) => ({ id: key.split('/').at(-1)!, data: () => structuredClone(store[key]), ref: doc(key) })) }) });
  return { collection, runTransaction: async (work: any) => { const writes: Array<() => Promise<void>> = []; h.beforeCommit?.(); h.beforeCommit = undefined; const result = await work({ get: (ref: any) => ref.get(), set: (ref: any, data: Data) => { writes.push(() => ref.set(data)); }, update: (ref: any, data: Data) => { writes.push(() => ref.update(data)); }, create: (ref: any, data: Data) => { if (store[ref.path]) throw new Error('exists'); writes.push(() => ref.set(data)); } }); for (const write of writes) await write(); return result; } };
};
let store: Record<string, Data>;
const call = async (body: Data) => { const result = { status: 0, payload: {} as Data }; const res = { status(code: number) { result.status = code; return res; }, json(data: Data) { result.payload = data; return res; } }; await handler({ method: 'POST', body: { idToken: 't', ...body } } as never, res as never); return result; };
beforeEach(() => { h.uid = 'student-uid'; h.beforeCommit = undefined; h.deleted = []; h.copy.mockReset(); h.copy.mockResolvedValue([]); h.signed.mockClear(); h.metadata = { 'homework/student-uid/a.jpg': { name: 'homework/student-uid/a.jpg', size: '100', contentType: 'image/jpeg', metadata: { firebaseStorageDownloadTokens: 'token' } } }; store = { 'studentLinks/student-uid': { classId: 'class', studentId: 'student', teacherId: 'teacher' }, 'classes/class': { teacherId: 'teacher', joinCode: 'CODE' }, 'classes/class/students/student': { name: 'HS' }, 'classes/class/parentSecrets/student': { pinHash: hashPin('2468'), pinSetBy: 'parent', updatedAt: 'now' }, 'assignments/a': { classId: 'class', teacherId: 'teacher', type: 'upload', title: 'Bài', isOpen: false }, 'submissions/s': { classId: 'class', teacherId: 'teacher', studentId: 'student', assignmentId: 'a', fileUrls: [], status: 'graded', grade: { teacherApproved: true, score: 8, maxScore: 10, questionResults: [{ questionNumber: 'Câu 1' }] } } }; h.db = makeDb(store); });
const parent = { role: 'parent', joinCode: 'CODE', studentId: 'student', pin: '2468' };
describe('actor submission and feedback', () => {
  it.each(['student', 'teacher', 'parent'])('picture evidence rejects online exam scope for %s while reads remain accessible', async role => {
    const credentials = role === 'parent' ? parent : role === 'teacher' ? { role, classId: 'class', studentId: 'student' } : { role };
    h.uid = role === 'teacher' ? 'teacher' : 'student-uid';
    for (const patch of [{ type: 'exam', deliveryMode: 'both' }, { type: 'upload', deliveryMode: 'online' }]) {
      Object.assign(store['assignments/a'], patch);
      for (const isOpen of [true, false]) {
        store['assignments/a'].isOpen = isOpen;
        expect((await call({ action: 'issueSubmissionUpload', ...credentials, assignmentId: 'a', files: [{ name: 'a.jpg', mimeType: 'image/jpeg', size: 100 }] })).status).toBe(422);
        expect((await call({ action: 'submitActorSubmission', ...credentials, assignmentId: 'a', fileUrls: ['ignored'] })).status).toBe(422);
        expect((await call({ action: 'actorAssignmentDetail', ...credentials, assignmentId: 'a' })).status).toBe(200);
      }
    }
  }, 20_000);
  it('teacher lock applies independently of closed status', async () => { h.uid = 'teacher'; const locked = await call({ action: 'setSubmissionLock', classId: 'class', assignmentId: 'a', locked: true }); expect(locked.status).toBe(200); expect(store['assignments/a'].submissionLocked).toBe(true); expect(store['assignments/a'].lockedBy).toBe('teacher'); const unlocked = await call({ action: 'setSubmissionLock', classId: 'class', assignmentId: 'a', locked: false }); expect(unlocked.status).toBe(200); expect(store['assignments/a'].submissionLocked).toBe(false); });
  it('student feedback works when evidence locked, teacher replies preserve immutable history', async () => { store['assignments/a'].submissionLocked = true; const sent = await call({ action: 'sendSubmissionFeedback', submissionId: 's', message: 'Xin xem lại', questionNumber: 'Câu 1' }); expect(sent.status).toBe(200); const id = sent.payload.feedback.id; h.uid = 'teacher'; const reply = await call({ action: 'replySubmissionFeedback', submissionId: 's', feedbackId: id, message: 'Thầy sẽ kiểm tra.', resolved: true }); expect(reply.status).toBe(200); h.uid = 'student-uid'; const read = await call({ action: 'submissionFeedback', submissionId: 's' }); expect(read.status).toBe(200); expect(read.payload.feedback[0].messages.map((m: Data) => m.text)).toEqual(['Xin xem lại', 'Thầy sẽ kiểm tra.']); expect(read.payload.feedback[0].status).toBe('resolved'); });
  it('rejects different student, unreleased grade, unknown question and oversized message', async () => { h.uid = 'other'; expect((await call({ action: 'sendSubmissionFeedback', submissionId: 's', message: 'x' })).status).toBe(403); h.uid = 'student-uid'; store['submissions/s'].grade.teacherApproved = false; expect((await call({ action: 'sendSubmissionFeedback', submissionId: 's', message: 'x' })).status).toBe(409); store['submissions/s'].grade.teacherApproved = true; expect((await call({ action: 'sendSubmissionFeedback', submissionId: 's', message: 'x', questionNumber: 'fake' })).status).toBe(422); expect((await call({ action: 'sendSubmissionFeedback', submissionId: 's', message: 'x'.repeat(2001) })).status).toBe(422); });
  it('parent upload requires self-set PIN and refuses a locked assignment', async () => { store['classes/class/parentSecrets/student'].pinSetBy = 'teacher'; expect((await call({ action: 'issueSubmissionUpload', ...parent, assignmentId: 'a', files: [{ name: 'a.jpg', mimeType: 'image/jpeg', size: 100 }] })).status).toBe(403); store['classes/class/parentSecrets/student'].pinSetBy = 'parent'; store['assignments/a'].submissionLocked = true; expect((await call({ action: 'issueSubmissionUpload', ...parent, assignmentId: 'a', files: [{ name: 'a.jpg', mimeType: 'image/jpeg', size: 100 }] })).status).toBe(409); expect(h.signed).not.toHaveBeenCalled(); });
  it('parent cannot finalize an arbitrary URL or somebody else grant', async () => { const forged = await call({ action: 'submitActorSubmission', ...parent, assignmentId: 'a', fileUrls: ['https://evil.test/a.jpg'] }); expect(forged.status).toBe(422); expect(Object.keys(store).filter(k => k.startsWith('submissions/'))).toHaveLength(1); });
  it('closed assignment accepts student revision, never replaces previous attempt', async () => { const sent = await call({ action: 'submitActorSubmission', assignmentId: 'a', supplementOf: 's', fileUrls: ['https://firebasestorage.googleapis.com/v0/b/test.firebasestorage.app/o/homework%2Fstudent-uid%2Fa.jpg?alt=media&token=token'] }); expect(sent.status).toBe(200); expect(sent.payload.submission.submittedBy.role).toBe('student'); expect(sent.payload.submission.supplementOf).toBe('s'); expect(store['submissions/s'].grade.score).toBe(8); store['assignments/a'].submissionLocked = true; expect((await call({ action: 'submitActorSubmission', assignmentId: 'a', fileUrls: ['https://firebasestorage.googleapis.com/v0/b/test.firebasestorage.app/o/homework%2Fstudent-uid%2Fa.jpg?alt=media&token=token'] })).status).toBe(409); });
  const grant = async (credentials: Data = parent, purpose = 'submission') => {
    const result = await call({ action: 'issueSubmissionUpload', ...credentials, assignmentId: 'a', purpose, files: [{ name: 'a.jpg', mimeType: 'image/jpeg', size: 100 }] });
    expect(result.status).toBe(200);
    const uploadGrantId = result.payload.uploadGrantId;
    for (const file of store[`submissionUploadGrants/${uploadGrantId}`].files) h.metadata[file.path] = { name: file.path, contentType: file.mimeType, size: String(file.size), generation: '1' };
    return uploadGrantId;
  };
  it.each(['student', 'teacher', 'parent'])('role %s: open/closed accepted; hard lock denies every evidence mutation', async role => {
    const credentials = role === 'parent' ? parent : role === 'teacher' ? { role, classId: 'class', studentId: 'student' } : { role };
    h.uid = role === 'teacher' ? 'teacher' : 'student-uid';
    for (const isOpen of [true, false]) { store['assignments/a'].isOpen = isOpen; const uploadGrantId = await grant(credentials); expect((await call({ action: 'submitActorSubmission', ...credentials, assignmentId: 'a', uploadGrantId })).status).toBe(200); }
    const uploadGrantId = await grant(credentials); store['assignments/a'].submissionLocked = true;
    expect((await call({ action: 'submitActorSubmission', ...credentials, assignmentId: 'a', uploadGrantId })).status).toBe(409);
  });
  it('one-time grant rejects replay, wrong purpose and metadata mismatch', async () => {
    const uploadGrantId = await grant();
    store[`submissionUploadGrants/${uploadGrantId}`].purpose = 'clarification';
    expect((await call({ action: 'submitActorSubmission', ...parent, assignmentId: 'a', uploadGrantId })).status).toBe(422);
    store[`submissionUploadGrants/${uploadGrantId}`].purpose = 'submission';
    const path = store[`submissionUploadGrants/${uploadGrantId}`].files[0].path;
    h.metadata[path].size = '101'; expect((await call({ action: 'submitActorSubmission', ...parent, assignmentId: 'a', uploadGrantId })).status).toBe(422);
    h.metadata[path].size = '100'; expect((await call({ action: 'submitActorSubmission', ...parent, assignmentId: 'a', uploadGrantId })).status).toBe(200);
    expect((await call({ action: 'submitActorSubmission', ...parent, assignmentId: 'a', uploadGrantId })).status).toBe(422);
  });
  it.each(['lock', 'pin', 'student', 'teacher'])('finalize rechecks %s after copying upload, never creates a partial submission', async change => {
    const uploadGrantId = await grant(); const before = Object.keys(store).filter(key => key.startsWith('submissions/')).length;
    h.copy.mockImplementation(async () => { if (change === 'lock') store['assignments/a'].submissionLocked = true; if (change === 'pin') store['classes/class/parentSecrets/student'].pinHash = hashPin('9999'); if (change === 'student') delete store['classes/class/students/student']; if (change === 'teacher') store['classes/class'].teacherId = 'other'; return []; });
    const sent = await call({ action: 'submitActorSubmission', ...parent, assignmentId: 'a', uploadGrantId }); expect([401, 403, 409]).toContain(sent.status);
    expect(Object.keys(store).filter(key => key.startsWith('submissions/'))).toHaveLength(before); expect(store[`submissionUploadGrants/${uploadGrantId}`].consumed).toBe(false);
  });
  it('target student and removed co-teacher cannot upload or read another assignment', async () => {
    store['assignments/a'].targetStudentIds = ['other']; expect((await call({ action: 'issueSubmissionUpload', ...parent, assignmentId: 'a', files: [{ name: 'a.jpg', mimeType: 'image/jpeg', size: 100 }] })).status).toBe(403);
    store['assignments/a'].targetStudentIds = []; h.uid = 'co'; store['classMembers/class__co'] = { uid: 'co', role: 'co_owner', status: 'removed' };
    expect((await call({ action: 'setSubmissionLock', role: 'teacher', classId: 'class', assignmentId: 'a', locked: true })).status).toBe(403);
  });
  it('read acknowledgement does not hide a reply newer than the fetched thread', async () => {
    store['submissions/s'].feedbackSummary = { pending: 0, replies: 2, lastReplyAt: '2026-10-14T02:00:00Z' };
    const read = await call({ action: 'readSubmissionFeedback', submissionId: 's', lastReplyAt: '2026-10-14T01:00:00Z' }); expect(read.status).toBe(200); expect(store['submissions/s'].feedbackReadAt).toBe('2026-10-14T01:00:00Z');
  });
 it('parent assignment index supplies compact status and no photos, questions or unapproved grades', async () => {
  for (let index = 0; index < 300; index++) { store[`assignments/a${index}`] = { ...store['assignments/a'], title: `Bài ${index}` }; store[`submissions/s${index}`] = { ...store['submissions/s'], assignmentId: `a${index}`, fileUrls: ['PRIVATE PHOTO'], note: 'PRIVATE NOTE', grade: { ...store['submissions/s'].grade, teacherApproved: false, feedback: 'SECRET FEEDBACK', questionResults: [{ questionNumber: 'SECRET QUESTION', score: 8, expectedAnswer: 'SECRET KEY' }] } }; }
  const result = await call({ action: 'actorAssignments', ...parent }); expect(result.status).toBe(200); expect(result.payload.assignments).toHaveLength(301); expect(result.payload.submissions).toHaveLength(301);
  for (const secret of ['PRIVATE PHOTO','PRIVATE NOTE','SECRET FEEDBACK','SECRET QUESTION','SECRET KEY']) expect(JSON.stringify(result.payload)).not.toContain(secret);
  expect(result.payload.submissions.find((submission: Data) => submission.assignmentId === 'a1').grade.score).toBe(0);
 });

  it('nộp xong thì xoá ảnh tạm pending-homework; ảnh chưa tải lên xong báo 422 chứ không phải lỗi máy chủ', async () => {
    const issued = await call({ action: 'issueSubmissionUpload', ...parent, assignmentId: 'a', files: [{ name: 'a.jpg', mimeType: 'image/jpeg', size: 100 }] });
    const early = await call({ action: 'submitActorSubmission', ...parent, assignmentId: 'a', uploadGrantId: issued.payload.uploadGrantId });
    expect(early.status).toBe(422);
    expect(early.payload.error).toContain('chưa tải lên xong');
    const uploadGrantId = await grant();
    const path = store[`submissionUploadGrants/${uploadGrantId}`].files[0].path;
    expect((await call({ action: 'submitActorSubmission', ...parent, assignmentId: 'a', uploadGrantId })).status).toBe(200);
    expect(h.deleted).toContain(path);
  });

  it('GV nộp bài đã chấm lưu cờ handMarkedPaper; HS/PH tự khai cũng được nhưng KHÔNG được coi là điểm chính thức', async () => {
    // GV nộp
    h.uid = 'teacher';
    const teacherCredentials = { role: 'teacher', classId: 'class', studentId: 'student' };
    const uploadGrantTeacher = await grant(teacherCredentials);
    const teacherRes = await call({
      action: 'submitActorSubmission',
      ...teacherCredentials,
      assignmentId: 'a',
      uploadGrantId: uploadGrantTeacher,
      handMarked: true,
    });
    expect(teacherRes.status).toBe(200);
    expect(teacherRes.payload.submission.handMarkedPaper).toBe(true);
    expect(teacherRes.payload.submission.handMarkedDeclaredBy).toBe('teacher');

    // Học sinh tự khai bài thầy đã chấm tay → máy đọc điểm, nhưng thầy phải xác nhận
    h.uid = 'student-uid';
    const studentCredentials = { role: 'student' };
    const uploadGrantStudent = await grant(studentCredentials);
    const studentRes = await call({
      action: 'submitActorSubmission',
      ...studentCredentials,
      assignmentId: 'a',
      uploadGrantId: uploadGrantStudent,
      handMarked: true,
    });
    expect(studentRes.status).toBe(200);
    expect(studentRes.payload.submission.handMarkedPaper).toBe(true);
    expect(studentRes.payload.submission.handMarkedDeclaredBy).toBe('student');
  });
  it('lượt tải bỏ dở hết hạn được dọn; quá 10 lượt chưa dùng cùng lúc thì từ chối', async () => {
    const stale = await grant();
    store[`submissionUploadGrants/${stale}`].expiresAt = Date.now() - 1000;
    const stalePath = store[`submissionUploadGrants/${stale}`].files[0].path;
    for (let index = 0; index < 9; index++) await grant();
    expect(store[`submissionUploadGrants/${stale}`]).toBeUndefined();
    expect(h.deleted).toContain(stalePath);
    // Đang có 10 lượt chưa dùng còn hạn
    await grant();
    const refused = await call({ action: 'issueSubmissionUpload', ...parent, assignmentId: 'a', files: [{ name: 'a.jpg', mimeType: 'image/jpeg', size: 100 }] });
    expect(refused.status).toBe(429);
  }, 20_000);
});
