import type { VercelResponse } from '@vercel/node';
import type { SubmissionDoc, SubmissionGrade } from '../src/lib/classroom/types.js';
import { commitSubmissionGradeChange, GradeLifecycleConflictError, removeSubmissionGradeEvidence } from './_grade-lifecycle.js';
import { syncApprovedGradeEvidence } from './_skill-profile.js';

/**
 * KHÔI PHỤC sau sự cố GHKI 23/10: một agent ngoài (OpenCode) chấm lại + lưu điểm qua API từ 04:39 tới 10:38 sáng 23/10.
 * Columbus bị ghi đè điểm; lời phê 45 bài bị hỏng chữ (U+FFFD) vì script gửi tiếng Việt sai bảng mã; lớp 12 có 4 câu bịa.
 * Nguồn khôi phục là lịch sử điểm máy chủ (`submissionGradeHistory`: mỗi lần đổi điểm cất bản TRƯỚC đó), không dùng file chụp.
 * Chủ dự án chốt 23/10:
 *  - Columbus: trả nguyên trạng trước sự cố (điểm, lời phê, bảng câu, trạng thái duyệt — hôm qua chỉ 2/26 đã duyệt); Tuệ Minh = 4,85 bút đỏ.
 *  - Olinda, lớp 12: GIỮ điểm + trạng thái duyệt hiện tại (lớp 12 là điểm bút đỏ GV), chỉ thay lời phê hỏng bằng bản sạch gần nhất.
 *  - Hải Phong: bài ghép 1da12eb5 (đủ 2 tờ, 6,9) làm bài chính, lấy lời phê sạch từ phiếu 5988c78a; 2 bài lẻ để nguyên.
 * Chỉ quản trị gọi (`_admin.ts`); xem trước rồi mới chạy; chạy theo lô; chạy lại an toàn (`ghkiRestoredAt`).
 */

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;
type HistoryEntry = { action?: string; createdAt?: string; grade?: SubmissionGrade };
type RestorableSubmission = SubmissionDoc & { ghkiRestoredAt?: string };

/** 04:00 sáng 23/10 giờ VN — trước lệnh ghi đầu tiên của agent (04:39). */
export const GHKI_CUTOFF = '2026-10-22T21:00:00.000Z';
const RESTORE_BATCH = 20;

export type GhkiMode = 'rollback' | 'text';
export const GHKI_ASSIGNMENTS: Record<string, { label: string; mode: GhkiMode }> = {
  'asg_1787d143-4d24-43a6-ae8c-d9e45a498258': { label: '11 Columbus · Thi giữa HKI', mode: 'rollback' },
  'asg_70eb10a9-912c-4551-b389-d5e43107d6c0': { label: '10 Olinda · Kiểm tra giữa HKI', mode: 'text' },
  'asg_ec30fd04-4486-47d0-aad8-a634c90cd0b5': { label: '12 · Thi GHKI', mode: 'text' },
};
/** Tuệ Minh: thầy đọc bút đỏ trên phiếu = 4,85. */
const SCORE_OVERRIDES: Record<string, number> = { 'c7fd6025-8da3-4f63-9beb-fe4a536eb42e': 4.85 };
/** Hai bài lẻ của Hải Phong để nguyên (chủ dự án chốt). */
const LEAVE_AS_IS = new Set(['5988c78a-0ca4-4b53-b3b9-c5524a74c151', 'f0bb7b6c-ee48-4c06-a8ac-3b3798518d36']);
/** Bài ghép do agent tạo chưa từng có lời phê sạch → lấy lời phê từ phiếu gốc; chỉ sửa chữ, giữ 6,9 và trạng thái duyệt. */
const TEXT_SOURCE: Record<string, string> = { '1da12eb5-a1d2-4f47-b9e0-113f5d4efc26': '5988c78a-0ca4-4b53-b3b9-c5524a74c151' };
/** Câu máy bịa ở lớp 12 (đề có 4 câu Phần II, bảng câu có 8). Bỏ dòng, không đổi điểm (điểm là bút đỏ GV). */
const FABRICATED_ROWS: Record<string, string[]> = {
  'df9ad9c6-a3c6-46df-acb8-abb9ded6678a': ['Câu 5 (Phần II)', 'Câu 6 (Phần II)', 'Câu 7 (Phần II)', 'Câu 8 (Phần II)'],
};

const TEXT_FIELDS = ['feedback', 'noteForTeacher', 'teacherNote', 'strengths', 'weaknesses', 'weakTopics'] as const;
const BROKEN = '�';
const isBroken = (value: unknown): boolean => JSON.stringify(value ?? '').includes(BROKEN);
export const gradeTextBroken = (grade: SubmissionGrade | undefined): boolean => !!grade && TEXT_FIELDS.some(field => isBroken(grade[field]));

/** Bản điểm tại mốc giờ: lần đổi ĐẦU TIÊN sau mốc đã cất bản trước nó. Không có lần đổi nào sau mốc → bài không đổi. */
export const gradeAtCutoff = (history: HistoryEntry[], cutoff = GHKI_CUTOFF): SubmissionGrade | undefined =>
  history.filter(item => item.grade && item.createdAt && item.createdAt > cutoff)
    .sort((a, b) => a.createdAt!.localeCompare(b.createdAt!))[0]?.grade;

/** Bản có lời phê sạch gần nhất trong lịch sử. */
export const latestCleanGrade = (history: HistoryEntry[]): SubmissionGrade | undefined =>
  history.filter(item => item.grade && item.createdAt && !gradeTextBroken(item.grade))
    .sort((a, b) => b.createdAt!.localeCompare(a.createdAt!))[0]?.grade;

export interface GhkiDecision {
  action: 'restore' | 'skip';
  reason: string;
  grade?: SubmissionGrade;
  removedRows?: string[];
}

/** Quyết định cho một bài — thuần, để test. `sourceHistory` chỉ dùng cho bài có TEXT_SOURCE. */
export const decideGhkiRestore = (
  submission: RestorableSubmission | null,
  history: HistoryEntry[],
  sourceHistory: HistoryEntry[] = [],
): GhkiDecision => {
  if (!submission) return { action: 'skip', reason: 'Bài nộp không còn.' };
  if (submission.ghkiRestoredAt) return { action: 'skip', reason: 'Đã khôi phục.' };
  if (LEAVE_AS_IS.has(submission.id)) return { action: 'skip', reason: 'Bài lẻ của Hải Phong — để nguyên theo chủ dự án (bài chính là bài ghép).' };
  const current = submission.grade;
  if (!current) return { action: 'skip', reason: 'Bài chưa có kết quả chấm.' };
  if (submission.status === 'grading') return { action: 'skip', reason: 'Bài đang được chấm — thử lại sau.' };
  if (!GHKI_ASSIGNMENTS[submission.assignmentId || '']) return { action: 'skip', reason: 'Không thuộc 3 bài GHKI.' };
  // Bài ghép do agent tạo SAU mốc: không có "trạng thái trước sự cố" — chỉ sửa chữ, giữ 6,9 thầy chốt.
  const mode = TEXT_SOURCE[submission.id] ? 'text' : GHKI_ASSIGNMENTS[submission.assignmentId || ''].mode;

  if (mode === 'rollback') {
    const before = gradeAtCutoff(history);
    if (!before) return { action: 'skip', reason: 'Không đổi gì từ trước sự cố.' };
    const override = SCORE_OVERRIDES[submission.id];
    const grade: SubmissionGrade = override === undefined ? before : { ...before, score: override, editedByTeacher: true };
    return { action: 'restore', reason: override === undefined ? 'Trả nguyên trạng trước sự cố (điểm, lời phê, bảng câu, trạng thái duyệt).' : `Trả nguyên trạng trước sự cố, điểm ${override} theo bút đỏ của thầy.`, grade };
  }

  const fabricated = FABRICATED_ROWS[submission.id] ?? [];
  const rows = current.questionResults ?? [];
  const removedRows = rows.filter(row => fabricated.includes(row.questionNumber)).map(row => row.questionNumber);
  const broken = gradeTextBroken(current);
  if (!broken && !removedRows.length) return { action: 'skip', reason: 'Lời phê đã sạch.' };
  const clean = broken ? latestCleanGrade(TEXT_SOURCE[submission.id] ? sourceHistory : history) : current;
  if (!clean) return { action: 'skip', reason: 'Không tìm thấy bản lời phê sạch — thầy viết lại tay.' };
  const grade: SubmissionGrade = { ...current };
  for (const field of TEXT_FIELDS) {
    if (!isBroken(current[field])) continue;
    if (clean[field] === undefined) delete (grade as Partial<SubmissionGrade>)[field];
    else (grade as unknown as Record<string, unknown>)[field] = clean[field];
  }
  if (removedRows.length) grade.questionResults = rows.filter(row => !fabricated.includes(row.questionNumber));
  const parts = [broken ? 'thay lời phê hỏng chữ bằng bản sạch gần nhất' : '', removedRows.length ? `bỏ ${removedRows.length} câu máy bịa` : ''].filter(Boolean);
  return { action: 'restore', reason: `Giữ điểm và trạng thái duyệt; ${parts.join(', ')}.`, grade, removedRows };
};

export interface GhkiPlanItem {
  submissionId: string;
  studentName: string;
  assignment: string;
  currentScore: number | null;
  newScore: number | null;
  maxScore: number | null;
  currentApproved: boolean | null;
  newApproved: boolean | null;
  currentBroken: boolean;
  newBroken: boolean;
  feedbackPreview: string;
  action: 'restore' | 'skip';
  reason: string;
}

const historyOf = async (db: Db, submissionId: string): Promise<HistoryEntry[]> =>
  (await db.collection('submissionGradeHistory').where('submissionId', '==', submissionId).get()).docs.map(doc => doc.data() as HistoryEntry);

export const handleGhkiRestore = async (db: Db, body: Body, adminUid: string, res: VercelResponse): Promise<void> => {
  const run = body.run === true;
  const names = new Map<string, Promise<string>>();
  const sourceHistories = new Map<string, Promise<HistoryEntry[]>>();
  const plan: GhkiPlanItem[] = [];
  let restored = 0;
  let failed = 0;
  for (const [assignmentId, { label }] of Object.entries(GHKI_ASSIGNMENTS)) {
    const snaps = (await db.collection('submissions').where('assignmentId', '==', assignmentId).get()).docs;
    const loaded = await Promise.all(snaps.map(async snap => {
      const submission = { ...snap.data(), id: snap.id } as RestorableSubmission;
      const source = TEXT_SOURCE[snap.id];
      if (source && !sourceHistories.has(source)) sourceHistories.set(source, historyOf(db, source));
      const [history, sourceHistory] = await Promise.all([historyOf(db, snap.id), source ? sourceHistories.get(source)! : Promise.resolve([])]);
      const key = `${submission.classId}/${submission.studentId}`;
      if (!names.has(key)) names.set(key, db.collection('classes').doc(submission.classId).collection('students').doc(submission.studentId).get().then(s => String(s.data()?.name || submission.studentId)));
      return { ref: snap.ref, submission, decision: decideGhkiRestore(submission, history, sourceHistory), studentName: await names.get(key)! };
    }));
    for (const { ref, submission, decision, studentName } of loaded.sort((a, b) => a.studentName.localeCompare(b.studentName, 'vi'))) {
      const item: GhkiPlanItem = {
        submissionId: submission.id,
        studentName,
        assignment: label,
        currentScore: submission.grade?.score ?? null,
        newScore: decision.grade?.score ?? null,
        maxScore: submission.grade?.maxScore ?? null,
        currentApproved: submission.grade ? submission.grade.teacherApproved === true : null,
        newApproved: decision.grade ? decision.grade.teacherApproved === true : null,
        currentBroken: gradeTextBroken(submission.grade),
        newBroken: gradeTextBroken(decision.grade),
        feedbackPreview: String(decision.grade?.feedback ?? submission.grade?.feedback ?? '').slice(0, 160),
        action: decision.action,
        reason: decision.reason,
      };
      plan.push(item);
      if (!run || decision.action !== 'restore' || !decision.grade || restored >= RESTORE_BATCH) continue;
      const now = new Date().toISOString();
      try {
        await commitSubmissionGradeChange(db, ref, submission, 'incident_restore', adminUid, { ...submission, status: 'graded', grade: decision.grade, updatedAt: now, ghkiRestoredAt: now } as SubmissionDoc, now);
        // Hồ sơ năng lực đã nhận weakTopics hỏng chữ / điểm sai lúc agent duyệt hàng loạt: đồng bộ lại theo bản khôi phục.
        const owner = { studentId: submission.studentId, classId: submission.classId, teacherId: submission.teacherId };
        if (decision.grade.teacherApproved) await syncApprovedGradeEvidence(db, { submissionId: submission.id, assignmentId: submission.assignmentId, grade: decision.grade, owner, now, approved: true });
        else await removeSubmissionGradeEvidence(db, submission, now);
        item.reason = 'Đã khôi phục.';
        restored += 1;
      } catch (error) {
        failed += 1;
        item.action = 'skip';
        item.reason = error instanceof GradeLifecycleConflictError ? 'Bài vừa thay đổi — thử lại.' : `Lỗi khi khôi phục: ${error instanceof Error ? error.message.slice(0, 120) : 'không rõ'}`;
      }
    }
  }
  const pending = plan.filter(item => item.action === 'restore' && item.reason !== 'Đã khôi phục.').length;
  res.status(200).json({ plan, restored, failed, pending, batch: RESTORE_BATCH });
};
