import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { QuestionResult } from '../../../lib/classroom/types';
import { QuestionDetail, questionAppearance } from './QuestionDetail';
import { QuestionResultsList } from './QuestionResultsList';
import { SubmissionPhotoReview } from './SubmissionPhotoReview';
const question = { questionNumber: 'Câu 1', status: 'correct', score: 1, maxScore: 1, studentAnswer: '$x=2$', expectedAnswer: '$x=2$', errorType: '', explanation: 'Bài em áp dụng đúng.', correction: 'Ghi thêm điều kiện.', nextPractice: '', workedSolution: '**Bước 1.** Điều kiện $x>0$.\n\n**Bước 2.** Tính $x=2$ và đối chiếu điều kiện.' } as QuestionResult;
describe('lời giải chung và nhận xét độc lập', () => {
  it('câu đúng vẫn có lời giải, lưu ý không đổi xanh thành sai', () => {
    const html = renderToStaticMarkup(<QuestionDetail question={{ ...question, needsTeacherReview: true }} />);
    expect(html).toContain('Lời giải chi tiết'); expect(html).toContain('Bước 1.'); expect(html).toContain('Bước 2.');
    expect(html).toContain('Lưu ý / bổ sung'); expect(html).toContain('katex'); expect(html).toContain('không có nghĩa');
    expect(questionAppearance({ ...question, needsTeacherReview: true }).kind).toBe('correct');
  });
  it('hai viewer giữ cùng nội dung đã duyệt, không tự bịa lời giải cho bài cũ', () => {
    const list = renderToStaticMarkup(<QuestionResultsList results={[question]} />);
    const photo = renderToStaticMarkup(<SubmissionPhotoReview imageUrl="https://example.test/photo.jpg" alt="Bài" questionResults={[question]} approved selectedQuestion={question.questionNumber} />);
    for (const text of ['Bước 1.', 'Bước 2.', 'Ghi thêm điều kiện.', 'Bài em áp dụng đúng.']) { expect(list).toContain(text); expect(photo).toContain(text); }
    const absent = renderToStaticMarkup(<QuestionDetail question={{ ...question, workedSolution: undefined, workedSolutionStatus: 'unavailable' }} />);
    expect(absent).toContain('Chưa có lời giải chi tiết đã xác minh'); expect(absent).not.toContain('Bước 1.');
  });
  it('đang đối chiếu không có score/đáp án/lời giải dù dữ liệu GV đầy đủ', () => {
    const html = renderToStaticMarkup(<QuestionDetail question={question} pending />);
    expect(html).toContain('Cần đối chiếu'); expect(html).not.toContain('Đáp án /'); expect(html).not.toContain('Bước 1.'); expect(html).not.toContain('1/1'); expect(html).not.toContain('Ghi thêm điều kiện.');
  });
});
