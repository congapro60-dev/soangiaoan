/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb, getAdminStorage } from './_exam-core.js';
import { createAiUsageContext, runWithAiUsage } from './_ai-usage.js';
import { handleAdminAction } from './_admin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { uniqueStoragePaths } from './_classroom-storage.js';
import { removeEvidence } from '../src/lib/classroom/profileMerge.js';
import { mergeSubmissionEvidence } from '../src/lib/classroom/submissionRevision.js';
import { buildHomeworkSkillEvidence } from '../src/lib/learning/skillProfile.js';
import { buildManualGrade, type ManualGradeInput } from '../src/lib/classroom/manualGrade.js';
import { applyAnswerKeyFixes, questionKey, recomputeTotal } from '../src/lib/classroom/questionRescore.js';
import type {
  AnswerKeyFix,
  ProfileTopic,
  StudentActivityExportBundle,
  StudentAssignmentView,
  SubmissionDoc,
  SubmissionGrade,
} from '../src/lib/classroom/types.js';
import {
  EMPTY_LOCK,
  JOIN_CODE_DUPLICATE_MESSAGE,
  attemptPin,
  createPin,
  hashPin,
  isValidPinShape,
  lookupClassByJoinCode,
  normalizeJoinCode,
} from './_classroom-core.js';
import {
  removeSkillEvidenceAndRebuild,
  replaceSkillEvidenceAndRebuild,
  syncApprovedGradeEvidence,
} from './_skill-profile.js';
import {
  commitSubmissionGradeChange,
  GradeLifecycleConflictError,
  removeSubmissionGradeEvidence,
  submissionWithoutGrade,
} from './_grade-lifecycle.js';
import { stripUndefinedDeep } from './_firestore-sanitize.js';
import { handleTeacherAction } from './_classroom-teacher.js';
import { readClassAccess } from './_classroom-access.js';
import { handleClassroomOnlineAction } from './_classroom-online.js';
import { handleScoreBookAction } from './_score-book.js';
import { handleParentReportAction } from './_parent-report.js';
import { handleSsmTemplateAction } from './_ssm-template.js';
import { handleTimetableAction } from './_timetable.js';
import { handlePortfolioAction } from './_portfolio.js';
import { AiKeyRequiredError, aiKeyRequiredPayload, handleAiKeyAction } from './_ai-keys.js';
import { handleAiBillingAction } from './_ai-billing.js';
import { handleAdminLinkAction } from './_admin-link.js';
import { handleParentPortalAction, purgeParentData } from './_parent-portal.js';
import { handleStudentAiCostAction } from './_student-ai-cost.js';
import { handleSepayWebhook } from './_ai-wallet.js';

/**
 * Một hàm phục vụ các việc sau, để không vượt trần 12 Serverless Function của Vercel:
 *
 *   POST { action: 'roster', joinCode }                     → danh sách tên để học sinh chọn
 *   POST { action: 'login', joinCode, studentId, pin, idToken } → gắn phiên vào studentLinks/{uid}
 *   POST { action: 'studentAssignments', idToken }           → projection assignment an toàn cho học sinh
 *   POST { action: 'studentSubmissions', idToken }            → projection bài nộp không có ghi chú nội bộ
 *   POST { action: 'issuePins', classId, idToken }          → giáo viên cấp PIN cho cả lớp
 *   POST { action: 'resetOnePin', classId, studentId, idToken } → cấp lại PIN cho MỘT em
 *   POST { action: 'viewPin', classId, studentId, idToken } → giáo viên xem PIN ĐANG DÙNG của một em
 *   POST { action: 'revokeStudentAccess', classId, studentId, idToken } → xoá học sinh khỏi server + thu hồi đăng nhập
 *   POST { action: 'revokeClass', classId, idToken } → gỡ toàn bộ dữ liệu lớp khỏi server (roster/secret/link)
 *   POST { action: 'createSupplementSubmission', submission, idToken } → tạo revision ghép bài
 *   POST { action: 'deleteSubmission', submissionId, idToken } → xoá bài nộp và file Storage
 *   POST { action: 'saveSubmissionGrade', submissionId, grade, idToken } → lưu chấm tay
 *   POST { action: 'fixAnswerKeyForClass', assignmentId, questionNumber, expectedAnswer, idToken } → sửa đáp án 1 câu, tính lại cả lớp
 *   POST { action: 'deleteSubmissionGrade', submissionId, idToken } → xoá kết quả chấm, giữ bài nộp
 *   POST { action: 'approveSubmissionGrade', submissionId, approved, idToken } → duyệt/bỏ duyệt
 *   POST { action: 'deleteAssignment', assignmentId, idToken } → xoá bài giao và file đề
 *   Sổ điểm (xem `_score-book.ts`): teacherScoreBook / saveHs1Column / deleteHs1Column / saveExamScores
 *   cho giáo viên thuộc lớp, studentScoreBook cho học sinh (chỉ dòng của chính mình).
 *   Khoá AI (xem `_ai-keys.ts`): aiKeyStatus / saveAiKey / deleteAiKey / setAiConsent / setAiSpendCap cho giáo viên;
 *   redeemVoucher (mã giảm giá); sao kê ví AI (xem `_ai-billing.ts`): aiStatement (chỉ của chính mình).
 *   POST /api/classroom?hook=sepay → webhook SePay cộng tiền nạp vào ví (xác thực `Apikey SEPAY_WEBHOOK_KEY`).
 *
 * Vì sao phải đi qua server thay vì để client đọc thẳng Firestore:
 *  - PIN nằm ở `studentSecrets`, rules cấm MỌI client đọc. Chỉ Admin SDK kiểm được.
 *  - `studentLinks` cũng cấm client ghi. Cho client tự ghi là cho nó tự nhận là bất kỳ ai.
 *  - Danh sách tên học sinh không mở ở tầng rules; chỉ trả qua đây sau khi mã lớp đúng.
 *
 * PIN chỉ 4 số nên KHOÁ SAU 5 LẦN SAI là hàng rào thật, không phải tính năng thêm.
 * Từ 2026-08-22 máy chủ lưu THÊM bản PIN thô (`pinPlain`) cạnh bản băm: chủ dự án chốt rằng
 * giáo viên phải xem lại được mã đang dùng mọi lúc. Với mã 4 số thì băm vốn không chống nổi
 * vét cạn (chỉ 10.000 khả năng), nên rủi ro cộng thêm là không đáng kể so với giá trị sử dụng;
 * client vẫn không đọc trực tiếp được document bí mật, chỉ lấy qua API đã xác thực chủ lớp.
 */

const readBody = (req: VercelRequest): Record<string, unknown> => {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  try {
    return JSON.parse(String(req.body || '{}'));
  } catch {
    return {};
  }
};

const uidFromIdToken = async (idToken: unknown): Promise<string | null> => {
  if (typeof idToken !== 'string' || !idToken) return null;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
};

/** Kiểm tra namespace legacy sau khi đã kiểm tra membership của lớp. */
const teacherCanAccessClass = async (
  db: FirebaseFirestore.Firestore,
  uid: string,
  classId: unknown,
  legacyTeacherId: unknown,
): Promise<boolean> => {
  const normalizedClassId = typeof classId === 'string' ? classId.trim() : '';
  const legacyUid = typeof legacyTeacherId === 'string' ? legacyTeacherId.trim() : '';
  if (!normalizedClassId) return legacyUid === uid;
  const classAccess = await readClassAccess(db, normalizedClassId, uid);
  // Bài legacy mồ côi không còn document lớp vẫn giữ namespace teacherId cũ. Không
  // mở rộng quyền trong ca này; chỉ giữ tương thích với hành vi owner cũ.
  return classAccess ? classAccess.data.teacherId === legacyUid : legacyUid === uid;
};

const urlsFromValue = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (typeof item === 'string') return [item];
    if (item && typeof item === 'object' && typeof (item as { url?: unknown }).url === 'string') {
      return [(item as { url: string }).url];
    }
    return [];
  });
};

/**
 * Lỗi DỮ LIỆU xác định: URL không nhận diện được thì thử lại bao nhiêu lần cũng vậy.
 * Phải trả nguyên văn message về giáo viên — nếu lọt vào catch tổng 500 "thử lại sau
 * ít phút" thì giáo viên ngồi retry vô vọng mà không biết mình phải làm gì khác.
 */
class StorageCleanupError extends Error {}

const deleteStorageFiles = async (urls: string[]): Promise<number> => {
  const bucket = getAdminStorage();
  const rawUrls = [...new Set(urls.map(url => url.trim()).filter(Boolean))];
  const paths = uniqueStoragePaths(rawUrls, bucket.name);
  if (paths.length !== rawUrls.length) {
    throw new StorageCleanupError('Không xác định được đường dẫn file Storage để dọn an toàn.');
  }

  await Promise.all(paths.map(async path => {
    try {
      await bucket.file(path).delete();
    } catch (error) {
      const code = String((error as { code?: unknown })?.code || '');
      // Xoá lặp lại là an toàn: object đã mất được coi là đã dọn xong.
      if (code !== '404' && code !== 'storage/object-not-found') throw error;
    }
  }));
  return paths.length;
};

const handleDeleteSubmission = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });

  const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : '';
  if (!submissionId) return res.status(400).json({ error: 'Thiếu mã bài nộp.' });

  const submissionRef = db.collection('submissions').doc(submissionId);
  const submissionSnap = await submissionRef.get();
  if (!submissionSnap.exists) return res.status(404).json({ error: 'Bài nộp không còn tồn tại.' });

  const submission = submissionSnap.data() || {};
  if (!await teacherCanAccessClass(db, uid, submission.classId, submission.teacherId)) {
    return res.status(403).json({ error: 'Bạn không có quyền xoá bài nộp này.' });
  }
  if (submission.status === 'grading') {
    return res.status(409).json({ error: 'Bài đang được AI chấm. Chờ lượt hiện tại kết thúc rồi mới xóa bài nộp.' });
  }

  const urls = [
    ...urlsFromValue(submission.fileUrls),
    ...urlsFromValue(submission.attachments),
  ];
  // Một revision con giữ lại toàn bộ evidence của parent để chấm lại toàn bài. Vì vậy
  // không được dọn URL chỉ vì giáo viên xoá parent: file vẫn còn được document khác trỏ tới.
  const protectedUrls = new Set<string>();
  if (typeof submission.studentId === 'string' && submission.studentId) {
    const otherSubmissions = await db.collection('submissions')
      .where('studentId', '==', submission.studentId)
      .get();
    for (const other of otherSubmissions.docs) {
      if (other.id === submissionId) continue;
      const otherData = other.data() || {};
      for (const url of [
        ...urlsFromValue(otherData.fileUrls),
        ...urlsFromValue(otherData.attachments),
      ]) {
        const normalized = url.trim();
        if (normalized) protectedUrls.add(normalized);
      }
    }
  }
  const urlsToDelete = urls.filter(url => !protectedUrls.has(url.trim()));
  let deletedFiles: number;
  try {
    deletedFiles = await deleteStorageFiles(urlsToDelete);
  } catch (error) {
    if (error instanceof StorageCleanupError) {
      console.error('[classroom] xoá bài nộp: dữ liệu URL không dọn được', error);
      return res.status(422).json({ error: error.message });
    }
    throw error;
  }

  if (submission.grade?.teacherApproved === true && typeof submission.studentId === 'string') {
    const profileRef = db.collection('studentProfiles').doc(submission.studentId);
    const profileSnap = await profileRef.get();
    if (profileSnap.exists) {
      const profile = profileSnap.data() || {};
      const existing = Array.isArray(profile.topics)
        ? (profile.topics as ProfileTopic[]).filter(topic => Array.isArray(topic?.evidenceSubmissionIds))
        : [];
      await profileRef.set(stripUndefinedDeep({
        studentId: submission.studentId,
        classId: String(submission.classId || ''),
        teacherId: String(submission.teacherId || uid),
        topics: removeEvidence(existing, submissionId, new Date().toISOString(), String(submission.assignmentId || '') || undefined),
        updatedAt: new Date().toISOString(),
      }), { merge: true });
    }
  }

  await removeSkillEvidenceAndRebuild(db, {
    studentId: String(submission.studentId || ''),
    classId: String(submission.classId || ''),
    teacherId: String(submission.teacherId || uid),
  }, submissionId, new Date().toISOString());

  await submissionRef.delete();

  // Bài biến mất khỏi màn hình em mà không một lời giải thích thì em tưởng máy nuốt mất bài. Phải
  // ghi tại đây: sau lệnh delete ở trên không còn dấu vết nào để cổng học sinh dựng lại việc này.
  await writeSubmissionDeletedNotification(db, submissionId, submission, body.reason);

  return res.status(200).json({ deleted: true, deletedFiles });
};

/** Best-effort: hỏng bước thông báo KHÔNG được biến một lượt xoá đã thành công thành lỗi. */
const writeSubmissionDeletedNotification = async (
  db: FirebaseFirestore.Firestore,
  submissionId: string,
  submission: Record<string, unknown>,
  rawReason: unknown,
): Promise<void> => {
  const studentId = String(submission.studentId || '').trim();
  if (!studentId) return;

  try {
    const assignmentId = String(submission.assignmentId || '').trim();
    let assignmentTitle = '';
    if (assignmentId) {
      const assignmentSnap = await db.collection('assignments').doc(assignmentId).get();
      assignmentTitle = String(assignmentSnap.data()?.title || '').trim();
    }
    const reason = (typeof rawReason === 'string' ? rawReason : '').trim().slice(0, 500);
    const now = new Date().toISOString();
    const id = `del_${submissionId}_${Date.now()}`;
    await db.collection('studentNotifications').doc(id).set(stripUndefinedDeep({
      id,
      studentId,
      classId: String(submission.classId || ''),
      teacherId: String(submission.teacherId || ''),
      type: 'submission_deleted',
      ...(assignmentId ? { assignmentId } : {}),
      ...(assignmentTitle ? { assignmentTitle } : {}),
      ...(reason ? { reason } : {}),
      createdAt: now,
    }));
  } catch (error) {
    console.error('[classroom] không ghi được thông báo xoá bài nộp', error);
  }
};

const storedHomeworkSkillEvidence = (submissionId: string, submission: Record<string, unknown>) => {
  const rawGrade = submission.grade;
  if (!rawGrade || typeof rawGrade !== 'object' || Array.isArray(rawGrade)) return [];
  const grade = rawGrade as Record<string, unknown>;
  const rawQuestionResults = Array.isArray(grade.questionResults) ? grade.questionResults : [];
  return buildHomeworkSkillEvidence({
    submissionId,
    assignmentId: typeof submission.assignmentId === 'string' ? submission.assignmentId : undefined,
    grade: {
      score: Number(grade.score) || 0,
      maxScore: Number(grade.maxScore) || 0,
      weakTopics: Array.isArray(grade.weakTopics) ? grade.weakTopics.map(String) : [],
      strengths: Array.isArray(grade.strengths) ? grade.strengths.map(String) : [],
      teacherApproved: grade.teacherApproved === true,
      gradedAt: String(grade.gradedAt || submission.updatedAt || new Date().toISOString()),
      questionResults: rawQuestionResults.map(item => ({
        confidence: item && typeof item === 'object' && typeof (item as Record<string, unknown>).confidence === 'number'
          ? Number((item as Record<string, unknown>).confidence)
          : undefined,
      })),
    },
  });
};

const handleSyncSkillEvidence = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });

  const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : '';
  if (!submissionId) return res.status(400).json({ error: 'Thiếu mã bài nộp.' });

  const submissionSnap = await db.collection('submissions').doc(submissionId).get();
  if (!submissionSnap.exists) return res.status(404).json({ error: 'Bài nộp không còn tồn tại.' });
  const submission = submissionSnap.data() || {};
  if (!await teacherCanAccessClass(db, uid, submission.classId, submission.teacherId)) return res.status(403).json({ error: 'Bạn không có quyền cập nhật minh chứng bài này.' });

  const owner = {
    studentId: String(submission.studentId || ''),
    classId: String(submission.classId || ''),
    teacherId: String(submission.teacherId || uid),
  };
  if (!owner.studentId || !owner.classId) return res.status(422).json({ error: 'Bài nộp thiếu thông tin lớp hoặc học sinh.' });

  const evidence = storedHomeworkSkillEvidence(submissionId, submission);
  const skills = submission.grade?.teacherApproved === true
    ? await replaceSkillEvidenceAndRebuild(db, owner, submissionId, evidence, new Date().toISOString())
    : await removeSkillEvidenceAndRebuild(db, owner, submissionId, new Date().toISOString());
  return res.status(200).json({ ok: true, skills });
};

const gradeInputFromBody = (value: unknown): ManualGradeInput | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const score = Number(raw.score);
  const maxScore = Number(raw.maxScore);
  const feedback = typeof raw.feedback === 'string' ? raw.feedback.trim() : '';
  const weakTopics = Array.isArray(raw.weakTopics)
    ? raw.weakTopics
      .filter((topic): topic is string => typeof topic === 'string')
      .map(topic => topic.trim())
      .filter(Boolean)
    : [];
  const teacherNote = typeof raw.teacherNote === 'string' ? raw.teacherNote.trim() : '';
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0 || score < 0 || score > maxScore) return null;
  if (feedback.length > 12000 || teacherNote.length > 6000 || weakTopics.length > 50 || weakTopics.some(topic => topic.length > 200)) return null;
  // Bảng câu chỉ được đè lên khung bảng cũ (xem mergeTeacherQuestionResults) — ở đây chỉ chặn cỡ.
  const questionResults = Array.isArray(raw.questionResults) && raw.questionResults.length <= 300
    ? raw.questionResults as ManualGradeInput['questionResults']
    : undefined;
  return { score, maxScore, feedback, weakTopics, teacherNote, ...(questionResults ? { questionResults } : {}) };
};

const readOwnedSubmission = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  res: VercelResponse,
): Promise<{ uid: string; submissionId: string; ref: FirebaseFirestore.DocumentReference; submission: SubmissionDoc } | null> => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) {
    res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });
    return null;
  }
  const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : '';
  if (!submissionId) {
    res.status(400).json({ error: 'Thiếu mã bài nộp.' });
    return null;
  }
  const ref = db.collection('submissions').doc(submissionId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    res.status(404).json({ error: 'Bài nộp không còn tồn tại.' });
    return null;
  }
  const data = snapshot.data() || {};
  const classId = typeof data.classId === 'string' ? data.classId.trim() : '';
  const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : '';
  if (!classId || !studentId) {
    res.status(422).json({ error: 'Bài nộp thiếu thông tin lớp hoặc học sinh; không thể sửa kết quả an toàn.' });
    return null;
  }

  if (!await teacherCanAccessClass(db, uid, classId, data.teacherId)) {
    res.status(403).json({ error: 'Bạn không có quyền cập nhật kết quả chấm của bài này.' });
    return null;
  }

  const assignmentId = data.assignmentId;
  if (assignmentId !== null && assignmentId !== undefined && typeof assignmentId !== 'string') {
    res.status(422).json({ error: 'Bài nộp có mã bài giao không hợp lệ.' });
    return null;
  }
  if (typeof assignmentId === 'string' && assignmentId.trim()) {
    const assignmentSnap = await db.collection('assignments').doc(assignmentId.trim()).get();
    const assignment = assignmentSnap.exists ? assignmentSnap.data() || {} : null;
    if (!assignment || assignment.classId !== classId || !await teacherCanAccessClass(db, uid, classId, assignment.teacherId)) {
      res.status(422).json({ error: 'Bài nộp không khớp lớp và bài đã giao; không thể sửa kết quả an toàn.' });
      return null;
    }
  }
  return {
    uid,
    submissionId,
    ref,
    submission: { id: submissionId, ...data } as SubmissionDoc,
  };
};

const handleSaveSubmissionGrade = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  res: VercelResponse,
) => {
  const owned = await readOwnedSubmission(db, body, res);
  if (!owned) return;
  if (owned.submission.status === 'grading') {
    return res.status(409).json({ error: 'Bài đang được AI chấm. Chờ máy xử lý xong rồi sửa điểm.' });
  }

  const input = gradeInputFromBody(body.grade);
  if (!input) return res.status(422).json({ error: 'Điểm hoặc nội dung chấm tay không hợp lệ.' });

  const now = new Date().toISOString();
  const grade = buildManualGrade(owned.submission, input, now);
  const nextSubmission = {
    ...owned.submission,
    status: 'graded',
    grade,
    errorMessage: '',
    lastGradingError: '',
    lastGradingErrorRaw: '',
    updatedAt: now,
  } as SubmissionDoc;
  let historyId: string | null;
  try {
    historyId = await commitSubmissionGradeChange(
      db,
      owned.ref,
      owned.submission,
      'manual_edit',
      owned.uid,
      nextSubmission,
      now,
    );
  } catch (error) {
    if (error instanceof GradeLifecycleConflictError) {
      return res.status(409).json({ error: error.message });
    }
    throw error;
  }
  // Grade mới chưa duyệt nhưng vẫn phải gỡ evidence của grade cũ đã duyệt (best-effort).
  try {
    await removeSubmissionGradeEvidence(db, owned.submission, now);
    // Clear any previous evidence sync error since grade changed (best-effort)
    try {
      await db.collection('submissions').doc(owned.submissionId).update({ evidenceSyncError: '' });
    } catch {
      // Best-effort: don't overwrite successful response
    }
  } catch (cleanupError) {
    // Best-effort: evidence cleanup failure must not turn a committed grade into a failure
    // Record actionable marker for teacher
    const errorMessage = cleanupError instanceof Error ? cleanupError.message : 'Dọn minh chứng cũ thất bại';
    try {
      await db.collection('submissions').doc(owned.submissionId).update({ evidenceSyncError: errorMessage });
    } catch {
      // Best-effort: marker write failure must not overwrite successful response
    }
  }
  return res.status(200).json({ saved: true, submissionId: owned.submissionId, historyId });
};

/**
 * Thầy cô sửa đáp án MỘT câu cho cả lớp. Lưu vào bài giao (lượt chấm sau và bài nộp muộn dùng
 * luôn), rồi tính lại câu đó ở mọi bài đã chấm — trắc nghiệm / Đúng-Sai / trả lời ngắn tính tất
 * định, câu tự luận giữ điểm và gắn cờ cần soát. Bài đã duyệt GIỮ duyệt (chủ dự án chốt 01/10)
 * và hồ sơ được đồng bộ lại theo điểm mới.
 */
const FIX_CONCURRENCY = 6;

const handleFixAnswerKeyForClass = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  res: VercelResponse,
) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });
  const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId.trim() : '';
  const questionNumber = typeof body.questionNumber === 'string' ? body.questionNumber.trim() : '';
  const expectedAnswer = typeof body.expectedAnswer === 'string' ? body.expectedAnswer.trim() : '';
  if (!assignmentId || !questionNumber || questionNumber.length > 200 || !expectedAnswer || expectedAnswer.length > 4000) {
    return res.status(422).json({ error: 'Thiếu bài giao, số câu hoặc đáp án mới.' });
  }
  const assignmentRef = db.collection('assignments').doc(assignmentId);
  const assignmentSnap = await assignmentRef.get();
  const assignment = assignmentSnap.exists ? assignmentSnap.data() || {} : null;
  if (!assignment) return res.status(404).json({ error: 'Không tìm thấy bài giao.' });
  if (!await teacherCanAccessClass(db, uid, assignment.classId, assignment.teacherId)) {
    return res.status(403).json({ error: 'Bạn không có quyền sửa đáp án bài này.' });
  }
  // Bài nhiều mã đề: câu 5 mã 101 khác câu 5 mã 102 → bản sửa chỉ áp cho bài nộp của đúng mã.
  const variantCodes = Array.isArray(assignment.examVariants)
    ? (assignment.examVariants as { code?: unknown }[]).map(variant => String(variant?.code ?? '')).filter(Boolean)
    : [];
  const examCode = typeof body.examCode === 'string' ? body.examCode.trim() : '';
  if (variantCodes.length > 0 && !variantCodes.includes(examCode)) {
    return res.status(422).json({ error: 'Bài này có nhiều mã đề — chọn mã đề của bài trước khi sửa đáp án.' });
  }

  const now = new Date().toISOString();
  const fix: AnswerKeyFix = { questionNumber, expectedAnswer, fixedAt: now, ...(variantCodes.length > 0 ? { examCode } : {}) };
  const key = questionKey(questionNumber);
  const sameTarget = (f: AnswerKeyFix) => questionKey(f.questionNumber) === key && (f.examCode ?? '') === (fix.examCode ?? '');
  const previousFixes = Array.isArray(assignment.answerKeyFixes) ? assignment.answerKeyFixes as AnswerKeyFix[] : [];
  await assignmentRef.update({
    answerKeyFixes: [...previousFixes.filter(f => !sameTarget(f)), fix],
    updatedAt: now,
    updatedBy: uid,
  });

  const snap = await db.collection('submissions').where('assignmentId', '==', assignmentId).get();
  let updated = 0;
  let needsReview = 0;
  let busy = 0;
  let syncFailed = 0;
  const fixOne = async (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const submission = { ...doc.data(), id: doc.id } as SubmissionDoc;
    if (submission.classId !== assignment.classId || !submission.grade?.questionResults?.length) return;
    if (fix.examCode && submission.examCode !== fix.examCode) return;
    if (submission.status === 'grading') { busy += 1; return; }
    const out = applyAnswerKeyFixes(submission.grade.questionResults, [fix]);
    if (!out.changed) return;
    const grade: SubmissionGrade = {
      ...submission.grade,
      questionResults: out.rows,
      score: recomputeTotal(submission.grade, out.rows),
      gradedAt: now,
    };
    try {
      await commitSubmissionGradeChange(db, doc.ref, submission, 'answer_key_fix', uid, { ...submission, grade, updatedAt: now }, now);
    } catch (error) {
      if (error instanceof GradeLifecycleConflictError) { busy += 1; return; }
      throw error;
    }
    updated += 1;
    needsReview += out.needsReview;
    if (grade.teacherApproved !== true) return;
    try {
      await syncApprovedGradeEvidence(db, {
        submissionId: doc.id,
        assignmentId,
        grade,
        owner: { studentId: submission.studentId, classId: submission.classId, teacherId: submission.teacherId },
        now,
        approved: true,
      });
    } catch (error) {
      syncFailed += 1;
      const message = error instanceof Error ? error.message : 'Đồng bộ minh chứng thất bại';
      await doc.ref.update({ evidenceSyncError: message }).catch(() => undefined);
    }
  };
  for (let i = 0; i < snap.docs.length; i += FIX_CONCURRENCY) {
    await Promise.all(snap.docs.slice(i, i + FIX_CONCURRENCY).map(fixOne));
  }
  return res.status(200).json({ updated, needsReview, busy, syncFailed });
};

/**
 * Giáo viên chọn mã đề cho một bài nộp của bài kiểm tra nhiều mã (AI không đọc được hoặc đọc sai mã).
 * Chỉ ghi mã; lượt chấm lại sau đó dùng mã giáo viên chọn, không đọc lại trên ảnh.
 */
const handleSetSubmissionExamCode = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  res: VercelResponse,
) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });
  const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : '';
  const examCode = typeof body.examCode === 'string' ? body.examCode.trim() : '';
  if (!submissionId || !examCode) return res.status(422).json({ error: 'Thiếu bài nộp hoặc mã đề.' });
  const submissionRef = db.collection('submissions').doc(submissionId);
  const submissionSnap = await submissionRef.get();
  const submission = submissionSnap.exists ? submissionSnap.data() || {} : null;
  if (!submission?.assignmentId) return res.status(404).json({ error: 'Không tìm thấy bài nộp.' });
  const assignmentSnap = await db.collection('assignments').doc(String(submission.assignmentId)).get();
  const assignment = assignmentSnap.exists ? assignmentSnap.data() || {} : null;
  if (!assignment) return res.status(404).json({ error: 'Không tìm thấy bài giao.' });
  if (submission.classId !== assignment.classId || !await teacherCanAccessClass(db, uid, assignment.classId, assignment.teacherId)) {
    return res.status(403).json({ error: 'Bạn không có quyền sửa bài nộp này.' });
  }
  const codes = Array.isArray(assignment.examVariants)
    ? (assignment.examVariants as { code?: unknown }[]).map(variant => String(variant?.code ?? '')).filter(Boolean)
    : [];
  if (!codes.includes(examCode)) return res.status(422).json({ error: `Mã đề phải là một trong: ${codes.join(', ') || '(bài này không có mã đề)'}.` });
  if (submission.status === 'grading') return res.status(409).json({ error: 'Bài đang được chấm, thử lại sau ít phút.' });
  await submissionRef.update({ examCode, examCodeSource: 'teacher', updatedAt: new Date().toISOString() });
  return res.status(200).json({ examCode });
};

const handleDeleteSubmissionGrade = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  res: VercelResponse,
) => {
  const owned = await readOwnedSubmission(db, body, res);
  if (!owned) return;
  if (owned.submission.status === 'grading') {
    return res.status(409).json({ error: 'Bài đang được AI chấm. Chờ máy xử lý xong rồi xóa kết quả.' });
  }
  if (!owned.submission.grade) {
    return res.status(409).json({ error: 'Bài nộp này chưa có kết quả chấm để xóa.' });
  }

  const now = new Date().toISOString();
  // Remove evidence of the grade being deleted. If cleanup fails, we MUST NOT
  // delete the grade — return an error and preserve grade/submission/history.
  // We do NOT set evidenceSyncError because:
  // 1. The grade deletion is aborted - the grade remains intact
  // 2. retryEvidenceSync is for syncing evidence, not for failed deletion cleanup
  try {
    await removeSubmissionGradeEvidence(db, owned.submission, now);
  } catch (cleanupError) {
    const errorMessage = cleanupError instanceof Error ? cleanupError.message : 'Dọn minh chứng cũ thất bại';
    return res.status(500).json({ error: `Không thể xóa điểm: ${errorMessage}. Điểm hiện tại được giữ nguyên.` });
  }
  // Clear any previous evidence sync error since grade removed (best-effort)
  try {
    await db.collection('submissions').doc(owned.submissionId).update({ evidenceSyncError: '' });
  } catch {
    // Best-effort: don't overwrite successful response
  }
  const nextSubmission = {
    ...submissionWithoutGrade(owned.submission),
    status: 'submitted',
    errorMessage: '',
    lastGradingError: '',
    lastGradingErrorRaw: '',
    evidenceSyncError: '',
    updatedAt: now,
  } as SubmissionDoc;
  let historyId: string | null;
  try {
    historyId = await commitSubmissionGradeChange(
      db,
      owned.ref,
      owned.submission,
      'delete',
      owned.uid,
      nextSubmission,
      now,
    );
  } catch (error) {
    if (error instanceof GradeLifecycleConflictError) {
      return res.status(409).json({ error: error.message });
    }
    throw error;
  }
  return res.status(200).json({ deletedGrade: true, submissionId: owned.submissionId, historyId });
};

const handleApproveSubmissionGrade = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  res: VercelResponse,
) => {
  const owned = await readOwnedSubmission(db, body, res);
  if (!owned) return;
  if (owned.submission.status === 'grading') {
    return res.status(409).json({ error: 'Bài đang được AI chấm. Chờ lượt hiện tại kết thúc rồi duyệt.' });
  }
  if (!owned.submission.grade) {
    return res.status(409).json({ error: 'Bài nộp chưa có kết quả chấm để duyệt.' });
  }
  if (typeof body.approved !== 'boolean') {
    return res.status(422).json({ error: 'Thiếu trạng thái duyệt điểm hợp lệ.' });
  }

  const approved = body.approved;
  const now = new Date().toISOString();
  try {
    await db.runTransaction(async transaction => {
      const latestSnapshot = await transaction.get(owned.ref);
      if (!latestSnapshot.exists) throw new GradeLifecycleConflictError();
      const latest = latestSnapshot.data() as FirebaseFirestore.DocumentData;
      const latestGradeAt = latest.grade && typeof latest.grade === 'object' ? latest.grade.gradedAt : undefined;
      if (latest.teacherId !== owned.submission.teacherId
        || latest.updatedAt !== owned.submission.updatedAt
        || latest.status !== owned.submission.status
        || latestGradeAt !== owned.submission.grade?.gradedAt) {
        throw new GradeLifecycleConflictError();
      }
      const approvalSourceUpdate = approved ? 'teacher' : FieldValue.delete();
      transaction.update(owned.ref, {
        'grade.teacherApproved': approved,
        'grade.approvalSource': approvalSourceUpdate,
        updatedAt: now,
      });
    });
  } catch (error) {
    if (error instanceof GradeLifecycleConflictError) {
      return res.status(409).json({ error: error.message });
    }
    throw error;
  }

  const nextGrade = { ...owned.submission.grade, teacherApproved: approved };
  if (approved) {
    nextGrade.approvalSource = 'teacher';
  }
  let syncPending = false;
  let syncError: string | undefined;
  try {
    await syncApprovedGradeEvidence(db, {
      submissionId: owned.submissionId,
      assignmentId: owned.submission.assignmentId,
      grade: nextGrade,
      owner: {
        studentId: owned.submission.studentId,
        classId: owned.submission.classId,
        teacherId: owned.submission.teacherId,
      },
      now,
      approved,
    });
    // Sync succeeded, clear any previous sync error (best-effort)
    try {
      await db.collection('submissions').doc(owned.submissionId).update({ evidenceSyncError: '' });
    } catch {
      // Best-effort: don't overwrite successful response
    }
  } catch (error) {
    // Sync failed but grade approval is committed — record pending marker (best-effort)
    syncPending = true;
    syncError = error instanceof Error ? error.message : 'Đồng bộ minh chứng thất bại';
    try {
      await db.collection('submissions').doc(owned.submissionId).update({ evidenceSyncError: syncError });
    } catch {
      // Best-effort: don't overwrite successful response
    }
  }

  const response: Record<string, unknown> = { approved, submissionId: owned.submissionId };
  if (syncPending) {
    response.syncPending = true;
    response.syncError = syncError;
  }
  return res.status(200).json(response);
};

const handleRetryEvidenceSync = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  res: VercelResponse,
) => {
  const owned = await readOwnedSubmission(db, body, res);
  if (!owned) return;
  if (owned.submission.status === 'grading') {
    return res.status(409).json({ error: 'Bài đang được AI chấm. Chờ lượt hiện tại kết thúc rồi thử lại.' });
  }
  if (!owned.submission.grade) {
    return res.status(409).json({ error: 'Bài nộp chưa có kết quả chấm để đồng bộ.' });
  }
  if (!owned.submission.evidenceSyncError) {
    return res.status(409).json({ error: 'Không có lỗi đồng bộ đang chờ xử lý.' });
  }

  const now = new Date().toISOString();
  const isApproved = owned.submission.grade.teacherApproved === true;
  // Preserve original approvalSource; retry sync doesn't change approval
  const nextGrade = { ...owned.submission.grade };

  try {
    if (isApproved) {
      // Approved grade: retry syncing approved evidence (current path)
      await syncApprovedGradeEvidence(db, {
        submissionId: owned.submissionId,
        assignmentId: owned.submission.assignmentId,
        grade: nextGrade,
        owner: {
          studentId: owned.submission.studentId,
          classId: owned.submission.classId,
          teacherId: owned.submission.teacherId,
        },
        now,
        approved: true,
      });
    } else {
      // Unapproved grade (teacher AI regrade or manual edit): retry cleaning up stale evidence
      await removeSubmissionGradeEvidence(db, owned.submission, now);
    }
    // Sync/cleanup succeeded, clear the error marker (best-effort)
    try {
      await db.collection('submissions').doc(owned.submissionId).update({ evidenceSyncError: '' });
    } catch {
      // Best-effort: don't overwrite successful response
    }
    return res.status(200).json({ retried: true, submissionId: owned.submissionId });
  } catch (error) {
    const syncError = error instanceof Error ? error.message : 'Đồng bộ minh chứng thất bại';
    // Record error marker (best-effort)
    try {
      await db.collection('submissions').doc(owned.submissionId).update({ evidenceSyncError: syncError });
    } catch {
      // Best-effort: don't overwrite error response
    }
    return res.status(500).json({ retried: false, error: syncError });
  }
};

const validAttachmentKind = (value: unknown): 'image' | 'pdf' | 'document' | 'unknown' | undefined => {
  const kind = String(value || '');
  return ['image', 'pdf', 'document', 'unknown'].includes(kind)
    ? kind as 'image' | 'pdf' | 'document' | 'unknown'
    : undefined;
};

const sanitizeSubmissionAttachments = (value: unknown): SubmissionDoc['attachments'] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const raw = item as Record<string, unknown>;
    const name = String(raw.name || '').trim();
    const url = String(raw.url || '').trim();
    if (!name || !url) return [];
    const kind = validAttachmentKind(raw.kind);
    return [{
      name: name.slice(0, 300),
      url,
      ...(typeof raw.mimeType === 'string' ? { mimeType: raw.mimeType.slice(0, 150) } : {}),
      ...(typeof raw.size === 'number' && Number.isFinite(raw.size) && raw.size >= 0 ? { size: raw.size } : {}),
      ...(kind ? { kind } : {}),
    }];
  });
};

const normalizedSubmissionUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((url): url is string => typeof url === 'string')
    .map(url => url.trim())
    .filter(Boolean))];
};

/**
 * Tạo một lượt nộp mới sau khi học sinh nhận ra lượt trước thiếu ảnh.
 * Không cho client ghi đè parent: server kiểm link học sinh + toàn bộ lineage rồi
 * lưu một revision mới với evidence đã ghép, để grade-homework chấm lại toàn bộ.
 */
const handleCreateSupplementSubmission = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  res: VercelResponse,
) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Phiên đăng nhập học sinh không hợp lệ.' });

  const linkSnap = await db.collection('studentLinks').doc(uid).get();
  if (!linkSnap.exists) return res.status(403).json({ error: 'Chỉ học sinh đã đăng nhập mới được bổ sung bài.' });
  const link = linkSnap.data() || {};
  const studentId = typeof link.studentId === 'string' ? link.studentId : '';
  const classId = typeof link.classId === 'string' ? link.classId : '';
  const teacherId = typeof link.teacherId === 'string' ? link.teacherId : '';
  if (!studentId || !classId || !teacherId) {
    return res.status(403).json({ error: 'Phiên học sinh thiếu thông tin lớp.' });
  }

  const raw = body.submission;
  if (!raw || typeof raw !== 'object') return res.status(400).json({ error: 'Thiếu dữ liệu lượt bổ sung.' });
  const incoming = raw as Record<string, unknown>;
  const id = typeof incoming.id === 'string' ? incoming.id.trim() : '';
  const supplementOf = typeof incoming.supplementOf === 'string' ? incoming.supplementOf.trim() : '';
  const assignmentId = typeof incoming.assignmentId === 'string' ? incoming.assignmentId.trim() : '';
  const fileUrls = normalizedSubmissionUrls(incoming.fileUrls);
  if (!id || !supplementOf || !assignmentId || fileUrls.length === 0) {
    return res.status(400).json({ error: 'Lượt bổ sung thiếu mã bài, parent, bài giao hoặc tệp.' });
  }
  if (id.length > 150 || supplementOf.length > 150 || assignmentId.length > 150) {
    return res.status(400).json({ error: 'Mã lượt nộp không hợp lệ.' });
  }

  const assignmentSnap = await db.collection('assignments').doc(assignmentId).get();
  if (!assignmentSnap.exists) return res.status(404).json({ error: 'Bài giao không còn tồn tại.' });
  const assignment = assignmentSnap.data() || {};
  if (assignment.teacherId !== teacherId || assignment.classId !== classId) {
    return res.status(403).json({ error: 'Bài giao không thuộc lớp học của em.' });
  }
  if (assignment.isOpen !== true) {
    return res.status(409).json({ error: 'Bài giao đã đóng nên không thể bổ sung ảnh.' });
  }

  // Chỉ nhận object mà chính học sinh vừa upload trong namespace của mình. Nếu
  // không chặn ở API này, client có thể gửi URL ngoài Storage để grade-homework
  // tải nhầm tài nguyên không thuộc bài nộp.
  const bucket = getAdminStorage();
  const incomingPaths = uniqueStoragePaths(fileUrls, bucket.name);
  const ownPrefix = `homework/${uid}/`;
  if (incomingPaths.length !== fileUrls.length || incomingPaths.some(path => !path.startsWith(ownPrefix))) {
    return res.status(422).json({ error: 'Tệp bổ sung không thuộc kho bài làm của em.' });
  }

  const submissionRef = db.collection('submissions').doc(id);
  if ((await submissionRef.get()).exists) return res.status(409).json({ error: 'Lượt bổ sung đã tồn tại.' });

  const parentSnap = await db.collection('submissions').doc(supplementOf).get();
  if (!parentSnap.exists) return res.status(404).json({ error: 'Không tìm thấy lượt nộp cần bổ sung.' });
  const parent = parentSnap.data() || {};
  if (
    parent.studentId !== studentId
    || parent.classId !== classId
    || parent.teacherId !== teacherId
    || parent.assignmentId !== assignmentId
  ) {
    return res.status(403).json({ error: 'Lượt nộp này không thuộc đúng học sinh, lớp hoặc bài giao.' });
  }

  const merged = mergeSubmissionEvidence(
    {
      fileUrls: normalizedSubmissionUrls(parent.fileUrls),
      attachments: sanitizeSubmissionAttachments(parent.attachments),
      textContent: typeof parent.textContent === 'string' ? parent.textContent : '',
    },
    {
      fileUrls,
      attachments: sanitizeSubmissionAttachments(incoming.attachments),
      textContent: typeof incoming.textContent === 'string' ? incoming.textContent : '',
    },
  );
  if (merged.fileUrls.length > 12) {
    return res.status(422).json({ error: 'Bài bổ sung vượt giới hạn 12 tệp. Em hãy xoá bớt tệp rồi thử lại.' });
  }
  if (merged.textContent.length > 60000) {
    return res.status(422).json({ error: 'Nội dung bài bổ sung vượt giới hạn cho phép.' });
  }

  const now = new Date().toISOString();
  const submission: SubmissionDoc = {
    id,
    teacherId,
    classId,
    studentId,
    assignmentId,
    supplementOf,
    fileUrls: merged.fileUrls,
    textContent: merged.textContent,
    attachments: merged.attachments,
    note: typeof incoming.note === 'string' ? incoming.note.slice(0, 2000) : '',
    status: 'submitted',
    createdAt: now,
    updatedAt: now,
  };
  await submissionRef.set(submission);
  return res.status(200).json({ submission });
};

const handleDeleteAssignment = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });

  const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId.trim() : '';
  if (!assignmentId) return res.status(400).json({ error: 'Thiếu mã bài giao.' });

  const assignmentRef = db.collection('assignments').doc(assignmentId);
  const assignmentSnap = await assignmentRef.get();
  if (!assignmentSnap.exists) return res.status(404).json({ error: 'Bài giao không còn tồn tại.' });

  const assignment = assignmentSnap.data() || {};
  if (!await teacherCanAccessClass(db, uid, assignment.classId, assignment.teacherId)) {
    return res.status(403).json({ error: 'Bạn không có quyền xoá bài giao này.' });
  }

  const submissions = await db.collection('submissions')
    .where('assignmentId', '==', assignmentId)
    .limit(1)
    .get();
  if (!submissions.empty) {
    return res.status(409).json({ error: 'Bài giao đã có bài nộp. Hãy đóng bài hoặc xoá từng bài nộp trước.' });
  }

  const urls = [
    ...urlsFromValue(assignment.attachments),
    ...urlsFromValue(assignment.sourceImageUrls),
    ...urlsFromValue(assignment.answerKeyImageUrls),
  ];
  let deletedFiles: number;
  try {
    deletedFiles = await deleteStorageFiles(urls);
  } catch (error) {
    if (error instanceof StorageCleanupError) {
      console.error('[classroom] xoá bài giao: dữ liệu URL không dọn được', error);
      return res.status(422).json({ error: error.message });
    }
    throw error;
  }
  await assignmentRef.delete();
  return res.status(200).json({ deleted: true, deletedFiles });
};


const handleRoster = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const joinCode = normalizeJoinCode(body.joinCode);
  const lookup = await lookupClassByJoinCode(db, joinCode);
  if (lookup.status === 'duplicate') return res.status(409).json({ error: JOIN_CODE_DUPLICATE_MESSAGE });
  const classDoc = lookup.status === 'ok' ? lookup.doc : null;
  if (!classDoc) return res.status(404).json({ error: 'Không tìm thấy lớp với mã này. Kiểm tra lại mã thầy cô cho.' });

  const students = await classDoc.ref.collection('students').get();
  return res.status(200).json({
    classId: classDoc.id,
    className: classDoc.data().name || '',
    // CỐ Ý chỉ trả id và tên. Mã học sinh của trường không rời khỏi máy chủ.
    students: students.docs
      .map(d => ({ studentId: d.id, name: String(d.data().name || '') }))
      .filter(s => s.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
  });
};

const studentExportBundle = (value: unknown): StudentActivityExportBundle | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const status = String(raw.status || '');
  const contentVersion = String(raw.contentVersion || '').trim();
  const contentHash = String(raw.contentHash || '').trim();
  if (!['pending', 'ready', 'error'].includes(status) || !contentVersion || !contentHash) return undefined;
  return {
    status: status as StudentActivityExportBundle['status'],
    contentVersion,
    contentHash,
    ...(String(raw.studentPdfUrl || '').trim() ? { studentPdfUrl: String(raw.studentPdfUrl).trim() } : {}),
    ...(String(raw.studentDocxUrl || '').trim() ? { studentDocxUrl: String(raw.studentDocxUrl).trim() } : {}),
    ...(String(raw.generatedAt || '').trim() ? { generatedAt: String(raw.generatedAt).trim() } : {}),
  };
};

const safeEnum = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined => {
  const text = typeof value === 'string' ? value : '';
  return (allowed as readonly string[]).includes(text) ? text as T : undefined;
};

const projectStudentAssignment = (id: string, data: FirebaseFirestore.DocumentData): StudentAssignmentView => {
  const attachments = (Array.isArray(data.attachments) ? data.attachments : [])
    .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map(item => ({
      name: String(item.name || ''),
      url: String(item.url || ''),
      ...(item.mimeType ? { mimeType: String(item.mimeType) } : {}),
      ...(typeof item.size === 'number' ? { size: item.size } : {}),
    }))
    .filter(item => item.name && item.url);
  const answerKey = String(data.answerKey || '').trim();
  const rubric = String(data.rubric || '').trim();
  const answerKeyImages = Array.isArray(data.answerKeyImageUrls)
    ? data.answerKeyImageUrls.map((url: unknown) => String(url || '')).filter(Boolean)
    : [];

  const purpose = safeEnum(data.purpose, ['practice', 'remediation', 'assignment', 'assessment'] as const);
  const deliveryMode = safeEnum(data.deliveryMode, ['online', 'file', 'both'] as const);
  const gradingPolicy = safeEnum(data.gradingPolicy, ['automatic', 'mixed', 'teacher_review'] as const);
  const skillIds = Array.isArray(data.skillIds)
    ? data.skillIds.filter((skillId: unknown): skillId is string => typeof skillId === 'string' && Boolean(skillId.trim())).map((skillId: string) => skillId.trim())
    : [];
  const exportBundle = studentExportBundle(data.exportBundle);

  return {
    id,
    teacherId: String(data.teacherId || ''),
    classId: String(data.classId || ''),
    title: String(data.title || ''),
    description: String(data.description || ''),
    type: data.type === 'exam' ? 'exam' : 'upload',
    ...(data.examId ? { examId: String(data.examId) } : {}),
    ...(data.dueAt ? { dueAt: String(data.dueAt) } : {}),
    ...(Number.isFinite(Number(data.maxScore)) ? { maxScore: Number(data.maxScore) } : {}),
    attachments,
    isOpen: true,
    createdAt: String(data.createdAt || ''),
    updatedAt: String(data.updatedAt || ''),
    hasAnswerKey: Boolean(answerKey || rubric || answerKeyImages.length > 0),
    // Cờ trống (không lộ tên cột sổ điểm): cổng học sinh dùng để KHÔNG hiện điểm AI chấm lại của bài định kì.
    ...(data.periodicTest ? { periodicTest: {} } : {}),
    ...(purpose ? { purpose } : {}),
    ...(deliveryMode ? { deliveryMode } : {}),
    ...(skillIds.length > 0 ? { skillIds } : {}),
    ...(typeof data.sourceReportId === 'string' && data.sourceReportId.trim() ? { sourceReportId: data.sourceReportId.trim() } : {}),
    ...(gradingPolicy ? { gradingPolicy } : {}),
    ...(typeof data.contentVersion === 'string' && data.contentVersion.trim() ? { contentVersion: data.contentVersion.trim() } : {}),
    ...(exportBundle ? { exportBundle } : {}),
  };
};

const projectStudentSubmission = (id: string, data: FirebaseFirestore.DocumentData): SubmissionDoc => {
  const rawStatus = String(data.status || 'submitted');
  const rawGrade = data.grade as FirebaseFirestore.DocumentData | undefined;
  const hasValidGrade = rawGrade && typeof rawGrade.score === 'number' && typeof rawGrade.maxScore === 'number';

  // Normalize legacy status='error' with a valid grade to 'graded' at projection time
  // This preserves historical data while presenting correct status to users
  const normalizedStatus = (rawStatus === 'error' && hasValidGrade) ? 'graded' :
    (['submitted', 'grading', 'graded', 'error'].includes(rawStatus) ? rawStatus : 'submitted');

  const questionResults = Array.isArray(rawGrade?.questionResults)
    ? rawGrade.questionResults
      .filter((item: unknown): item is FirebaseFirestore.DocumentData => Boolean(item && typeof item === 'object'))
      .map(item => ({
        questionNumber: String(item.questionNumber || ''),
        status: ['correct', 'partially_correct', 'incorrect', 'unreadable', 'not_attempted'].includes(String(item.status))
          ? item.status
          : 'unreadable',
        score: Number(item.score) || 0,
        maxScore: Number(item.maxScore) || 0,
        studentAnswer: String(item.studentAnswer || ''),
        expectedAnswer: rawGrade?.teacherApproved === true ? String(item.expectedAnswer || '') : '',
        errorType: String(item.errorType || ''),
        explanation: rawGrade?.teacherApproved === true ? String(item.explanation || '') : '',
        correction: String(item.correction || ''),
        nextPractice: String(item.nextPractice || ''),
        ...(typeof item.confidence === 'number' ? { confidence: item.confidence } : {}),
        ...(typeof item.ignoredByTeacherInstruction === 'boolean' ? { ignoredByTeacherInstruction: item.ignoredByTeacherInstruction } : {}),
        needsTeacherReview: Boolean(item.needsTeacherReview),
      }))
    : undefined;
  const grade: SubmissionGrade | undefined = rawGrade ? {
    score: Number(rawGrade.score) || 0,
    maxScore: Number(rawGrade.maxScore) || 0,
    feedback: String(rawGrade.feedback || ''),
    strengths: Array.isArray(rawGrade.strengths) ? rawGrade.strengths.map(String) : [],
    weaknesses: Array.isArray(rawGrade.weaknesses) ? rawGrade.weaknesses.map(String) : [],
    ...(questionResults ? { questionResults } : {}),
    ...(typeof rawGrade.gradedWithoutAnswerKey === 'boolean' ? { gradedWithoutAnswerKey: rawGrade.gradedWithoutAnswerKey } : {}),
    gradedAt: String(rawGrade.gradedAt || ''),
    teacherApproved: rawGrade.teacherApproved === true,
    approvalSource: typeof rawGrade.approvalSource === 'string' ? rawGrade.approvalSource as 'student_ai' | 'teacher' : undefined,
    ...(typeof rawGrade.editedByTeacher === 'boolean' ? { editedByTeacher: rawGrade.editedByTeacher } : {}),
    // noteForTeacher and teacherNote are teacher-only fields — not exposed to students
  } : undefined;

  // Student-safe error message: never expose raw provider/internal errors
  const STUDENT_SAFE_GRADING_ERROR = 'Lần chấm lại trước chưa thành công; điểm hiện tại vẫn được giữ nguyên.';
  const rawLastGradingError = typeof data.lastGradingError === 'string' ? data.lastGradingError : undefined;
  const rawErrorMessage = typeof data.errorMessage === 'string' ? data.errorMessage : undefined;
  const studentLastGradingError = rawLastGradingError || rawErrorMessage ? STUDENT_SAFE_GRADING_ERROR : undefined;

  return {
    id,
    teacherId: String(data.teacherId || ''),
    classId: String(data.classId || ''),
    studentId: String(data.studentId || ''),
    assignmentId: typeof data.assignmentId === 'string' ? data.assignmentId : null,
    ...(typeof data.supplementOf === 'string' ? { supplementOf: data.supplementOf } : {}),
    fileUrls: Array.isArray(data.fileUrls) ? data.fileUrls.map(String) : [],
    attachments: Array.isArray(data.attachments) ? data.attachments : undefined,
    note: String(data.note || ''),
    status: normalizedStatus,
    ...(grade ? { grade } : {}),
    // Expose separate error information based on data presence, not status
    // This ensures lastGradingError surfaces even when status='graded'
    ...(hasValidGrade && studentLastGradingError ? { lastGradingError: studentLastGradingError } : {}),
    ...(normalizedStatus === 'error' && !hasValidGrade ? { errorMessage: 'Bài đã được nhận nhưng kết quả chấm chưa hoàn tất. Em chưa cần nộp lại ảnh; thầy/cô sẽ chấm lại hoặc kiểm tra bài.' } : {}),
    // evidenceSyncError is teacher/internal-only; never exposed to students
    createdAt: String(data.createdAt || ''),
    updatedAt: String(data.updatedAt || ''),
  } as SubmissionDoc;
};

const handleStudentAssignments = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Phiên đăng nhập học sinh không hợp lệ.' });

  const linkSnap = await db.collection('studentLinks').doc(uid).get();
  if (!linkSnap.exists) return res.status(403).json({ error: 'Chỉ học sinh đã đăng nhập mới xem được bài tập.' });
  const link = linkSnap.data() as { classId?: unknown; studentId?: unknown };
  const classId = typeof link.classId === 'string' ? link.classId : '';
  const studentId = typeof link.studentId === 'string' ? link.studentId : '';
  if (!classId || !studentId) return res.status(403).json({ error: 'Phiên học sinh thiếu thông tin lớp.' });

  // Lọc isOpen ngay trong query: limit không được phép làm 100 bài đóng che mất bài đang mở.
  const snap = await db.collection('assignments')
    .where('classId', '==', classId)
    .where('isOpen', '==', true)
    .limit(100)
    .get();
  const assignments = snap.docs
    .filter(document => {
      const targetStudentIds = document.data().targetStudentIds;
      return !Array.isArray(targetStudentIds)
        || targetStudentIds.length === 0
        || targetStudentIds.some((targetId: unknown) => targetId === studentId);
    })
    .map(document => projectStudentAssignment(document.id, document.data()))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return res.status(200).json({ assignments });
};

const handleStudentSubmissions = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Phiên đăng nhập học sinh không hợp lệ.' });

  const linkSnap = await db.collection('studentLinks').doc(uid).get();
  if (!linkSnap.exists) return res.status(403).json({ error: 'Chỉ học sinh đã đăng nhập mới xem được bài nộp.' });
  const link = linkSnap.data() as { studentId?: unknown; classId?: unknown; teacherId?: unknown };
  const studentId = typeof link.studentId === 'string' ? link.studentId : '';
  const classId = typeof link.classId === 'string' ? link.classId : '';
  const teacherId = typeof link.teacherId === 'string' ? link.teacherId : '';
  if (!studentId || !classId || !teacherId) return res.status(403).json({ error: 'Phiên học sinh thiếu thông tin lớp.' });

  const snap = await db.collection('submissions').where('studentId', '==', studentId).limit(50).get();
  const submissions = snap.docs
    .filter(document => {
      const data = document.data();
      return data.classId === classId && data.teacherId === teacherId;
    })
    .map(document => projectStudentSubmission(document.id, document.data()))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return res.status(200).json({ submissions });
};

/**
 * Thông báo của CHÍNH học sinh đang đăng nhập.
 *
 * Lọc theo `studentId` lấy từ `studentLinks` của phiên, không lấy theo tham số client gửi lên —
 * nhận studentId từ client là mở đường cho em này đọc thông báo của em khác.
 */
const handleStudentNotifications = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Phiên đăng nhập học sinh không hợp lệ.' });

  const linkSnap = await db.collection('studentLinks').doc(uid).get();
  if (!linkSnap.exists) return res.status(403).json({ error: 'Chỉ học sinh đã đăng nhập mới xem được thông báo.' });
  const link = linkSnap.data() as { studentId?: unknown; classId?: unknown; teacherId?: unknown };
  const studentId = typeof link.studentId === 'string' ? link.studentId : '';
  const classId = typeof link.classId === 'string' ? link.classId : '';
  const teacherId = typeof link.teacherId === 'string' ? link.teacherId : '';
  if (!studentId || !classId || !teacherId) return res.status(403).json({ error: 'Phiên học sinh thiếu thông tin lớp.' });

  const snap = await db.collection('studentNotifications')
    .where('studentId', '==', studentId)
    .limit(100)
    .get();
  const notifications = snap.docs
    .map(document => ({ id: document.id, ...(document.data() || {}) } as Record<string, unknown>))
    // Cùng một mã học sinh có thể tồn tại ở lớp khác của giáo viên khác; chỉ trả đúng lớp của phiên.
    .filter(item => item.classId === classId && item.teacherId === teacherId)
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
    .slice(0, 50);
  return res.status(200).json({ notifications });
};

const handleLogin = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ. Tải lại trang rồi thử lại.' });

  const pin = body.pin;
  if (!isValidPinShape(pin)) return res.status(400).json({ error: 'Mã PIN phải là 4 chữ số.' });

  const joinCode = normalizeJoinCode(body.joinCode);
  const studentId = typeof body.studentId === 'string' ? body.studentId : '';
  const lookup = await lookupClassByJoinCode(db, joinCode);
  if (lookup.status === 'duplicate') return res.status(409).json({ error: JOIN_CODE_DUPLICATE_MESSAGE });
  const classDoc = lookup.status === 'ok' ? lookup.doc : null;
  if (!classDoc || !studentId) return res.status(404).json({ error: 'Không tìm thấy lớp hoặc học sinh.' });

  const studentRef = classDoc.ref.collection('students').doc(studentId);
  const studentSnap = await studentRef.get();
  if (!studentSnap.exists) return res.status(404).json({ error: 'Không tìm thấy học sinh trong lớp này.' });

  const now = new Date();
  // Đọc khoá + kiểm PIN + ghi khoá trong một giao dịch (xem attemptPin) — đoán PIN song song không né được khoá.
  const attempt = await attemptPin(db, classDoc.ref.collection('studentSecrets').doc(studentId), pin, now);
  if (attempt.status === 'missing') {
    return res.status(409).json({ error: 'Thầy cô chưa cấp mã PIN cho em. Báo thầy cô bấm "Cấp mã PIN" trong lớp.' });
  }
  if (attempt.status === 'locked') {
    return res.status(429).json({
      error: `Sai mã PIN nhiều lần. Thử lại sau ${attempt.minutes} phút, hoặc nhờ thầy cô cấp lại PIN.`,
    });
  }
  if (attempt.status === 'wrong') return res.status(401).json({ error: 'Mã PIN không đúng.' });

  const classData = classDoc.data();
  await db.collection('studentLinks').doc(uid).set({
    uid,
    studentId,
    classId: classDoc.id,
    teacherId: classData.teacherId,
    createdAt: now.toISOString(),
  });

  return res.status(200).json({
    studentId,
    classId: classDoc.id,
    teacherId: classData.teacherId,
    className: classData.name || '',
    studentName: studentSnap.data()?.name || '',
  });
};

const handleIssuePins = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
  if (!await teacherCanAccessClass(db, uid, classId, classSnap.data()?.teacherId)) {
    return res.status(403).json({ error: 'Bạn không có quyền cấp mã PIN cho lớp này.' });
  }

  const regenerate = body.regenerate === true;
  const students = await classSnap.ref.collection('students').get();
  const now = new Date().toISOString();
  const issued: Array<{ studentId: string; name: string; pin: string }> = [];
  let batch = db.batch();
  let pending = 0;

  for (const studentDoc of students.docs) {
    const secretRef = classSnap.ref.collection('studentSecrets').doc(studentDoc.id);
    if (!regenerate && (await secretRef.get()).exists) continue;

    const pin = createPin();
    batch.set(secretRef, {
      studentId: studentDoc.id,
      classId: classId,
      pinHash: hashPin(pin),
      pinPlain: pin,
      ...EMPTY_LOCK,
      updatedAt: now,
    });
    issued.push({ studentId: studentDoc.id, name: String(studentDoc.data().name || ''), pin });
    pending += 1;
    if (pending >= 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending > 0) await batch.commit();

  return res.status(200).json({ issued, total: students.size });
};

/**
 * Cấp lại PIN cho ĐÚNG MỘT em.
 *
 * Thiếu đường này thì một em quên PIN là cả lớp phải đổi mã — 25 em kia bị phiền vì lỗi của
 * một người, và giáo viên phải phát lại toàn bộ bảng PIN.
 *
 * Cấp lại cũng XOÁ trạng thái khoá: em bị khoá vì sai 5 lần thì mã mới phải dùng được ngay.
 */
const handleResetOnePin = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const studentId = typeof body.studentId === 'string' ? body.studentId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
  if (!await teacherCanAccessClass(db, uid, classId, classSnap.data()?.teacherId)) {
    return res.status(403).json({ error: 'Bạn không có quyền cấp lại mã PIN cho lớp này.' });
  }

  const studentRef = classSnap.ref.collection('students').doc(studentId);
  const studentSnap = await studentRef.get();
  if (!studentSnap.exists) return res.status(404).json({ error: 'Không tìm thấy học sinh trong lớp này.' });

  const pin = createPin();
  await classSnap.ref.collection('studentSecrets').doc(studentId).set({
    studentId,
    classId,
    pinHash: hashPin(pin),
    pinPlain: pin,
    ...EMPTY_LOCK,
    updatedAt: new Date().toISOString(),
  });

  return res.status(200).json({ studentId, name: String(studentSnap.data()?.name || ''), pin });
};

/**
 * Xem PIN ĐANG DÙNG của một em — chỉ giáo viên chủ lớp.
 *
 * Trả `pin: null` khi mã được cấp trước 2026-08-22 (thời máy chủ chỉ giữ bản băm, không đọc
 * ngược được): giáo viên cấp lại một lần là từ đó về sau xem lại được thoải mái.
 */
const handleViewPin = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const studentId = typeof body.studentId === 'string' ? body.studentId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
  if (!await teacherCanAccessClass(db, uid, classId, classSnap.data()?.teacherId)) {
    return res.status(403).json({ error: 'Bạn không có quyền xem mã PIN của lớp này.' });
  }

  const studentSnap = await classSnap.ref.collection('students').doc(studentId).get();
  if (!studentSnap.exists) return res.status(404).json({ error: 'Không tìm thấy học sinh trong lớp này.' });

  const secretSnap = await classSnap.ref.collection('studentSecrets').doc(studentId).get();
  const pin = String(secretSnap.data()?.pinPlain || '') || null;

  return res.status(200).json({
    studentId,
    name: String(studentSnap.data()?.name || ''),
    pin,
  });
};

/**
 * Xoá học sinh khỏi server và THU HỒI quyền truy cập: xoá roster, xoá bí mật PIN, gỡ mọi
 * studentLinks đang trỏ vào em này. Không làm gì thì "xoá" trên giao diện chỉ là xoá local —
 * em ấy vẫn vào được bằng mã lớp + PIN cũ.
 */
const handleRevokeStudentAccess = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const studentId = typeof body.studentId === 'string' ? body.studentId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
  if (!await teacherCanAccessClass(db, uid, classId, classSnap.data()?.teacherId)) {
    return res.status(403).json({ error: 'Bạn không có quyền thu hồi học sinh khỏi lớp này.' });
  }

  // Firestore delete trên document không tồn tại vẫn thành công — khỏi kiểm exists từng cái.
  await classSnap.ref.collection('students').doc(studentId).delete();
  await classSnap.ref.collection('studentSecrets').doc(studentId).delete();
  // PIN phụ huynh (bản đọc được), thống kê và báo cáo đã công bố của em này cũng phải đi theo.
  await purgeParentData(db, classSnap.ref, studentId);
  // Đếm LẠI sĩ số từ danh sách thật (trước đây xoá không trừ, sĩ số lệch dần — vd 12LoTrinh1 hiện 9, thật 8).
  const remaining = await classSnap.ref.collection('students').get();
  await classSnap.ref.update({ studentCount: remaining.size, updatedAt: new Date().toISOString() });

  const links = await db.collection('studentLinks').where('studentId', '==', studentId).get();
  let batch = db.batch();
  let pending = 0;
  let revokedLinks = 0;
  for (const l of links.docs) {
    batch.delete(l.ref);
    revokedLinks += 1;
    pending += 1;
    if (pending >= 400) { await batch.commit(); batch = db.batch(); pending = 0; }
  }
  if (pending > 0) await batch.commit();

  return res.status(200).json({ revoked: true, revokedLinks });
};

/**
 * Gỡ toàn bộ dữ liệu LỚP khỏi server khi giáo viên xoá lớp: roster, bí mật PIN, document lớp
 * và mọi studentLinks của lớp. Điểm/bài nộp CỐ Ý GIỮ LẠI để đối chiếu sau; quyền truy cập
 * học sinh chết ngay vì studentLinks đã bị gỡ.
 */
const handleRevokeClass = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
  const classAccess = await readClassAccess(db, classId, uid);
  if (!classAccess || !classAccess.access.isOwner) {
    return res.status(403).json({ error: 'Chỉ giáo viên chủ lớp mới gỡ được dữ liệu lớp.' });
  }

  const [students, secrets, links] = await Promise.all([
    classSnap.ref.collection('students').get(),
    classSnap.ref.collection('studentSecrets').get(),
    db.collection('studentLinks').where('classId', '==', classId).get(),
  ]);

  let batch = db.batch();
  let pending = 0;
  let removedStudents = 0;
  let removedSecrets = 0;
  let revokedLinks = 0;

  // await được thật sự: hàm phụ là async và mọi nơi gọi đều await. Bản trước dùng forEach nên
  // lệnh ghi giữa chừng bị bắn đi mà không chờ — lỗi biến mất không dấu vết.
  const xoa = async (ref: FirebaseFirestore.DocumentReference) => {
    batch.delete(ref);
    pending += 1;
    if (pending >= 400) { await batch.commit(); batch = db.batch(); pending = 0; }
  };
  for (const d of students.docs) { await xoa(d.ref); removedStudents += 1; }
  for (const d of secrets.docs) { await xoa(d.ref); removedSecrets += 1; }
  for (const d of links.docs) { await xoa(d.ref); revokedLinks += 1; }
  await xoa(classSnap.ref);
  if (pending > 0) await batch.commit();
  // Dữ liệu cổng phụ huynh của cả lớp (PIN đọc được, báo cáo đã công bố, thống kê).
  await purgeParentData(db, classSnap.ref);

  return res.status(200).json({
    revoked: true,
    removedStudents,
    removedSecrets,
    revokedLinks,
  });
};

/**
 * Bảng PIN của CẢ LỚP để giáo viên phát cho học sinh.
 *
 * Bảng lúc cấp chỉ hiện một lần, mà giáo viên thì cần phát lại nhiều lần: em mới vào lớp, phụ
 * huynh hỏi lại, đổi điện thoại... Từ khi máy chủ lưu thêm `pinPlain` thì đọc lại được, nên
 * không bắt cấp mã mới chỉ để xem mã cũ nữa.
 *
 * Em nào được cấp PIN trước khi có `pinPlain` sẽ trả `pin: null` — nơi gọi hiện rõ để giáo viên
 * biết cần cấp lại riêng em đó, chứ không im lặng bỏ sót.
 */
const handleViewClassPins = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
  if (!await teacherCanAccessClass(db, uid, classId, classSnap.data()?.teacherId)) {
    return res.status(403).json({ error: 'Bạn không có quyền xem mã PIN của lớp này.' });
  }

  const [students, secrets] = await Promise.all([
    classSnap.ref.collection('students').get(),
    classSnap.ref.collection('studentSecrets').get(),
  ]);
  const pinTheoId = new Map(secrets.docs.map(d => [d.id, String(d.data()?.pinPlain || '')]));

  const rows = students.docs
    .map(d => ({
      studentId: d.id,
      name: String(d.data()?.name || ''),
      pin: pinTheoId.get(d.id) || null,
    }))
    .filter(r => r.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  return res.status(200).json({
    joinCode: String(classSnap.data()?.joinCode || ''),
    className: String(classSnap.data()?.name || ''),
    rows,
  });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Chỉ nhận POST' });
  }

  // Webhook SePay (tiền nạp ví AI vào tài khoản ngân hàng) đi chung function để không vượt trần 12 function.
  if (req.query?.hook === 'sepay') {
    try {
      return await handleSepayWebhook(getAdminDb(), req, res);
    } catch (error) {
      console.error('[classroom] webhook SePay lỗi', error);
      return res.status(500).json({ success: false });
    }
  }

  const body = readBody(req);
  const action = String(body.action || '');
  // Ngữ cảnh đếm token (chấm bài thi online dùng khoá chung). Không tốn gì với action không gọi AI.
  return runWithAiUsage(
    createAiUsageContext(body.idToken, action, body as Record<string, unknown>),
    () => dispatchClassroom(res, body, action),
  );
}

async function dispatchClassroom(res: VercelResponse, body: ReturnType<typeof readBody>, action: string) {
  try {
    const db = getAdminDb();
    if (await handleAdminAction(db, body, res)) return;
    if (await handleTeacherAction(db, body, res)) return;
    if (await handleClassroomOnlineAction(db, body, res)) return;
    if (await handleScoreBookAction(db, body, res)) return;
    if (await handleParentReportAction(db, body, res)) return;
    if (await handleSsmTemplateAction(body, res)) return;
    if (await handleTimetableAction(body, res)) return;
    if (await handlePortfolioAction(db, body, res)) return;
    if (await handleAiKeyAction(db, body, res)) return;
    if (await handleAiBillingAction(db, body, res)) return;
    if (await handleAdminLinkAction(body, res)) return;
    if (await handleParentPortalAction(db, body, res)) return;
    if (await handleStudentAiCostAction(db, body, res)) return;
    if (action === 'roster') return await handleRoster(db, body, res);
    if (action === 'login') return await handleLogin(db, body, res);
    if (action === 'studentAssignments') return await handleStudentAssignments(db, body, res);
    if (action === 'studentSubmissions') return await handleStudentSubmissions(db, body, res);
    if (action === 'studentNotifications') return await handleStudentNotifications(db, body, res);
    if (action === 'issuePins') return await handleIssuePins(db, body, res);
    if (action === 'resetOnePin') return await handleResetOnePin(db, body, res);
    if (action === 'viewPin') return await handleViewPin(db, body, res);
    if (action === 'viewClassPins') return await handleViewClassPins(db, body, res);
    if (action === 'revokeStudentAccess') return await handleRevokeStudentAccess(db, body, res);
    if (action === 'revokeClass') return await handleRevokeClass(db, body, res);
    if (action === 'createSupplementSubmission') return await handleCreateSupplementSubmission(db, body, res);
    if (action === 'deleteSubmission') return await handleDeleteSubmission(db, body, res);
    if (action === 'saveSubmissionGrade') return await handleSaveSubmissionGrade(db, body, res);
    if (action === 'fixAnswerKeyForClass') return await handleFixAnswerKeyForClass(db, body, res);
    if (action === 'setSubmissionExamCode') return await handleSetSubmissionExamCode(db, body, res);
    if (action === 'deleteSubmissionGrade') return await handleDeleteSubmissionGrade(db, body, res);
    if (action === 'approveSubmissionGrade') return await handleApproveSubmissionGrade(db, body, res);
    if (action === 'retryEvidenceSync') return await handleRetryEvidenceSync(db, body, res);
    if (action === 'syncSkillEvidence') return await handleSyncSkillEvidence(db, body, res);
    if (action === 'deleteAssignment') return await handleDeleteAssignment(db, body, res);
    return res.status(400).json({ error: `Hành động không hợp lệ: ${action}` });
  } catch (error) {
    if (error instanceof AiKeyRequiredError) return res.status(402).json(aiKeyRequiredPayload(error));
    console.error('[classroom] lỗi', error);
    return res.status(500).json({ error: 'Máy chủ gặp lỗi. Thử lại sau ít phút.' });
  }
}
