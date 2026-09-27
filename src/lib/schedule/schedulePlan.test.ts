import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import type { PpctLesson } from '../../data/ppct';
import type { Course } from './primeTimetable';
import {
  classOptions, classTimetables, defaultClassLabel, guessGrade, planClassCalendar,
  type SchedulePlan, type SavedTimetable,
} from './schedulePlan';
import { buildRegisterWorkbook, registerSheetRows } from './registerWorkbook';

const slot = (day: number, start: string, subject: string, classNames = ['10A (Dis)']) =>
  ({ day, periodNo: 1, start, end: start, classNames, subject });
const course = (subject: string, slots: ReturnType<typeof slot>[], classNames = ['10A (Dis)']): Course =>
  ({ key: `${classNames.join('+')}|${subject}`, classNames, subject, slots });

const tt = (id: string, from: string, to: string, courses: Course[]): SavedTimetable =>
  ({ id, link: '', title: id, from, to, level: null, teacherId: 't', teacherName: 'GV', courses, periods: [] });

const lessons: PpctLesson[] = [1, 2, 3, 4].map((n) => ({
  id: `L${n}`, title: `Bài ${n}`, subject: '', isElective: false, week: n <= 2 ? 1 : 2, weeks: [n <= 2 ? 1 : 2],
  periodNo: n, periodIndex: 1, periodCount: 1, lessonPeriods: [n], detail: '', objectives: '', notes: '',
}));

const plan: SchedulePlan = {
  id: 'p', name: 'MOET', week1Monday: '2026-09-07', skippedWeeks: [], messageSubject: 'Toán', subjectLabels: {},
  timetables: [
    tt('q2', '2026-09-14', '2026-09-20', [course('Toán', [slot(3, '08:00', 'Toán'), slot(3, '09:00', 'Toán')])]),
    tt('q1', '2026-09-07', '2026-09-13', [
      course('Toán', [slot(1, '08:00', 'Toán')]),
      course('Chuyên đề Toán', [slot(2, '08:00', 'Chuyên đề Toán')]),
      course('Chủ nhiệm', [slot(1, '07:45', 'Chủ nhiệm')]),
      course('Toán', [slot(4, '08:00', 'Toán', ['12A', '12B'])], ['12A', '12B']),
    ]),
  ],
  classes: [],
};

describe('schedulePlan', () => {
  it('gợi ý nhãn lớp và khối', () => {
    expect(defaultClassLabel('10Olinda (Dis)')).toBe('10Olinda');
    expect(defaultClassLabel('12Denver+12Detroit')).toBe('12Denver+12Detroit');
    expect(guessGrade('10Olinda (Dis)')).toBe(10);
    expect(guessGrade('Lớp chọn')).toBeNull();
  });

  it('liệt kê lớp (kể cả lớp ghép) và môn ở mọi TKB', () => {
    expect(classOptions(plan)).toEqual([
      { classKey: '10A (Dis)', subjects: ['Chủ nhiệm', 'Chuyên đề Toán', 'Toán'] },
      { classKey: '12A+12B', subjects: ['Toán'] },
    ]);
  });

  it('TKB theo giai đoạn, chỉ môn đã chọn, sắp theo ngày', () => {
    const periods = classTimetables(plan, { classKey: '10A (Dis)', subjects: ['Toán', 'Chuyên đề Toán'] });
    expect(periods.map((p) => `${p.from} ${p.slots.map((s) => `${s.day}${s.subject}`).join(',')}`)).toEqual([
      '2026-09-07 1Toán,2Chuyên đề Toán',
      '2026-09-14 3Toán,3Toán',
    ]);
  });

  it('xếp lịch qua 2 TKB, ngày nghỉ từ lịch năm học', () => {
    const pc = { classKey: '10A (Dis)', label: '10A', subjects: ['Toán', 'Chuyên đề Toán'], ppct: null, strandBySlot: {} };
    const r = planClassCalendar(plan, pc, lessons, [{ from: '2026-09-08', to: '2026-09-08', kind: 'nghi', note: '', applied: true }]);
    expect(r.slots.map((s) => `${s.date} ${s.lesson?.title}`)).toEqual(['2026-09-07 Bài 1', '2026-09-16 Bài 2', '2026-09-16 Bài 3']);
    expect(r.overflow).toEqual([{ week: 1, lessons: [lessons[1]] }, { week: 2, lessons: [lessons[3]] }]);
  });
});

describe('registerWorkbook', () => {
  const week = {
    week: 5, monday: '2026-10-05',
    rows: [
      { date: '2026-10-05', dayLabel: 'Thứ 2', session: 'Buổi sáng' as const, periodNo: 1, ppctNo: 21, subject: 'Toán', className: '10A', title: 'Ôn tập (tiết 1)' },
      { date: '2026-10-05', dayLabel: 'Thứ 2', session: 'Buổi sáng' as const, periodNo: 2, ppctNo: null, subject: '', className: '', title: '' },
      { date: '2026-10-05', dayLabel: 'Thứ 2', session: 'Buổi chiều' as const, periodNo: 5, ppctNo: 22, subject: 'CĐ Toán', className: '10A', title: 'Dự án' },
      { date: '2026-10-06', dayLabel: 'Thứ 3', session: 'Buổi sáng' as const, periodNo: 1, ppctNo: null, subject: '', className: '', title: '' },
    ],
  };

  it('khuôn trang tuần: tiêu đề, ngày, thứ + ngày ở cột đầu, buổi chỉ ghi khi đổi', () => {
    const rows = registerSheetRows(week, 'Cô Lan', 6);
    expect(rows[2]).toEqual(['Tuần học thứ 5', 'Từ ngày', '05/10/2026', 'đến ngày', '10/10/2026']);
    expect(rows.slice(4, 8)).toEqual([
      ['Thứ 2', 'Buổi sáng', 1, 21, 'Toán', '10A', 'Ôn tập (tiết 1)', ''],
      ['05/10/2026', '', 2, '', '', '', '', ''],
      ['', 'Buổi chiều', 5, 22, 'CĐ Toán', '10A', 'Dự án', ''],
      ['Thứ 3', 'Buổi sáng', 1, '', '', '', '', ''],
    ]);
    expect(rows.at(-1)).toContain('TỔ TRƯỞNG');
  });

  it('file xlsx mở lại được, mỗi tuần một trang', () => {
    const bytes = buildRegisterWorkbook([week, { ...week, week: 6, monday: '2026-10-12' }], 'Cô Lan', 5);
    const wb = XLSX.read(bytes, { type: 'array' });
    expect(wb.SheetNames).toEqual(['Tuần 5', 'Tuần 6']);
    expect(wb.Sheets['Tuần 5'].G5.v).toBe('Ôn tập (tiết 1)');
  });
});
