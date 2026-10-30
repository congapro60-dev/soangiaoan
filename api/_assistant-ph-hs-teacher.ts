/**
 * GV-1 (2026-10-27) — vai GIÁO VIÊN trên bot Zalo, phạm vi CHỈ ĐỌC:
 * menu `gv` + 2 lệnh đọc (`lop`, `chua nop`) + `web` + push "HS vừa nộp bài" cho GV đã link.
 * Không có lệnh ghi/xóa — nhóm B (duyệt điểm kèm phân tích, chốt hạn) làm ở GV-2; nhóm C chặn qua bot.
 * Mọi truy vấn lọc theo teacherId == actor.firebaseUid — cùng ngưỡng quyền với runAssistantReadTool.
 */
import type { Firestore } from 'firebase-admin/firestore';
import { resolveChannelActor } from './_assistant-auth.js';
import type { AssistantActor } from './_assistant-types.js';
import { sendStyled } from './_assistant-zalo-send.js';
import { WEB_PORTAL_BASE } from './_assistant-ph-hs-menu.js';

export const TEACHER_HINT = 'Nhắn: gv để xem lại menu.';
const NO_TEACHER = 'Chỉ thầy cô mới dùng được lệnh này.';

export const teacherMenuReply = (): string => [
  '👑 MENU THẦY CÔ (chỉ xem):',
  '• lop — danh sách lớp',
  '• chua nop — bài đang nhận nộp + HS chưa nộp',
  '• web — mở trang quản trị',
  '',
  TEACHER_HINT,
].join('\n');

/** Bỏ dấu + hạ chữ để khớp lệnh gõ tay: 'LỚP' == 'lop'. Khớp 'đổi vai' ở bot dispatch. */
const plain = (message: string): string =>
  message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim().toLowerCase();

export type TeacherCommand = 'menu' | 'classes' | 'pending' | 'web';
export const parseTeacherCommand = (message: string): TeacherCommand | null => {
  const p = plain(message);
  if (p === 'gv' || p === '/gv' || p === '/teacher') return 'menu';
  if (p === 'lop' || p === 'xem lop') return 'classes';
  if (p === 'chua nop' || p === 'xem chua nop') return 'pending';
  if (p === 'web' || p === '/web') return 'web';
  return null;
};

export const teacherClassesReply = async (db: Firestore, actor: AssistantActor): Promise<string> => {
  const snap = await db.collection('classes').where('teacherId', '==', actor.firebaseUid).get();
  const classes = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })).slice(0, 10);
  if (!classes.length) return ['Bạn chưa có lớp nào trên hệ thống.', '', TEACHER_HINT].join('\n');
  const lines = await Promise.all(classes.map(async (c, index) => {
    const roster = await db.collection('classes').doc(c.id).collection('students').get();
    return `${index + 1}. ${String(c.name ?? 'Chưa đặt tên')}${c.grade ? ` — ${String(c.grade)}` : ''} — ${roster.docs.length} HS`;
  }));
  return ['🏫 Lớp của thầy/cô:', ...lines, '', TEACHER_HINT].join('\n');
};

/** Bài đang mở (isOpen !== false) của tối đa 5 lớp, đếm HS đã nộp/chưa nộp theo danh sách lớp. */
export const teacherPendingReply = async (db: Firestore, actor: AssistantActor): Promise<string> => {
  const classesSnap = await db.collection('classes').where('teacherId', '==', actor.firebaseUid).get();
  const classes = classesSnap.docs.map(doc => ({ id: doc.id, name: String((doc.data() as any)?.name ?? 'Chưa đặt tên') })).slice(0, 5);
  const blocks: string[] = [];
  for (const cls of classes) {
    const aSnap = await db.collection('assignments').where('teacherId', '==', actor.firebaseUid).where('classId', '==', cls.id).get();
    const open = aSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })).filter(a => a.isOpen !== false).slice(0, 5);
    if (!open.length) continue;
    const roster = await db.collection('classes').doc(cls.id).collection('students').get();
    const total = roster.docs.length;
    const lines = await Promise.all(open.map(async a => {
      const subSnap = await db.collection('submissions').where('teacherId', '==', actor.firebaseUid).where('assignmentId', '==', a.id).get();
      const submitted = new Set(subSnap.docs.map(doc => String((doc.data() as any)?.studentId ?? '')).filter(Boolean));
      const conLai = Math.max(0, total - submitted.size);
      return `• ${String(a.title ?? 'Không tên')}${a.dueAt ? ` — hạn ${String(a.dueAt).slice(0, 10)}` : ''}: đã nộp ${submitted.size}/${total}${conLai ? ` — còn ${conLai} chưa nộp` : ' — đủ rồi'}`;
    }));
    blocks.push([`📌 ${cls.name}`, ...lines].join('\n'));
  }
  if (!blocks.length) return ['Không có bài nào đang nhận nộp.', '', TEACHER_HINT].join('\n');
  return ['📝 Bài đang nhận nộp:', '', ...blocks, '', TEACHER_HINT].join('\n');
};

/**
 * Push "HS vừa nộp bài" tới mọi bot-link teacher của GV (từ submission data, không tin từ user).
 * Bỏ qua chính tài khoản vừa nộp (tài khoản test giữ song song vai GV + HS) và link kênh khác zalo_bot.
 * Push là phụ: mọi lỗi bỏ qua — không chặn trả lời HS, không log dữ liệu nhạy cảm.
 */
export const notifyTeacherNewSubmission = async (
  db: Firestore, token: string,
  info: { teacherId: string; classId: string; studentId: string; assignmentTitle: string; photoCount: number; fromUserId: string },
): Promise<void> => {
  try {
    const links = await db.collection('channelLinks').where('firebaseUid', '==', info.teacherId).where('active', '==', true).get();
    const targets = links.docs.filter(doc => {
      const value = doc.data() as any;
      return (value.role ?? 'teacher') === 'teacher' && value.channel === 'zalo_bot' && value.channelUserId !== info.fromUserId;
    });
    if (!targets.length) return;
    const [student, classDoc] = await Promise.all([
      db.collection('classes').doc(info.classId).collection('students').doc(info.studentId).get(),
      db.collection('classes').doc(info.classId).get(),
    ]);
    const name = String((student.data() as any)?.name ?? 'Học sinh');
    const className = String((classDoc.data() as any)?.name ?? '');
    const text = [
      '📥 HS vừa nộp bài qua bot',
      `👤 ${name}`,
      ...(className ? [`🏫 Lớp: ${className}`] : []),
      `📝 ${info.assignmentTitle}`,
      `📷 ${info.photoCount} ảnh`,
      'Máy đang chấm — điểm sẽ hiện ở mục Điểm của HS.',
    ].join('\n');
    for (const target of targets) await sendStyled(token, String(target.data().channelUserId), text);
  } catch { /* phụ: bỏ qua */ }
};

/**
 * Nhận tin từ bot dispatch: trả null nếu không phải lệnh GV (caller chạy luồng cũ),
 * trả '' nếu đã xử lý VÀ tự gửi qua sendStyled (nội dung hệ tự dựng, không qua output() che link).
 */
export const teacherBotReply = async (
  db: Firestore, botId: string, userId: string, chatId: string, token: string, message: string,
): Promise<string | null> => {
  const cmd = parseTeacherCommand(message);
  if (!cmd) return null;
  let actor: AssistantActor | null = null;
  try { actor = await resolveChannelActor('zalo_bot' as any, botId, userId, chatId, db, { preferredRole: 'teacher' }); }
  catch { actor = null; }
  if (!actor || (actor.role ?? 'teacher') !== 'teacher') {
    // 'web' cũng là lệnh của PH/HS → nhường luồng cũ; các lệnh riêng của GV → chặn rõ ràng.
    return cmd === 'web' ? null : NO_TEACHER;
  }
  if (cmd === 'web') { await sendStyled(token, chatId, WEB_PORTAL_BASE, false); return ''; }
  const reply = cmd === 'menu' ? teacherMenuReply()
    : cmd === 'classes' ? await teacherClassesReply(db, actor)
    : await teacherPendingReply(db, actor);
  await sendStyled(token, chatId, reply);
  return '';
};
