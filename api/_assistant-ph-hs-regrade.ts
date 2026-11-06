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
import { AiKeyRequiredError } from './_ai-keys.js';
import { bumpQuota, chayNgam, getGradingChain, remainingQuota, rollQuota, today, type QuotaDoc } from './_grading-core.js';
import { sendStyled } from './_assistant-zalo-send.js';
import { MENU_HINT } from './_assistant-ph-hs-menu.js';
import type { SubmissionDoc } from '../src/lib/classroom/types.js';
import { awaitsClarification } from '../src/lib/classroom/clarification.js';

const SUBMISSIONS = 'submissions';

export const REGRADE_REPLIES = {
  notFound: `ℹ️ Em chưa có bài nào đã chấm để chấm lại.\n\nNhắn 8 để nộp bài bằng ảnh rồi chấm lại nhé.\n\n${MENU_HINT}`,
  alreadyApproved: `✅ Bài này thầy cô đã duyệt điểm chính thức nên không chấm lại được nữa.\n\nEm có thắc mắc thì nhắn thầy cô nhé.\n\n${MENU_HINT}`,
  alreadyUsed: `ℹ️ Em đã dùng lượt chấm lại cho bài này rồi.\n\nNếu vẫn thấy chưa đúng, em nhắn thầy cô kiểm tra giúp nhé.\n\n${MENU_HINT}`,
  busy: `⏳ Bài này đang được chấm, em chờ một chút rồi thử lại nhé.\n\n${MENU_HINT}`,
  noKey: `⚠️ Máy chấm của lớp đang tạm dừng, thầy cô sẽ chấm sớm.\n\n${MENU_HINT}`,
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
  token: string,
): Promise<RegradeOutcome> => {
  const db = getAdminDb();
  if (!token || getGradingChain().length === 0) return { kind: 'rejected', reply: REGRADE_REPLIES.noKey };
  // Bài đã chấm gần nhất của chính em trong lớp này.
  const snaps = await db.collection(SUBMISSIONS)
    .where('studentId', '==', studentId)
    .where('classId', '==', classId)
    .limit(50)
    .get();
  const graded = snaps.docs
    .map(doc => ({ id: doc.id, data: doc.data() as SubmissionDoc & { regradeRequestedAt?: number } }))
    .filter(item => item.data.grade && item.data.status !== 'grading')
    // `gradedAt` là CHUỖI ISO (không phải number) — Number() trên nó ra NaN, làm sắp xếp
    // chọn sai bài. Dùng Date.parse; thiếu thì coi như cũ nhất.
    .sort((a, b) => {
      const at = (x: typeof a) => { const t = Date.parse(String(x.data.grade?.gradedAt ?? '')); return Number.isFinite(t) ? t : 0; };
      return at(b) - at(a);
    });
  if (!graded.length) return { kind: 'rejected', reply: REGRADE_REPLIES.notFound };
  // Chọn bài GẦN NHẤT mà CÒN chấm lại được — không phải bài mới nhất tuyệt đối.
  // Lỗi thật 29/10: bài mới nhất thường đã được GV duyệt (hoặc đã dùng lượt), nên HS xin
  // chấm lại bài khác thì bị từ chối oan dù vẫn còn bài chưa duyệt.
  const target = graded.find(item => item.data.grade?.teacherApproved !== true && !item.data.regradeRequestedAt);
  if (!target) {
    // Không còn bài nào chấm lại được → nói đúng lý do của bài gần nhất.
    const newest = graded[0];
    return { kind: 'rejected', reply: newest.data.grade?.teacherApproved === true
      ? REGRADE_REPLIES.alreadyApproved
      : REGRADE_REPLIES.alreadyUsed };
  }

  // Đặt cờ TRƯỚC khi chấm: 2 tin "chấm lại" song song chỉ 1 lượt thắng (transaction).
  const claimed = await db.runTransaction(async tx => {
    const ref = db.collection(SUBMISSIONS).doc(target.id);
    const fresh = (await tx.get(ref)).data() as (SubmissionDoc & { regradeRequestedAt?: number }) | undefined;
    if (!fresh || fresh.classId !== classId || fresh.studentId !== studentId || fresh.grade?.teacherApproved === true || fresh.regradeRequestedAt) return 'used';
    if (fresh.status === 'grading' || fresh.status === 'submitted' || awaitsClarification(fresh.grade?.questionResults)) return 'busy';
    if (!fresh.teacherId) return 'used';
    const quotaRef = db.collection('gradingQuota').doc(fresh.teacherId);
    const quotaSnap = await tx.get(quotaRef);
    const quota = rollQuota(quotaSnap.exists ? quotaSnap.data() as Partial<QuotaDoc> : null, today());
    const verdict = remainingQuota(quota, 'self', fresh.studentId);
    if (verdict.allowed <= 0) return { reason: verdict.reason };
    tx.set(quotaRef, bumpQuota(quota, 'self', fresh.studentId, 1));
    tx.update(ref, { regradeRequestedAt: Date.now(), updatedAt: new Date().toISOString() });
    return 'claimed';
  });
  if (typeof claimed === 'object') return { kind: 'rejected', reply: claimed.reason };
  if (claimed !== 'claimed') return { kind: 'rejected', reply: claimed === 'busy' ? REGRADE_REPLIES.busy : REGRADE_REPLIES.alreadyUsed };

  const title = String((target.data as any).assignmentTitle ?? 'bài đã nộp');
  // `chayNgam` trả FALSE khi môi trường không có `waitUntil` (local/test) — khi đó PHẢI chờ
  // chấm xong mới trả lời, nếu bỏ qua giá trị trả về thì việc chấm KHÔNG BAO GIỜ CHẠY
  // (lỗi thật 29/10: bấm chấm lại thấy "đang chấm" nhưng gradedAt không đổi).
  const background = regradeAndNotify(token, userId, chatId, target.id, title, classId);
  if (!chayNgam(background)) await background;
  return { kind: 'started', submissionId: target.id, title };
};

/** Chấm lại nền rồi báo HS — dùng CHUNG đường chấm của web, chế độ `thorough`. */
const regradeAndNotify = async (
  token: string, userId: string, chatId: string, submissionId: string, title: string, classId: string,
): Promise<void> => {
  try {
    const db = getAdminDb();
    // Khoá chấm bài nay do MÁY CHỦ giữ (chuỗi `getGradingChain`). Không có lớp nào thì báo
    // ngay, đừng để HS chờ tới lúc chấm xong mới biết.
    if (getGradingChain().length === 0) { await sendStyled(token, chatId, REGRADE_REPLIES.noKey); return; }
    const subSnap = await db.collection(SUBMISSIONS).doc(submissionId).get();
    if (!subSnap.exists) { await sendStyled(token, chatId, `Không tìm thấy bài "${title}".`); return; }
    const sub = subSnap.data() as SubmissionDoc;
    const aSnap = await db.collection('assignments').doc(String(sub.assignmentId)).get();
    if (!aSnap.exists) { await sendStyled(token, chatId, `Bài "${title}" không còn tồn tại.`); return; }
    const ctx = await gradeContextFor(aSnap.data() as Record<string, unknown>);
    const result = await gradeOneSubmission(
      db, submissionId, ctx, '', String(sub.teacherId), false,
      'thorough',
    );
    console.log(`[regrade] cham lai xong | success=${result.success} | failureCode=${result.failureCode ?? '-'}`);
    const fresh = (await db.collection(SUBMISSIONS).doc(submissionId).get()).data() as SubmissionDoc | undefined;
    if (result.success && fresh?.grade) {
      await sendStyled(token, chatId, [
        `Đã đọc lại bài "${title}" ở chế độ đọc kỹ.`,
        fresh.grade.teacherApproved === true
          ? 'Thầy cô đã duyệt. Em nhắn 2 để xem kết quả trên hồ sơ đang liên kết.'
          : 'Kết quả chờ thầy cô duyệt. Sau khi được duyệt, em nhắn 2 để xem điểm và nhận xét.',
        '', MENU_HINT,
      ].join('\n'));
      return;
    }
    await sendStyled(token, chatId, [`⚠️ Chưa chấm lại được bài "${title}".`, 'Bài và ảnh vẫn được giữ. Em nhờ thầy cô kiểm tra; nếu cần thêm hoặc thay ảnh, nhắn bổ sung hoặc nộp lại.', '', MENU_HINT].join('\n'));
  } catch (error) {
    console.error('[regrade] không hoàn tất:', error instanceof AiKeyRequiredError ? 'ai_key_required' : 'grading_failed');
    const msg = error instanceof AiKeyRequiredError
      ? REGRADE_REPLIES.noKey
      : `⚠️ Chưa chấm lại được bài "${title}".\n\nEm thử lại sau hoặc nhờ thầy cô nhé.\n\n${MENU_HINT}`;
    await sendStyled(token, chatId, msg).catch(() => undefined);
  }
};
