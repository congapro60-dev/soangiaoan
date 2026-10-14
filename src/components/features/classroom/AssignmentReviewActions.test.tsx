import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssignmentDoc, SubmissionDoc } from '../../../lib/classroom/types';
const view = vi.hoisted(() => ({ index: 0, values: [] as unknown[], annotate: vi.fn(), solutions: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useState: (initial: unknown) => {
  const index = view.index++;
  if (!(index in view.values)) view.values[index] = initial;
  return [view.values[index], (next: unknown) => { view.values[index] = next; }];
} }));
vi.mock('../../../services/submissionActorsApi', () => ({ annotateSubmissionPhotos: view.annotate, prepareWorkedSolutions: view.solutions, setSubmissionLock: vi.fn() }));
vi.mock('../../../utils/fileUtils', () => ({}));
vi.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {} }));
import { AnnotateSubmissionPhotosButton, WorkedSolutionsButton } from './AssignmentPanel';
const submission = { id: 's', classId: 'c', studentId: 'student', status: 'graded', fileUrls: ['https://example.test/work.jpg'], grade: { teacherApproved: true, score: 8, questionResults: [{ questionNumber: 'Câu 1', studentAnswer: '2', status: 'incorrect' }] } } as SubmissionDoc;
beforeEach(() => { view.index = 0; view.values = []; view.annotate.mockReset(); view.solutions.mockReset(); });
it('GV thêm vị trí trên bài đã duyệt không gọi chấm lại, báo rõ vùng chưa định vị', async () => {
  view.annotate.mockResolvedValue({ mapped: 2, unlocated: 1, total: 3 });
  const onChanged = vi.fn();
  const element = AnnotateSubmissionPhotosButton({ submission, onChanged });
  const button = element!.props.children[0];
  button.props.onClick();
  await vi.waitFor(() => expect(view.values[0]).toBe(false));
  expect(view.annotate).toHaveBeenCalledWith({ role: 'teacher', classId: 'c', studentId: 'student' }, 's');
  expect(view.values[1]).toContain('2/3');
  expect(view.values[1]).toContain('1 câu chưa có vị trí');
  expect(onChanged).toHaveBeenCalledOnce();
});
it('không khôi phục dấu GV đã bỏ hoặc hiện nút khi thiếu ảnh/kết quả', () => {
  for (const row of [{ ...submission, fileUrls: [] }, { ...submission, grade: undefined }, { ...submission, grade: { ...submission.grade!, questionResults: [{ ...submission.grade!.questionResults![0], photoMarksCleared: true }] } }]) {
    expect(renderToStaticMarkup(<AnnotateSubmissionPhotosButton submission={row} onChanged={() => undefined} />)).toBe('');
    view.index = 0; view.values = [];
  }
});
it('lời giải thiếu câu không thông báo đã tạo đầy đủ', async () => {
  view.solutions.mockResolvedValue({ cache: { status: 'incomplete', questions: [{ questionNumber: 'Câu 1', status: 'ready', workedSolution: 'Lời giải' }, { questionNumber: 'Câu 2', status: 'unavailable', workedSolution: '' }] } });
  const element = WorkedSolutionsButton({ assignment: { id: 'a' } as AssignmentDoc, classId: 'c', studentId: 'student', onChanged: vi.fn() });
  element.props.children[2].props.onClick();
  await vi.waitFor(() => expect(view.values[1]).toBe(false));
  expect(view.values[2]).toContain('1/2');
  expect(view.values[2]).toContain('Câu 2');
  expect(view.values[2]).not.toContain('Đã tạo lời giải.');
});
