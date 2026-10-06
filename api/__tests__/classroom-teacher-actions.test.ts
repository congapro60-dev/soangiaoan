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

  it('tạo hoạt động hỗ trợ từ báo cáo với cùng snapshot cho đề và bài giao', async () => {
    const harness = buildHarness();
    harness.store.classes = { 'shared-class': { teacherId: 'owner-1', name: '11 Columbus', track: 'Toán', grade: '11' } };
    harness.store.classMembers = {};
    harness.store['classes/shared-class/students'] = {
      'student-1': { name: 'Nguyễn An' },
      'student-2': { name: 'Trần Bình' },
    };

    const res = await call({
      action: 'createSupportActivity',
      classId: 'shared-class',
      sourceReportId: 'assignment-1',
      purpose: 'remediation',
      title: 'Phiếu hỗ trợ phương trình',
      objective: 'Sửa lỗi nhầm công thức.',
      durationMinutes: 20,
      targetStudentIds: ['student-1', 'student-2', 'student-1'],
      questions: [
        { id: 'support-q1', type: 'essay', content: 'Giải phương trình tương tự.', points: 2 },
        { id: 'support-q2', type: 'multiple_choice', content: 'Chọn quy tắc đúng.', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', points: 1 },
      ],
    });

    expect(res.statusCode).toBe(200);
    const exams = Object.values(harness.store.exams || {});
    const assignments = Object.values(harness.store.assignments || {});
    expect(exams).toHaveLength(1);
    expect(assignments).toHaveLength(1);
    expect(exams[0]).toEqual(expect.objectContaining({ sourceReportId: 'assignment-1', contentVersion: expect.any(String) }));
    expect(assignments[0]).toEqual(expect.objectContaining({
      type: 'exam',
      purpose: 'remediation',
      sourceReportId: 'assignment-1',
      targetStudentIds: ['student-1', 'student-2'],
      contentVersion: exams[0].contentVersion,
    }));
    expect(assignments[0]).not.toHaveProperty('answerKey');
  });

  it('từ chối hoạt động hỗ trợ có học sinh ngoài lớp hoặc câu hỏi rỗng', async () => {
    const harness = buildHarness();
    harness.store.classes = { 'shared-class': { teacherId: 'owner-1', name: '11 Columbus' } };
    harness.store['classes/shared-class/students'] = { 'student-1': { name: 'Nguyễn An' } };

    const res = await call({
      action: 'createSupportActivity',
      classId: 'shared-class',
      sourceReportId: 'assignment-1',
      purpose: 'practice',
      title: 'Phiếu hỗ trợ',
      questions: [{ id: 'support-q1', type: 'essay', content: '   ', points: 1 }],
      targetStudentIds: ['outside-class'],
    });

    expect(res.statusCode).toBe(422);
    expect(Object.values(harness.store.exams || {})).toHaveLength(0);
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

  it('owner sửa mã học sinh: tự viết hoa, chỉ đổi field code', async () => {
    const harness = buildHarness();
    harness.store.classes = { 'shared-class': { teacherId: 'owner-1', name: '10 Olinda' } };
    harness.store['classes/shared-class/students'] = {
      'student-1': { id: 'student-1', classId: 'shared-class', name: 'Đỗ Hải Phong', code: '10OLINDA-1' },
    };

    const res = await call({ action: 'setStudentCode', classId: 'shared-class', studentId: 'student-1', code: ' s23050141 ' });

    expect(res.statusCode).toBe(200);
    expect(harness.store['classes/shared-class/students']['student-1']).toEqual(expect.objectContaining({
      code: 'S23050141', name: 'Đỗ Hải Phong', updatedBy: 'owner-1',
      previousCodes: ['10OLINDA-1'],
    }));
  });

  it('sao lưu dồn mã cũ, không thêm trùng khi đổi đi đổi lại', async () => {
    const harness = buildHarness();
    harness.store.classes = { 'shared-class': { teacherId: 'owner-1', name: '10 Olinda' } };
    harness.store['classes/shared-class/students'] = {
      'student-1': { id: 'student-1', classId: 'shared-class', name: 'A', code: 'C1', previousCodes: ['C0'] },
    };

    await call({ action: 'setStudentCode', classId: 'shared-class', studentId: 'student-1', code: 'C0' }); // C1 -> backup ['C0','C1']
    const res = await call({ action: 'setStudentCode', classId: 'shared-class', studentId: 'student-1', code: 'C1' }); // C0 da co trong backup, khong them lai

    expect(res.statusCode).toBe(200);
    expect(harness.store['classes/shared-class/students']['student-1'].code).toBe('C1');
    expect(harness.store['classes/shared-class/students']['student-1'].previousCodes).toEqual(['C0', 'C1']);
  });

  it('đặt lại đúng mã đang dùng thì không đổi, không ghi backup thừa', async () => {
    const harness = buildHarness();
    harness.store.classes = { 'shared-class': { teacherId: 'owner-1', name: '10 Olinda' } };
    harness.store['classes/shared-class/students'] = {
      'student-1': { id: 'student-1', classId: 'shared-class', name: 'A', code: 'S001' },
    };

    const res = await call({ action: 'setStudentCode', classId: 'shared-class', studentId: 'student-1', code: 's001' });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual(expect.objectContaining({ updated: false }));
    expect(harness.store['classes/shared-class/students']['student-1']).not.toHaveProperty('previousCodes');
  });

  it('từ chối mã học sinh trùng với em khác trong lớp', async () => {
    const harness = buildHarness();
    harness.store.classes = { 'shared-class': { teacherId: 'owner-1', name: '10 Olinda' } };
    harness.store['classes/shared-class/students'] = {
      'student-1': { id: 'student-1', classId: 'shared-class', name: 'A', code: 'S001' },
      'student-2': { id: 'student-2', classId: 'shared-class', name: 'B', code: 'S002' },
    };

    const res = await call({ action: 'setStudentCode', classId: 'shared-class', studentId: 'student-2', code: 's001' });

    expect(res.statusCode).toBe(409);
    expect(harness.store['classes/shared-class/students']['student-2'].code).toBe('S002');
  });

  it('người không thuộc lớp bị từ chối sửa mã học sinh', async () => {
    const harness = buildHarness();
    h.uid = 'outsider';
    harness.store.classes = { 'shared-class': { teacherId: 'root-2', ownerId: 'root-2', name: '10A' } };

    const res = await call({ action: 'setStudentCode', classId: 'shared-class', studentId: 'student-1', code: 'S999' });

    expect(res.statusCode).toBe(403);
  });

  it('bài kiểm tra định kì: mã nào cũng phải có đáp án; lưu mã đã làm sạch + cột sổ điểm; đọc lại còn nguyên', async () => {
    const harness = buildHarness();
    harness.store.classes = { 'lop-12': { teacherId: 'owner-1', name: '12A', grade: '12' } };
    const base = { action: 'createAssignment', classId: 'lop-12' };
    const variants = [
      { code: '1201', sourceText: 'Câu 1. …', answerKey: 'Phần I – Câu 1: A' },
      { code: '1202', sourceText: 'Câu 1. …', answerKey: '' },
    ];
    const missing = await call({ ...base, assignment: { classId: 'lop-12', title: 'Giữa kì I', periodicTest: { sheetLabel: 'Giữa học kì I' }, examVariants: variants } });
    expect(missing.statusCode).toBe(422);
    expect(missing.payload?.error).toBe('Mã 1202 chưa có đáp án.');
    expect((await call({ ...base, assignment: { classId: 'lop-12', title: 'Giữa kì I', periodicTest: {}, examVariants: [] } })).statusCode).toBe(422);

    const ok = await call({ ...base, assignment: {
      id: 'kt-1', classId: 'lop-12', title: 'Giữa kì I', periodicTest: { sheetLabel: '  Giữa   học kì I ' },
      examVariants: [variants[0], { ...variants[0] }, { code: 'mã sai', sourceText: 'x', answerKey: 'x' }],
    } });
    expect(ok.statusCode).toBe(200);
    expect(harness.store.assignments['kt-1']).toMatchObject({ periodicTest: { sheetLabel: 'Giữa học kì I' }, examVariants: [variants[0]] });

    const list = await call({ action: 'teacherAssignments', classId: 'lop-12' });
    expect((list.payload?.assignments as DocData[])[0]).toMatchObject({ periodicTest: { sheetLabel: 'Giữa học kì I' }, examVariants: [variants[0]] });
  });

  it('bài thường không bị gắn cờ định kì', async () => {
    const harness = buildHarness();
    harness.store.classes = { 'lop-10': { teacherId: 'owner-1', name: '10A', grade: '10' } };
    const res = await call({ action: 'createAssignment', classId: 'lop-10', assignment: { id: 'bt-1', classId: 'lop-10', title: 'BTVN', examVariants: [{ code: '101', sourceText: 'x', answerKey: 'y' }] } });
    expect(res.statusCode).toBe(200);
    expect(harness.store.assignments['bt-1']).not.toHaveProperty('periodicTest');
    expect(harness.store.assignments['bt-1']).not.toHaveProperty('examVariants');
  });

  it('danh sách bài nộp cho giáo viên giữ mã đề + kết quả đối chiếu điểm (bản chiếu là danh sách cho phép)', async () => {
    const harness = buildHarness();
    harness.store.classes = { 'lop-12': { teacherId: 'owner-1', name: '12A', grade: '12' } };
    harness.store.submissions = {
      s1: {
        teacherId: 'owner-1', classId: 'lop-12', studentId: 'hs-1', assignmentId: 'kt-1', fileUrls: ['u'], note: '', status: 'graded',
        examCode: '1202', examCodeSource: 'ai', createdAt: '2026-10-06', updatedAt: '2026-10-06',
        grade: { score: 6, maxScore: 10, feedback: '', strengths: [], weaknesses: [], gradedAt: '2026-10-06', teacherApproved: false,
          examCheck: { sheetLabel: 'Giữa học kì I', sheetScore: 7.5, diff: 1.5, mismatch: true } },
      },
    };
    const res = await call({ action: 'teacherSubmissions', classId: 'lop-12' });
    expect(res.statusCode).toBe(200);
    expect((res.payload?.submissions as DocData[])[0]).toMatchObject({
      examCode: '1202', examCodeSource: 'ai', grade: { examCheck: { sheetScore: 7.5, mismatch: true } },
    });
  });
});

