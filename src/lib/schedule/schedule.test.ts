import { describe, expect, it } from 'vitest';
import type { PpctLesson } from '../../data/ppct';
import { findTeacher, numberedPeriods, parseDateRange, parsePrimeTimetable, primeTimetableId, teacherCourses } from './primeTimetable';
import { addDays, buildLessonCalendar, mondayOf, slotKey, weekday } from './lessonCalendar';
import { buildParentWeekMessage, buildRegisterWeek, describeLesson, lessonChains, registerTitle } from './scheduleFormat';

const TT = {
  id: 'tt1',
  name: 'TKB Q1 (19/08/26 - 23/10/26)',
  days: [
    { id: 'd1', name: 'Monday', position: 1 },
    { id: 'd2', name: 'Tuesday', position: 2 },
  ],
  periods: [
    { id: 'mm', name: 'Morning meeting EY: 7:45-8:00; MHS:7:50-8:05;', position: 1, startHour: 7, startMinute: 45, endHour: 8, endMinute: 5 },
    { id: 'p1', name: 'P 1   EY:8:05-8:40;  MHS:8:10-8:50', position: 2, startHour: 8, startMinute: 5, endHour: 8, endMinute: 50 },
    { id: 'p2', name: 'P2    EY:8:45-9:20   MHS:8:55-9:35', position: 3, startHour: 8, startMinute: 45, endHour: 9, endMinute: 35 },
    { id: 'p3', name: 'Tiết 3 (13:30 - 14:15)', position: 4, startHour: 13, startMinute: 30, endHour: 14, endMinute: 15 },
  ],
  subjects: [{ id: 's1', name: 'Math' }, { id: 's2', name: 'Homeroom' }],
  teachers: [
    { id: 't1', name: 'Nguyễn Văn Đức', shortName: ' Duc.Nguyen@school.edu.vn ' },
    { id: 't2', name: 'Trần Thị Bình', shortName: 'B' },
  ],
  classes: [
    { id: 'c1', name: '10A', groupSets: [{ groups: [{ id: 'g10a' }] }, { groups: [{ id: 'g10a-1' }, { id: 'g10a-2' }] }] },
    { id: 'c2', name: '10B', groupSets: [{ groups: [{ id: 'g10b' }] }] },
  ],
  activities: [
    { subjectId: 's1', teacherIds: ['t1'], groupIds: ['g10a'], length: 2, cards: [{ dayId: 'd2', periodId: 'p1' }, { dayId: 'd1', periodId: 'p1' }] },
    { subjectId: 's1', teacherIds: ['t1'], groupIds: ['g10a-1', 'g10b'], length: 1, cards: [{ dayId: 'd1', periodId: 'p3' }] },
    { subjectId: 's2', teacherIds: ['t2'], groupIds: ['g10a'], cards: [{ dayId: 'd1', periodId: 'mm' }] },
  ],
};

let seq = 0;
const lesson = (week: number, subject: string, title: string, extra: Partial<PpctLesson> = {}): PpctLesson => {
  seq += 1;
  return {
    id: `L${seq}`, title, subject, isElective: false, week, weeks: [week], periodNo: seq,
    periodIndex: 1, periodCount: 1, lessonPeriods: [seq], detail: '', objectives: '', notes: '', ...extra,
  };
};
const elective = (week: number) => lesson(week, '', 'Tiết tự chọn', { isElective: true });

describe('primeTimetableId', () => {
  it('lấy id từ link publish (?id hoặc #id)', () => {
    const id = '059862c7-e590-4ced-9619-69a3e3a406c1';
    expect(primeTimetableId(`https://primetimetable.com/publish/?id=${id}#id=${id}&view=1`)).toBe(id);
    expect(primeTimetableId(`https://primetimetable.com/publish/#id=${id.toUpperCase()}`)).toBe(id);
  });
  it('từ chối host lạ, http, id sai', () => {
    expect(primeTimetableId('https://evil.example/publish/?id=059862c7-e590-4ced-9619-69a3e3a406c1')).toBeNull();
    expect(primeTimetableId('http://primetimetable.com/publish/?id=059862c7-e590-4ced-9619-69a3e3a406c1')).toBeNull();
    expect(primeTimetableId('https://primetimetable.com/publish/?id=../x')).toBeNull();
    expect(primeTimetableId('không phải link')).toBeNull();
  });
});

describe('parsePrimeTimetable', () => {
  it('đọc khoảng ngày trong tên (năm 2 hoặc 4 chữ số)', () => {
    expect(parseDateRange('Q1 (19/08/26 - 23/10/26)')).toEqual({ from: '2026-08-19', to: '2026-10-23' });
    expect(parseDateRange('MOET (7/9/2026 - 07/11/2026)')).toEqual({ from: '2026-09-07', to: '2026-11-07' });
    expect(parseDateRange('không ghi ngày')).toBeNull();
  });

  it('nhận ra các cấp học có giờ riêng + mail GV', () => {
    const tt = parsePrimeTimetable(TT);
    expect(tt.levels.sort()).toEqual(['EY', 'MHS']);
    expect(tt.teachers[0].email).toBe('duc.nguyen@school.edu.vn');
    expect(tt.teachers[1].email).toBeNull();
  });

  it('báo lỗi rõ khi không phải dữ liệu TKB', () => {
    expect(() => parsePrimeTimetable({ foo: 1 })).toThrow(/thời khoá biểu/);
  });

  it('tìm GV theo mail, rồi theo tên bỏ dấu', () => {
    const tt = parsePrimeTimetable(TT);
    expect(findTeacher(tt, { email: 'DUC.nguyen@school.edu.vn' })?.id).toBe('t1');
    expect(findTeacher(tt, { name: 'tran thi binh' })?.id).toBe('t2');
    expect(findTeacher(tt, { email: 'x@y.z', name: 'ai đó' })).toBeNull();
  });

  it('tách tiết đôi, lấy giờ theo cấp, gộp lớp ghép', () => {
    const tt = parsePrimeTimetable(TT);
    const courses = teacherCourses(tt, 't1', 'MHS');
    const a = courses.find((c) => c.key === '10A|Math')!;
    expect(a.slots.map((s) => `${s.day} ${s.periodNo} ${s.start}-${s.end}`)).toEqual([
      '1 1 08:10-08:50', '1 2 08:55-09:35', '2 1 08:10-08:50', '2 2 08:55-09:35',
    ]);
    const ab = courses.find((c) => c.key === '10A+10B|Math')!;
    expect(ab.slots).toEqual([{ day: 1, periodNo: 3, start: '13:30', end: '14:15', classNames: ['10A', '10B'], subject: 'Math' }]);
  });

  it('không chọn cấp thì dùng giờ khung; tiết đánh số theo tên', () => {
    const tt = parsePrimeTimetable(TT);
    expect(teacherCourses(tt, 't1').find((c) => c.key === '10A|Math')!.slots[0].start).toBe('08:05');
    expect(numberedPeriods(tt, 'MHS')).toEqual([
      { periodNo: 1, start: '08:10', end: '08:50' },
      { periodNo: 2, start: '08:55', end: '09:35' },
      { periodNo: 3, start: '13:30', end: '14:15' },
    ]);
  });
});

describe('ngày', () => {
  it('thứ và thứ Hai đầu tuần', () => {
    expect(weekday('2026-09-15')).toBe(2);
    expect(weekday('2026-09-20')).toBe(7);
    expect(mondayOf('2026-09-20')).toBe('2026-09-14');
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
  });
});

// Tuần 1 = 07/09/2026; TKB: T2 hai tiết, T3 hai tiết.
const SLOTS = [
  { day: 1, periodNo: 1, start: '08:10', end: '08:50', classNames: ['10A'], subject: 'Toán' },
  { day: 1, periodNo: 2, start: '08:55', end: '09:35', classNames: ['10A'], subject: 'Toán' },
  { day: 2, periodNo: 1, start: '08:10', end: '08:50', classNames: ['10A'], subject: 'Toán' },
  { day: 2, periodNo: 2, start: '08:55', end: '09:35', classNames: ['10A'], subject: 'CĐ Toán' },
];
const TIMETABLES = [{ from: '2026-09-07', to: '2026-09-20', slots: SLOTS }];

describe('buildLessonCalendar', () => {
  it('xếp tuần tự theo tuần PPCT', () => {
    seq = 0;
    const lessons = [1, 1, 1, 1, 2, 2, 2, 2].map((w, i) => lesson(w, '', `Bài ${i + 1}`));
    const r = buildLessonCalendar({ lessons, timetables: TIMETABLES, week1Monday: '2026-09-07' });
    expect(r.slots.map((s) => `${s.date} ${s.week} ${s.subject} ${s.lesson?.title}`)).toEqual([
      '2026-09-07 1 Toán Bài 1', '2026-09-07 1 Toán Bài 2', '2026-09-08 1 Toán Bài 3', '2026-09-08 1 CĐ Toán Bài 4',
      '2026-09-14 2 Toán Bài 5', '2026-09-14 2 Toán Bài 6', '2026-09-15 2 Toán Bài 7', '2026-09-15 2 CĐ Toán Bài 8',
    ]);
    expect(r.overflow).toEqual([]);
  });

  it('ô gán phân môn: lấy đúng mạch, hết thì Tự chọn', () => {
    seq = 0;
    const lessons = [lesson(1, 'Đại số', 'ĐS1'), lesson(1, 'Hình học', 'HH1'), lesson(1, 'Đại số', 'ĐS2'), elective(1)];
    const strandBySlot = { [slotKey(SLOTS[0])]: 'Hình học', [slotKey(SLOTS[1])]: 'Hình học', [slotKey(SLOTS[2])]: 'Đại số', [slotKey(SLOTS[3])]: 'Đại số' };
    const r = buildLessonCalendar({ lessons, timetables: [{ ...TIMETABLES[0], to: '2026-09-13' }], week1Monday: '2026-09-07', strandBySlot });
    expect(r.slots.map((s) => s.lesson?.title)).toEqual(['HH1', 'Tiết tự chọn', 'ĐS1', 'ĐS2']);
  });

  it('ngày nghỉ: bài học dồn sang tuần sau (có báo), Tự chọn thì bỏ', () => {
    seq = 0;
    const lessons = [lesson(1, '', 'A'), lesson(1, '', 'B'), lesson(1, '', 'C'), elective(1), lesson(2, '', 'D'), lesson(2, '', 'E')];
    const r = buildLessonCalendar({ lessons, timetables: TIMETABLES, week1Monday: '2026-09-07', offDates: new Set(['2026-09-07']) });
    expect(r.slots.filter((s) => s.week === 1).map((s) => s.lesson?.title)).toEqual(['A', 'B']);
    expect(r.overflow).toEqual([{ week: 1, lessons: [lessons[2]] }]);
    expect(r.slots.filter((s) => s.week === 2).map((s) => s.lesson?.title ?? null)).toEqual(['C', 'D', 'E', null]);
  });

  it('TKB bắt đầu sau tuần 1: tiết các tuần trước dồn vào; tuần không đánh số không nhận bài', () => {
    seq = 0;
    const lessons = [lesson(1, '', 'A'), lesson(2, '', 'B'), lesson(3, '', 'C')];
    const r = buildLessonCalendar({
      lessons, week1Monday: '2026-08-31',
      timetables: [{ from: '2026-09-07', to: '2026-09-20', slots: SLOTS.slice(0, 1) }],
      skippedWeeks: new Set(['2026-09-14']),
    });
    expect(r.slots.map((s) => `${s.date} ${s.week} ${s.lesson?.title ?? '-'}`)).toEqual(['2026-09-07 2 A', '2026-09-14 null -']);
    expect(r.overflow).toEqual([{ week: 2, lessons: [lessons[1]] }]);
  });
});

describe('định dạng', () => {
  seq = 0;
  const L = [
    lesson(4, 'Hình học', 'Hệ thức lượng trong tam giác', { detail: 'Tiết 5: Diện tích\nArea' }),
    lesson(5, 'Hình học', 'Hệ thức lượng trong tam giác.', { detail: 'Tiết 6: Công thức tính diện tích tam giác' }),
    lesson(5, 'Hình học', 'Ôn tập chương III'),
    lesson(8, '', 'Hoạt động dự án'),
    lesson(12, '', 'Hoạt động dự án'),
    elective(5),
  ];
  const chains = lessonChains(L);

  it('đánh số tiết cùng bài; bài trùng tên nhưng cách xa là bài khác', () => {
    expect(registerTitle(L[0], chains)).toBe('Hệ thức lượng trong tam giác (tiết 1)');
    expect(registerTitle(L[1], chains)).toBe('Hệ thức lượng trong tam giác (tiết 2)');
    expect(registerTitle(L[2], chains)).toBe('Ôn tập chương III');
    expect(registerTitle(L[3], chains)).toBe('Hoạt động dự án');
    expect(registerTitle(L[4], chains)).toBe('Hoạt động dự án');
    expect(registerTitle(null, chains)).toBe('');
  });

  it('câu báo giảng cho phụ huynh', () => {
    expect(describeLesson(L[1], chains)).toBe('Hình học: Hệ thức lượng trong tam giác (tiếp) – Tiết 6: Công thức tính diện tích tam giác.');
    expect(describeLesson(L[2], chains)).toBe('Hình học: Ôn tập chương III.');
    expect(describeLesson(L[5], chains)).toBe('Tự chọn.');
  });

  it('tin tuần: lời dẫn + ngày + giờ, bản chữ và HTML', () => {
    const slots = [
      { date: '2026-09-15', day: 2, start: '08:10', end: '08:50', periodNo: 1, subject: 'Toán', week: 5, lesson: L[1] },
      { date: '2026-09-17', day: 4, start: '14:20', end: '15:00', periodNo: 7, subject: 'Toán', week: 5, lesson: L[5] },
    ];
    const msg = buildParentWeekMessage({ className: '10A', subjectName: 'Toán', week: 5, slots, chains, teacherName: 'Cô Lan' });
    expect(msg.text).toContain('Kính gửi Quý Phụ huynh lớp 10A,');
    expect(msg.text).toContain('tuần 5 (14/9 – 18/9)');
    expect(msg.text).toContain('Thứ Ba 15/9\n• Từ 8h10 đến 8h50: Hình học: Hệ thức lượng trong tam giác (tiếp)');
    expect(msg.text).toContain('Thứ Năm 17/9\n• Từ 14h20 đến 15h00: Tự chọn.');
    expect(msg.text.trim().endsWith('Trân trọng!\nCô Lan')).toBe(true);
    expect(msg.html).toContain('<p><strong>Thứ Ba 15/9</strong></p><ul><li>');
  });

  it('khung tuần của sổ báo giảng giữ cả ô trống, đổi tên môn', () => {
    const slots = [{ date: '2026-09-15', day: 2, start: '08:10', end: '08:50', periodNo: 1, subject: 'Chuyên đề Toán', week: 5, lesson: L[2] }];
    const rows = buildRegisterWeek('2026-09-14', [1, 2], [{ periodNo: 1, start: '08:10' }, { periodNo: 5, start: '13:30' }],
      [{ className: '10A', subjectLabels: { 'Chuyên đề Toán': 'CĐ Toán' }, slots, chains }]);
    expect(rows).toHaveLength(4);
    expect(rows[2]).toEqual({ date: '2026-09-15', dayLabel: 'Thứ 3', session: 'Buổi sáng', periodNo: 1, ppctNo: 3, subject: 'CĐ Toán', className: '10A', title: 'Ôn tập chương III' });
    expect(rows[3].session).toBe('Buổi chiều');
    expect(rows[3].title).toBe('');
  });
});

describe('describeLesson — phân môn trùng tên bài', () => {
  it('không ghi lặp "Tự chọn: Tự chọn"', () => {
    const l = { id: 'x', title: 'Tự chọn', subject: 'Tự chọn', isElective: false, week: 1, weeks: [1], periodNo: 1, periodIndex: 1, periodCount: 1, lessonPeriods: [1], detail: '', objectives: '', notes: '' };
    expect(describeLesson(l, new Map())).toBe('Tự chọn.');
  });
});
