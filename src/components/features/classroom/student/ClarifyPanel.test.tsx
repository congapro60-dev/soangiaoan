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

  it('mỗi dạng câu có đúng ô nhập; nút xác nhận khoá tới khi đủ đáp án; có nút "để thầy cô xem" và lời nhắn lưu bài', () => {
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
    expect(html.match(/Để thầy cô xem/g)).toHaveLength(3);
    expect(html.match(/disabled=""[^>]*>[^<]*<svg[^>]*>[^]*?Xác nhận câu này/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('bài và ảnh vẫn được lưu');
    // Không có đáp án đúng nào lọt ra màn hình
    expect(html).not.toContain('Đáp án đúng');
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
    // Câu tự luận không có nút "Xác nhận câu này" (không có gì để gõ)
    expect(html({ kind: 'photo', state: 'open', reading: '' })).not.toContain('Xác nhận câu này');
  });
});
