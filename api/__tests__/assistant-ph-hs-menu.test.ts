import { describe, expect, it, vi } from 'vitest';
import { FakeDb } from './_fake-db.js';
import { buildParentSafeReport } from '../../src/lib/classroom/parentSafeReport.js';
import { MENU_ITEMS, MENU_REPLIES, loadParentReport, menuSectionText, menuText, parseMenuChoice, parentMenuReply } from '../_assistant-ph-hs-menu.js';

/**
 * Phase 2 — menu 1–6.
 * Ranh giới quan trọng nhất: người CHƯA liên kết không bao giờ thấy menu (M1), và mọi mục
 * đọc đúng (classId, studentId) của link, không có tham số nào từ người nhắn (M2, M3).
 */

const seed = () => {
  const db = new FakeDb();
  db.put('classes/c', { name: '12LoTrinh1', joinCode: 'AD4GKT' });
  db.put('classes/c/students/s1', { name: 'Trần Bảo Lâm', code: '87272487' });
  db.put('classes/c/students/s2', { name: 'Nguyễn Chi Mai', code: '87168299' });
  db.put('assignments/a1', { classId: 'c', title: 'BTVN tuần 3', maxScore: 10, dueAt: '2026-10-20' });
  db.put('assignments/a2', { classId: 'c', title: 'BTVN tuần 4', maxScore: 10, dueAt: '2026-10-27' });
  // s1 đã nộp a1 và được chấm; a2 chưa nộp
  db.put('submissions/sub1', { classId: 'c', studentId: 's1', assignmentId: 'a1', status: 'graded', grade: { score: 8, maxScore: 10, teacherApproved: true }, createdAt: '2026-10-21T00:00:00Z' });
  // s2 có dữ liệu riêng — không được lộ cho người đang xem s1
  db.put('submissions/sub2', { classId: 'c', studentId: 's2', assignmentId: 'a1', status: 'graded', grade: { score: 2, maxScore: 10, teacherApproved: true }, createdAt: '2026-10-21T00:00:00Z' });
  db.put('studentProfiles/s1', { studentId: 's1', classId: 'c', skills: {} });
  return db;
};

describe('menu PH/HS — Phase 2', () => {
  it('nhãn tổng quan không hứa dữ liệu tuần khi báo cáo lấy toàn bộ lịch sử', () => {
    expect(menuText('HS Mẫu', 'Lớp Mẫu')).not.toContain('tuần này');
    expect(MENU_REPLIES.needChoice).toContain('Nhắn 0 để xem lại menu.');
  });

  it('mục 2 và 7 lấy 8 bài mới nhất theo thứ tự báo cáo', () => {
    const report = { studentName: 'HS Mẫu', results: Array.from({ length: 10 }, (_, i) => ({
      assignmentId: `a${i}`, title: `Bài thứ ${i}`, status: 'official', score: 8, maxScore: 10,
      submittedAt: new Date(Date.UTC(2026, 9, 25 - i)).toISOString(),
    })) } as any;
    for (const [key, periodic] of [['2', new Set<string>()], ['7', new Set(report.results.map((r: any) => r.assignmentId))]] as const) {
      const out = menuSectionText(key, report, periodic as Set<string>);
      expect(out).toContain('Bài thứ 0:'); expect(out).not.toContain('Bài thứ 9:');
    }
  });

  it('điểm chưa duyệt và feedback không xuất hiện trong bất kỳ mục PH nào', async () => {
    const db = seed();
    db.put('submissions/sub1', { classId: 'c', studentId: 's1', assignmentId: 'a1', status: 'graded', grade: { score: 9.876, maxScore: 10, teacherApproved: false, feedback: 'NOI_DUNG_RIENG_BAI_LAM' }, createdAt: '2026-10-21T00:00:00Z' });
    db.put('assignments/a1', { classId: 'c', title: 'Kiểm tra', periodicTest: {}, maxScore: 10 });
    for (const key of ['1', '2', '3', '4', '5', '6', '7']) {
      const out = await parentMenuReply(db.db, 'c', 's1', key);
      expect(out).not.toContain('9.876'); expect(out).not.toContain('NOI_DUNG_RIENG_BAI_LAM');
    }
  });

  it('mục 3 không bỏ sót bài nộp đang lỗi xử lý', async () => {
    const db = seed();
    db.put('submissions/sub1', { classId: 'c', studentId: 's1', assignmentId: 'a1', status: 'error', createdAt: '2026-10-21T00:00:00Z' });
    const out = await parentMenuReply(db.db, 'c', 's1', '3');
    expect(out).toContain('BTVN tuần 3'); expect(out).toContain('lỗi xử lý');
  });

  it('M1: người chưa liên kết KHÔNG thấy menu ở bất kỳ cách gõ nào', async () => {
    // Webhook tự chặn trước khi tới menu: chỉ nhánh có link mới gọi parentMenuReply.
    // Ở đây khẳng định hợp đồng của module: nó không bao giờ tự nhận người lạ.
    const { parseMenuChoice } = await import('../_assistant-ph-hs-menu.js');
    // Mọi input của người lạ đều không chứa dữ liệu lớp/em
    for (const raw of ['1', 'menu', '0', 'xin chào']) {
      const out = parseMenuChoice(raw);
      expect(['menu', 'section', 'invalid']).toContain(out.kind);
    }
    const db = seed();
    const { report } = (await loadParentReport(db.db, 'c', 's1'))!;
    const text = menuText(report.studentName, report.className);
    expect(text).toContain('12LoTrinh1');
    expect(text).not.toMatch(/87168299|c\/students/); // không lộ mã em khác
  });

  it('M2: menu liệt kê đủ 7 mục + mục 0, đánh số 1–7', () => {
    const text = menuText('Trần Bảo Lâm', '12LoTrinh1');
    expect(MENU_ITEMS).toHaveLength(7);
    for (const item of MENU_ITEMS) expect(text).toContain(`${item.key}. ${item.label}`);
    expect(text).toContain('0. Xem lại menu');
  });

  it('M3: báo cáo đọc ĐÚNG em của link — không lẫn dữ liệu em khác cùng lớp', async () => {
    const db = seed();
    const a = (await loadParentReport(db.db, 'c', 's1'))!.report;
    const b = (await loadParentReport(db.db, 'c', 's2'))!.report;
    expect(a.studentName).toBe('Trần Bảo Lâm');
    expect(b.studentName).toBe('Nguyễn Chi Mai');
    const aScores = a.results.map(r => r.score ?? '-');
    expect(aScores).not.toContain(2); // điểm của s2 không lọt sang
    const gradedB = b.results.find(r => r.assignmentId === 'a1');
    expect(gradedB?.score).toBe(2);
  });

  it('M4: mục 1 tổng quan có đủ số đã chấm / chờ / chưa nộp / xu hướng', async () => {
    const db = seed();
    const { report } = (await loadParentReport(db.db, 'c', 's1'))!;
    const text = menuSectionText('1', report);
    expect(text).toContain('Đã chấm:');
    expect(text).toContain('Chưa nộp:');
    expect(text).toContain('Xu hướng:');
    expect(text).toContain(report.overallSummary);
  });

  it('M5: mục 2 chỉ hiện bài ĐÃ chấm kèm điểm; mục 3 chỉ bài chờ', async () => {
    const db = seed();
    const { report } = (await loadParentReport(db.db, 'c', 's1'))!;
    const graded = menuSectionText('2', report);
    expect(graded).toContain('BTVN tuần 3');
    expect(graded).not.toContain('BTVN tuần 4');
    const todo = menuSectionText('3', report);
    expect(todo).toContain('BTVN tuần 4');
    expect(todo).toContain('chưa nộp');
    expect(todo).not.toContain('BTVN tuần 3');
  });

  it('M6: parseMenuChoice: 1–8 là section, 0/menu là menu, 9 là đổi vai, còn lại invalid', () => {
    for (const key of ['1', '2', '3', '4', '5', '6', '7', '8']) expect(parseMenuChoice(key)).toEqual({ kind: 'section', key });
    expect(parseMenuChoice('0')).toEqual({ kind: 'menu' });
    expect(parseMenuChoice('menu')).toEqual({ kind: 'menu' });
    expect(parseMenuChoice('')).toEqual({ kind: 'menu' });
    // Mục 9 "Đổi vai trò" (chốt 29/10) — không còn là invalid.
    expect(parseMenuChoice('9')).toEqual({ kind: 'switchRole' });
    expect(parseMenuChoice('doi vai')).toEqual({ kind: 'switchRole' });
    for (const bad of ['12', '1 2', 'abc', '/link']) expect(parseMenuChoice(bad)).toEqual({ kind: 'invalid' });
  });

  it('M7: mục 6 nói rõ đang liên kết em nào và đường đổi em / quên PIN', async () => {
    const db = seed();
    const { report } = (await loadParentReport(db.db, 'c', 's1'))!;
    const text = menuSectionText('6', report);
    expect(text).toContain('Trần Bảo Lâm');
    expect(text).toContain('phụ huynh');
    expect(text).toContain('/khoiphuc');
    expect(text).not.toContain('87168299');
  });

  it('M8: học sinh chưa có bài nào vẫn trả lời tử tế, không lỗi', async () => {
    const db = seed();
    db.put('classes/c/students/s3', { name: 'HS Mới', code: 'S999' });
    const out = await parentMenuReply(db.db, 'c', 's3', '1');
    expect(out).toContain('HS Mới');
    expect(out).not.toContain('undefined');
    const todo = await parentMenuReply(db.db, 'c', 's3', '3');
    expect(todo).toContain('chưa nộp'); // HS mới: 2 bài của lớp, chưa nộp bài nào
    expect(todo).not.toContain('undefined');
    // HS/id không tồn tại → câu chung, không lộ gì
    expect(await parentMenuReply(db.db, 'c', 'khong-co', '1')).toBe(MENU_REPLIES.noData);
  });

  it('M9: buildParentSafeReport không lộ nội dung lớp khác / em khác', async () => {    const db = seed();
    const report = buildParentSafeReport({
      studentId: 's1', studentName: 'Trần Bảo Lâm', className: '12LoTrinh1',
      assignments: [{ id: 'a1', title: 'BTVN tuần 3', maxScore: 10 }],
      submissions: [
        { id: 'sub1', studentId: 's1', assignmentId: 'a1', status: 'graded', grade: { score: 8, maxScore: 10, teacherApproved: true } } as any,
        { id: 'sub2', studentId: 's2', assignmentId: 'a1', status: 'graded', grade: { score: 2, maxScore: 10, teacherApproved: true } } as any,
      ],
      profile: null,
    });
    expect(report.results).toHaveLength(1);
    expect(report.results[0].score).toBe(8);
  });
});

describe('tách BTVN và bài kiểm tra định kì', () => {
  it('M11: mục 2 chỉ bài thường, mục 7 chỉ bài có periodicTest', () => {
    const report = {
      studentId: 's1', studentName: 'Trần Bảo Lâm', className: '12LoTrinh1',
      results: [
        { assignmentId: 'a1', title: 'BTVN tuần 3', status: 'official', score: 8, maxScore: 10 },
        { assignmentId: 'kt1', title: 'Kiểm tra giữa kì I', status: 'official', score: 6, maxScore: 10 },
        { assignmentId: 'kt2', title: 'Kiểm tra cuối kì', status: 'not_submitted', score: null, maxScore: null, dueAt: '2026-12-20' },
      ],
      officialCount: 2, officialAveragePercent: 70, pendingCount: 0, missingCount: 1,
      strengths: [], areasToPractice: [], progress: { trend: 'flat', firstPercent: 60, latestPercent: 70 },
      overallSummary: '', parentActions: [], teacherActions: [],
    } as any;
    const periodic = new Set(['kt1', 'kt2']);
    const bt = menuSectionText('2', report, periodic);
    expect(bt).toContain('BTVN tuần 3');
    expect(bt).not.toContain('Kiểm tra giữa kì I');
    const kt = menuSectionText('7', report, periodic);
    expect(kt).toContain('Kiểm tra giữa kì I');
    expect(kt).toContain('6/10');
    expect(kt).toContain('chưa nộp');
    expect(kt).not.toContain('BTVN tuần 3');
    // Không hiện % (chốt 25/10) — PH thấy điểm thô 6/10 là đủ.
    expect(kt).not.toContain('60%');
    // Mọi mục đều nhắc xem lại menu.
    expect(kt).toContain('Nhắn 0 để xem lại menu.');
  });

  it('M12: chưa có bài kiểm tra định kì thì trả lời lịch sự', () => {
    const report = { studentName: 'HS Mới', className: '12LoTrinh1', results: [], officialCount: 0, officialAveragePercent: null, pendingCount: 0, missingCount: 0, strengths: [], areasToPractice: [], progress: { trend: 'not_enough_data' }, overallSummary: '', parentActions: [], teacherActions: [] } as any;
    expect(menuSectionText('7', report, new Set())).toContain('Chưa có bài kiểm tra định kì nào');
  });
});

describe('menu — không phụ thuộc tham số người nhắn', () => {
  it('M10: parentMenuReply chỉ dùng (classId, studentId) truyền vào, không đọc link/người gửi', async () => {
    const db = seed();
    const spy = vi.spyOn(db, 'collection');
    await parentMenuReply(db.db, 'c', 's1', '1');
    const paths = spy.mock.calls.map(call => call[0]);
    expect(paths).not.toContain('channelLinks'); // menu không tự tra quyền — bot quyết định trước
    expect(paths).toContain('classes');
  });
});

describe('menu theo vai trò (M13)', () => {
  const report = {
    studentId: 's1', studentName: 'Trần Bảo Lâm', className: '12LoTrinh1',
    results: [{ assignmentId: 'a1', title: 'BTVN tuần 3', status: 'official', score: 8, maxScore: 10 }],
    officialCount: 1, officialAveragePercent: 80, pendingCount: 0, missingCount: 0,
    strengths: ['Làm tốt dạng cộng trừ'], areasToPractice: ['Luyện phép nhân chia có nhớ'],
    progress: { trend: 'up', firstPercent: 60, latestPercent: 80 },
    overallSummary: '', parentActions: ['Nhắc con làm bài tập về nhà mỗi tối'], teacherActions: [],
  } as any;

  it('M13a: HS nhắn mục 5 nhận gợi ý tự học (từ areasToPractice), KHÔNG nhận việc của phụ huynh', () => {
    const out = menuSectionText('5', report, new Set(), 'student');
    expect(out).toContain('Gợi ý tự học của Trần Bảo Lâm');
    expect(out).toContain('Luyện phép nhân chia có nhớ');
    expect(out).not.toContain('phụ huynh');
    expect(out).not.toContain('Nhắc con làm bài tập về nhà');
    expect(out).toContain('Nhắn 0 để xem lại menu.');
  });

  it('M13b: PH (mặc định) mục 5 vẫn là việc phụ huynh — không đổi hành vi cũ', () => {
    expect(menuSectionText('5', report, new Set())).toContain('Việc phụ huynh có thể làm ở nhà');
    expect(menuText('Trần Bảo Lâm', '12LoTrinh1')).toContain('5. Việc phụ huynh làm ở nhà');
    expect(menuText('Trần Bảo Lâm', '12LoTrinh1', 'parent')).toContain('5. Việc phụ huynh làm ở nhà');
  });

  it('M13c: menu của HS đổi nhãn mục 5; HS chưa có dữ liệu thì trả lời lịch sự', async () => {
    expect(menuText('Trần Bảo Lâm', '12LoTrinh1', 'student')).toContain('5. Gợi ý tự học ở nhà');
    const db = seed();
    const out = await parentMenuReply(db.db, 'c', 's1', '5', 'student');
    expect(out).toContain('Chưa có gợi ý tự học riêng');
    expect(out).not.toContain('undefined');
  });
});

describe('link web + feedback HS (M14)', () => {
  it('M14a: nhắn web/link → nhận đúng link portal theo vai trò, kèm nhắc menu', async () => {
    const db = seed();
    expect(parseMenuChoice('link')).toEqual({ kind: 'link' });
    expect(parseMenuChoice('WEB')).toEqual({ kind: 'link' });
    expect(parseMenuChoice('webcam')).toEqual({ kind: 'invalid' });
    const ph = await parentMenuReply(db.db, 'c', 's1', 'web', 'parent');
    expect(ph).toContain('https://giaoandewey.vercel.app/ph/AD4GKT');
    expect(ph).not.toContain('/lop/');
    expect(ph).toContain('Nhắn 0 để xem lại menu.');
    const hs = await parentMenuReply(db.db, 'c', 's1', 'website', 'student');
    expect(hs).toContain('https://giaoandewey.vercel.app/lop/AD4GKT');
  });

  it('M14b: mục 2 bản HS kèm nhận xét GV đã duyệt; bản PH không kèm', async () => {
    const db = seed();
    db.put('submissions/sub1', { classId: 'c', studentId: 's1', assignmentId: 'a1', status: 'graded', grade: { score: 8, maxScore: 10, teacherApproved: true, feedback: 'Em làm tốt dạng cơ bản, cần cẩn thận hơn với phép chia có dư.' }, createdAt: '2026-10-21T00:00:00Z' });
    const hs = (await loadParentReport(db.db, 'c', 's1', 'student'))!;
    expect(hs.report.results[0]?.feedback).toContain('phép chia có dư');
    expect(menuSectionText('2', hs.report, new Set(), 'student')).toContain('Em làm tốt dạng cơ bản');
    const ph = (await loadParentReport(db.db, 'c', 's1'))!;
    expect(ph.report.results[0]?.feedback).toBeUndefined();
    expect(menuSectionText('2', ph.report, new Set())).not.toContain('Em làm tốt dạng cơ bản');
  });

  it('M14c: feedback CHƯA duyệt tuyệt đối không lọt vào bản HS', async () => {
    const db = seed();
    db.put('submissions/sub1', { classId: 'c', studentId: 's1', assignmentId: 'a1', status: 'graded', grade: { score: 9.876, maxScore: 10, teacherApproved: false, feedback: 'NOI_DUNG_CHUA_DUYET' }, createdAt: '2026-10-21T00:00:00Z' });
    const hs = (await loadParentReport(db.db, 'c', 's1', 'student'))!;
    expect(JSON.stringify(hs.report.results)).not.toContain('NOI_DUNG_CHUA_DUYET');
  });

  it('M14d: mục 6 hướng dẫn cách nhận link web', async () => {
    const db = seed();
    expect(await parentMenuReply(db.db, 'c', 's1', '6')).toContain('nhắn web');
  });
});

describe('mục 8 — nộp bài bằng ảnh (việc 4)', () => {
  it('M15a: menu của HS có mục 8; menu của PH không', () => {
    expect(menuText('Trần Bảo Lâm', '12LoTrinh1', 'student')).toContain('8. Nộp bài bằng ảnh');
    expect(menuText('Trần Bảo Lâm', '12LoTrinh1')).not.toContain('Nộp bài bằng ảnh');
    expect(menuText('Trần Bảo Lâm', '12LoTrinh1', 'parent')).not.toContain('Nộp bài bằng ảnh');
  });
  it('M15b: HS chọn mục 8 → hướng dẫn nhắn chấm', async () => {
    const db = seed();
    const out = await parentMenuReply(db.db, 'c', 's1', '8', 'student');
    expect(out).toContain('nhắn chấm');
    expect(out).toContain('Nhắn 0 để xem lại menu.');
  });
  it('M15c: PH chọn mục 8 → từ chối đúng 1 câu, không hứa nộp thay', async () => {
    const db = seed();
    const out = await parentMenuReply(db.db, 'c', 's1', '8');
    expect(out).toContain('dành cho học sinh');
    expect(out).not.toContain('nhắn chấm');
    expect(out).toContain('Nhắn 0 để xem lại menu.');
  });
  it('M15d: mục 6 bản HS nhắc thêm chức năng nộp ảnh; bản PH không', async () => {
    const db = seed();
    const hs = await parentMenuReply(db.db, 'c', 's1', '6', 'student');
    expect(hs).toContain('nhắn 8');
    const ph = await parentMenuReply(db.db, 'c', 's1', '6');
    expect(ph).not.toContain('nhắn 8');
  });
});
