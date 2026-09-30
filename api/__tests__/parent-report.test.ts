import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  store: {} as Record<string, Record<string, unknown>>,
  owner: '' as string | null,
  prompt: '',
  allowed: true,
  grade: '' as string,
  reply: '**Con** học chăm, cần luyện thêm hàm số.',
  jsonMode: false as boolean | undefined,
  fail: '' as '' | 'slow' | 'fast',
}));

vi.mock('../_classroom-teacher.js', () => ({
  teacherContext: async (_db: unknown, body: Record<string, unknown>, res: { status: (c: number) => { json: (b: unknown) => void } }) => {
    if (!h.allowed) { res.status(403).json({ error: 'Bạn không thuộc lớp này.' }); return null; }
    return { uid: 'gv-dong', classId: String(body.classId), classData: { teacherId: 'gv-chu', grade: h.grade } };
  },
}));
vi.mock('../_ai-usage.js', () => ({ setAiKeyOwner: (uid: string | null) => { h.owner = uid; } }));
vi.mock('../_grading-core.js', () => ({
  GRADING_MODEL: 'gemini-test',
  getGradingApiKey: () => 'k',
  callGeminiVision: async (prompt: string, _files: unknown, _key: string, _model: string, options: { jsonMode?: boolean }) => {
    h.prompt = prompt;
    h.jsonMode = options.jsonMode;
    if (h.fail === 'slow') { vi.setSystemTime(Date.now() + 55_000); throw new Error('AI xử lý quá lâu'); }
    if (h.fail === 'fast') throw new Error('Chưa có khoá Gemini');
    return h.reply;
  },
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
  beforeEach(() => {
    h.store = {}; h.owner = ''; h.prompt = ''; h.allowed = true; h.grade = '';
    h.reply = '**Con** học chăm, cần luyện thêm hàm số.'; h.jsonMode = undefined; h.fail = '';
    vi.useRealTimers();
  });

  it('AI quá giờ chờ → 504 kèm lời dặn rõ ràng; lỗi khác (khoá, ví) vẫn ném lên như cũ', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    h.fail = 'slow';
    const slow = await call({ action: 'draftParentReportComment', ...key, facts: {} });
    expect(slow.status).toBe(504);
    expect(String(slow.body.error)).toContain('quá lâu');
    h.fail = 'fast';
    await expect(call({ action: 'draftParentReportComment', ...key, facts: {} })).rejects.toThrow('Chưa có khoá Gemini');
  });

  it('AI soạn nháp từ số liệu, bỏ markdown, tính tiền cho giáo viên chủ lớp', async () => {
    const out = await call({ action: 'draftParentReportComment', ...key, facts: { avgPercent: 72, strengths: ['Hàm số bậc hai'] } });
    expect(out.status).toBe(200);
    expect(out.body.text).toBe('Con học chăm, cần luyện thêm hàm số.');
    expect(h.owner).toBe('gv-chu');
    expect(h.prompt).toContain('Hàm số bậc hai');
    expect(h.prompt).toContain('không bịa');
  });

  it('khối có YCCĐ + có bài đã duyệt: một lượt AI trả JSON, máy tự tính mức và bỏ mã bịa', async () => {
    h.grade = '10';
    h.reply = JSON.stringify({
      nhanXet: 'Con tiến bộ ở phần vectơ.',
      ghep: [
        { cau: 'b1q1', yccd: 'T10.30' },
        { cau: 'b1q2', yccd: 'T10.30' },
        { cau: 'b1q2', yccd: 'T99.01' },
        { cau: 'b9q9', yccd: 'T10.01' },
      ],
      ghiChu: [{ yccd: 'T10.30', ghiChu: 'Nhầm chiều khi áp dụng **quy tắc hiệu**.' }],
    });
    const facts = { baiDaDuyet: [{ ma: 'b1', ten: 'BTVN', ngay: '2026-09-20', cau: [
      { ma: 'b1q1', diem: 1, toiDa: 2, ketQua: 'đúng một phần' },
      { ma: 'b1q2', diem: 0, toiDa: 2, ketQua: 'sai' },
    ] }] };
    const out = await call({ action: 'draftParentReportComment', ...key, facts });
    expect(out.status).toBe(200);
    expect(h.jsonMode).toBe(true);
    expect(h.prompt).toContain('T10.30 |');
    expect(out.body.text).toBe('Con tiến bộ ở phần vectơ.');
    expect(out.body.requirements).toEqual([
      { id: 'T10.30', level: 'chua', evidence: 2, percent: 25, note: 'Nhầm chiều khi áp dụng quy tắc hiệu.' },
    ]);
  });

  it('lưu kèm dòng YCCĐ: chỉ giữ mã đúng khối, mức hợp lệ', async () => {
    h.grade = '10';
    const requirements = [
      { id: 'T10.02', level: 'vung', evidence: 3, percent: 90, note: 'ok' },
      { id: 'T10.01', level: 'dang', evidence: 1, percent: 60, note: '' },
      { id: 'T11.01', level: 'vung', evidence: 1, percent: 90, note: '' },
      { id: 'T10.03', level: 'gioi', evidence: 1, percent: 90, note: '' },
    ];
    await call({ action: 'saveParentReportNote', ...key, text: 'x', requirements });
    const read = await call({ action: 'parentReportNote', ...key });
    expect((read.body.requirements as { id: string }[]).map(r => r.id)).toEqual(['T10.01', 'T10.02']);
  });

  it('lưu rồi đọc lại đúng theo học sinh + loại + khoảng; khoảng khác thì trống', async () => {
    expect((await call({ action: 'saveParentReportNote', ...key, text: '  Nhận xét đã sửa  ' })).body.text).toBe('Nhận xét đã sửa');
    expect((await call({ action: 'parentReportNote', ...key })).body.text).toBe('Nhận xét đã sửa');
    expect((await call({ action: 'parentReportNote', ...key, to: '2026-11-15' })).body.text).toBe('');
  });

  it('từ chối dữ liệu sai hoặc người ngoài lớp; action khác thì bỏ qua', async () => {
    expect((await call({ action: 'saveParentReportNote', ...key, kind: 'quy1' })).status).toBe(422);
    expect((await call({ action: 'saveParentReportNote', ...key, from: '2026-12-01' })).status).toBe(422);
    expect((await call({ action: 'draftParentReportComment', ...key, facts: { x: 'a'.repeat(61000) } })).status).toBe(422);
    h.allowed = false;
    expect((await call({ action: 'parentReportNote', ...key })).status).toBe(403);
    expect((await call({ action: 'khac' })).handled).toBe(false);
  });
});
