import type { VercelResponse } from '@vercel/node';
import type { QuestionResult, SubmissionDoc, SubmissionGrade } from '../src/lib/classroom/types.js';
import { questionKey } from '../src/lib/classroom/questionRescore.js';
import { commitSubmissionGradeChange, GradeLifecycleConflictError, removeSubmissionGradeEvidence } from './_grade-lifecycle.js';
import { syncApprovedGradeEvidence } from './_skill-profile.js';

/**
 * KHÔI PHỤC sau sự cố 15–16/10: job "làm mới dấu trên ảnh" (`photo-refresh-20261015-*`) đã chấm lại toàn bộ bài thay vì
 * chỉ thêm dấu. Trả lại grade trước đợt chạy (lấy từ lịch sử `ai_regrade` mà chính lượt chấm lại đã ghi), GIỮ dấu trên ảnh
 * mới tạo. Không đụng bài thầy cô đã SỬA TAY sau đợt chạy. Bài được duyệt sau đợt (kể cả nguồn 'teacher') vẫn khôi phục.
 * Chủ dự án duyệt 17/10. Chỉ quản trị gọi (`_admin.ts`), xem trước rồi mới chạy, chạy theo lô.
 */

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

export const REFRESH_JOB_PREFIX = 'photo-refresh-20261015';
const RESTORE_BATCH = 20;

/**
 * Bài chủ dự án soát ảnh 17/10 thấy lần chấm lại đúng hơn → giữ điểm mới, không khôi phục (thầy cô duyệt lại).
 * Nhóm Hình học 29/09: hai lần đọc như nhau, lần chấm lại theo thang Đúng/Sai THPT đã chốt (1 ý 0,1 · 2 ý 0,25 · 3 ý 0,5 · 4 ý trọn).
 */
export const KEEP_REGRADE = new Set([
  'sub_dc2eeab1-d05a-403a-887f-2196a1fb8bea', // Linh Chi — Đại số 25/09
  'sub_1eddb6ae-fc69-42f9-b9ed-362d873698d6', // Linh Chi — Đại số 25/09
  'sub_2b0f0d5e-3844-4936-b52a-4be39c758e99', // Nam Phong — Đại số 25/09
  'sub_c165971b-cbe2-4c90-a2bc-ea290181d8a7', // Bảo Nam — Hình học 24/09
  'sub_b8f2c47f-b714-4714-b422-8ac16ef1e327', // Nam Phong — Hình học 10/09
  'sub_89fc0482-6446-4a13-a02e-6c9a44d41992', // Phúc Minh — GHK I ĐC1 (câu 5 em khoanh B: thầy cô sửa tay)
  'sub_16637666-f22c-4d1b-b6f3-0886c168393a', // Hình học 29/09 (12 bài)
  'sub_2160c53c-1c60-4ac8-869f-711bb826b0ab',
  'sub_320ecaff-ac1f-4516-acbf-99ea3c45bc72',
  'sub_4da13ac9-915d-4811-8376-b9a1e1148d7c',
  'sub_521ac101-d865-4107-8254-b02d437e370c',
  'sub_934c7abb-ab4a-4183-ad59-e0927498a7de',
  'sub_f0c98aec-0f02-484c-abc1-2569056104bf',
  'sub_f77c4bc1-145c-45f9-b518-15ac658e3326',
  'sub_511a70eb-335d-4476-9989-0441e2cb32db',
  'sub_77651a88-f399-408f-9338-71b2a6c97320',
  'sub_a343fb96-17c3-4f54-a4e2-22eff20b3590',
  'sub_d3737b09-85cc-41f6-9537-4c8f7c735ede',
]);

export type RestoreAction = 'restore' | 'skip';

export interface RestorePlanItem {
  submissionId: string;
  classId: string;
  studentId: string;
  studentName: string;
  assignmentTitle: string;
  oldScore: number | null;
  currentScore: number | null;
  maxScore: number | null;
  oldApproved: boolean | null;
  currentApproved: boolean | null;
  action: RestoreAction;
  reason: string;
}

/** Ghép dấu trên ảnh của bảng câu hiện tại vào bảng câu cũ, theo nhãn câu. Không đổi gì khác của bảng cũ. */
export const withCurrentMarks = (oldRows: QuestionResult[], currentRows: QuestionResult[]): QuestionResult[] => {
  const byKey = new Map(currentRows.map(row => [questionKey(row.questionNumber), row]));
  return oldRows.map(row => {
    if (row.photoMarksCleared) return row;
    const current = byKey.get(questionKey(row.questionNumber));
    if (!current) return row;
    return {
      ...row,
      ...(current.photoMarks?.length ? { photoMarks: current.photoMarks } : {}),
      ...(current.readingRegions?.length ? { readingRegions: current.readingRegions } : {}),
    };
  });
};

/** Quyết định cho một bài: thuần, để test. `history` = các bản grade cũ máy đã lưu khi chấm lại bài này. */
export const decideRestore = (
  submission: (SubmissionDoc & { refreshRestoredAt?: string }) | null,
  history: { action?: string; createdAt?: string; grade?: SubmissionGrade }[],
): { action: RestoreAction; reason: string; oldGrade?: SubmissionGrade } => {
  if (!submission) return { action: 'skip', reason: 'Bài nộp không còn.' };
  if (submission.refreshRestoredAt) return { action: 'skip', reason: 'Đã khôi phục.' };
  const current = submission.grade;
  if (!current) return { action: 'skip', reason: 'Bài không còn kết quả chấm.' };
  if (submission.status === 'grading') return { action: 'skip', reason: 'Bài đang được chấm — thử lại sau.' };
  // Lượt chấm lại của job ghi lịch sử và grade mới CÙNG một mốc giờ; bài bị chấm / sửa thêm sau đó thì mốc lệch.
  const regrade = history.find(item => item.action === 'ai_regrade' && item.createdAt === current.gradedAt && item.grade);
  if (!regrade?.grade) return { action: 'skip', reason: 'Bài đã được chấm hoặc sửa lại sau đợt chạy — giữ kết quả hiện tại.' };
  if (current.editedByTeacher) return { action: 'skip', reason: 'Thầy cô đã sửa tay sau đợt chạy — giữ kết quả của thầy cô.' };
  if (KEEP_REGRADE.has(submission.id)) return { action: 'skip', reason: 'Đã soát ảnh: lần chấm lại đúng hơn — giữ điểm mới, thầy cô duyệt lại.', oldGrade: regrade.grade };
  // Duyệt sau đợt chạy (kể cả "teacher") vẫn khôi phục: chủ dự án xác nhận 17/10 là bấm duyệt hàng loạt, không biết điểm đã bị chấm lại.
  return { action: 'restore', reason: 'Trả lại điểm, nhận xét, trạng thái duyệt trước đợt chạy; giữ dấu trên ảnh.', oldGrade: regrade.grade };
};

const graded = async (db: Db): Promise<string[]> => {
  const jobs = (await db.collection('gradingRefreshJobs').get()).docs.filter(doc => doc.id.startsWith(REFRESH_JOB_PREFIX));
  const ids = new Set<string>();
  for (const job of jobs) {
    const items = await job.ref.collection('items').where('status', '==', 'graded').get();
    for (const item of items.docs) ids.add(item.id);
  }
  return [...ids].sort();
};

const historyOf = async (db: Db, submissionId: string) =>
  (await db.collection('submissionGradeHistory').where('submissionId', '==', submissionId).get()).docs.map(doc => doc.data() as { action?: string; createdAt?: string; grade?: SubmissionGrade });

interface Loaded {
  id: string;
  ref: FirebaseFirestore.DocumentReference;
  submission: (SubmissionDoc & { refreshRestoredAt?: string }) | null;
  decision: ReturnType<typeof decideRestore>;
  studentName: string;
  assignmentTitle: string;
}

const READ_CONCURRENCY = 10;

const load = async (db: Db, id: string, names: Map<string, Promise<string>>, titles: Map<string, Promise<string>>): Promise<Loaded> => {
  const ref = db.collection('submissions').doc(id);
  const snap = await ref.get();
  const submission = snap.exists ? ({ ...snap.data(), id } as SubmissionDoc & { refreshRestoredAt?: string }) : null;
  const decision = decideRestore(submission, submission ? await historyOf(db, id) : []);
  let studentName = '';
  let assignmentTitle = '';
  if (submission) {
    const key = `${submission.classId}/${submission.studentId}`;
    if (!names.has(key)) names.set(key, db.collection('classes').doc(submission.classId).collection('students').doc(submission.studentId).get().then(s => String(s.data()?.name || submission.studentId)));
    studentName = await names.get(key)!;
    if (submission.assignmentId) {
      if (!titles.has(submission.assignmentId)) titles.set(submission.assignmentId, db.collection('assignments').doc(submission.assignmentId).get().then(s => String(s.data()?.title || '')));
      assignmentTitle = await titles.get(submission.assignmentId)!;
    }
  }
  return { id, ref, submission, decision, studentName, assignmentTitle };
};

export const handleRefreshRestore = async (db: Db, body: Body, adminUid: string, res: VercelResponse): Promise<void> => {
  const run = body.run === true;
  const ids = await graded(db);
  const names = new Map<string, Promise<string>>();
  const titles = new Map<string, Promise<string>>();
  const loaded: Loaded[] = [];
  for (let i = 0; i < ids.length; i += READ_CONCURRENCY) {
    loaded.push(...await Promise.all(ids.slice(i, i + READ_CONCURRENCY).map(id => load(db, id, names, titles))));
  }
  let restored = 0;
  let failed = 0;
  const plan: RestorePlanItem[] = [];
  for (const { id, ref, submission, decision, studentName, assignmentTitle } of loaded) {
    const item: RestorePlanItem = {
      submissionId: id,
      classId: submission?.classId || '',
      studentId: submission?.studentId || '',
      studentName,
      assignmentTitle,
      oldScore: decision.oldGrade?.score ?? null,
      currentScore: submission?.grade?.score ?? null,
      maxScore: submission?.grade?.maxScore ?? null,
      oldApproved: decision.oldGrade ? decision.oldGrade.teacherApproved === true : null,
      currentApproved: submission?.grade ? submission.grade.teacherApproved === true : null,
      action: decision.action,
      reason: decision.reason,
    };
    plan.push(item);
    if (!run || decision.action !== 'restore' || !submission || !decision.oldGrade || restored >= RESTORE_BATCH) continue;
    const now = new Date().toISOString();
    const grade: SubmissionGrade = {
      ...decision.oldGrade,
      questionResults: withCurrentMarks(decision.oldGrade.questionResults || [], submission.grade?.questionResults || []),
    };
    try {
      await commitSubmissionGradeChange(db, ref, submission, 'refresh_restore', adminUid, { ...submission, status: 'graded', grade, updatedAt: now, refreshRestoredAt: now } as SubmissionDoc, now);
      const owner = { studentId: submission.studentId, classId: submission.classId, teacherId: submission.teacherId };
      if (grade.teacherApproved) await syncApprovedGradeEvidence(db, { submissionId: id, assignmentId: submission.assignmentId, grade, owner, now, approved: true });
      else await removeSubmissionGradeEvidence(db, submission, now);
      item.reason = 'Đã khôi phục.';
      restored += 1;
    } catch (error) {
      failed += 1;
      item.action = 'skip';
      item.reason = error instanceof GradeLifecycleConflictError ? 'Bài vừa thay đổi — thử lại.' : `Lỗi khi khôi phục: ${error instanceof Error ? error.message.slice(0, 120) : 'không rõ'}`;
    }
  }
  const pending = plan.filter(item => item.action === 'restore' && item.reason !== 'Đã khôi phục.').length;
  res.status(200).json({ plan, restored, failed, pending, batch: RESTORE_BATCH });
};
