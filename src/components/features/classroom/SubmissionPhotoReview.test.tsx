import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuestionResult } from '../../../lib/classroom/types';
import { validPhotoRegion, SubmissionPhotoReview } from './SubmissionPhotoReview';

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
    expect(html).toContain('Ẩn dấu trên ảnh');
    expect(html).toContain('Mở bản gốc');
  });
  it('22 vùng gần nhau chỉ hiện số trên câu đang chọn, các vùng khác dùng chấm nhỏ và vẫn có nút 44px', () => {
    const results = Array.from({ length: 22 }, (_, i) => row([{ ...mark, y: .1 + i * .025 }], { questionNumber: `Câu ${i + 1}` }));
    const initial = render(results);
    expect(initial.match(/h-2 w-2/g)).toHaveLength(22);
    expect(initial.match(/aria-label="Dấu /g)).toHaveLength(22);
    expect(initial.match(/absolute flex h-11 w-11/g)).toHaveLength(22);
    view.active = 5;
    const selected = render(results);
    expect(selected.match(/h-6 w-6/g)).toHaveLength(1);
    expect(selected.match(/h-2 w-2/g)).toHaveLength(21);
    expect(selected).toContain('Dấu 6 · Câu 6');
    expect(selected).toContain('>6</span>');
    expect(selected.match(/<ellipse/g)).toHaveLength(22);
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
  it('đúng xanh, một phần vàng, sai đỏ; bỏ qua không đánh dấu', () => {
    const results = [row([mark], { status: 'correct' }), row([mark], { status: 'partially_correct' }), row([mark]), row([mark], { ignoredByTeacherInstruction: true }), row([mark], { studentAnswer: '' })];
    const html = render(results);
    expect(html.match(/<ellipse/g)).toHaveLength(3);
    for (const color of ['#059669', '#d97706', '#dc2626']) expect(html).toContain(`stroke="${color}"`);
    for (const label of ['Tất cả', 'Đúng', 'Đúng một phần', 'Cần sửa', 'Cần đối chiếu']) expect(html).toContain(label);
  });
  it('không hiện dấu đã loại; dấu cũ đang chờ làm rõ chỉ hiện trung tính', () => {
    expect(render([row([mark], { photoMarksCleared: true })], true, true)).not.toContain('<ellipse');
    const results = ['open', 'photo_saved', 'regrading'].map(state =>
      row([mark], { clarify: { kind: 'photo', state, reading: '' } }));
    const html = render(results, true, true);
    expect(html.match(/stroke-dasharray="5 3"/g)).toHaveLength(3);
    expect(html).not.toContain('stroke="#dc2626"');
    expect(render([row([mark], { clarify: { kind: 'photo', state: 'done', reading: '' } })], true, true)).toContain('<ellipse');
  });
  it.each([{ status: 'unreadable' }, { needsTeacherReview: true }, { confidence: .4 }])('vùng chưa chắc sau chấm lại vẫn hiện trung tính: %j', uncertainty => {
    const html = render([row([mark], { ...uncertainty, readingRegions: [{ ...mark, x: .4 }] })], false, true);
    expect(html).toContain('cx="55');
    expect(html).toContain('stroke-dasharray="5 3"');
    expect(html).toContain('stroke="#64748b"');
    expect(html).toContain('background-color:#64748b');
    expect(html).not.toContain('stroke="#dc2626"');
  });
  it('vùng đọc sai dùng dấu hợp lệ cũ làm vùng trung tính; câu chắc giữ dấu màu', () => {
    const uncertain = render([row([mark], { needsTeacherReview: true, readingRegions: [{ ...mark, imageUrl: 'https://foreign.test/photo.jpg' }] })]);
    expect(uncertain).toContain('cx="25"');
    expect(uncertain).toContain('stroke="#64748b"');
    expect(uncertain).toContain('stroke-dasharray="5 3"');
    const certain = render([row([mark], { status: 'correct', confidence: .95, readingRegions: [{ ...mark, x: .4 }] })]);
    expect(certain).toContain('cx="25"');
    expect(certain).toContain('stroke="#059669"');
    expect(certain).not.toContain('stroke-dasharray');
  });
  it('bài cũ không có dấu vẫn mở được ảnh, không thêm điểm hay lời chữa', () => {
    const html = render([]);
    expect(html).toContain('<img');
    expect(html).toContain('Mở bản gốc');
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('PRIVATE');
  });
  it('mở đúng một lời chữa và điểm câu, vẫn không lộ khi chưa duyệt', () => {
    view.active = 0;
    const rows = [row([mark], { score: 99, maxScore: 100 }), row([mark], { correction: 'OTHER CORRECTION' })];
    const html = render(rows);
    expect(html).toContain('PRIVATE EXPLANATION');
    expect(html).toContain('PRIVATE CORRECTION');
    expect(html).not.toContain('OTHER CORRECTION');
    expect(html).toContain('99/100');
    expect(html).toContain('Quay lại ảnh');
    expect(render(rows, false)).not.toContain('PRIVATE');
  });
  it('tổng lấy cả grade, bài định kì chỉ nhãn AI, chưa duyệt không lộ tổng', () => {
    const grade = { score: 8, maxScore: 10, teacherApproved: true } as NonNullable<import('../../../lib/classroom/types').SubmissionDoc['grade']>;
    const html = renderToStaticMarkup(<SubmissionPhotoReview imageUrl={url} alt="Bài" approved grade={grade} questionResults={[row([mark], { score: 1, maxScore: 2 })]} />);
    expect(html).toContain('Tổng điểm: 8/10');
    expect(html).toContain('1/2');
    const hidden = renderToStaticMarkup(<SubmissionPhotoReview imageUrl={url} alt="Bài" grade={grade} questionResults={[row([mark])]} />);
    expect(hidden).not.toContain('8/10');
    const periodic = renderToStaticMarkup(<SubmissionPhotoReview imageUrl={url} alt="Bài" approved grade={grade} hideScores questionResults={[row([mark], { score: 1, maxScore: 2 })]} />);
    expect(periodic).toContain('Phân tích AI'); expect(periodic).not.toContain('8/10'); expect(periodic).not.toContain('>1/2<');
  });
  it('vùng đọc chưa chắc nét đứt, không lộ đáp án/lời giải; thiếu vùng vẫn chọn được câu', () => {
    view.active = 0;
    const question = row([], { status: 'unreadable', expectedAnswer: 'SECRET KEY', workedSolution: 'SECRET SOLUTION', readingRegions: [mark], clarify: { kind: 'mcq', state: 'open', reading: 'B' } });
    const html = renderToStaticMarkup(<SubmissionPhotoReview imageUrl={url} alt="Đối chiếu" pending questionResults={[question]} />);
    expect(html).toContain('stroke-dasharray="5 3"'); expect(html).toContain('Máy đọc được'); expect(html).not.toContain('SECRET'); expect(html).not.toContain('PRIVATE');
    const absent = render([row([], { workedSolution: 'Lời giải đã xác minh' })]);
    expect(absent).toContain('Câu 2'); expect(absent).not.toContain('<ellipse'); expect(absent).toContain('Chưa có vị trí đủ chắc');
  });
  it('chọn câu gắn trang đúng; không tạo tọa độ từ index không có URL', () => {
    const other = 'https://example.test/page2.jpg';
    const question = row([{ ...mark, imageUrl: other, imageIndex: 2 }]);
    const html = renderToStaticMarkup(<SubmissionPhotoReview imageUrl={url} imageUrls={[url, other]} selectedQuestion="Câu 2" alt="Bài" approved questionResults={[question]} />);
    expect(html).toContain('Trang ảnh'); expect(html).toContain('2/2'); expect(html).toContain('PRIVATE EXPLANATION');
    expect(validPhotoRegion({ ...mark, imageUrl: undefined }, [url])).toBe(false);
  });
});
