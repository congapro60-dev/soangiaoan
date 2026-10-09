import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  store: {} as Record<string, Record<string, unknown>>,
  owner: '' as string | null,
  prompt: '',
  allowed: true,
  grade: '' as string,
  reply: '**Con** học chăm, cần luyện thêm hàm số.',
  jsonMode: false as boolean | undefined,
  fail: '' as '' | 'slow' | 'fast' | 'notesSlow',
  notesReply: '{"ghiChu": []}',
  mapReply: '{"yccd": []}',
  calls: [] as string[],
}));

vi.mock('../_classroom-teacher.js', () => ({
  teacherContext: async (_db: unknown, body: Record<string, unknown>, res: { status: (c: number) => { json: (b: unknown) => void } }) => {
    if (!h.allowed) { res.status(403).json({ error: 'Bạn không thuộc lớp này.' }); return null; }
    const base = `classes/${String(body.classId)}`;
    const classRef = { collection: (sub: string) => ({ doc: (id: string) => ({
      get: async () => ({ exists: Boolean(h.store[`${base}/${sub}/${id}`]) }),
      update: async (data: Record<string, unknown>) => { h.store[`${base}/${sub}/${id}`] = { ...h.store[`${base}/${sub}/${id}`], ...data }; },
    }) }) };
    return { uid: 'gv-dong', classId: String(body.classId), classRef, classData: { teacherId: 'gv-chu', grade: h.grade } };
  },
}));
vi.mock('../_ai-usage.js', () => ({ setAiKeyOwner: (uid: string | null) => { h.owner = uid; } }));
vi.mock('../_grading-core.js', () => ({
  GRADING_MODEL: 'gemini-test',
  getGradingApiKey: () => 'k',
  callGeminiVision: async (prompt: string, _files: unknown, _key: string, _model: string, options: { jsonMode?: boolean }) => {
    h.prompt = prompt;
    h.jsonMode = options.jsonMode;
    h.calls.push(prompt);
    if (h.fail === 'slow') { vi.setSystemTime(Date.now() + 55_000); throw new Error('AI xử lý quá lâu'); }
    if (h.fail === 'fast') throw new Error('Chưa có khoá Gemini');
    if (prompt.includes('tỉ lệ điểm đạt')) {
      if (h.fail === 'notesSlow') { vi.setSystemTime(Date.now() + 55_000); throw new Error('AI xử lý quá lâu'); }
      return h.notesReply;
    }
    return prompt.includes('đối chiếu bài làm') ? h.mapReply : h.reply;
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
    h.reply = '**Con** học chăm, cần luyện thêm hàm số.'; h.jsonMode = undefined; h.fail = ''; h.mapReply = '{"yccd": []}'; h.notesReply = '{"ghiChu": []}'; h.calls = [];
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

  it('khối có YCCĐ + có bài đã duyệt: nhận xét + ghép YCCĐ (JSON), máy tự tính mức và bỏ mã bịa', async () => {
    h.grade = '10';
    h.reply = 'Con tiến bộ ở phần vectơ.';
    h.mapReply = JSON.stringify({
      yccd: [
        { ma: 'T10.30', cau: ['b1q1', 'b1q2'] },
        { ma: 'T99.01', cau: ['b1q2'] },
        { ma: 'T10.01', cau: ['b9q9'] },
      ],
    });
    h.notesReply = JSON.stringify({ ghiChu: [{ ma: 'T10.30', ghiChu: 'Nhầm chiều khi áp dụng **quy tắc hiệu**.' }, { ma: 'T10.01', ghiChu: 'không có dòng' }] });
    const facts = { baiDaDuyet: [{ ma: 'b1', ten: 'BTVN', ngay: '2026-09-20', cau: [
      { ma: 'b1q1', diem: 1, toiDa: 2, ketQua: 'đúng một phần' },
      { ma: 'b1q2', diem: 0, toiDa: 2, ketQua: 'sai' },
    ] }] };
    const out = await call({ action: 'draftParentReportComment', ...key, facts });
    expect(out.status).toBe(200);
    expect(h.calls).toHaveLength(3);
    const mappingPrompt = h.calls.find(p => p.includes('đối chiếu bài làm'))!;
    expect(mappingPrompt).toContain('T10.30 |');
    const notesPrompt = h.calls.find(p => p.includes('tỉ lệ điểm đạt'))!;
    expect(notesPrompt).toContain('"tiLeDiem":"25%"');
    expect(h.calls.find(p => !p.includes('đối chiếu bài làm'))).not.toContain('b1q1');
    expect(out.body.text).toBe('Con tiến bộ ở phần vectơ.');
    expect(out.body.requirements).toEqual([
      {
        id: 'T10.30', level: 'chua', evidence: 2, percent: 25, note: 'Nhầm chiều khi áp dụng quy tắc hiệu.',
        questions: [{ code: 'b1q1', score: 1, max: 2 }, { code: 'b1q2', score: 0, max: 2 }],
      },
    ]);
  });

  it('nhiều bài: chia nhóm ≤30 câu chạy song song, gộp câu căn cứ và nối ghi chú của cùng một YCCĐ', async () => {
    h.grade = '10';
    h.reply = 'Nhận xét.';
    const bai = (n: number) => ({ ma: `b${n}`, ten: 'BTVN', ngay: '2026-09-20', cau: Array.from({ length: 20 }, (_, i) => ({ ma: `b${n}q${i + 1}`, diem: n === 1 ? 1 : 0, toiDa: 1, ketQua: 'x' })) });
    h.mapReply = JSON.stringify({ yccd: [{ ma: 'T10.03', cau: ['b1q1', 'b2q1'] }] });
    h.notesReply = JSON.stringify({ ghiChu: [{ ma: 'T10.03', ghiChu: 'Ý chung.' }] });
    const out = await call({ action: 'draftParentReportComment', ...key, facts: { baiDaDuyet: [bai(1), bai(2)] } });
    expect(h.calls.filter(p => p.includes('đối chiếu bài làm'))).toHaveLength(2);
    expect(h.calls.filter(p => p.includes('tỉ lệ điểm đạt'))).toHaveLength(1);
    expect(out.body.requirements).toEqual([{
      id: 'T10.03', level: 'dang', evidence: 2, percent: 50, note: 'Ý chung.',
      questions: [{ code: 'b1q1', score: 1, max: 1 }, { code: 'b2q1', score: 0, max: 1 }],
    }]);
  });

  it('bước ghi chú hết giờ: vẫn trả các dòng với mức đúng, ghi chú để trống cho giáo viên điền', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    h.grade = '10';
    h.reply = 'Nhận xét.';
    h.fail = 'notesSlow';
    h.mapReply = JSON.stringify({ yccd: [{ ma: 'T10.03', cau: ['b1q1'] }] });
    const facts = { baiDaDuyet: [{ ma: 'b1', ten: 'BTVN', ngay: '2026-09-20', cau: [{ ma: 'b1q1', diem: 2, toiDa: 2, ketQua: 'đúng' }] }] };
    const out = await call({ action: 'draftParentReportComment', ...key, facts });
    expect(out.status).toBe(200);
    expect(out.body.requirements).toEqual([{ id: 'T10.03', level: 'vung', evidence: 1, percent: 100, note: '', questions: [{ code: 'b1q1', score: 2, max: 2 }] }]);
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

  it('lưu rồi đọc lại giữ danh sách câu căn cứ (để gom theo bài SGK không đếm trùng); câu hỏng bị bỏ', async () => {
    h.grade = '10';
    const questions = [{ code: 'b1q1', score: 1, max: 2 }, { code: 'b1q1', score: 2, max: 2 }, { code: 'x', score: 1, max: 1 }, { code: 'b2', score: 9, max: 4 }];
    await call({ action: 'saveParentReportNote', ...key, text: 'x', requirements: [{ id: 'T10.03', level: 'dang', evidence: 2, percent: 50, note: '', questions }] });
    const read = await call({ action: 'parentReportNote', ...key });
    expect(read.body.requirements).toEqual([{ id: 'T10.03', level: 'dang', evidence: 2, percent: 50, note: '', questions: [{ code: 'b1q1', score: 1, max: 2 }, { code: 'b2', score: 4, max: 4 }] }]);
  });

  it('lưu rồi đọc lại đúng theo học sinh + loại + khoảng; khoảng khác thì trống', async () => {
    expect((await call({ action: 'saveParentReportNote', ...key, text: '  Nhận xét đã sửa  ' })).body.text).toBe('Nhận xét đã sửa');
    expect((await call({ action: 'parentReportNote', ...key })).body.text).toBe('Nhận xét đã sửa');
    expect((await call({ action: 'parentReportNote', ...key, to: '2026-11-15' })).body.text).toBe('');
  });

  it('bản chỉnh tay: lưu + đọc lại; báo cáo đã công bố cập nhật ngay, chưa công bố thì không đụng tới; "tổng hợp từ đầu năm" lưu được', async () => {
    const publishedId = 'classes/lop/parentReports/hs1__gk1__2026-09-01__2026-10-31';
    h.store[publishedId] = { inputJson: '{}', studentId: 'hs1' };
    const saved = await call({ action: 'saveParentReportNote', ...key, text: 'Nhận xét', overrides: { overallSummary: ' Thầy viết ', strengths: ['A'], evil: 1, officialCount: 5 } });
    expect(saved.body.overrides).toEqual({ overallSummary: 'Thầy viết', strengths: ['A'], officialCount: 5 });
    expect((await call({ action: 'parentReportNote', ...key })).body.overrides).toEqual({ overallSummary: 'Thầy viết', strengths: ['A'], officialCount: 5 });
    expect(JSON.parse(String(h.store[publishedId].overridesJson))).toEqual({ overallSummary: 'Thầy viết', strengths: ['A'], officialCount: 5, teacherComment: 'Nhận xét', requirements: [] });
    // Chưa công bố kì khác: không tạo tài liệu công bố.
    await call({ action: 'saveParentReportNote', ...key, to: '2026-11-15', text: 'x', overrides: { officialCount: 1 } });
    expect(h.store['classes/lop/parentReports/hs1__gk1__2026-09-01__2026-11-15']).toBeUndefined();
    // Lưu lại mà không gửi `overrides` (soạn hàng loạt) thì giữ nguyên chỗ đã chỉnh.
    await call({ action: 'saveParentReportNote', ...key, text: 'Nhận xét 2' });
    expect((await call({ action: 'parentReportNote', ...key })).body.overrides).toEqual({ overallSummary: 'Thầy viết', strengths: ['A'], officialCount: 5 });
    const all = { studentId: 'hs1', kind: 'all', from: '2026-01-01', to: '2026-12-31' };
    await call({ action: 'saveParentReportNote', ...all, text: '', overrides: { missingCount: 0 } });
    expect((await call({ action: 'parentReportNote', ...all })).body.overrides).toEqual({ missingCount: 0 });
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
