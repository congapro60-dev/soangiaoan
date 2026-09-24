import { describe, expect, it } from 'vitest';
import {
  hs1Average,
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
      hs1: [{ label: 'KT 15 phút', date: '2026-09-10', score: 8 }, { label: 'Miệng', date: '2026-09-22', score: 9.5 }],
      examsSyncedAt: '2026-09-24T01:00:00Z',
    });
    expect(studentScoreView(book, 'khong-co')).toEqual({ exams: { moet: [], tds: [] }, hs1: [], examsSyncedAt: '2026-09-24T01:00:00Z' });
  });

  it('document hỏng không làm vỡ màn hình', () => {
    expect(normalizeScoreBook('lop-1', null)).toEqual({ classId: 'lop-1', hs1Columns: [], hs1: {}, exams: {} });
    expect(normalizeScoreBook('lop-1', { hs1Columns: 'x', hs1: { a: { c1: 'NaN' } } }).hs1).toEqual({ a: {} });
  });

  it('trung bình hệ số 1', () => {
    expect(hs1Average([])).toBeNull();
    expect(hs1Average([{ label: 'a', date: 'd', score: 8 }, { label: 'b', date: 'd', score: 7.5 }, { label: 'c', date: 'd', score: 9 }])).toBe(8.17);
  });
});
