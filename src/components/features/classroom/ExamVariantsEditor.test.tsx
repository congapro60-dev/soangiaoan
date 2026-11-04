import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AssignmentDoc, SubmissionDoc } from '../../../lib/classroom/types';
import { aiErrorText, describeChange, diffVariants, gradedByCode, solveEach } from '../../../lib/classroom/examVariantDiff';
import { ExamVariantsEditor, RegradeSuggestions, removedWithGraded } from './ExamVariantsEditor';

vi.mock('../../../lib/classroom/submissionService', () => ({ updateAssignmentContent: vi.fn(async () => undefined) }));
vi.mock('../../../lib/classroom/readExamSourceFile', () => ({ readExamSourceFile: vi.fn(), renderVariantPages: vi.fn() }));
vi.mock('../../../services/gradingApi', () => ({ extractExamVariantKeys: vi.fn(), solveAnswerKey: vi.fn(), suggestRubric: vi.fn() }));

const assignment = (variants: AssignmentDoc['examVariants']): AssignmentDoc => ({
  id: 'kt-1', classId: 'lop-1', teacherId: 'gv-1', type: 'upload', title: 'Thi giữa HK1', isOpen: true,
  periodicTest: { sheetLabel: 'GHKI' },
  examVariants: variants,
} as AssignmentDoc);

const variant = (code: string, answerKey: string, sourceText = 'Đề') => ({ code, sourceText, answerKey });

let seq = 0;
const bai = (examCode: string | undefined, patch: Partial<SubmissionDoc> & { edited?: boolean; status?: SubmissionDoc['status'] } = {}): SubmissionDoc => {
  seq += 1;
  const { edited, ...rest } = patch;
  return {
    id: `s${seq}`, teacherId: 'gv-1', classId: 'lop-1', studentId: `hs${seq}`, assignmentId: 'kt-1', fileUrls: [], note: '',
    status: 'graded', examCode, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
    grade: { score: 8, maxScore: 10, feedback: '', strengths: [], weaknesses: [], gradedAt: '2026-10-01T00:00:00Z', teacherApproved: false, ...(edited ? { editedByTeacher: true } : {}) },
    ...rest,
  } as SubmissionDoc;
};

describe('sửa mã đề + đáp án của bài kiểm tra định kì', () => {
  it('hiện từng mã đề kèm ô sửa đáp án, có nút thêm mã đề và lưu', () => {
    const html = renderToStaticMarkup(<ExamVariantsEditor assignment={assignment([
      variant('101', 'Phần I – Câu 1: A', 'Câu 1: ...'),
      variant('102', 'Phần I – Câu 1: B', 'Câu 1: ...'),
    ])} />);
    expect(html).toContain('Mã đề 1');
    expect(html).toContain('value="101"');
    expect(html).toContain('value="102"');
    expect(html).toContain('Phần I – Câu 1: A');
    expect(html).toContain('Thêm mã đề');
    expect(html).toContain('Lưu mã đề + đáp án');
    expect(html).toContain('1 câu có đáp án');
  });

  it('có thả file đề/đáp án, nút AI giải đề (từng mã) và AI đề xuất hướng dẫn chấm', () => {
    const html = renderToStaticMarkup(<ExamVariantsEditor assignment={assignment([variant('101', 'Phần I – Câu 1: A')])} />);
    expect(html).toContain('Chọn hoặc kéo thả file');
    expect(html).toContain('Giải lại');
    expect(html).toContain('Để AI đề xuất');
    expect(html).toContain('type="file"');
  });

  it('báo SỚM mã sắp bỏ còn bài đã chấm (kể cả bài sửa tay), không xóa bài', () => {
    const subs = [bai('103'), bai('103', { edited: true }), bai('101')];
    expect(removedWithGraded([variant('101', 'a'), variant('103', 'b')], [{ code: '101' }], subs)).toEqual([{ code: '103', count: 2 }]);
    expect(removedWithGraded([variant('101', 'a'), variant('104', 'b')], [{ code: '101' }], subs)).toEqual([]);
  });
});

describe('diff từng mã giữa bản cũ và bản mới', () => {
  const cu = [variant('101', 'Phần I – Câu 1: A\nPhần I – Câu 2: B\nPhần I – Câu 3: C'), variant('102', 'Câu 1: A\nCâu 2: B')];

  it('đáp án đổi / thêm / bớt câu', () => {
    const moi = [variant('101', 'Phần I – Câu 1: A\nPhần I – Câu 2: D\nPhần I – Câu 3: D\nPhần I – Câu 4: A'), variant('102', 'Câu 1: A')];
    const [m101, m102] = diffVariants(cu, moi);
    expect(m101).toMatchObject({ code: '101', kind: 'changed', changed: 2, added: 1, removed: 0 });
    expect(describeChange(m101)).toBe('đổi 2 câu đáp án, thêm 1 câu');
    expect(m102).toMatchObject({ code: '102', kind: 'changed', changed: 0, removed: 1 });
    expect(describeChange(m102)).toBe('bớt 1 câu');
  });

  it('khoảng trắng, xuống dòng thừa không tính là đổi', () => {
    const [m101, m102] = diffVariants(cu, [variant('101', '  Phần I – Câu 1:   A \n\nPhần I – Câu 2: B\r\nPhần I – Câu 3: C  '), variant('102', 'Câu 1: A\nCâu 2: B')]);
    expect(m101.kind).toBe('same');
    expect(m102.kind).toBe('same');
    expect(describeChange(m101)).toBe('không đổi');
  });

  it('mã thêm và mã bỏ', () => {
    const rows = diffVariants(cu, [variant('101', cu[0].answerKey), variant('103', 'Câu 1: A\nCâu 2: B')]);
    expect(rows.map(row => [row.code, row.kind])).toEqual([['101', 'same'], ['103', 'added'], ['102', 'removed']]);
    expect(describeChange(rows[1])).toBe('mã mới');
    expect(describeChange(rows[2])).toBe('mã bị bỏ');
  });

  it('đổi hướng dẫn chấm làm mọi mã còn lại thành "đổi"', () => {
    const rows = diffVariants(cu, cu, true);
    expect(rows.every(row => row.kind === 'changed')).toBe(true);
    expect(describeChange(rows[0])).toBe('đổi hướng dẫn chấm');
  });

  it('câu tự luận nhiều dòng: dòng nối thuộc về câu đó', () => {
    const a = [variant('101', 'Câu 1 (tự luận): bước 1\nbước 2')];
    const b = [variant('101', 'Câu 1 (tự luận): bước 1\nbước 2 khác')];
    expect(diffVariants(a, b)[0]).toMatchObject({ kind: 'changed', changed: 1, added: 0, removed: 0 });
  });
});

describe('bảng gợi ý chấm lại theo mã', () => {
  it('chỉ đếm bài đã chấm bằng AI, theo từng mã; bài sửa tay giữ nguyên', () => {
    const subs = [
      bai('101'), bai('101'), bai('101', { edited: true }),
      bai('101', { status: 'submitted', grade: undefined }),
      bai('102'),
      bai(undefined),
    ];
    expect(gradedByCode(subs, '101')).toMatchObject({ edited: 1 });
    expect(gradedByCode(subs, '101').ai).toHaveLength(2);
    expect(gradedByCode(subs, '102').ai).toHaveLength(1);
    expect(gradedByCode(subs, '103').ai).toHaveLength(0);

    const changes = diffVariants([variant('101', 'Câu 1: A'), variant('102', 'Câu 1: A')], [variant('101', 'Câu 1: B'), variant('102', 'Câu 1: A'), variant('103', 'Câu 1: A')]);
    const html = renderToStaticMarkup(<RegradeSuggestions changes={changes} submissions={subs} onRegrade={() => undefined} />);
    expect(html).toContain('đổi 1 câu đáp án');
    expect(html).toContain('2 bài');
    expect(html).toContain('+1 bài sửa tay, giữ nguyên');
    expect(html).toContain('Chấm lại mã 101');
    expect(html).not.toContain('Chấm lại mã 102');
    expect(html).not.toContain('Chấm lại mã 103');
    expect(html).toContain('0 (chưa có bài chấm)');
    expect(html).toContain('2 bài AI sẽ chấm lại theo mã đã chọn');
  });

  it('mã bị bỏ còn bài đã chấm → cảnh báo đậm, không có nút chấm lại', () => {
    const subs = [bai('102'), bai('102', { edited: true })];
    const changes = diffVariants([variant('101', 'Câu 1: A'), variant('102', 'Câu 1: A')], [variant('101', 'Câu 1: A')]);
    const html = renderToStaticMarkup(<RegradeSuggestions changes={changes} submissions={subs} onRegrade={() => undefined} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Mã 102 đã bỏ nhưng còn 2 bài đã chấm');
    expect(html).toContain('KHÔNG bị xóa');
    expect(html).not.toContain('Chấm lại mã 102');
  });

  it('không mã nào đổi thì không có nút; không đổi gì thì không hiện bảng', () => {
    const same = diffVariants([variant('101', 'Câu 1: A')], [variant('101', 'Câu 1: A')]);
    const html = renderToStaticMarkup(<RegradeSuggestions changes={same} submissions={[bai('101')]} onRegrade={() => undefined} />);
    expect(html).toContain('không đổi');
    expect(html).not.toContain('Chấm lại mã');
    expect(renderToStaticMarkup(<RegradeSuggestions changes={[]} submissions={[]} />)).toBe('');
  });
});

describe('lỗi AI báo sạch', () => {
  it('lỗi một mã không làm hỏng mã sau, thông báo ngắn kèm tên mã', async () => {
    const solved: string[] = [];
    const out = await solveEach(['101', '102', '103'], async code => {
      if (code === '102') throw new Error('AI chưa có endpoint giải đề.\n    at stack trace');
      solved.push(code);
    });
    expect(solved).toEqual(['101', '103']);
    expect(out.failed).toEqual(['102']);
    expect(out.errors).toEqual(['Mã 102: AI chưa có endpoint giải đề.']);
  });

  it('giá trị lạ (không phải Error) không lộ "[object Object]"', () => {
    expect(aiErrorText({ status: 500 })).toBe('AI chưa trả lời được. Thử lại sau ít phút.');
    expect(aiErrorText(undefined, '101')).toBe('Mã 101: AI chưa trả lời được. Thử lại sau ít phút.');
    expect(aiErrorText(new Error('x'.repeat(500))).length).toBeLessThanOrEqual(200);
  });
});
