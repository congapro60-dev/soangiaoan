import { beforeEach, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ token: vi.fn(async () => 'teacher-token'), rows: [] as any[] }));
vi.mock('../lib/firebase', () => ({ auth: { currentUser: { getIdToken: h.token } }, db: {} }));
vi.mock('firebase/firestore', async importOriginal => ({ ...await importOriginal<typeof import('firebase/firestore')>(), collection: vi.fn(), doc: vi.fn(), query: vi.fn(), where: vi.fn(), getDoc: async () => ({ exists: () => true, data: () => ({ questions: [{ id: 'essay', type: 'essay', points: 8 }] }) }), getDocs: async () => ({ forEach: (visit: any) => h.rows.forEach(data => visit({ data: () => data })) }) }));
import { gradeExamSubmission, getSubmissions } from './useExams';
import { verifySubmissionScore } from '../utils/examScoring';
beforeEach(() => { h.token.mockClear(); vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ id: 's', status: 'graded', totalScore: 2 }) }))); });
it('public student autograde sends its nonce, never teacher credentials', async () => {
  await gradeExamSubmission('s', '0123456789abcdef0123456789abcdef');
  expect(h.token).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledWith('/api/exam', expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId: 's', clientNonce: '0123456789abcdef0123456789abcdef' }) }));
});
it('teacher grading sends Firebase Bearer authentication', async () => {
  await gradeExamSubmission('s'); expect(h.token).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith('/api/exam', expect.objectContaining({ headers: { 'Content-Type': 'application/json', Authorization: 'Bearer teacher-token' } }));
});
it('teacher reader cannot promote forged student essay or unknown score into an official grade', async () => {
  h.rows = [{ id: 's', status: 'submitted', totalScore: 99, answers: [{ questionId: 'essay', answer: 'x', aiScore: 8, aiFeedback: 'fake' }, { questionId: 'unknown', answer: 'y', autoScore: 100 }] }];
  const [submission] = await getSubmissions('e'); expect(submission.totalScore).toBeUndefined(); expect(submission.requiresScoreReview).toBe(true);
  const verified = verifySubmissionScore([{ id: 'essay', content: '', type: 'essay', points: 8 }], submission.answers, submission.totalScore);
  expect(verified.totalScore).toBe(0); expect(verified.answers).toEqual([{ questionId: 'essay', answer: 'x' }]);
});
it('teacher reader preserves trusted server and legacy teacher grades', async () => {
  const answers = [{ questionId: 'essay', answer: 'x', aiScore: 7 }];
  h.rows = [{ id: 's', status: 'submitted', publicAutoGradedAt: 'server', totalScore: 7, answers }, { id: 'legacy', status: 'graded', totalScore: 7, answers }];
  expect((await getSubmissions('e')).map(sub => sub.totalScore)).toEqual([7, 7]);
});
