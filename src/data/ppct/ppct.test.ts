import { describe, it, expect } from 'vitest';
import { groupByWeek, type PpctProgram } from './index';
import tdsG6 from './tds-g6.json';
import tdsG10 from './tds-g10.json';
import tdsG11 from './tds-g11.json';
import tdsG12 from './tds-g12.json';
import moetG10 from './moet-g10.json';
import moetG11 from './moet-g11.json';
import moetG12 from './moet-g12.json';

// Canh dữ liệu sinh ra từ scripts/build-ppct.mjs. Chạy lại script mà làm hỏng cấu trúc
// thì các phép kiểm dưới đây đỏ, thay vì lỗi âm thầm lộ ra khi giáo viên đang soạn bài.
const PROGRAMS: [string, PpctProgram][] = [
  ['TDS lớp 6', tdsG6 as PpctProgram],
  ['TDS lớp 10', tdsG10 as PpctProgram],
  ['TDS lớp 11', tdsG11 as PpctProgram],
  ['TDS lớp 12', tdsG12 as PpctProgram],
  ['MOET lớp 10', moetG10 as PpctProgram],
  ['MOET lớp 11', moetG11 as PpctProgram],
  ['MOET lớp 12', moetG12 as PpctProgram],
];

describe('dữ liệu phân phối chương trình', () => {
  it.each(PROGRAMS)('%s: mọi bài đều có tên và mã định danh riêng', (_name, program) => {
    expect(program.lessons.length).toBeGreaterThan(50);
    for (const lesson of program.lessons) {
      expect(lesson.title.trim()).not.toBe('');
    }
    const ids = program.lessons.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(PROGRAMS)('%s: tuần nằm trong 1–45 và không lùi về sau', (_name, program) => {
    let previous = 0;
    for (const lesson of program.lessons) {
      const week = lesson.week ?? 0;
      expect(week).toBeGreaterThanOrEqual(1);
      expect(week).toBeLessThanOrEqual(45);
      expect(week).toBeGreaterThanOrEqual(previous);
      previous = week;
    }
  });

  it.each(PROGRAMS)('%s: số tiết tăng dần, không lặp', (_name, program) => {
    // TDS có lỗ số tiết là đúng: các tiết "Tự chọn / Teacher's choice" không ghi tên bài
    // nên không phải tiết để soạn, bộ đọc bỏ qua chúng.
    const periods = program.lessons.map(l => l.periodNo).filter((p): p is number => p !== null);
    expect(new Set(periods).size).toBe(periods.length);
    for (let i = 1; i < periods.length; i++) {
      expect(periods[i]).toBeGreaterThan(periods[i - 1]);
    }
  });

  it.each(PROGRAMS.filter(([name]) => name.startsWith('MOET')))(
    '%s: số tiết liên tục 1→175, không nhảy cóc',
    (_name, program) => {
      const periods = program.lessons.map(l => l.periodNo);
      expect(periods[0]).toBe(1);
      expect(periods.at(-1)).toBe(175);
      for (let i = 1; i < periods.length; i++) {
        expect(periods[i]).toBe(periods[i - 1]! + 1);
      }
    },
  );

  // Giáo án soạn theo TỪNG TIẾT, nên mỗi tiết phải là một mục chọn riêng và phải biết
  // nó là tiết thứ mấy trong bài.
  it.each(PROGRAMS)('%s: mỗi tiết là một mục riêng, có vị trí trong bài', (_name, program) => {
    for (const lesson of program.lessons) {
      expect(lesson.periodIndex).toBeGreaterThanOrEqual(1);
      expect(lesson.periodIndex).toBeLessThanOrEqual(lesson.periodCount);
    }
    const multi = program.lessons.filter(l => l.periodCount > 1);
    expect(multi.length, 'phải có bài nhiều tiết, nếu không là gộp nhóm hỏng').toBeGreaterThan(10);
  });

  // Bản PDF MOET có trang bìa với bảng thiết bị; cột "Số lượng" chứa số 01 nằm đúng dải toạ độ
  // của cột Tiết nên từng bị nuốt nguyên trang bìa thành một "bài học" dài 400 ký tự.
  it.each(PROGRAMS)('%s: tên bài không dính chữ của trang bìa', (_name, program) => {
    for (const lesson of program.lessons) {
      expect(lesson.title.length).toBeLessThan(150);
      expect(lesson.title).not.toMatch(/KHUNG KẾ HOẠCH|Số học sinh|Trình độ đào tạo|Tên phòng/i);
    }
  });

  it('MOET có yêu cầu cần đạt cho gần hết các bài', () => {
    for (const [name, program] of PROGRAMS.filter(([n]) => n.startsWith('MOET'))) {
      const missing = program.lessons.filter(l => !l.objectives.trim()).length;
      expect(missing, `${name} thiếu mục tiêu ở ${missing} bài`).toBeLessThanOrEqual(3);
    }
  });

  it('bài trải nhiều tuần chỉ xếp vào tuần đầu, không hiện trùng', () => {
    const program = tdsG11 as PpctProgram;
    const grouped = groupByWeek(program.lessons);
    const flat = grouped.flatMap(g => g.lessons.map(l => l.id));
    expect(new Set(flat).size).toBe(flat.length);
    expect(flat.length).toBe(program.lessons.length);
  });
});
