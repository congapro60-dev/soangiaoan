/**
 * GV-1 & GV-2 (2026-10-27, cập nhật 04/11) — vai GIÁO VIÊN trên bot Zalo:
 * - Menu `gv` + xem danh sách lớp (`lop`)
 * - Bấm số `1`, `2`, `3`... hoặc `lop <số>` để xem chi tiết lớp + mã PIN học sinh
 * - Đóng vai bất kỳ HS hoặc PH nào trong các lớp mình dạy:
 *   `đổi vai <tên>` (sang Học sinh)
 *   `đổi vai ph <tên>` (sang Phụ huynh)
 *   `gv` hoặc `đổi vai gv` (quay lại vai Giáo viên)
 * - Bài chưa nộp (`chua nop`)
 * - Link quản trị (`web`)
 * - Push thông báo "HS vừa nộp bài" cho GV đã link
 */
import type { Firestore } from 'firebase-admin/firestore';
import { resolveChannelActor } from './_assistant-auth.js';
import type { AssistantActor } from './_assistant-types.js';
import { sendStyled } from './_assistant-zalo-send.js';
import { WEB_PORTAL_BASE } from './_assistant-ph-hs-menu.js';
import crypto from 'node:crypto';

export const TEACHER_HINT = 'Nhắn: gv để xem lại menu.';
const NO_TEACHER = 'Chỉ thầy cô mới dùng được lệnh này.';

export const teacherMenuReply = (): string => [
  '👩‍🏫 MENU GIÁO VIÊN:',
  '• lop — Danh sách lớp (nhắn 1, 2, 3... để xem chi tiết & mã PIN HS)',
  '• chua nop — Bài đang nhận nộp & HS chưa nộp',
  '• đổi vai <tên> — Đóng vai bất kỳ học sinh nào (ví dụ: đổi vai Tuệ Minh)',
  '• đổi vai ph <tên> — Đóng vai phụ huynh của học sinh đó',
  '• web — Mở trang quản trị SmartPlan Web',
  '',
  '💡 Khi đang đóng vai HS/PH: nhắn "gv" bất cứ lúc nào để quay lại vai Giáo viên.',
  '',
  TEACHER_HINT,
].join('\n');

/** Bỏ dấu + hạ chữ để khớp lệnh gõ tay: 'LỚP' == 'lop'. Khớp 'đổi vai' ở bot dispatch. */
export const plain = (message: string): string =>
  message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/\s+/g, ' ').trim().toLowerCase();

export type TeacherCommand =
  | { kind: 'menu' }
  | { kind: 'classes' }
  | { kind: 'classDetail'; classIndex: number; isBareNumber?: boolean }
  | { kind: 'pending' }
  | { kind: 'web' }
  | { kind: 'switch'; query: string; role: 'student' | 'parent' }
  | { kind: 'switchBack' }
  | { kind: 'switchGuide'; isBare?: boolean };

export const parseTeacherCommand = (message: string): TeacherCommand | null => {
  const p = plain(message);
  if (p === 'gv' || p === '/gv' || p === '/teacher' || p === 'menu gv') return { kind: 'menu' };
  if (p === 'lop' || p === 'xem lop' || p === 'danh sach lop') return { kind: 'classes' };
  if (p === 'chua nop' || p === 'xem chua nop') return { kind: 'pending' };
  if (p === 'web' || p === '/web') return { kind: 'web' };
  if (p === 'doi vai gv' || p === 've gv' || p === 'dong vai gv' || p === 'tro ve gv') return { kind: 'switchBack' };

  // Nhắn rõ "lop 1", "lop 2"
  const explicitClassMatch = /^lop\s+([1-9][0-9]*)$/.exec(p);
  if (explicitClassMatch) {
    return { kind: 'classDetail', classIndex: Number(explicitClassMatch[1]), isBareNumber: false };
  }

  // Nhắn số trần "1", "2"... 20
  const bareNumMatch = /^([1-9][0-9]*)$/.exec(p);
  if (bareNumMatch) {
    return { kind: 'classDetail', classIndex: Number(bareNumMatch[1]), isBareNumber: true };
  }

  // Đổi vai: "đổi vai [tên]", "đóng vai [tên]", "nhập vai [tên]"
  const switchMatch = /^(?:doi vai|dong vai|nhap vai)\s*(.*)$/.exec(p);
  if (switchMatch) {
    const rawRest = switchMatch[1].trim();
    if (!rawRest) return { kind: 'switchGuide', isBare: true };
    if (rawRest === 'gv' || rawRest === 'giao vien') return { kind: 'switchBack' };
    const phMatch = /^(?:ph|phu huynh)\s+(.+)$/.exec(rawRest);
    if (phMatch) {
      return { kind: 'switch', query: phMatch[1].trim(), role: 'parent' };
    }
    const hsMatch = /^(?:hs|hoc sinh)\s+(.+)$/.exec(rawRest);
    if (hsMatch) {
      return { kind: 'switch', query: hsMatch[1].trim(), role: 'student' };
    }
    return { kind: 'switch', query: rawRest, role: 'student' };
  }

  return null;
};

export const teacherClassesReply = async (db: Firestore, actor: AssistantActor): Promise<string> => {
  const snap = await db.collection('classes').where('teacherId', '==', actor.firebaseUid).get();
  const classes = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
  if (!classes.length) return ['Bạn chưa có lớp nào trên hệ thống.', '', TEACHER_HINT].join('\n');
  const lines = await Promise.all(classes.map(async (c, index) => {
    const roster = await db.collection('classes').doc(c.id).collection('students').get();
    return `${index + 1}. ${String(c.name ?? 'Chưa đặt tên')}${c.grade ? ` — Khối ${String(c.grade)}` : ''} — ${roster.docs.length} HS`;
  }));
  return [
    '🏫 Lớp của thầy/cô:',
    ...lines,
    '',
    '👉 Nhắn số thứ tự lớp (ví dụ: 1) để xem chi tiết danh sách học sinh & mã PIN.',
    '',
    TEACHER_HINT,
  ].join('\n');
};

export const teacherClassDetailReply = async (db: Firestore, actor: AssistantActor, index: number): Promise<string> => {
  const snap = await db.collection('classes').where('teacherId', '==', actor.firebaseUid).get();
  const classes = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
  if (!classes.length || index < 1 || index > classes.length) {
    return `Lớp số ${index} không tồn tại. Nhắn: lop để xem lại danh sách lớp.`;
  }
  const cls = classes[index - 1];
  const studentsSnap = await db.collection('classes').doc(cls.id).collection('students').get();
  const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

  students.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'));

  const secretsSnap = await db.collection('classes').doc(cls.id).collection('studentSecrets').get();
  const pinMap = new Map<string, string>();
  for (const doc of secretsSnap.docs) {
    const data = doc.data() as any;
    if (data.pinPlain) pinMap.set(doc.id, String(data.pinPlain));
  }

  const lines = students.map((s, idx) => {
    const pin = pinMap.get(s.id);
    return `${idx + 1}. ${s.name || 'Không tên'}${pin ? ` — PIN: ${pin}` : ''}`;
  });

  const more = '';
  const joinCodeText = cls.joinCode ? `🔑 Mã tham gia lớp: ${cls.joinCode}\n` : '';
  const sample = students[0]?.name ? students[0].name.split(' ').slice(-1)[0] : 'Tuệ Minh';

  return [
    `🏫 LỚP: ${cls.name ?? 'Không tên'}${cls.grade ? ` (Khối ${cls.grade})` : ''} — Sĩ số: ${students.length} HS`,
    joinCodeText,
    '👥 Danh sách học sinh & mã PIN:',
    ...lines,
    more,
    '',
    '🎭 ĐỔI VAI ĐỂ THỬ BOT:',
    `Thầy/cô chỉ cần nhắn: "đổi vai <tên>" (ví dụ: đổi vai ${sample})`,
    'Hoặc: "đổi vai ph <tên>" để đóng vai phụ huynh.',
    '',
    TEACHER_HINT,
  ].filter(Boolean).join('\n');
};

/** Bài đang mở (isOpen !== false) của tối đa 5 lớp, đếm HS đã nộp/chưa nộp theo danh sách lớp. */
export const teacherPendingReply = async (db: Firestore, actor: AssistantActor): Promise<string> => {
  const classesSnap = await db.collection('classes').where('teacherId', '==', actor.firebaseUid).get();
  const classes = classesSnap.docs.map(doc => ({ id: doc.id, name: String((doc.data() as any)?.name ?? 'Chưa đặt tên') }));
  const blocks: string[] = [];
  for (const cls of classes) {
    const aSnap = await db.collection('assignments').where('teacherId', '==', actor.firebaseUid).where('classId', '==', cls.id).get();
    const open = aSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })).filter(a => a.isOpen !== false);
    if (!open.length) continue;
    const roster = await db.collection('classes').doc(cls.id).collection('students').get();
    const total = roster.docs.length;
    const lines = await Promise.all(open.map(async a => {
      const subSnap = await db.collection('submissions').where('teacherId', '==', actor.firebaseUid).where('assignmentId', '==', a.id).get();
      const submitted = new Set(subSnap.docs.map(doc => String((doc.data() as any)?.studentId ?? '')).filter(Boolean));
      const conLai = Math.max(0, total - submitted.size);
      return `• ${String(a.title ?? 'Không tên')}${a.dueAt ? ` — hạn ${String(a.dueAt)}` : ''}: đã nộp ${submitted.size}/${total}${conLai ? ` — còn ${conLai} chưa nộp` : ' — đủ rồi'}`;
    }));
    blocks.push([`📌 ${cls.name}`, ...lines].join('\n'));
  }
  if (!blocks.length) return ['Không có bài nào đang nhận nộp.', '', TEACHER_HINT].join('\n');
  return ['📝 Bài đang nhận nộp:', '', ...blocks, '', TEACHER_HINT].join('\n');
};

export const teacherSwitchGuideReply = (): string => [
  '🎭 ĐỔI VAI DÀNH CHO GIÁO VIÊN:',
  'Thầy/cô có thể đóng vai bất kỳ học sinh hoặc phụ huynh nào trong lớp để thử nghiệm bot:',
  '',
  '• Sang HỌC SINH: nhắn "đổi vai <tên>" (Ví dụ: đổi vai Tuệ Minh)',
  '• Sang PHỤ HUYNH: nhắn "đổi vai ph <tên>\" (Ví dụ: đổi vai ph Tuệ Minh)',
  '• Quay lại GIÁO VIÊN: nhắn "gv" hoặc "đổi vai gv"',
  '',
  '👉 Nhắn "lop" rồi chọn số lớp để xem danh sách tên học sinh.',
  '',
  TEACHER_HINT,
].join('\n');

export const teacherSwitchRole = async (
  db: Firestore,
  botId: string,
  userId: string,
  actor: AssistantActor,
  query: string,
  targetRole: 'student' | 'parent',
  now = Date.now(),
): Promise<string> => {
  const clean = plain(query.trim());
  if (!clean) return teacherSwitchGuideReply();

  const classesSnap = await db.collection('classes').where('teacherId', '==', actor.firebaseUid).get();
  if (classesSnap.empty) {
    return 'Thầy/cô chưa có lớp nào trên hệ thống.';
  }

  const matches: Array<{ classId: string; className: string; studentId: string; studentName: string }> = [];
  for (const cDoc of classesSnap.docs) {
    const cData = cDoc.data() as any;
    const studentsSnap = await cDoc.ref.collection('students').get();
    for (const sDoc of studentsSnap.docs) {
      const sData = sDoc.data() as any;
      const sName = String(sData.name || '');
      if (plain(sName).includes(clean)) {
        matches.push({
          classId: cDoc.id,
          className: String(cData.name || 'Chưa đặt tên'),
          studentId: sDoc.id,
          studentName: sName,
        });
      }
    }
  }

  if (matches.length === 0) {
    return [
      `Không tìm thấy học sinh nào có tên khớp với "${query}" trong các lớp của thầy/cô.`,
      '',
      '👉 Nhắn "lop" rồi chọn số lớp để xem danh sách tên học sinh chính xác nhé.',
      '',
      TEACHER_HINT,
    ].join('\n');
  }

  if (matches.length > 1) {
    const lines = matches.slice(0, 6).map((m, idx) =>
      `${idx + 1}. ${m.studentName} (${m.className}) → nhắn: đổi vai ${targetRole === 'parent' ? 'ph ' : ''}${m.studentName}`
    );
    const more = matches.length > 6 ? `\n... và ${matches.length - 6} học sinh khác.` : '';
    return [
      `🔍 Tìm thấy ${matches.length} học sinh có tên khớp với "${query}":`,
      '',
      ...lines,
      more,
      '',
      'Thầy/cô gửi lại tên đầy đủ để bot chọn đúng em nhé.',
    ].join('\n');
  }

  const target = matches[0];
  const linkId = crypto.createHash('sha256').update(`${botId}|${userId}|${targetRole}|${target.classId}|${target.studentId}`).digest('hex');
  const linkRef = db.collection('channelLinks').doc(linkId);

  const existingSnap = await db.collection('channelLinks')
    .where('channel', '==', 'zalo_bot')
    .where('channelAccountId', '==', botId)
    .where('channelUserId', '==', userId)
    .get();

  await db.runTransaction(async tx => {
    for (const doc of existingSnap.docs) {
      const d = doc.data() as any;
      if ((d.role ?? 'teacher') === 'teacher') continue;
      if (doc.id !== linkId && d.active) {
        tx.update(doc.ref, { active: false, updatedAt: now });
      }
    }
    tx.set(linkRef, {
      firebaseUid: `pinlink:${targetRole}:${target.classId}:${target.studentId}`,
      channel: 'zalo_bot',
      channelAccountId: botId,
      channelUserId: userId,
      channelChatId: userId,
      role: targetRole,
      classId: target.classId,
      studentId: target.studentId,
      studentName: target.studentName,
      className: target.className,
      active: true,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  });

  const roleLabel = targetRole === 'student' ? 'HỌC SINH' : 'PHỤ HUYNH';
  return [
    `🎭 ĐÃ CHUYỂN SANG VAI ${roleLabel}: ${target.studentName} (Lớp ${target.className}).`,
    '',
    `Bây giờ thầy/cô đang trải nghiệm bot đúng như ${targetRole === 'student' ? 'em' : 'phụ huynh em'} ${target.studentName} nhìn thấy:`,
    '• Nhắn 0 để xem Menu.',
    '• Nhắn 8 để nộp bài tập bằng ảnh (tối đa 10 ảnh).',
    '• Hỏi bài tập, xem điểm... như người thật.',
    '',
    '💡 Muốn quay lại vai GIÁO VIÊN bất cứ lúc nào: nhắn "gv" hoặc "đổi vai gv".',
  ].join('\n');
};

export const teacherSwitchBackReply = async (
  db: Firestore,
  botId: string,
  userId: string,
  now = Date.now(),
): Promise<string> => {
  const existingSnap = await db.collection('channelLinks')
    .where('channel', '==', 'zalo_bot')
    .where('channelAccountId', '==', botId)
    .where('channelUserId', '==', userId)
    .get();

  let deactivated = false;
  await db.runTransaction(async tx => {
    for (const doc of existingSnap.docs) {
      const d = doc.data() as any;
      if ((d.role ?? 'teacher') !== 'teacher' && d.active === true) {
        tx.update(doc.ref, { active: false, updatedAt: now });
        deactivated = true;
      }
    }
  });

  return [
    deactivated ? '👩‍🏫 Đã thoát vai và QUAY TRỞ LẠI vai GIÁO VIÊN.' : '👩‍🏫 Thầy/cô đang ở vai GIÁO VIÊN.',
    '',
    teacherMenuReply(),
  ].join('\n');
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
    if (typeof db?.collection !== 'function') return;
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

  // Nếu DB không có hàm collection (mock rỗng trong test caller), an toàn thoát
  if (typeof db?.collection !== 'function') return null;

  let actor: AssistantActor | null = null;
  try { actor = await resolveChannelActor('zalo_bot' as any, botId, userId, chatId, db, { preferredRole: 'teacher' }); }
  catch { actor = null; }

  // Nếu không phải là teacher
  if (!actor || (actor.role ?? 'teacher') !== 'teacher') {
    // Với số trần, 'web', hoặc 'đổi vai' trần không có tham số:
    // nhường luồng student/parent/stranger xử lý
    if (cmd.kind === 'web' || (cmd.kind === 'classDetail' && cmd.isBareNumber) || (cmd.kind === 'switchGuide' && cmd.isBare)) {
      return null;
    }
    return NO_TEACHER;
  }

  // Tài khoản ĐÃ LÀ giáo viên: kiểm tra xem có đang đóng vai HS/PH hay không
  let hasActiveStudentOrParent = false;
  try {
    const existingLinks = await db.collection('channelLinks')
      .where('channel', '==', 'zalo_bot')
      .where('channelAccountId', '==', botId)
      .where('channelUserId', '==', userId)
      .where('active', '==', true)
      .get();
    hasActiveStudentOrParent = existingLinks.docs.some(d => {
      const r = (d.data() as any).role;
      return r === 'student' || r === 'parent';
    });
  } catch {
    hasActiveStudentOrParent = false;
  }

  // Nếu đang đóng vai HS/PH và nhắn số trần (1, 2, 3.. 8) hoặc 'web' → nhường luồng HS/PH
  if (hasActiveStudentOrParent && (cmd.kind === 'web' || (cmd.kind === 'classDetail' && cmd.isBareNumber))) {
    return null;
  }

  if (cmd.kind === 'web') {
    await sendStyled(token, chatId, WEB_PORTAL_BASE, false);
    return '';
  }
  if (cmd.kind === 'switchBack') {
    const text = await teacherSwitchBackReply(db, botId, userId);
    await sendStyled(token, chatId, text);
    return '';
  }
  if (cmd.kind === 'menu') {
    if (hasActiveStudentOrParent) {
      const text = await teacherSwitchBackReply(db, botId, userId);
      await sendStyled(token, chatId, text);
      return '';
    }
    await sendStyled(token, chatId, teacherMenuReply());
    return '';
  }
  if (cmd.kind === 'classes') {
    const text = await teacherClassesReply(db, actor);
    await sendStyled(token, chatId, text);
    return '';
  }
  if (cmd.kind === 'classDetail') {
    const text = await teacherClassDetailReply(db, actor, cmd.classIndex);
    await sendStyled(token, chatId, text);
    return '';
  }
  if (cmd.kind === 'pending') {
    const text = await teacherPendingReply(db, actor);
    await sendStyled(token, chatId, text);
    return '';
  }
  if (cmd.kind === 'switchGuide') {
    await sendStyled(token, chatId, teacherSwitchGuideReply());
    return '';
  }
  if (cmd.kind === 'switch') {
    const text = await teacherSwitchRole(db, botId, userId, actor, cmd.query, cmd.role);
    await sendStyled(token, chatId, text);
    return '';
  }

  return null;
};
