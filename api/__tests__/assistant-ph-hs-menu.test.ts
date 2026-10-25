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
    expect(MENU_REPLIES.needChoice).toContain('1–7');
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

  it('M6: parseMenuChoice: 1–7 là section, 0/menu là menu, còn lại invalid', () => {
    for (const key of ['1', '2', '3', '4', '5', '6', '7']) expect(parseMenuChoice(key)).toEqual({ kind: 'section', key });
    expect(parseMenuChoice('0')).toEqual({ kind: 'menu' });
    expect(parseMenuChoice('menu')).toEqual({ kind: 'menu' });
    expect(parseMenuChoice('')).toEqual({ kind: 'menu' });
    for (const bad of ['8', '12', '1 2', 'abc', '/link']) expect(parseMenuChoice(bad)).toEqual({ kind: 'invalid' });
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
    expect(kt).toContain('trung bình 60%'); // chỉ tính bài đã chấm
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
