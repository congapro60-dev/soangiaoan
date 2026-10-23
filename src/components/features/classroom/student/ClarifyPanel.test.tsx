import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { QuestionResult, SubmissionDoc } from '../../../../lib/classroom/types';
import { ClarifyPanel } from './ClarifyPanel';

const q = (over: Partial<QuestionResult>): QuestionResult => ({
  questionNumber: 'Câu', status: 'unreadable', score: 0, maxScore: 1, studentAnswer: '', expectedAnswer: '',
  errorType: '', explanation: '', correction: '', nextPractice: '', needsTeacherReview: true, ...over,
});

const submission = (rows: QuestionResult[]): SubmissionDoc => ({
  id: 'sub-1', teacherId: 't', classId: 'c', studentId: 's', assignmentId: 'a', fileUrls: [], note: '', status: 'graded',
  grade: { score: 0, maxScore: 1, feedback: '', strengths: [], weaknesses: [], teacherApproved: true, gradedAt: '2026-10-09T10:00:00.000Z', awaitingClarification: true, questionResults: rows },
  createdAt: '2026-10-09T00:00:00.000Z', updatedAt: '2026-10-09T00:00:00.000Z',
});

describe('ClarifyPanel', () => {
  it('không có bài chờ thì không vẽ gì', () => {
    expect(renderToStaticMarkup(<ClarifyPanel items={[]} onChanged={() => undefined} />)).toBe('');
  });

  it('mỗi dạng câu có đúng ô nhập; có MỘT nút lưu chung cho cả lượt; có nút "để thầy cô xem hết" và lời nhắn lưu bài', () => {
    const html = renderToStaticMarkup(<ClarifyPanel onChanged={() => undefined} items={[{ title: 'BTVN 9/10', submission: submission([
      q({ questionNumber: 'Phần I – Câu 2', clarify: { kind: 'mcq', state: 'open', reading: 'B hoặc D' } }),
      q({ questionNumber: 'Phần II – Câu 1', clarify: { kind: 'true_false', state: 'open', reading: '', parts: ['a', 'b'] } }),
      q({ questionNumber: 'Phần III – Câu 1', clarify: { kind: 'short', state: 'open', reading: '3,5' } }),
    ]) }]} />);
    expect(html).toContain('Máy cần em xác nhận vài câu');
    expect(html).toContain('BTVN 9/10 · còn 3 câu');
    expect(html).toContain('B hoặc D');
    for (const letter of ['A', 'B', 'C', 'D']) expect(html).toContain(`>${letter}</button>`);
    expect(html).toContain('a)');
    expect(html).toContain('b)');
    expect(html).toContain('inputMode="decimal"');
    expect(html).toContain('Chọn đáp án 3 câu');
    expect(html).toContain('(đã chọn 0/3)');
    // Một lượt gửi duy nhất: đúng MỘT nút lưu, chưa chọn gì thì khoá; "để thầy cô xem" cũng chỉ một nút cho cả lượt.
    expect(html.match(/Lưu tất cả<\/button>/g)).toHaveLength(1);
    expect(html.match(/Để thầy cô xem hết/g)).toHaveLength(1);
    expect(html).not.toContain('Xác nhận câu này');
    expect(html).toMatch(/disabled=""[^>]*>[^<]*<svg[^>]*>[^]*?Lưu tất cả/);
    expect(html).toContain('bài, ảnh và những gì đã lưu vẫn còn');
    // Không có đáp án đúng nào lọt ra màn hình
    expect(html).not.toContain('Đáp án đúng');
  });

  it('câu tự luận đứng trên ô chọn đáp án để ảnh bài chấm không đẩy form khỏi màn hình', () => {
    const html = renderToStaticMarkup(<ClarifyPanel onChanged={() => undefined} items={[{ title: 'KT', submission: submission([
      q({ questionNumber: 'Phần I – Câu 1', clarify: { kind: 'mcq', state: 'open', reading: 'B hoặc D' } }),
      q({ questionNumber: 'Bài 1', clarify: { kind: 'photo', state: 'open', reading: '' } }),
    ]) }]} />);
    expect(html.indexOf('Chụp / chọn ảnh câu này')).toBeGreaterThan(-1);
    expect(html.indexOf('Chụp / chọn ảnh câu này')).toBeLessThan(html.indexOf('Chọn đáp án 1 câu'));
  });

  it('câu tự luận: có nút chụp ảnh; đang chấm lại thì báo chờ; chấm lỗi thì có nút "Thử lại"; hết số lần chụp thì chỉ còn "để thầy cô xem"', () => {
    const html = (clarify: QuestionResult['clarify']) => renderToStaticMarkup(<ClarifyPanel onChanged={() => undefined} items={[{ title: 'KT', submission: submission([q({ questionNumber: 'Bài 1', clarify })]) }]} />);
    expect(html({ kind: 'photo', state: 'open', reading: '' })).toContain('Chụp / chọn ảnh câu này');
    expect(html({ kind: 'photo', state: 'open', reading: '', photoUrls: ['a'], message: 'Máy vẫn chưa đọc rõ' })).toContain('Gửi thêm ảnh câu này');
    expect(html({ kind: 'photo', state: 'open', reading: '', photoUrls: ['a'], message: 'Máy vẫn chưa đọc rõ' })).toContain('Máy vẫn chưa đọc rõ');
    expect(html({ kind: 'photo', state: 'regrading', reading: '', photoUrls: ['a'] })).toContain('Máy đang đọc lại ảnh em chụp');
    expect(html({ kind: 'photo', state: 'photo_saved', reading: '', photoUrls: ['a'] })).toContain('Thử lại');
    const exhausted = html({ kind: 'photo', state: 'open', reading: '', photoUrls: ['a'], tries: 5 });
    expect(exhausted).not.toContain('Gửi thêm ảnh câu này');
    expect(exhausted).toContain('Để thầy cô xem');
    // Câu tự luận không có ô gõ đáp án / không tính vào lượt lưu đáp án
    expect(html({ kind: 'photo', state: 'open', reading: '' })).not.toContain('Chọn đáp án');
    expect(html({ kind: 'photo', state: 'open', reading: '' })).not.toContain('inputMode="decimal"');
  });
});

it('đối chiếu PH có ảnh cạnh câu hỏi / vùng nét đứt, không đáp án và lời giải', () => {
  const url = 'https://example.test/paper.jpg';
  const question = q({ questionNumber: 'Câu 3', expectedAnswer: 'SECRET KEY', explanation: 'SECRET WHY', workedSolution: 'SECRET SOLUTION', studentAnswer: 'B', clarify: { kind: 'mcq', state: 'open', reading: 'B hoặc D' }, readingRegions: [{ imageIndex: 1, imageUrl: url, x: .1, y: .2, width: .3, height: .1, confidence: .95 }] });
  const work = { ...submission([question]), fileUrls: [url] };
  const props = { items: [{ title: 'Bài QA', submission: work }], onChanged: () => undefined, credentials: { role: 'parent' as const, joinCode: 'ABCD', studentId: 'child', pin: '1234' } };
  const html = renderToStaticMarkup(<ClarifyPanel {...props} />);
  expect(html).toContain('md:grid-cols-2'); expect(html).toContain('stroke-dasharray="5 3"'); expect(html).toContain(url); expect(html).toContain('B hoặc D'); expect(html).not.toContain('SECRET'); expect(html).not.toContain('1234');
  const locked = renderToStaticMarkup(<ClarifyPanel {...props} locked />);
  expect(locked).toContain('GV đã khóa chốt'); expect(locked).not.toContain('Lưu tất cả');
});
