import { describe, expect, it } from 'vitest';
import {
  aggregateRequirementLines, applyRequirementNotes, buildLessonMap, groupRequirementLines, lessonPriorities, levelOf, parentActionsForRequirements,
  sanitizeRequirementLines, type EvidenceSubmission, type ParentRequirementLine,
} from './parentRequirements';
import { yccdForGrade } from '../curriculum/yccdToan';

const evidence: EvidenceSubmission[] = [
  { ma: 'b1', ten: 'BTVN 1', ngay: '2026-09-05', cau: [
    { ma: 'b1q1', diem: 2, toiDa: 2, ketQua: 'đúng' },
    { ma: 'b1q2', diem: 1, toiDa: 2, ketQua: 'đúng một phần' },
    { ma: 'b1q3', diem: 0, toiDa: 0, ketQua: 'sai' },
  ] },
  { ma: 'b2', ten: 'BTVN 2', ngay: '2026-09-12', cau: [{ ma: 'b2', diem: 3, toiDa: 10, ketQua: 'cả bài' }] },
];

describe('kết quả theo yêu cầu cần đạt', () => {
  it.each([[10, 75], [11, 128], [12, 46]])('bảng YCCĐ lớp %i: %i mục, mã đánh số liền, không chữ rác, chủ đề không bị tách', (grade, count) => {
    const list = yccdForGrade(`Lớp ${grade}`);
    expect(list).toHaveLength(count);
    expect(list.map(item => item.id)).toEqual(list.map((_, index) => `T${grade}.${String(index + 1).padStart(2, '0')}`));
    for (const item of list) {
      expect(item.text.length).toBeGreaterThan(20);
      expect(item.text).toMatch(/[.)]$/);
      expect(item.text).not.toMatch(/\s{2,}|Thực hành trong phòng máy|được được|[-]/);
    }
    // Một chủ đề chỉ xuất hiện thành một khối liền (báo cáo nhóm theo chủ đề liên tiếp).
    const topics = list.map(item => item.topic).filter((topic, i, all) => i === 0 || all[i - 1] !== topic);
    expect(new Set(topics).size).toBe(topics.length);
  });

  it('kí hiệu và công thức đã khôi phục đúng', () => {
    expect(yccdForGrade(10)[0].text).toContain('∀, ∃');
    expect(yccdForGrade(11).find(item => item.text.startsWith('Nhận biết được khái niệm lôgarit'))!.text).toContain('a ≠ 1');
    expect(yccdForGrade(12).some(item => item.text.startsWith('Vận dụng được đạo hàm và khảo sát hàm số'))).toBe(true);
    expect(yccdForGrade(9)).toEqual([]);
  });

  it('mức theo tỉ lệ điểm các câu căn cứ', () => {
    expect(levelOf(80)).toBe('vung');
    expect(levelOf(79.9)).toBe('dang');
    expect(levelOf(50)).toBe('dang');
    expect(levelOf(49.9)).toBe('chua');
  });

  it('gộp bản ghép của AI: bỏ mã YCCĐ ngoài khối, mã câu lạ, câu thang 0; ghi chú bỏ markdown', () => {
    const lines = aggregateRequirementLines(10, evidence, {
      yccd: [
        { ma: 'T10.03', cau: ['b1q1', 'b1q2', 'b1q2'], ghiChu: '  Dùng **đúng** biểu đồ Ven  ' },
        { ma: 'T10.04', cau: ['b1q3'], ghiChu: 'thang 0' },
        { ma: 'T10.01', cau: ['b2', 'b7q1'] },
        { ma: 'T11.01', cau: ['b1q1'], ghiChu: 'khối khác' },
        { ma: 'T10.40', cau: [], ghiChu: 'không có câu nào' },
        'rác',
      ],
    });
    expect(lines).toEqual([
      { id: 'T10.01', level: 'chua', evidence: 1, percent: 30, note: '', questions: [{ code: 'b2', score: 3, max: 10 }] },
      {
        id: 'T10.03', level: 'dang', evidence: 2, percent: 75, note: 'Dùng đúng biểu đồ Ven',
        questions: [{ code: 'b1q1', score: 2, max: 2 }, { code: 'b1q2', score: 1, max: 2 }],
      },
    ]);
  });

  it('ghi chú bước sau: gắn đúng mã, bỏ mã lạ, làm sạch markdown', () => {
    const lines = [{ id: 'T10.03', level: 'dang' as const, evidence: 2, percent: 60, note: '' }];
    expect(applyRequirementNotes(lines, { ghiChu: [{ ma: 'T10.03', ghiChu: '**Nhầm** giao với hợp' }, { ma: 'T10.09', ghiChu: 'x' }] })[0].note).toBe('Nhầm giao với hợp');
    expect(applyRequirementNotes(lines, null)).toEqual(lines);
  });

  it('AI trả sai dạng thì không có dòng nào', () => {
    expect(aggregateRequirementLines(10, evidence, { yccd: 'x' })).toEqual([]);
    expect(aggregateRequirementLines(10, evidence, { yccd: [{ ma: 'T10.03', cau: 'b1q1' }] })).toEqual([]);
    expect(aggregateRequirementLines(12, evidence, { yccd: [{ ma: 'T10.03', cau: ['b1q1'] }] })).toEqual([]);
  });

  it('dòng giáo viên sửa: kiểm khối, mức, trùng; xếp theo thứ tự Chương trình', () => {
    const lines = sanitizeRequirementLines('10', [
      { id: 'T10.20', level: 'vung', evidence: 2.4, percent: 140, note: 'a'.repeat(400) },
      { id: 'T10.02', level: 'chua', evidence: -1, percent: 10, note: 5 },
      { id: 'T10.02', level: 'vung', evidence: 1, percent: 90, note: '' },
      { id: 'T10.05', level: 'tot', evidence: 1, percent: 90, note: '' },
    ]);
    expect(lines.map(line => [line.id, line.level, line.evidence, line.percent])).toEqual([['T10.02', 'chua', 0, 10], ['T10.20', 'vung', 2, 100]]);
    expect(lines[1].note).toHaveLength(300);
    expect(sanitizeRequirementLines('10', 'không phải mảng')).toEqual([]);
  });

  it('gợi ý ở nhà: có dòng YCCĐ thì không trỏ tới "Cần rèn thêm" nữa', () => {
    const actions = ['Hỏi con mỗi ngày.', 'Luyện lại phần ở mục “Cần rèn thêm”.', 'Giữ liên lạc.'];
    const weak = [{ id: 'T10.01', level: 'chua' as const, evidence: 1, percent: 10, note: '' }];
    const out = parentActionsForRequirements(actions, weak);
    expect(out.join(' ')).not.toContain('Cần rèn thêm');
    // Nhãn trong ngoặc giữ dấu cách không ngắt — không bao giờ xuống dòng giữa “Chưa / đạt”.
    expect(out[1]).toContain('“Chưa\u00a0đạt” hoặc “Đang\u00a0hình\u00a0thành”');
    expect(out[1]).toContain('“Bản\u00a0đồ\u00a0theo\u00a0bài\u00a0SGK”');
    expect(parentActionsForRequirements(actions, [{ ...weak[0], level: 'vung' }])).toEqual(['Hỏi con mỗi ngày.', 'Giữ liên lạc.']);
    expect(parentActionsForRequirements(actions, [])).toEqual(actions);
  });

  it('nhóm theo chủ đề, giữ thứ tự Chương trình', () => {
    const groups = groupRequirementLines([
      { id: 'T10.03', level: 'vung', evidence: 1, percent: 90, note: '' },
      { id: 'T10.01', level: 'chua', evidence: 1, percent: 10, note: '' },
      { id: 'T10.02', level: 'dang', evidence: 1, percent: 60, note: '' },
    ]);
    expect(groups.map(group => [group.topic, group.rows.map(row => row.line.id)])).toEqual([
      ['Mệnh đề', ['T10.01', 'T10.02']],
      ['Tập hợp và các phép toán trên tập hợp', ['T10.03']],
    ]);
  });

  it('dòng giáo viên sửa: giữ câu căn cứ hợp lệ, bỏ mã lạ/trùng, kẹp điểm; không còn câu nào thì bỏ hẳn trường', () => {
    const [line] = sanitizeRequirementLines('10', [{ id: 'T10.03', level: 'dang', evidence: 2, percent: 50, note: '', questions: [
      { code: 'b1q1', score: 1, max: 2 }, { code: 'b1q1', score: 2, max: 2 }, { code: 'b2', score: -1, max: 4 },
      { code: 'cau 1', score: 1, max: 1 }, { code: 'b3q1', score: 1, max: 0 }, 'rác',
    ] }]);
    expect(line.questions).toEqual([{ code: 'b1q1', score: 1, max: 2 }, { code: 'b2', score: 0, max: 4 }]);
    const [bare] = sanitizeRequirementLines('10', [{ id: 'T10.03', level: 'dang', evidence: 2, percent: 50, note: '', questions: [{ code: 'x', score: 1, max: 1 }] }]);
    expect(bare).not.toHaveProperty('questions');
  });
});

const line = (id: string, level: ParentRequirementLine['level'], evidence: number, percent: number, note = '', codes?: [string, number, number][]): ParentRequirementLine => ({
  id, level, evidence, percent, note, ...(codes ? { questions: codes.map(([code, score, max]) => ({ code, score, max })) } : {}),
});

describe('bản đồ theo bài SGK', () => {
  it('gom theo bài, câu ghép vào hai yêu cầu cùng bài chỉ tính một lần, tỉ lệ cộng trên điểm câu', () => {
    const [bai1] = buildLessonMap([
      line('T11.01', 'vung', 3, 100, '', [['b1q1', 1, 1], ['b1q2', 1, 1], ['b1q3', 1, 1]]),
      line('T11.02', 'chua', 2, 25, '', [['b1q3', 1, 1], ['b1q4', 0, 3]]),
    ]);
    expect(bai1).toMatchObject({ lesson: 'Bài 1', title: 'Giá trị lượng giác của góc lượng giác', questions: 4, percent: 50, level: 'dang' });
  });

  it('bản ghi cũ không có danh sách câu: tỉ lệ trung bình theo số câu, không in số câu, đủ căn cứ xét theo dòng nhiều câu nhất', () => {
    const [bai1] = buildLessonMap([line('T11.01', 'vung', 4, 90), line('T11.02', 'chua', 1, 40)]);
    expect(bai1).toMatchObject({ percent: 80, questions: null, level: 'vung' });
    // 2 + 2 câu có thể chỉ là 2 câu thật (ghép trùng) → chưa đủ 3 câu để kết luận.
    const [thin] = buildLessonMap([line('T11.01', 'vung', 2, 90), line('T11.02', 'vung', 2, 90)]);
    expect(thin.level).toBeNull();
  });

  it('dưới 3 câu khác nhau thì chưa gắn mức', () => {
    expect(buildLessonMap([line('T11.05', 'chua', 2, 10, '', [['b1q1', 0, 1], ['b1q2', 0, 1]])])[0]).toMatchObject({ level: null, questions: 2 });
  });

  it('xếp theo thứ tự sách: bài gộp đứng sau bài cuối của nó; "Chương V" đứng sau bài có số ngay trước nó; mã lạ bị bỏ', () => {
    const order = buildLessonMap([
      line('T11.14', 'dang', 3, 60), line('T11.06', 'dang', 3, 60), line('T11.05', 'dang', 3, 60),
      line('T11.07', 'dang', 3, 60), line('T11.01', 'dang', 3, 60), line('T99.01', 'dang', 3, 60),
    ]).map(lesson => lesson.lesson);
    expect(order).toEqual(['Bài 1', 'Bài 2', 'Bài 1–2', 'Bài 3', 'Bài 4']);
    expect(buildLessonMap([line('T10.63', 'dang', 3, 60), line('T10.62', 'dang', 3, 60), line('T10.57', 'dang', 3, 60)]).map(lesson => lesson.lesson))
      .toEqual(['Bài 12', 'Chương V', 'Bài 13']);
  });

  it('tên bài lấy theo mục đầu của bài trong Chương trình, không phụ thuộc dòng nào còn lại', () => {
    expect(buildLessonMap([line('T10.43', 'dang', 3, 60)])[0]).toMatchObject({ lesson: 'Bài 11', title: 'Tích vô hướng của hai vectơ' });
  });

  it('ghi chú: bài chưa vững lấy dòng yếu nhất đủ căn cứ; bài vững lấy dòng nhiều câu nhất', () => {
    const [weak] = buildLessonMap([line('T11.07', 'dang', 3, 70, 'lỗi nhẹ'), line('T11.08', 'chua', 1, 0, 'một câu'), line('T11.09', 'chua', 4, 40, 'lỗi chính')]);
    expect(weak.note).toBe('lỗi chính');
    const [strong] = buildLessonMap([line('T11.01', 'vung', 6, 90, 'ý chính'), line('T11.04', 'vung', 2, 100, 'bấm máy tính')]);
    expect(strong.note).toBe('ý chính');
  });

  it('ưu tiên ôn: Chưa đạt trước, rồi Đang hình thành, tỉ lệ thấp trước; bỏ bài vững và bài chưa đủ căn cứ', () => {
    const lessons = buildLessonMap([
      line('T11.01', 'vung', 5, 90), line('T11.05', 'chua', 5, 40), line('T11.07', 'dang', 5, 55),
      line('T11.14', 'chua', 5, 30), line('T11.18', 'chua', 1, 0), line('T11.06', 'dang', 5, 70),
    ]);
    expect(lessonPriorities(lessons).map(lesson => lesson.lesson)).toEqual(['Bài 4', 'Bài 2', 'Bài 3']);
    expect(lessonPriorities(lessons, 5).map(lesson => lesson.lesson)).toEqual(['Bài 4', 'Bài 2', 'Bài 3', 'Bài 1–2']);
  });

  it('câu của bài kiểm tra định kì: cờ đi trọn vòng (gộp → lưu → bản đồ), bản đồ đếm riêng số câu kiểm tra', () => {
    const lines = aggregateRequirementLines(11, [
      { ma: 'b1', ten: 'BTVN', ngay: '2026-10-01', cau: [{ ma: 'b1q1', diem: 1, toiDa: 1, ketQua: 'đúng' }, { ma: 'b1q2', diem: 1, toiDa: 1, ketQua: 'đúng' }] },
      { ma: 'b2', ten: 'KT', ngay: '2026-10-20', cau: [{ ma: 'b2q1', diem: 0, toiDa: 1, ketQua: 'sai', kt: true }] },
    ], { yccd: [{ ma: 'T11.05', cau: ['b1q1', 'b1q2', 'b2q1'] }] });
    expect(lines[0].questions).toEqual([{ code: 'b1q1', score: 1, max: 1 }, { code: 'b1q2', score: 1, max: 1 }, { code: 'b2q1', score: 0, max: 1, test: true }]);
    const saved = sanitizeRequirementLines('11', lines);
    expect(saved[0].questions?.[2]).toEqual({ code: 'b2q1', score: 0, max: 1, test: true });
    expect(buildLessonMap(saved)[0]).toMatchObject({ lesson: 'Bài 2', questions: 3, testQuestions: 1 });
  });
});

