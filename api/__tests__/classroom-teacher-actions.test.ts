import handler from '../classroom';
import { classMemberId } from '../_classroom-access';

type DocData = Record<string, unknown>;

const h = vi.hoisted(() => ({
  uid: 'owner-1',
  email: 'owner@example.com',
  db: null as unknown,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async () => ({ uid: h.uid, email: h.email }),
    getUserByEmail: async (email: string) => ({ uid: email === 'co@example.com' ? 'co-1' : 'unknown', email }),
    getUser: async (uid: string) => ({ uid, email: uid === 'owner-1' ? 'owner@example.com' : `${uid}@example.com` }),
  }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: () => h.db,
  getAdminStorage: () => ({ name: 'bucket', file: () => ({ delete: async () => undefined }) }),
}));

interface Harness {
  store: Record<string, Record<string, DocData>>;
}

const keyFor = (collection: string, id: string, sub?: string): string => sub ? `${collection}/${id}/${sub}` : collection;

const makeDb = (harness: Harness) => {
  const makeCollection = (collectionName: string) => {
    const ensure = () => { harness.store[collectionName] ||= {}; return harness.store[collectionName]; };
    const makeDoc = (id: string) => {
      const data = () => ensure()[id];
      const ref = {
        id,
        get: async () => ({ exists: data() !== undefined, data: () => data() ? { ...data() } : undefined }),
        set: async (payload: DocData, options?: { merge?: boolean }) => {
          ensure()[id] = options?.merge ? { ...ensure()[id], ...payload } : { ...payload };
        },
        update: async (payload: DocData) => { ensure()[id] = { ...ensure()[id], ...payload }; },
        delete: async () => { delete ensure()[id]; },
        collection: (subCollection: string) => makeCollection(keyFor(collectionName, id, subCollection)),
      };
      return ref;
    };
    const makeQuery = (constraints: Array<{ field: string; value: unknown }>) => ({
      where: (field: string, _operator: string, value: unknown) => makeQuery([...constraints, { field, value }]),
      get: async () => {
        const docs = Object.entries(ensure())
          .filter(([, value]) => constraints.every(constraint => value[constraint.field] === constraint.value))
          .map(([id, value]) => ({ id, data: () => ({ ...value }) }));
        return { docs, empty: docs.length === 0, size: docs.length };
      },
    });
    return {
      doc: makeDoc,
      where: (field: string, _operator: string, value: unknown) => makeQuery([{ field, value }]),
      get: async () => makeQuery([]).get(),
    };
  };

  return {
    collection: (name: string) => makeCollection(name),
    runTransaction: async (callback: (transaction: { get: (ref: { get: () => Promise<unknown> }) => Promise<unknown>; set: (ref: { set: (payload: DocData, options?: { merge?: boolean }) => Promise<void> }, payload: DocData) => Promise<void>; update: (ref: { update: (payload: DocData) => Promise<void> }, payload: DocData) => Promise<void> }) => Promise<unknown>) => {
      const transaction = {
        get: (ref: { get: () => Promise<unknown> }) => ref.get(),
        set: (ref: { set: (payload: DocData, options?: { merge?: boolean }) => Promise<void> }, payload: DocData) => ref.set(payload),
        update: (ref: { update: (payload: DocData) => Promise<void> }, payload: DocData) => ref.update(payload),
      };
      await callback(transaction);
    },
  };
};

const buildHarness = (): Harness => {
  const harness: Harness = { store: {} };
  h.db = makeDb(harness);
  return harness;
};

const call = async (body: DocData) => {
  const res = {
    statusCode: 0,
    payload: null as DocData | null,
    status(code: number) { res.statusCode = code; return res; },
    json(payload: DocData) { res.payload = payload; return res; },
  };
  await handler({ method: 'POST', body: { idToken: 'id-token', ...body } } as never, res as never);
  return res;
};

describe('POST /api/classroom · teacher collaboration', () => {
  beforeEach(() => {
    h.uid = 'owner-1';
    h.email = 'owner@example.com';
  });

  it('liệt kê lớp legacy của owner và lớp có membership active', async () => {
    const harness = buildHarness();
    harness.store.classes = {
      'legacy-class': { teacherId: 'owner-1', name: '11 Columbus', track: 'Toán', grade: '11', studentCount: 1 },
      'shared-class': { teacherId: 'root-2', ownerId: 'root-2', name: '10A', track: 'Toán', grade: '10', studentCount: 1 },
    };
    harness.store.classMembers = {
      [classMemberId('shared-class', 'owner-1')]: {
        classId: 'shared-class', uid: 'owner-1', role: 'co_owner', status: 'active',
      },
    };

    const res = await call({ action: 'listAccessibleClasses' });

    expect(res.statusCode).toBe(200);
    expect((res.payload?.classes as DocData[]).map(item => item.id)).toEqual(['shared-class', 'legacy-class']);
  });

  it('cho phép co-owner đọc bài giao trong lớp chung', async () => {
    const harness = buildHarness();
    h.uid = 'co-1';
    harness.store.classes = { 'shared-class': { teacherId: 'root-2', ownerId: 'root-2', name: '10A' } };
    harness.store.classMembers = {
      [classMemberId('shared-class', 'co-1')]: { classId: 'shared-class', uid: 'co-1', role: 'co_owner', status: 'active' },
    };
    harness.store.assignments = {
      'assignment-1': { id: 'assignment-1', classId: 'shared-class', teacherId: 'root-2', title: 'Bài chung', type: 'upload' },
    };

    const res = await call({ action: 'teacherAssignments', classId: 'shared-class' });

    expect(res.statusCode).toBe(200);
    expect(res.payload?.assignments).toEqual([expect.objectContaining({ id: 'assignment-1', title: 'Bài chung' })]);
  });

  it('owner mời giáo viên bằng email và lưu role co-owner', async () => {
    const harness = buildHarness();
    harness.store.classes = { 'shared-class': { teacherId: 'owner-1', name: '11 Columbus' } };

    const res = await call({ action: 'inviteTeacher', classId: 'shared-class', email: ' CO@EXAMPLE.COM ', role: 'co_owner' });

    expect(res.statusCode).toBe(200);
    const invites = Object.values(harness.store.classInvitations || {});
    expect(invites).toHaveLength(1);
    expect(invites[0]).toEqual(expect.objectContaining({
      classId: 'shared-class', inviteeEmail: 'co@example.com', inviteeUid: 'co-1', role: 'co_owner', status: 'pending',
    }));
  });

  it('owner đổi tên lớp mà không đổi id hoặc namespace dữ liệu', async () => {
    const harness = buildHarness();
    harness.store.classes = { 'shared-class': { teacherId: 'owner-1', name: '11 Columbus', track: 'Toán' } };
    harness.store.assignments = { 'assignment-1': { id: 'assignment-1', classId: 'shared-class', teacherId: 'owner-1', title: 'Bài cũ' } };

    const res = await call({ action: 'renameClass', classId: 'shared-class', name: '11 Columbus · Toán nâng cao' });

    expect(res.statusCode).toBe(200);
    expect(harness.store.classes['shared-class']).toEqual(expect.objectContaining({
      name: '11 Columbus · Toán nâng cao',
      previousNames: ['11 Columbus'],
    }));
    expect(harness.store.assignments['assignment-1']).toEqual(expect.objectContaining({ id: 'assignment-1', classId: 'shared-class' }));
  });

  it('co-owner đổi tên bài giao trong lớp chung', async () => {
    const harness = buildHarness();
    h.uid = 'co-1';
    harness.store.classes = { 'shared-class': { teacherId: 'root-2', ownerId: 'root-2', name: '10A' } };
    harness.store.classMembers = {
      [classMemberId('shared-class', 'co-1')]: { classId: 'shared-class', uid: 'co-1', role: 'co_owner', status: 'active' },
    };
    harness.store.assignments = { 'assignment-1': { id: 'assignment-1', classId: 'shared-class', teacherId: 'root-2', title: 'Bài cũ' } };

    const res = await call({ action: 'renameAssignment', assignmentId: 'assignment-1', title: 'Bài luyện tập mới' });

    expect(res.statusCode).toBe(200);
    expect(harness.store.assignments['assignment-1']).toEqual(expect.objectContaining({ id: 'assignment-1', title: 'Bài luyện tập mới', updatedBy: 'co-1' }));
  });

  it('tạo projection bài online theo lớp, không sao chép đáp án vào bài giao', async () => {
    const harness = buildHarness();
    harness.store.classes = { 'shared-class': { teacherId: 'owner-1', name: '11 Columbus' } };
    harness.store.exams = { 'exam-1': { id: 'exam-1', teacherId: 'owner-1', title: 'Đề Hình', maxScore: 10, questions: [{ id: 'q1', correctAnswer: 'A' }] } };

    const res = await call({ action: 'createExamAssignment', classId: 'shared-class', examId: 'exam-1', title: 'Đề Hình tuần này', maxScore: 10 });

    expect(res.statusCode).toBe(200);
    const assignment = Object.values(harness.store.assignments || {})[0];
    expect(assignment).toEqual(expect.objectContaining({ type: 'exam', examId: 'exam-1', classId: 'shared-class' }));
    expect(assignment).not.toHaveProperty('questions');
    expect(assignment).not.toHaveProperty('answerKey');
  });

  it('chấp nhận lời mời chuyển quyền trong transaction và giữ chủ cũ làm đồng giáo viên', async () => {
    const harness = buildHarness();
    h.uid = 'co-1';
    h.email = 'co@example.com';
    harness.store.classes = { 'shared-class': { teacherId: 'owner-1', ownerId: 'owner-1', originalOwnerId: 'owner-1', name: '11 Columbus' } };
    harness.store.classInvitations = {
      'invite-1': { id: 'invite-1', classId: 'shared-class', inviterUid: 'owner-1', inviteeUid: 'co-1', inviteeEmail: 'co@example.com', role: 'transfer_owner', status: 'pending' },
    };

    const res = await call({ action: 'acceptTeacherInvitation', invitationId: 'invite-1' });

    expect(res.statusCode).toBe(200);
    expect(harness.store.classes['shared-class']).toEqual(expect.objectContaining({ ownerId: 'co-1', teacherIds: ['owner-1', 'co-1'] }));
    expect(harness.store.classMembers[classMemberId('shared-class', 'owner-1')]).toEqual(expect.objectContaining({ role: 'co_owner', status: 'active' }));
    expect(harness.store.classMembers[classMemberId('shared-class', 'co-1')]).toEqual(expect.objectContaining({ role: 'owner', status: 'active' }));
  });

  it('tài khoản được mời thấy lời mời chờ xử lý theo đúng email', async () => {
    const harness = buildHarness();
    h.uid = 'co-1';
    h.email = 'co@example.com';
    harness.store.classes = { 'shared-class': { teacherId: 'owner-1', name: '11 Columbus' } };
    harness.store.classInvitations = {
      'invite-1': { id: 'invite-1', classId: 'shared-class', inviterUid: 'owner-1', inviteeUid: 'co-1', inviteeEmail: 'co@example.com', role: 'co_owner', status: 'pending' },
    };

    const res = await call({ action: 'teacherInvitations' });

    expect(res.statusCode).toBe(200);
    expect(res.payload?.invitations).toEqual([expect.objectContaining({ id: 'invite-1', className: '11 Columbus' })]);
  });

  it('danh sách thành viên đang hoạt động không hiện giáo viên đã bị xóa quyền', async () => {
    const harness = buildHarness();
    harness.store.classes = { 'shared-class': { teacherId: 'owner-1', name: '11 Columbus' } };
    harness.store.classMembers = {
      [classMemberId('shared-class', 'owner-1')]: { classId: 'shared-class', uid: 'owner-1', role: 'owner', status: 'active' },
      [classMemberId('shared-class', 'co-1')]: { classId: 'shared-class', uid: 'co-1', role: 'co_owner', status: 'removed' },
    };

    const res = await call({ action: 'teacherMembers', classId: 'shared-class' });

    expect(res.statusCode).toBe(200);
    expect((res.payload?.members as DocData[]).map(member => member.uid)).toEqual(['owner-1']);
  });

  it('người không thuộc lớp bị từ chối đổi tên học sinh', async () => {
    const harness = buildHarness();
    h.uid = 'outsider';
    harness.store.classes = { 'shared-class': { teacherId: 'root-2', ownerId: 'root-2', name: '10A' } };

    const res = await call({ action: 'renameStudent', classId: 'shared-class', studentId: 'student-1', name: 'Tên khác' });

    expect(res.statusCode).toBe(403);
  });
});
