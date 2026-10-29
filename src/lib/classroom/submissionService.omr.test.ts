import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ scan: vi.fn(), upload: vi.fn(), submit: vi.fn() }));
vi.mock('../../services/submissionActorsApi', () => ({ uploadActorEvidence: mocks.upload, submitActorSubmission: mocks.submit }));
vi.mock('../../utils/imageCompress', () => ({ quetAnhVaPhieu: mocks.scan, nenAnhBaiLam: vi.fn() }));
vi.mock('../firebase', () => ({ auth: { currentUser: { uid: 'student' } }, storage: {}, removeUndefinedFields: (value: unknown) => value }));
import { submitHomework } from './submissionService';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.upload.mockResolvedValue('grant');
  mocks.submit.mockResolvedValue({ submission: { id: 'submission' } });
});
it('nộp ảnh đã scan kèm kết quả dò phiếu, không base64', async () => {
  const image = new File(['image'], 'paper.jpg', { type: 'image/jpeg' });
  const scanned = new File(['scan'], 'paper-scan.jpg', { type: 'image/jpeg' });
  const omrSheet = { form: 'k12', examCode: '102', mcq: [{ q: 1, answer: 'B', confidence: .95 }] };
  mocks.scan.mockResolvedValue({ files: [scanned], omrSheet, detectedAnswers: [] });
  await submitHomework({ classId: 'c', studentId: 's', teacherId: 't', assignmentId: 'a', images: [image] });
  expect(mocks.scan).toHaveBeenCalledWith([image]);
  expect(mocks.upload).toHaveBeenCalledWith({ role: 'student' }, 'a', [scanned]);
  expect(mocks.submit).toHaveBeenCalledWith({ role: 'student' }, expect.objectContaining({ omrSheet, detectedAnswers: [], uploadGrantId: 'grant' }));
});
it('không nhận ra phiếu: không gửi omrSheet, vẫn gửi [] để server gắn cờ fallback', async () => {
  mocks.scan.mockResolvedValue({ files: [], omrSheet: null, detectedAnswers: [] });
  await submitHomework({ classId: 'c', studentId: 's', teacherId: 't', assignmentId: 'a', images: [], rawFiles: [new File(['pdf'], 'paper.pdf')] });
  const payload = mocks.submit.mock.calls[0][1];
  expect(payload).toMatchObject({ detectedAnswers: [] });
  expect(payload).not.toHaveProperty('omrSheet');
});
