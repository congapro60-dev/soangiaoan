import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuestionResult } from '../../../lib/classroom/types';
import { SubmissionPhotoReview } from './SubmissionPhotoReview';

const view = vi.hoisted(() => ({ active: null as number | null }));
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => [initial === null ? view.active : initial, () => undefined],
}));

const url = 'https://example.test/own.jpg';
const row = (marks: unknown[], overrides = {}) => ({
  questionNumber: 'Câu 2', status: 'incorrect', studentAnswer: 'x = 2',
  explanation: 'PRIVATE EXPLANATION', correction: 'PRIVATE CORRECTION',
  photoMarks: marks, ...overrides,
}) as QuestionResult;
const mark = { imageIndex: 1, imageUrl: url, x: .1, y: .2, width: .3, height: .1, confidence: .9 };
const render = (results: QuestionResult[], approved = true, teacherView = false) => renderToStaticMarkup(
  <SubmissionPhotoReview imageUrl={url} alt="Ảnh bài đã nộp" questionResults={results} approved={approved} teacherView={teacherView} />,
);

describe('dấu đỏ trên đúng ảnh gốc', () => {
  beforeEach(() => { view.active = null; });
  it('vẽ tọa độ chuẩn hóa, có nút bàn phím và bản gốc', () => {
    const html = render([row([mark])]);
    expect(html).toContain('<ellipse');
    expect(html).toContain('cx="25"');
    expect(html).toContain('cy="25"');
    expect(html).toContain('Dấu 1 · Câu 2');
    expect(html).toContain('Ẩn dấu đỏ');
    expect(html).toContain('Mở bản gốc');
  });
  it('không lộ dấu hoặc lời chữa trước duyệt; GV thấy gợi ý AI', () => {
    const html = render([row([mark])], false);
    expect(html).not.toContain('<ellipse');
    expect(html).not.toContain('Câu 2');
    expect(html).not.toContain('PRIVATE');
    expect(render([row([mark])], false, true)).toContain('Gợi ý AI · chờ GV duyệt');
  });
  it('bỏ dấu ảnh khác, URL chưa gắn, bounds sai và độ chắc thấp', () => {
    const invalid = [
      null, 'invalid',
      { ...mark, imageUrl: 'https://example.test/other.jpg' }, { ...mark, imageUrl: undefined },
      { ...mark, x: NaN }, { ...mark, width: 0 }, { ...mark, x: .9 },
      { ...mark, confidence: .84 }, { ...mark, confidence: 2 }, { ...mark, imageIndex: 0 },
    ];
    expect(render([row(invalid)])).not.toContain('<ellipse');
    expect(render([row(invalid)])).toContain('<img');
  });
  it('không đánh dấu câu đúng, bỏ trống hoặc bỏ qua theo lệnh GV', () => {
    const results = [row([mark], { status: 'correct' }), row([mark], { status: 'not_attempted' }),
      row([mark], { ignoredByTeacherInstruction: true }), row([mark], { studentAnswer: '' })];
    expect(render(results)).not.toContain('<ellipse');
  });
  it('không hiện dấu đã loại hoặc đang chờ làm rõ ngay cả ở luồng GV', () => {
    const results = [row([mark], { photoMarksCleared: true }), ...['open', 'photo_saved', 'regrading'].map(state =>
      row([mark], { clarify: { kind: 'photo', state, reading: '' } }))];
    expect(render(results, true, true)).not.toContain('<ellipse');
    expect(render([row([mark], { clarify: { kind: 'photo', state: 'done', reading: '' } })], true, true)).toContain('<ellipse');
  });
  it('bài cũ không có dấu vẫn mở được ảnh, không thêm điểm hay lời chữa', () => {
    const html = render([]);
    expect(html).toContain('<img');
    expect(html).toContain('Mở bản gốc');
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('PRIVATE');
  });
  it('mở đúng một lời chữa, không thêm điểm, vẫn không lộ khi chưa duyệt', () => {
    view.active = 0;
    const rows = [row([mark], { score: 99, maxScore: 100 }), row([mark], { correction: 'OTHER CORRECTION' })];
    const html = render(rows);
    expect(html).toContain('PRIVATE EXPLANATION');
    expect(html).toContain('PRIVATE CORRECTION');
    expect(html).not.toContain('OTHER CORRECTION');
    expect(html).not.toContain('99/100');
    expect(html).toContain('Quay lại ảnh');
    expect(render(rows, false)).not.toContain('PRIVATE');
  });
});
