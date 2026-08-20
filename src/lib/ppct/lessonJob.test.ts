import { describe, it, expect } from 'vitest';
import { buildQueue, buildRequirement, buildTitle, suyRaKeHoach } from './lessonJob';
import type { PpctLesson, PpctProgram } from '../../data/ppct';
import tdsG10 from '../../data/ppct/tds-g10.json';

const lesson = (over: Partial<PpctLesson> = {}): PpctLesson => ({
  id: 'l1',
  title: 'Mệnh đề',
  subject: 'Đại số',
  isElective: false,
  week: 1,
  weeks: [1],
  periodNo: 2,
  periodIndex: 1,
  periodCount: 1,
  lessonPeriods: [2],
  detail: '',
  objectives: '',
  notes: '',
  ...over,
});

describe('buildTitle — mỗi tiết phải phân biệt được', () => {
  it('ưu tiên số tiết mà chính PPCT ghi trong ô nội dung', () => {
    expect(buildTitle(lesson({ detail: 'Tiết 3: Mệnh đề kéo theo' }))).toBe('Mệnh đề — Tiết 3');
  });

  it('bài nhiều tiết mà PPCT không ghi số thì dùng vị trí trong bài', () => {
    expect(buildTitle(lesson({ periodIndex: 2, periodCount: 4 }))).toBe('Mệnh đề — Tiết 2/4');
  });

  it('bài một tiết thì giữ nguyên tên', () => {
    expect(buildTitle(lesson())).toBe('Mệnh đề');
  });

  it('tiết tự chọn ghi rõ tuần và tiết', () => {
    expect(buildTitle(lesson({ isElective: true, week: 7, periodNo: 21 })))
      .toBe('Tiết tự chọn — Tuần 7, tiết 21');
  });

  it('bốn tiết của cùng một bài ra bốn tên khác nhau', () => {
    const names = [1, 2, 3, 4].map(i => buildTitle(lesson({ detail: `Tiết ${i}: nội dung` })));
    expect(new Set(names).size).toBe(4);
  });
});

describe('suyRaKeHoach', () => {
  it('tiết học sinh làm bài không hợp kế hoạch nào', () => {
    expect(suyRaKeHoach(lesson({ title: 'Kiểm tra giữa HK1' }))).toBeNull();
    expect(suyRaKeHoach(lesson({ title: 'Kiểm tra cuối HK2' }))).toBeNull();
  });

  it('tiết CHỮA/TRẢ bài là tiết dạy thật, không được gộp vào nhóm kiểm tra', () => {
    expect(suyRaKeHoach(lesson({ title: 'Chữa bài kiểm tra cuối HK1' }))).toBe('luyen_tap');
    expect(suyRaKeHoach(lesson({ title: 'Trả bài kiểm tra giữa HK2' }))).toBe('luyen_tap');
    expect(suyRaKeHoach(lesson({ title: 'Chữa và trả bài kiểm tra giữa HK1' }))).toBe('luyen_tap');
  });

  it('nhận tiết luyện tập qua chữ của PPCT', () => {
    expect(suyRaKeHoach(lesson({ title: 'Luyện tập' }))).toBe('luyen_tap');
    expect(suyRaKeHoach(lesson({ detail: 'Tiết 2: Bài tập cuối chương' }))).toBe('luyen_tap');
  });

  it('mặc định là tiết hình thành kiến thức', () => {
    expect(suyRaKeHoach(lesson())).toBe('kien_thuc');
  });
});

describe('buildRequirement — giữ nguyên văn PPCT', () => {
  it('chép nguyên nội dung và mục tiêu, không diễn giải lại', () => {
    const req = buildRequirement(
      lesson({ detail: 'Tiết 2: Mệnh đề kéo theo', objectives: 'Nêu được mệnh đề đảo' }),
      'TDS', 10, '2026 - 2027',
    );
    expect(req).toContain('Tiết 2: Mệnh đề kéo theo');
    expect(req).toContain('Nêu được mệnh đề đảo');
    expect(req).toContain('Lớp 10 · Tuần học 1 · Năm học 2026 - 2027');
  });

  it('MOET gọi là "Yêu cầu cần đạt", TDS gọi là "Mục tiêu"', () => {
    const l = lesson({ objectives: 'X' });
    expect(buildRequirement(l, 'MOET', 10, '2026 - 2027')).toContain('Yêu cầu cần đạt');
    expect(buildRequirement(l, 'TDS', 10, '2026 - 2027')).toContain('Mục tiêu');
  });

  it('tiết tự chọn có chỗ trống để giáo viên tự điền', () => {
    expect(buildRequirement(lesson({ isElective: true }), 'TDS', 10, '2026 - 2027'))
      .toContain('NỘI DUNG TỰ CHỌN:');
  });

  it('nhắc AI không đổi bố cục mẫu giáo án', () => {
    expect(buildRequirement(lesson(), 'TDS', 10, '2026 - 2027'))
      .toContain('Giữ nguyên bố cục');
  });
});

describe('buildQueue', () => {
  const program = (lessons: PpctLesson[]): PpctProgram => ({
    source: 'TDS', grade: 10, stream: 'Discover', schoolYear: '2026 - 2027', lessons,
  });

  it('MẶC ĐỊNH soạn cả tiết tự chọn, chỉ loại tiết kiểm tra', () => {
    const res = buildQueue({
      program: program([
        lesson({ id: 'a' }),
        lesson({ id: 'b', isElective: true }),
        lesson({ id: 'c', title: 'Kiểm tra giữa kỳ' }),
      ]),
      fromWeek: 1, toWeek: 1,
    });
    expect(res.jobs.map(j => j.lessonId)).toEqual(['a', 'b']);
    expect(res.skipped.elective).toHaveLength(0);
    expect(res.skipped.kiemTra.map(l => l.id)).toEqual(['c']);
  });

  it('tắt soanTuChon thì tiết tự chọn về lại nhóm bỏ qua', () => {
    const res = buildQueue({
      program: program([lesson({ id: 'a' }), lesson({ id: 'b', isElective: true })]),
      fromWeek: 1, toWeek: 1, soanTuChon: false,
    });
    expect(res.jobs.map(j => j.lessonId)).toEqual(['a']);
    expect(res.skipped.elective.map(l => l.id)).toEqual(['b']);
  });

  it('tiết tự chọn nhận kế hoạch luyện tập và bối cảnh các tiết chính cùng tuần', () => {
    const res = buildQueue({
      program: program([
        lesson({ id: 'ds', title: 'Tập hợp', subject: 'Đại số', detail: 'Tiết 2: Các tập hợp số', week: 3, weeks: [3] }),
        lesson({ id: 'hh', title: 'Hệ thức lượng', subject: 'Hình học', week: 3, weeks: [3] }),
        lesson({ id: 'tc', isElective: true, title: 'Tiết tự chọn', subject: '', week: 3, weeks: [3] }),
      ]),
      fromWeek: 3, toWeek: 3,
    });
    const tc = res.jobs.find(j => j.lessonId === 'tc')!;
    expect(tc.keHoach).toBe('luyen_tap');
    expect(tc.requirement).toContain('TỰ CHỌN nội dung bám sát tiến độ');
    expect(tc.requirement).toContain('Tập hợp');
    expect(tc.requirement).toContain('Hệ thức lượng');
    expect(tc.requirement).toContain('KHÔNG dạy trước nội dung của các tuần sau');
  });

  it('tuần không có tiết chính nào thì lùi về tuần liền trước lấy bối cảnh', () => {
    const res = buildQueue({
      program: program([
        lesson({ id: 'truoc', title: 'Mệnh đề', subject: 'Đại số', week: 4, weeks: [4] }),
        lesson({ id: 'tc', isElective: true, week: 5, weeks: [5] }),
      ]),
      fromWeek: 5, toWeek: 5,
    });
    const tc = res.jobs[0];
    expect(tc.requirement).toContain('tuần 4 (tuần liền trước)');
    expect(tc.requirement).toContain('Mệnh đề');
  });

  it('đường soạn ĐƠN vẫn để chỗ trống cho giáo viên tự điền', () => {
    // buildRequirement không nhận gợi ý → giữ nguyên hành vi cũ.
    expect(buildRequirement(lesson({ isElective: true }), 'TDS', 10, '2026 - 2027'))
      .toContain('NỘI DUNG TỰ CHỌN:');
  });

  it('chỉ lấy tiết trong khoảng tuần, đảo from/to vẫn đúng', () => {
    const p = program([
      lesson({ id: 'w1', week: 1, weeks: [1] }),
      lesson({ id: 'w5', week: 5, weeks: [5] }),
      lesson({ id: 'w9', week: 9, weeks: [9] }),
    ]);
    expect(buildQueue({ program: p, fromWeek: 4, toWeek: 6 }).jobs.map(j => j.lessonId)).toEqual(['w5']);
    expect(buildQueue({ program: p, fromWeek: 6, toWeek: 4 }).jobs.map(j => j.lessonId)).toEqual(['w5']);
  });

  it('lọc theo phân môn', () => {
    const p = program([
      lesson({ id: 'ds', subject: 'Đại số' }),
      lesson({ id: 'hh', subject: 'Hình học' }),
    ]);
    expect(buildQueue({ program: p, fromWeek: 1, toWeek: 1, subjects: ['Hình học'] }).jobs.map(j => j.lessonId))
      .toEqual(['hh']);
    expect(buildQueue({ program: p, fromWeek: 1, toWeek: 1, subjects: [] }).jobs).toHaveLength(2);
  });

  it('sắp đúng thứ tự dạy: tuần tăng dần rồi tới tiết trong năm', () => {
    const p = program([
      lesson({ id: 'x', week: 2, weeks: [2], periodNo: 9 }),
      lesson({ id: 'y', week: 1, weeks: [1], periodNo: 4 }),
      lesson({ id: 'z', week: 1, weeks: [1], periodNo: 2 }),
    ]);
    expect(buildQueue({ program: p, fromWeek: 1, toWeek: 5 }).jobs.map(j => j.lessonId))
      .toEqual(['z', 'y', 'x']);
  });

  it('tiết chưa có số thứ tự xếp sau tiết đã có, trong cùng tuần', () => {
    const p = program([
      lesson({ id: 'khong-so', week: 1, weeks: [1], periodNo: null }),
      lesson({ id: 'co-so', week: 1, weeks: [1], periodNo: 3 }),
    ]);
    expect(buildQueue({ program: p, fromWeek: 1, toWeek: 1 }).jobs.map(j => j.lessonId))
      .toEqual(['co-so', 'khong-so']);
  });

  it('mọi job đều mang sẵn kế hoạch và yêu cầu đã dựng', () => {
    const res = buildQueue({ program: program([lesson({ detail: 'Tiết 2: Luyện tập' })]), fromWeek: 1, toWeek: 1 });
    expect(res.jobs[0].keHoach).toBe('luyen_tap');
    expect(res.jobs[0].title).toBe('Mệnh đề — Tiết 2');
    expect(res.jobs[0].requirement).toContain('Tiết 2: Luyện tập');
  });
});

describe('buildQueue — khử tiêu đề trùng', () => {
  const program = (lessons: PpctLesson[]): PpctProgram => ({
    source: 'TDS', grade: 10, stream: 'Discover', schoolYear: '2026 - 2027', lessons,
  });

  it('không đụng tới tiêu đề vốn đã duy nhất', () => {
    const res = buildQueue({
      program: program([lesson({ id: 'a', title: 'Mệnh đề' }), lesson({ id: 'b', title: 'Tập hợp' })]),
      fromWeek: 1, toWeek: 42,
    });
    expect(res.jobs.map(j => j.title).sort()).toEqual(['Mệnh đề', 'Tập hợp']);
  });

  it('bài trùng tên khác tuần/phân môn thì thêm phân môn và tuần', () => {
    const res = buildQueue({
      program: program([
        lesson({ id: 'a', title: 'Ôn tập cuối HK1', subject: 'Đại số', week: 16, weeks: [16], periodNo: 120 }),
        lesson({ id: 'b', title: 'Ôn tập cuối HK1', subject: 'Hình học', week: 16, weeks: [16], periodNo: 123 }),
        lesson({ id: 'c', title: 'Ôn tập cuối HK1', subject: 'Đại số', week: 17, weeks: [17], periodNo: 128 }),
      ]),
      fromWeek: 1, toWeek: 42,
    });
    expect(res.jobs.map(j => j.title)).toEqual([
      'Ôn tập cuối HK1 (Đại số, tuần 16)',
      'Ôn tập cuối HK1 (Hình học, tuần 16)',
      'Ôn tập cuối HK1 (Đại số, tuần 17)',
    ]);
  });

  it('cùng bài cùng phân môn cùng tuần thì thêm số tiết trong năm', () => {
    const res = buildQueue({
      program: program([
        lesson({ id: 'a', title: 'Ôn tập', subject: 'Đại số', week: 8, weeks: [8], periodNo: 55 }),
        lesson({ id: 'b', title: 'Ôn tập', subject: 'Đại số', week: 8, weeks: [8], periodNo: 56 }),
      ]),
      fromWeek: 1, toWeek: 42,
    });
    expect(res.jobs.map(j => j.title)).toEqual([
      'Ôn tập (Đại số, tuần 8, tiết 55)',
      'Ôn tập (Đại số, tuần 8, tiết 56)',
    ]);
  });

  it('TÊN ỔN ĐỊNH giữa các lô — soạn 1 tuần hay cả năm đều ra cùng tên', () => {
    const p = program([
      lesson({ id: 'a', title: 'Ôn tập cuối HK1', subject: 'Đại số', week: 16, weeks: [16], periodNo: 120 }),
      lesson({ id: 'b', title: 'Ôn tập cuối HK1', subject: 'Đại số', week: 17, weeks: [17], periodNo: 128 }),
    ]);
    const caNam = buildQueue({ program: p, fromWeek: 1, toWeek: 42 });
    const motTuan = buildQueue({ program: p, fromWeek: 16, toWeek: 16 });
    expect(motTuan.jobs[0].title).toBe(caNam.jobs[0].title);
  });
});

describe('buildQueue trên dữ liệu PPCT THẬT (tds-g10)', () => {
  const program = tdsG10 as unknown as PpctProgram;

  // Khoá lại con số đã đo 2026-08-13. Lệch nghĩa là dữ liệu PPCT đã đổi — phải xem lại chứ
  // không sửa số ở đây cho qua.
  it('cả năm: 290 tiết soạn được (gồm 65 tự chọn), chỉ 8 tiết kiểm tra thật bị loại', () => {
    const res = buildQueue({ program, fromWeek: 1, toWeek: 42 });
    expect(res.jobs).toHaveLength(290);
    expect(res.skipped.elective).toHaveLength(0);
    expect(res.skipped.kiemTra).toHaveLength(8);
    expect(res.jobs.length + res.skipped.kiemTra.length).toBe(program.lessons.length);
  });

  it('nhóm bị loại chỉ còn tiết học sinh làm bài, không còn tiết chữa bài', () => {
    const res = buildQueue({ program, fromWeek: 1, toWeek: 42 });
    expect(res.skipped.kiemTra.every(l => /^Kiểm tra/i.test(l.title))).toBe(true);
    expect(res.skipped.kiemTra.some(l => /chữa|trả bài/i.test(l.title))).toBe(false);
    expect(res.jobs.filter(j => /Chữa|Trả bài/i.test(j.title))).toHaveLength(9);
  });

  it('tắt tiết tự chọn thì còn 225 tiết chính', () => {
    const res = buildQueue({ program, fromWeek: 1, toWeek: 42, soanTuChon: false });
    expect(res.jobs).toHaveLength(225);
    expect(res.skipped.elective).toHaveLength(65);
  });

  it('mọi tiết tự chọn đều có bối cảnh tuần, không tiết nào bị bỏ trống nội dung', () => {
    const res = buildQueue({ program, fromWeek: 1, toWeek: 42 });
    const tuChon = res.jobs.filter(j => j.title.startsWith('Tiết tự chọn'));
    expect(tuChon).toHaveLength(65);
    expect(tuChon.every(j => j.requirement.includes('TỰ CHỌN nội dung bám sát tiến độ'))).toBe(true);
    expect(tuChon.every(j => !j.requirement.includes('NỘI DUNG TỰ CHỌN:'))).toBe(true);
  });

  it('mọi tiêu đề trong hàng đợi là duy nhất — thư viện phải phân biệt được', () => {
    const titles = buildQueue({ program, fromWeek: 1, toWeek: 42 }).jobs.map(j => j.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('lấy 2 tuần thì ra một lô nhỏ vừa sức chạy thử', () => {
    const res = buildQueue({ program, fromWeek: 1, toWeek: 2 });
    expect(res.jobs.length).toBeGreaterThan(0);
    expect(res.jobs.length).toBeLessThan(20);
    expect(res.jobs.every(j => j.week >= 1 && j.week <= 2)).toBe(true);
  });
});
