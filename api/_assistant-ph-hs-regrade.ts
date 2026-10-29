/**
 * HS XIN CHẤM LẠI bài đã có điểm (chốt chủ dự án 29/10).
 *
 * VÌ SAO: máy chấm lần đầu ở chế độ `quick` (nhanh, rẻ) — đôi khi đọc nhầm chữ viết tay
 * hoặc công thức. Trước đây HS thấy điểm sai KHÔNG có cách nào xin chấm lại: API web chặn
 * thẳng ("Máy đã đọc bài này rồi"), chỉ GV mới chấm lại được. HS phải nhờ thầy cô.
 *
 * NAY: HS nhắn "chấm lại" → chấm lại bằng chế độ `thorough` (chép bài thành chữ/LaTeX MỘT LẦN
 * rồi mới chấm — chính là "máy dò ép đọc chuẩn" trước khi chấm), tốn hơn nhưng chính xác hơn.
 *
 * CHỐT AN TOÀN (không đốt tiền, không phá dữ liệu):
 * - Tối đa 1 lần/bài (đếm bằng trường `regradeRequestedAt` trên submission).
 * - GV đã duyệt điểm → KHÔNG cho HS chấm lại (điểm đã chính thức).
 * - Bài đang chấm → không cho (tránh 2 lượt song song).
 * - Hết hạn mức chấm của lớp → báo rõ, không âm thầm thất bại.
 */
import { getAdminDb } from './_exam-core.js';
import { gradeContextFor, gradeOneSubmission } from './grade-homework.js';
import { AiKeyRequiredError, ensureGeminiKey } from './_ai-keys.js';
import { getGradingApiKey } from './_grading-core.js';
import { chayNgam } from './_grading-core.js';
import { sendStyled } from './_assistant-zalo-send.js';
import { MENU_HINT } from './_assistant-ph-hs-menu.js';
import type { SubmissionDoc } from '../src/lib/classroom/types.js';

const SUBMISSIONS = 'submissions';
/** Ngân sách chấm lại: dài hơn lượt đầu (chế độ thorough cần chép bài trước). */
const REGRADE_BUDGET_MS = 70_000;
const REGRADE_MARGIN_MS = 8_000;

export const REGRADE_REPLIES = {
  notFound: `Em chưa có bài nào đã chấm để chấm lại. Nộp bài bằng ảnh (nhắn 8) rồi chấm lại nhé.\n\n${MENU_HINT}`,
  alreadyApproved: `Bài này thầy cô đã duyệt điểm chính thức nên không chấm lại được nữa. Em có thắc mắc thì nhắn thầy cô nhé.\n\n${MENU_HINT}`,
  alreadyUsed: `Em đã dùng lượt chấm lại cho bài này rồi. Nếu vẫn thấy chưa đúng, em nhắn thầy cô kiểm tra giúp nhé.\n\n${MENU_HINT}`,
  busy: `Bài này đang được chấm, em chờ một chút rồi thử lại nhé.\n\n${MENU_HINT}`,
  noKey: `Máy chấm của lớp đang tạm dừng, thầy cô sẽ chấm sớm.\n\n${MENU_HINT}`,
} as const;

export type RegradeOutcome =
  | { kind: 'started'; submissionId: string; title: string }
  | { kind: 'rejected'; reply: string };

/**
 * Bắt đầu chấm lại bài GẦN NHẤT đã chấm của em.
 * Trả `started` (đã đặt cờ + giao việc chấm nền) hoặc `rejected` kèm câu trả lời cho HS.
 */
export const requestRegrade = async (
  botId: string,
  userId: string,
  chatId: string,
  classId: string,
  studentId: string,
): Promise<RegradeOutcome> => {
  const db = getAdminDb();
  // Bài đã chấm gần nhất của chính em trong lớp này.
  const snaps = await db.collection(SUBMISSIONS)
    .where('studentId', '==', studentId)
    .where('classId', '==', classId)
    .limit(50)
    .get();
  const graded = snaps.docs
    .map(doc => ({ id: doc.id, data: doc.data() as SubmissionDoc & { regradeRequestedAt?: number } }))
    .filter(item => item.data.grade && item.data.status !== 'grading')
    .sort((a, b) => Number(b.data.grade?.gradedAt ?? 0) - Number(a.data.grade?.gradedAt ?? 0));
  const target = graded[0];
  if (!target) return { kind: 'rejected', reply: REGRADE_REPLIES.notFound };
  if (target.data.grade?.teacherApproved === true) return { kind: 'rejected', reply: REGRADE_REPLIES.alreadyApproved };
  if (target.data.status === 'grading') return { kind: 'rejected', reply: REGRADE_REPLIES.busy };
  if (target.data.regradeRequestedAt) return { kind: 'rejected', reply: REGRADE_REPLIES.alreadyUsed };

  // Đặt cờ TRƯỚC khi chấm: 2 tin "chấm lại" song song chỉ 1 lượt thắng (transaction).
  const claimed = await db.runTransaction(async tx => {
    const ref = db.collection(SUBMISSIONS).doc(target.id);
    const fresh = (await tx.get(ref)).data() as (SubmissionDoc & { regradeRequestedAt?: number }) | undefined;
    if (!fresh || fresh.grade?.teacherApproved === true || fresh.regradeRequestedAt) return false;
    tx.update(ref, { regradeRequestedAt: Date.now(), updatedAt: Date.now() });
    return true;
  });
  if (!claimed) return { kind: 'rejected', reply: REGRADE_REPLIES.alreadyUsed };

  const title = String((target.data as any).assignmentTitle ?? 'bài đã nộp');
  chayNgam(regradeAndNotify(botId, userId, chatId, target.id, title, classId));
  return { kind: 'started', submissionId: target.id, title };
};

/** Chấm lại nền rồi báo HS — dùng CHUNG đường chấm của web, chế độ `thorough`. */
const regradeAndNotify = async (
  botId: string, userId: string, chatId: string, submissionId: string, title: string, classId: string,
): Promise<void> => {
  try {
    const db = getAdminDb();
    const apiKey = getGradingApiKey();
    await ensureGeminiKey(apiKey);
    const subSnap = await db.collection(SUBMISSIONS).doc(submissionId).get();
    if (!subSnap.exists) { await sendStyled(botId, chatId, `Không tìm thấy bài "${title}".`); return; }
    const sub = subSnap.data() as SubmissionDoc;
    const aSnap = await db.collection('assignments').doc(String(sub.assignmentId)).get();
    if (!aSnap.exists) { await sendStyled(botId, chatId, `Bài "${title}" không còn tồn tại.`); return; }
    const ctx = await gradeContextFor(aSnap.data() as Record<string, unknown>);
    const result = await gradeOneSubmission(
      db, submissionId, ctx, apiKey, String(sub.teacherId), false,
      'thorough', undefined, REGRADE_BUDGET_MS, REGRADE_MARGIN_MS,
    );
    const fresh = (await db.collection(SUBMISSIONS).doc(submissionId).get()).data() as SubmissionDoc | undefined;
    if (result.success && fresh?.grade) {
      await sendStyled(botId, chatId, [
        `Đã chấm lại bài "${title}" (chế độ đọc kỹ): ${fresh.grade.score}/${fresh.grade.maxScore} điểm`,
        'Lượt này máy đọc lại toàn bộ bài trước khi chấm nên chính xác hơn lượt đầu.',
        'Điểm vẫn chờ thầy cô duyệt mới chính thức.',
        '', MENU_HINT,
      ].join('\n'));
      return;
    }
    await sendStyled(botId, chatId, [`Chưa chấm lại được bài "${title}".`, 'Thầy cô sẽ kiểm tra giúp em.', '', MENU_HINT].join('\n'));
  } catch (error) {
    const msg = error instanceof AiKeyRequiredError
      ? REGRADE_REPLIES.noKey
      : `Chưa chấm lại được bài "${title}". Em thử lại sau hoặc nhờ thầy cô nhé.\n\n${MENU_HINT}`;
    await sendStyled(botId, chatId, msg).catch(() => undefined);
    console.error('[regrade] lỗi:', error instanceof Error ? error.message.slice(0, 200) : error);
  }
};
