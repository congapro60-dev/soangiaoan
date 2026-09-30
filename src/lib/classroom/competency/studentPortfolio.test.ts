import { describe, expect, it } from 'vitest';
import { mergePortfolio, normalizePortfolio, sanitizePortfolioPatch, schoolYearMonths, upcomingMonths } from './studentPortfolio';

describe('sanitizePortfolioPatch', () => {
  const raw = {
    'g10-ham-so-bac-hai': {
      selfLevel: 'Tốt', goal: '  Vẽ đúng parabol  ', progress: 'Đang thực hiện', timeframe: 'tháng 10/2026',
      teacherLevel: 'Xuất sắc', teacherComment: 'Tốt lắm',
    },
    'g11-gioi-han': { selfLevel: 'Tốt' },          // khác khối → bỏ
    'g10-khong-co': { selfLevel: 'Tốt' },          // id lạ → bỏ
    'g10-pt-duong-tron': { selfLevel: 'Giỏi', progress: 'Xong' }, // giá trị sai → bỏ cả mục
  };

  it('HS: chỉ giữ ô của HS, bỏ mức/ý kiến của GV', () => {
    expect(sanitizePortfolioPatch(raw, 10, 'student')).toEqual({
      'g10-ham-so-bac-hai': { selfLevel: 'Tốt', goal: 'Vẽ đúng parabol', progress: 'Đang thực hiện', timeframe: 'tháng 10/2026' },
    });
  });

  it('GV: giữ cả mức chốt + ý kiến', () => {
    expect(sanitizePortfolioPatch(raw, 10, 'teacher')['g10-ham-so-bac-hai']).toMatchObject({ teacherLevel: 'Xuất sắc', teacherComment: 'Tốt lắm' });
  });

  it('rỗng/null là xoá; chữ quá dài bị cắt; dữ liệu rác trả rỗng', () => {
    const p = sanitizePortfolioPatch({ 'g10-ham-so-bac-hai': { selfLevel: null, goal: '', plan: 'x'.repeat(900) } }, 10, 'student');
    expect(p['g10-ham-so-bac-hai'].selfLevel).toBeNull();
    expect(p['g10-ham-so-bac-hai'].goal).toBe('');
    expect(p['g10-ham-so-bac-hai'].plan).toHaveLength(500);
    expect(sanitizePortfolioPatch('abc', 10, 'student')).toEqual({});
    expect(sanitizePortfolioPatch([1], 10, 'teacher')).toEqual({});
  });
});

describe('mergePortfolio / normalizePortfolio', () => {
  it('gộp theo từng ô, không xoá ô không gửi', () => {
    const merged = mergePortfolio(
      { a: { selfLevel: 'Tốt', goal: 'cũ' }, b: { goal: 'giữ' } },
      { a: { goal: 'mới', teacherComment: 'ok' } },
    );
    expect(merged).toEqual({ a: { selfLevel: 'Tốt', goal: 'mới', teacherComment: 'ok' }, b: { goal: 'giữ' } });
  });

  it('dữ liệu hỏng → hồ sơ rỗng', () => {
    expect(normalizePortfolio('c', 's', null)).toEqual({ classId: 'c', studentId: 's', entries: {} });
    expect(normalizePortfolio('c', 's', { entries: [1], updatedByRole: 'x' })).toEqual({ classId: 'c', studentId: 's', entries: {} });
  });
});

describe('schoolYearMonths', () => {
  it('năm học tháng 8 → tháng 7 năm sau, đúng dạng file mẫu', () => {
    const months = schoolYearMonths('2026-09-30');
    expect(months).toHaveLength(12);
    expect(months[0]).toBe('tháng 8/2026');
    expect(months[4]).toBe('tháng 12/2026');
    expect(months[11]).toBe('tháng 7/2027');
    expect(schoolYearMonths('2027-03-01')[0]).toBe('tháng 8/2026');
    expect(upcomingMonths('2026-09-30')).toEqual(schoolYearMonths('2026-09-30').slice(1));
    expect(upcomingMonths('2027-07-15')).toEqual(['tháng 7/2027']);
  });
});
