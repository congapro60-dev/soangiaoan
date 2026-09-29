import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  store: {} as Record<string, Record<string, unknown>>,
  owner: '' as string | null,
  prompt: '',
  allowed: true,
}));

vi.mock('../_classroom-teacher.js', () => ({
  teacherContext: async (_db: unknown, body: Record<string, unknown>, res: { status: (c: number) => { json: (b: unknown) => void } }) => {
    if (!h.allowed) { res.status(403).json({ error: 'Bạn không thuộc lớp này.' }); return null; }
    return { uid: 'gv-dong', classId: String(body.classId), classData: { teacherId: 'gv-chu' } };
  },
}));
vi.mock('../_ai-usage.js', () => ({ setAiKeyOwner: (uid: string | null) => { h.owner = uid; } }));
vi.mock('../_grading-core.js', () => ({
  GRADING_MODEL: 'gemini-test',
  getGradingApiKey: () => 'k',
  callGeminiVision: async (prompt: string) => { h.prompt = prompt; return '**Con** học chăm, cần luyện thêm hàm số.'; },
}));

import { handleParentReportAction } from '../_parent-report';

const db = {
  collection: (col: string) => ({
    doc: (id: string) => ({
      get: async () => ({ exists: Boolean(h.store[`${col}/${id}`]), data: () => h.store[`${col}/${id}`] }),
      set: async (data: Record<string, unknown>) => { h.store[`${col}/${id}`] = data; },
    }),
  }),
} as unknown as FirebaseFirestore.Firestore;

const call = async (body: Record<string, unknown>) => {
  const out: { status: number; body: Record<string, unknown> } = { status: 0, body: {} };
  const res = { status(code: number) { out.status = code; return { json: (b: Record<string, unknown>) => { out.body = b; } }; } };
  const handled = await handleParentReportAction(db, { idToken: 't', classId: 'lop', ...body }, res as never);
  return { handled, ...out };
};

const key = { studentId: 'hs1', kind: 'gk1', from: '2026-09-01', to: '2026-10-31' };

describe('nhận xét giáo viên trong báo cáo phụ huynh', () => {
  beforeEach(() => { h.store = {}; h.owner = ''; h.prompt = ''; h.allowed = true; });

  it('AI soạn nháp từ số liệu, bỏ markdown, tính tiền cho giáo viên chủ lớp', async () => {
    const out = await call({ action: 'draftParentReportComment', ...key, facts: { avgPercent: 72, strengths: ['Hàm số bậc hai'] } });
    expect(out.status).toBe(200);
    expect(out.body.text).toBe('Con học chăm, cần luyện thêm hàm số.');
    expect(h.owner).toBe('gv-chu');
    expect(h.prompt).toContain('Hàm số bậc hai');
    expect(h.prompt).toContain('không bịa');
  });

  it('lưu rồi đọc lại đúng theo học sinh + loại + khoảng; khoảng khác thì trống', async () => {
    expect((await call({ action: 'saveParentReportNote', ...key, text: '  Nhận xét đã sửa  ' })).body.text).toBe('Nhận xét đã sửa');
    expect((await call({ action: 'parentReportNote', ...key })).body.text).toBe('Nhận xét đã sửa');
    expect((await call({ action: 'parentReportNote', ...key, to: '2026-11-15' })).body.text).toBe('');
  });

  it('từ chối dữ liệu sai hoặc người ngoài lớp; action khác thì bỏ qua', async () => {
    expect((await call({ action: 'saveParentReportNote', ...key, kind: 'quy1' })).status).toBe(422);
    expect((await call({ action: 'saveParentReportNote', ...key, from: '2026-12-01' })).status).toBe(422);
    expect((await call({ action: 'draftParentReportComment', ...key, facts: { x: 'a'.repeat(6000) } })).status).toBe(422);
    h.allowed = false;
    expect((await call({ action: 'parentReportNote', ...key })).status).toBe(403);
    expect((await call({ action: 'khac' })).handled).toBe(false);
  });
});
