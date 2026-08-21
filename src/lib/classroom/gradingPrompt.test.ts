import { describe, it, expect } from 'vitest';
import {
  buildHomeworkGradingPrompt,
  buildPracticePrompt,
  buildSolveExamPrompt,
  parseHomeworkGrade,
  parsePracticeQuestions,
  parseSolvedAnswerKey,
} from './gradingPrompt';

describe('buildHomeworkGradingPrompt', () => {
  it('có đáp án thì bảo AI dùng làm mốc, không tự nghĩ đáp án khác', () => {
    const prompt = buildHomeworkGradingPrompt({ answerKey: 'Câu 1: x = 2', maxScore: 10 });

    expect(prompt).toContain('ĐÁP ÁN CHUẨN');
    expect(prompt).toContain('Câu 1: x = 2');
    expect(prompt).not.toContain('KHÔNG có đáp án chuẩn');
  });

  it('không có đáp án thì bảo AI tự đọc đề trong ảnh và nói rõ chỗ không chắc', () => {
    const prompt = buildHomeworkGradingPrompt({ answerKey: '   ', maxScore: 10 });

    expect(prompt).toContain('KHÔNG có đáp án chuẩn');
    expect(prompt).toContain('không chắc');
  });

  it('gắn thang điểm và hướng dẫn chấm khi có', () => {
    const prompt = buildHomeworkGradingPrompt({
      answerKey: 'x = 2', maxScore: 20, rubric: 'Sai dấu trừ 0,25', assignmentTitle: 'Phiếu §2',
    });

    expect(prompt).toContain('tối đa 20 điểm');
    expect(prompt).toContain('Sai dấu trừ 0,25');
    expect(prompt).toContain('Phiếu §2');
  });

  it('luôn dặn tách hai giọng văn và không ghi bừa chủ đề yếu', () => {
    const prompt = buildHomeworkGradingPrompt({ answerKey: 'x', maxScore: 10 });

    expect(prompt).toContain('feedbackForStudent');
    expect(prompt).toContain('noteForTeacher');
    expect(prompt).toContain('hồ sơ học tập lâu dài');
  });
});

describe('parseHomeworkGrade', () => {
  const mau = {
    score: 8,
    maxScore: 10,
    feedbackForStudent: 'Em viết đúng dạng phương trình.',
    noteForTeacher: 'Nắm bài khá, lỗi dấu là lỗi vặt.',
    strengths: ['Đúng dạng tổng quát'],
    weaknesses: ['Câu 5 nhầm dấu'],
    weakTopics: ['quy tắc dấu khi thay toạ độ'],
  };

  it('đọc được JSON thuần', () => {
    const g = parseHomeworkGrade(JSON.stringify(mau), 10, false);

    expect(g.score).toBe(8);
    expect(g.feedbackForStudent).toBe('Em viết đúng dạng phương trình.');
    expect(g.weakTopics).toEqual(['quy tắc dấu khi thay toạ độ']);
    expect(g.gradedWithoutAnswerKey).toBe(false);
  });

  it('đọc được JSON bọc trong khối mã', () => {
    const g = parseHomeworkGrade('Đây là kết quả:\n```json\n' + JSON.stringify(mau) + '\n```', 10, false);
    expect(g.score).toBe(8);
  });

  it('kẹp điểm vượt thang về đúng thang', () => {
    const g = parseHomeworkGrade(JSON.stringify({ ...mau, score: 12 }), 10, false);
    expect(g.score).toBe(10);
  });

  it('kẹp điểm âm về 0', () => {
    const g = parseHomeworkGrade(JSON.stringify({ ...mau, score: -3 }), 10, false);
    expect(g.score).toBe(0);
  });

  it('điểm không đọc được thì về 0 chứ không thành NaN', () => {
    const g = parseHomeworkGrade(JSON.stringify({ ...mau, score: 'tám' }), 10, false);
    expect(g.score).toBe(0);
  });

  it('mảng thiếu hoặc sai kiểu thì thành mảng rỗng, không vỡ', () => {
    const g = parseHomeworkGrade(JSON.stringify({ score: 5, feedbackForStudent: 'ok' }), 10, false);

    expect(g.strengths).toEqual([]);
    expect(g.weakTopics).toEqual([]);
    expect(g.maxScore).toBe(10);
  });

  it('KHÔNG tìm được JSON thì NÉM lỗi, không lặng lẽ cho 0 điểm', () => {
    expect(() => parseHomeworkGrade('Xin lỗi, tôi không xem được ảnh.', 10, false))
      .toThrow(/không đọc được/);
  });

  it('ghi nhận cờ chấm khi không có đáp án chuẩn', () => {
    const g = parseHomeworkGrade(JSON.stringify(mau), 10, true);
    expect(g.gradedWithoutAnswerKey).toBe(true);
  });
});

describe('bài bổ trợ', () => {
  it('prompt bám đúng chủ đề yếu và cấm lan sang chủ đề khác', () => {
    const p = buildPracticePrompt(['phương trình đường thẳng', 'dấu toạ độ'], '10', 3);

    expect(p).toContain('phương trình đường thẳng');
    expect(p).toContain('dấu toạ độ');
    expect(p).toContain('không lan sang chủ đề khác');
    expect(p).toContain('ĐÚNG 3 bài');
  });

  it('prompt KHÔNG nhắc lại việc em từng làm sai', () => {
    expect(buildPracticePrompt(['đạo hàm'], '11')).toContain('không nhắc tới việc em từng làm sai');
  });

  it('đọc được danh sách bài và bỏ bài rỗng', () => {
    const raw = JSON.stringify({ questions: [
      { question: 'Viết PTTQ qua A(1;2)', hint: 'dùng VTPT', solution: 'x + 2y - 5 = 0' },
      { question: '', hint: 'x', solution: 'y' },
    ] });

    const ket = parsePracticeQuestions(raw);
    expect(ket).toHaveLength(1);
    expect(ket[0].hint).toBe('dùng VTPT');
  });

  it('không đọc được nội dung thì ném lỗi', () => {
    expect(() => parsePracticeQuestions('xin lỗi')).toThrow(/không đọc được/);
  });
});

describe('đáp án dạng ảnh', () => {
  it('dặn rõ mấy ảnh đầu là đáp án, không phải bài của em', () => {
    const p = buildHomeworkGradingPrompt({ answerKey: '', maxScore: 10, answerKeyImageCount: 2 });

    expect(p).toContain('2 ảnh ĐẦU TIÊN là ĐÁP ÁN CHUẨN');
    expect(p).toContain('không chấm điểm cho ảnh đáp án');
    expect(p).not.toContain('KHÔNG có đáp án chuẩn');
  });

  it('không có ảnh đáp án thì không chèn dặn dò thừa', () => {
    expect(buildHomeworkGradingPrompt({ answerKey: 'x = 2', maxScore: 10 })).not.toContain('THỨ TỰ ẢNH');
  });

  it('có cả chữ lẫn ảnh thì ưu tiên nêu bản chữ', () => {
    const p = buildHomeworkGradingPrompt({ answerKey: 'Câu 1: x = 2', maxScore: 10, answerKeyImageCount: 1 });

    expect(p).toContain('Câu 1: x = 2');
    expect(p).toContain('THỨ TỰ ẢNH');
  });
});

describe('AI tự giải đề', () => {
  it('đề dạng chữ thì đưa thẳng vào prompt', () => {
    const p = buildSolveExamPrompt({ examText: 'Câu 1: Giải x + 2 = 5', examImageCount: 0, maxScore: 10 });

    expect(p).toContain('Câu 1: Giải x + 2 = 5');
    expect(p).toContain('đúng bằng 10 điểm');
    expect(p).not.toContain('ảnh gửi kèm');
  });

  it('đề dạng ảnh thì bảo AI đọc đề trong ảnh', () => {
    const p = buildSolveExamPrompt({ examText: '', examImageCount: 3, maxScore: 20 });

    expect(p).toContain('3 ảnh gửi kèm');
    expect(p).toContain('đúng bằng 20 điểm');
  });

  it('LUÔN bắt AI nêu chỗ chưa chắc — một đáp án sai làm cả lớp bị chấm sai', () => {
    const p = buildSolveExamPrompt({ examText: 'x', examImageCount: 0, maxScore: 10 });

    expect(p).toContain('CHƯA CHẮC');
    expect(p).toContain('đoán bừa');
  });

  it('đọc được đáp án và danh sách chỗ chưa chắc', () => {
    const raw = JSON.stringify({ answerKey: 'Câu 1: x = 3 (2 điểm)', uncertainties: ['Câu 4 mờ, không đọc được số mũ'] });
    const ket = parseSolvedAnswerKey(raw);

    expect(ket.answerKey).toBe('Câu 1: x = 3 (2 điểm)');
    expect(ket.uncertainties).toEqual(['Câu 4 mờ, không đọc được số mũ']);
  });

  it('AI trả đáp án rỗng thì NÉM lỗi, không trả chuỗi trống cho giáo viên tưởng là xong', () => {
    expect(() => parseSolvedAnswerKey(JSON.stringify({ answerKey: '   ' }))).toThrow(/dán đáp án tay/);
  });

  it('không đọc được nội dung thì ném lỗi', () => {
    expect(() => parseSolvedAnswerKey('xin lỗi tôi không giải được')).toThrow(/không đọc được/);
  });
});
