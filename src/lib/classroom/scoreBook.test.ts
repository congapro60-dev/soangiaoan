import { describe, expect, it } from 'vitest';
import {
  computeAutoScores,
  hs1Average,
  parseHs1Weight,
  scoreToTen,
  normalizeScoreBook,
  parseHs1Score,
  sanitizeExamScores,
  studentScoreView,
  validateHs1Column,
} from './scoreBook';

describe('sổ điểm', () => {
  it('điểm hệ số 1: 0–10, tối đa 2 số lẻ, nhận dấu phẩy; ô trống là xoá điểm', () => {
    expect(parseHs1Score('8,5')).toBe(8.5);
    expect(parseHs1Score(10)).toBe(10);
    expect(parseHs1Score('0')).toBe(0);
    expect(parseHs1Score('7.25')).toBe(7.25);
    expect(parseHs1Score('')).toBeNull();
    expect(parseHs1Score(null)).toBeNull();
    expect(parseHs1Score('10.5')).toBeUndefined();
    expect(parseHs1Score('-1')).toBeUndefined();
    expect(parseHs1Score('8.125')).toBeUndefined();
    expect(parseHs1Score('tám')).toBeUndefined();
  });

  it('cột điểm cần tên và ngày thật', () => {
    expect(validateHs1Column({ label: '  KT 15 phút   lần 1 ', date: '2026-09-20' })).toEqual({ label: 'KT 15 phút lần 1', date: '2026-09-20' });
    expect(validateHs1Column({ label: '', date: '2026-09-20' })).toHaveProperty('error');
    expect(validateHs1Column({ label: 'KT', date: '20/09/2026' })).toHaveProperty('error');
  });

  it('điểm thi gửi lên bị làm sạch: bỏ mốc không tên / điểm vô lý, giữ điểm chữ', () => {
    expect(sanitizeExamScores({
      moet: [{ label: 'Giữa học kì I', score: 8.25 }, { label: '', score: 5 }, { label: 'X', score: 999 }, { label: 'Y', score: '7' }],
      tds: [{ label: 'Quý 1', score: 85, letter: 'A' }],
      extra: 'bỏ',
    })).toEqual({ moet: [{ label: 'Giữa học kì I', score: 8.25 }], tds: [{ label: 'Quý 1', score: 85, letter: 'A' }] });
    expect(sanitizeExamScores('rác')).toEqual({ moet: [], tds: [] });
  });

  it('học sinh chỉ thấy dòng của mình, cột xếp theo ngày, bỏ ô chưa có điểm', () => {
    const book = normalizeScoreBook('lop-1', {
      hs1Columns: [
        { id: 'c2', label: 'Miệng', date: '2026-09-22' },
        { id: 'c1', label: 'KT 15 phút', date: '2026-09-10' },
        { id: 'c3', label: 'Chưa chấm', date: '2026-09-23' },
      ],
      hs1: { a: { c1: 8, c2: 9.5 }, b: { c1: 4 } },
      exams: { a: { moet: [{ label: 'Khảo sát đầu năm', score: 7 }], tds: [] } },
      examsSyncedAt: '2026-09-24T01:00:00Z',
    });
    expect(studentScoreView(book, 'a')).toEqual({
      exams: { moet: [{ label: 'Khảo sát đầu năm', score: 7 }], tds: [] },
      hs1: [{ label: 'KT 15 phút', date: '2026-09-10', score: 8, weight: 1 }, { label: 'Miệng', date: '2026-09-22', score: 9.5, weight: 1 }],
      examsSyncedAt: '2026-09-24T01:00:00Z',
      average: 8.75,
    });
    expect(studentScoreView(book, 'khong-co')).toEqual({ exams: { moet: [], tds: [] }, hs1: [], examsSyncedAt: '2026-09-24T01:00:00Z', average: null });
  });

  it('document hỏng không làm vỡ màn hình', () => {
    expect(normalizeScoreBook('lop-1', null)).toEqual({ classId: 'lop-1', hs1Columns: [], hs1: {}, exams: {} });
    expect(normalizeScoreBook('lop-1', { hs1Columns: 'x', hs1: { a: { c1: 'NaN' } } }).hs1).toEqual({ a: {} });
  });

  it('trung bình hệ số 1', () => {
    expect(hs1Average([])).toBeNull();
    expect(hs1Average([{ label: 'a', date: 'd', score: 8 }, { label: 'b', date: 'd', score: 7.5 }, { label: 'c', date: 'd', score: 9 }])).toBe(8.17);
  });

  it('trung bình có hệ số: Σ(hệ số × điểm) / Σ hệ số', () => {
    expect(hs1Average([
      { label: 'a', date: 'd', score: 8, weight: 1 },
      { label: 'b', date: 'd', score: 6, weight: 2 },
      { label: 'c', date: 'd', score: 9, weight: 3 },
    ])).toBe(7.83);
  });

  it('hệ số chỉ nhận 1, 2, 3', () => {
    expect(parseHs1Weight(2)).toBe(2);
    expect(parseHs1Weight('3')).toBe(3);
    expect(parseHs1Weight(0)).toBeUndefined();
    expect(parseHs1Weight(4)).toBeUndefined();
    expect(parseHs1Weight('x')).toBeUndefined();
  });

  it('quy điểm về thang 10, chặn điểm vượt thang và thang hỏng', () => {
    expect(scoreToTen(15, 20)).toBe(7.5);
    expect(scoreToTen(8, 10)).toBe(8);
    expect(scoreToTen(25, 20)).toBe(10);
    expect(scoreToTen(5, 0)).toBeNull();
    expect(scoreToTen(-1, 10)).toBeNull();
  });

  it('cột liên kết: điểm lấy từ bài nộp mới nhất, ô nhập tay đè, hệ số vào trung bình, mốc MOET chọn hệ số vào trung bình', () => {
    const book = normalizeScoreBook('lop-1', {
      hs1Columns: [
        { id: 'c1', label: 'BTVN tuần 1', date: '2026-09-10', weight: 2, assignmentId: 'bt1' },
        { id: 'c2', label: 'Miệng', date: '2026-09-12' },
      ],
      hs1: { a: { c2: 10 }, b: { c1: 9 } },
      exams: { a: { moet: [{ label: 'Giữa kì', score: 6 }, { label: 'Khảo sát', score: 1 }], tds: [] } },
      examWeights: { 'Giữa kì': 2, 'Khảo sát': 7 },
    });
    expect(book.examWeights).toEqual({ 'Giữa kì': 2 });
    const entries = [
      { assignmentId: 'bt1', studentId: 'a', submittedAt: '2026-09-10T01:00:00Z', score: 4, maxScore: 10 },
      { assignmentId: 'bt1', studentId: 'a', submittedAt: '2026-09-11T01:00:00Z', score: 16, maxScore: 20 },
      { assignmentId: 'bt1', studentId: 'b', submittedAt: '2026-09-11T01:00:00Z', score: 3, maxScore: 10 },
    ];
    const auto = computeAutoScores(book, [{ id: 'bt1', title: 'BTVN tuần 1', createdAt: '2026-09-09T00:00:00Z', periodic: false }], entries, ['a', 'b'], Date.parse('2026-09-30T00:00:00Z'));
    expect(auto.linked.c1).toEqual({ a: 8, b: 3 });
    const view = studentScoreView({ ...book, auto }, 'a');
    expect(view.hs1.find(m => m.label === 'BTVN tuần 1')).toMatchObject({ score: 8, weight: 2 });
    // (8×2 + 10×1 + 6×2) / 5 = 7.6
    expect(view.average).toBe(7.6);
    // ô nhập tay của b đè điểm tự lấy (9 thay vì 3)
    expect(studentScoreView({ ...book, auto }, 'b').hs1[0].score).toBe(9);
  });

  it('chuyên cần = % bài đã nộp × 10; chỉ tính bài đã đến hạn hoặc đã nộp; bỏ bài kiểm tra định kì và bài không giao cho em', () => {
    const book = normalizeScoreBook('lop-1', {});
    const now = Date.parse('2026-10-01T00:00:00Z');
    const assignments = [
      { id: 'x1', title: 'x1', createdAt: '2026-09-01T00:00:00Z', dueAt: '2026-09-05T00:00:00Z', periodic: false },
      { id: 'x2', title: 'x2', createdAt: '2026-09-02T00:00:00Z', dueAt: '2026-09-06T00:00:00Z', periodic: false },
      { id: 'x3', title: 'x3', createdAt: '2026-09-03T00:00:00Z', dueAt: '2026-09-07T00:00:00Z', periodic: false },
      { id: 'x4', title: 'x4', createdAt: '2026-09-04T00:00:00Z', dueAt: '2026-09-08T00:00:00Z', periodic: false, targetStudentIds: ['khac'] },
      { id: 'dk', title: 'giữa kì', createdAt: '2026-09-04T00:00:00Z', dueAt: '2026-09-08T00:00:00Z', periodic: true },
      { id: 'moi', title: 'mới giao', createdAt: '2026-09-30T20:00:00Z', periodic: false },
    ];
    const entries = [
      { assignmentId: 'x1', studentId: 'a', submittedAt: '2026-09-04T00:00:00Z', score: 10, maxScore: 10 },
      { assignmentId: 'x2', studentId: 'a', submittedAt: '2026-09-05T00:00:00Z', score: 5, maxScore: 10 },
      { assignmentId: 'x3', studentId: 'a', submittedAt: '2026-09-06T00:00:00Z', score: null, maxScore: 10 },
      { assignmentId: 'moi', studentId: 'a', submittedAt: '2026-09-30T21:00:00Z', score: null, maxScore: 10 },
    ];
    const { homework } = computeAutoScores(book, assignments, entries, ['a', 'b'], now);
    // a: 4 bài tính (x1, x2, x3 và "mới giao" vì đã nộp), nộp cả 4 → 10; TB = (10 + 5) / 2 = 7.5
    expect(homework.a).toEqual({ submitted: 4, total: 4, attendance: 10, average: 7.5, graded: 2 });
    // b: x1, x2, x3 đã đến hạn mà chưa nộp; "mới giao" chưa đến 24h nên chưa tính → 0/3
    expect(homework.b).toEqual({ submitted: 0, total: 3, attendance: 0, average: null, graded: 0 });
  });

  it('chuyên cần: nộp 7/9 bài (77,8%) là 7.8 điểm', () => {
    const assignments = Array.from({ length: 9 }, (_, i) => ({ id: `t${i}`, title: `t${i}`, createdAt: '2026-09-01T00:00:00Z', dueAt: '2026-09-02T00:00:00Z', periodic: false }));
    const entries = assignments.slice(0, 7).map(a => ({ assignmentId: a.id, studentId: 'a', submittedAt: '2026-09-02T00:00:00Z', score: null, maxScore: 10 }));
    const { homework } = computeAutoScores(normalizeScoreBook('l', {}), assignments, entries, ['a'], Date.parse('2026-10-01T00:00:00Z'));
    expect(homework.a.attendance).toBe(7.8);
  });
});
