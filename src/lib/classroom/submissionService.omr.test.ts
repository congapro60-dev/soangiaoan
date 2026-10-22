import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ detect: vi.fn(), upload: vi.fn(), submit: vi.fn() }));
vi.mock('../../services/submissionActorsApi', () => ({ uploadActorEvidence: mocks.upload, submitActorSubmission: mocks.submit }));
vi.mock('../../utils/imageCompress', () => ({ detectAnswersFromFiles: mocks.detect, nenAnhBaiLam: vi.fn() }));
vi.mock('../firebase', () => ({ auth: { currentUser: { uid: 'student' } }, storage: {}, removeUndefinedFields: (value: unknown) => value }));
import { submitHomework } from './submissionService';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.upload.mockResolvedValue('grant');
  mocks.submit.mockResolvedValue({ submission: { id: 'submission' } });
});
it('nộp File kèm đáp án dò được, không base64', async () => {
  const image = new File(['image'], 'paper.jpg', { type: 'image/jpeg' });
  const detectedAnswers = [{ questionNo: 1, answer: 'B', confidence: .95 }];
  mocks.detect.mockResolvedValue(detectedAnswers);
  await submitHomework({ classId: 'c', studentId: 's', teacherId: 't', assignmentId: 'a', images: [image] });
  expect(mocks.detect).toHaveBeenCalledWith([image]);
  expect(mocks.upload).toHaveBeenCalledWith({ role: 'student' }, 'a', [image]);
  expect(mocks.submit).toHaveBeenCalledWith({ role: 'student' }, expect.objectContaining({ detectedAnswers, uploadGrantId: 'grant' }));
});
it('không nhận ra lưới vẫn gửi [] để server gắn cờ fallback', async () => {
  mocks.detect.mockResolvedValue([]);
  await submitHomework({ classId: 'c', studentId: 's', teacherId: 't', assignmentId: 'a', images: [], rawFiles: [new File(['pdf'], 'paper.pdf')] });
  expect(mocks.submit).toHaveBeenCalledWith({ role: 'student' }, expect.objectContaining({ detectedAnswers: [] }));
});
