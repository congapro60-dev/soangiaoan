import { beforeEach, describe, expect, it, vi } from 'vitest';

type DocData = Record<string, unknown>;

const h = vi.hoisted(() => ({
  claims: {} as Record<string, unknown>,
  store: {} as Record<string, Record<string, DocData>>,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async () => h.claims,
    getUser: async (uid: string) => ({ uid, email: h.claims.email }),
  }),
}));

vi.mock('../_exam-core.js', () => ({ getAdminDb: () => fakeDb(), getAdminStorage: () => ({}) }));

const snapOf = (col: string, id: string) => {
  const data = h.store[col]?.[id];
  return { id, exists: data !== undefined, data: () => (data ? structuredClone(data) : undefined) };
};

const fakeDb = () => {
  const docRef = (col: string, id: string): Record<string, any> => ({
    id,
    get: async () => snapOf(col, id),
    set: async (data: DocData) => { (h.store[col] ||= {})[id] = structuredClone(data); },
    update: async (data: DocData) => { h.store[col][id] = { ...h.store[col][id], ...data }; },
    collection: (sub: string) => ({
      get: async () => ({ docs: Object.keys(h.store[`${col}/${id}/${sub}`] ?? {}).map(subId => snapOf(`${col}/${id}/${sub}`, subId)) }),
      doc: (subId: string) => docRef(`${col}/${id}/${sub}`, subId),
    }),
  });
  return { collection: (col: string) => ({ doc: (id: string) => docRef(col, id) }) };
};

import handler from '../classroom';

const call = async (body: DocData) => {
  const res = { statusCode: 0, payload: null as DocData | null, status(c: number) { res.statusCode = c; return res; }, json(p: DocData) { res.payload = p; return res; } };
  await handler({ method: 'POST', body: { idToken: 't', ...body } } as never, res as never);
  return res;
};

const TEACHER = { uid: 'gv-cuong', email: 'congapro60@gmail.com' };
const OTHER_TEACHER = { uid: 'gv-khac', email: 'khac@gmail.com' };
const STUDENT_A = { uid: 'anon-a', firebase: { sign_in_provider: 'anonymous' } };
const DOC = 'lop-1__a';

describe('hồ sơ năng lực HS + GV', () => {
  beforeEach(() => {
    h.store = {
      classes: { 'lop-1': { name: '10Olinda', grade: '10', teacherId: 'gv-cuong' } },
      'classes/lop-1/students': { a: { name: 'An', code: 'S1' }, b: { name: 'Bình', code: 'S2' } },
      studentLinks: { 'anon-a': { classId: 'lop-1', studentId: 'a', teacherId: 'gv-cuong' } },
    };
  });

  it('HS lưu phần của mình; ô của GV gửi lên bị bỏ; lớp/mã lấy từ phiên, không theo client', async () => {
    h.claims = STUDENT_A;
    const res = await call({
      action: 'saveStudentPortfolio', classId: 'lop-khac', studentId: 'b',
      entries: { 'g10-ham-so-bac-hai': { selfLevel: 'Tốt', goal: 'Vẽ đúng parabol', teacherLevel: 'Xuất sắc', teacherComment: 'tự khen' } },
    });
    expect(res.statusCode).toBe(200);
    const saved = h.store.competencyPortfolios[DOC] as any;
    expect(saved.entries['g10-ham-so-bac-hai']).toEqual({ selfLevel: 'Tốt', goal: 'Vẽ đúng parabol' });
    expect(saved.updatedByRole).toBe('student');
    expect(h.store.competencyPortfolios['lop-khac__b']).toBeUndefined();

    const read = await call({ action: 'studentPortfolio' });
    expect(read.statusCode).toBe(200);
    expect((read.payload as any).grade).toBe(10);
    expect((read.payload as any).portfolio.entries['g10-ham-so-bac-hai'].goal).toBe('Vẽ đúng parabol');
  });

  it('GV thuộc lớp sửa được cả ô của HS, thêm mức chốt + ý kiến; ô không gửi giữ nguyên', async () => {
    h.store.competencyPortfolios = { [DOC]: { entries: { 'g10-ham-so-bac-hai': { selfLevel: 'Tốt', goal: 'cũ' } } } };
    h.claims = TEACHER;
    const res = await call({
      action: 'saveTeacherPortfolio', classId: 'lop-1', studentId: 'a',
      entries: { 'g10-ham-so-bac-hai': { goal: 'GV sửa', teacherLevel: 'Đạt yêu cầu', teacherComment: 'Cần luyện thêm' } },
    });
    expect(res.statusCode).toBe(200);
    expect((h.store.competencyPortfolios[DOC] as any).entries['g10-ham-so-bac-hai']).toEqual({
      selfLevel: 'Tốt', goal: 'GV sửa', teacherLevel: 'Đạt yêu cầu', teacherComment: 'Cần luyện thêm',
    });
  });

  it('GV ngoài lớp bị chặn; HS lạ trong lớp → 404; HS chưa đăng nhập lớp → 403', async () => {
    h.claims = OTHER_TEACHER;
    expect((await call({ action: 'teacherPortfolio', classId: 'lop-1', studentId: 'a' })).statusCode).toBe(403);
    h.claims = TEACHER;
    expect((await call({ action: 'teacherPortfolio', classId: 'lop-1', studentId: 'z' })).statusCode).toBe(404);
    h.claims = { uid: 'anon-la', firebase: { sign_in_provider: 'anonymous' } };
    expect((await call({ action: 'studentPortfolio' })).statusCode).toBe(403);
  });

  it('bản sửa rỗng/không hợp lệ → 422, không ghi', async () => {
    h.claims = STUDENT_A;
    const res = await call({ action: 'saveStudentPortfolio', entries: { 'g11-gioi-han': { selfLevel: 'Tốt' } } });
    expect(res.statusCode).toBe(422);
    expect(h.store.competencyPortfolios).toBeUndefined();
  });
});
