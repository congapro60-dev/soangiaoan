import type { Firestore, Query } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { deadlineTasksForStudent, digestText, digestWindow, sheetTaskRows, vietnamDate, type DeadlineConfig, type SheetTaskRow } from './_assistant-deadline.js';
import { deadlineOwner, publicationVersion, requireDeadlineSource, validateDeadlineConfig } from './_assistant-deadline-config.js';
import { readDeadlineSheet } from './_assistant-deadline-sheet.js';
import { deadlineRecipientAllowed, drainDeadlineOutbox, enqueueDeadlineDigest, syncDeadlineNotices, zaloDeadlineSender, type DeadlineDeliveryPolicy, type DeadlineNotice, type DeadlineTarget } from './_assistant-deadline-notify.js';

type Data = Record<string, any>;
interface Bundle {
  classId: string; teacherId: string; revision: number; settings: DeadlineConfig;
  publicationRevisions?: Record<string, number>;
  students: Data[]; assignments: Data[]; submissions: Data[]; rows: SheetTaskRow[];
}
export const deadlineDeliveryPolicy = (env: Record<string, string | undefined> = process.env): DeadlineDeliveryPolicy => ({
  enabled: env.ZALO_DEADLINE_ENABLED === 'true', botId: env.ZALO_BOT_ID || '',
  testUserIds: (env.ZALO_DEADLINE_TEST_USER_IDS || '').split(',').map(x => x.trim()).filter(Boolean),
  realDeliveryApproved: env.ZALO_DEADLINE_REAL_APPROVED === 'true', quotaVerified: env.ZALO_DEADLINE_QUOTA_VERIFIED === 'true',
});
async function records(query: Query, max = 2000): Promise<Data[]> {
  // ponytail: bounded per-class reads; add pagination before classes exceed this ceiling.
  const snap = await query.limit(max + 1).get();
  if (snap.size > max) throw new Error('Danh sách vượt giới hạn đọc; cần thu gọn trước khi nhắc việc.');
  return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}
/** No cache: source errors stop reminders, never manufacture an all-clear. */
export async function loadDeadlineClass(db: Firestore, classId: string, read = readDeadlineSheet, includeSubmissions = true): Promise<Bundle> {
  const [cls, config, students, regular, adaptive] = await Promise.all([
    db.collection('classes').doc(classId).get(), db.collection('assistantDeadlineConfig').doc(classId).get(),
    records(db.collection('classes').doc(classId).collection('students'), 100),
    records(db.collection('assignments').where('classId', '==', classId), 200),
    records(db.collection('adaptiveAssignments').where('classId', '==', classId), 100),
  ]);
  const owner = deadlineOwner(cls.data() || {}), stored = config.data() || {};
  if (!owner || stored?.teacherId !== owner || !stored.settings) throw new Error('Thầy cô chưa cấu hình deadline cho lớp.');
  const assignments: Data[] = [...regular, ...adaptive.map((a): Data => ({ ...a, id: `adaptive:${a.id}` }))].filter((a: Data) => a.teacherId === owner);
  let settings: DeadlineConfig, rows: SheetTaskRow[];
  if (stored.settings.spreadsheetId === '' && Array.isArray(stored.settings.tasks) && stored.settings.tasks.length === 0) {
    // Server-only homework configuration grants no Sheet access; identity remains the linked studentId.
    settings = { spreadsheetId: '', sheetTitle: '', sheetId: 0, studentNames: {}, tasks: [],
      notifications: stored.settings.notifications === true, digest: stored.settings.digest === true };
    rows = [];
  } else {
    if (![cls.data()?.sheetSync?.spreadsheetId, cls.data()?.examSheet?.spreadsheetId].includes(stored.settings.spreadsheetId)) throw new Error('Nguồn deadline đã thay đổi; thầy cô cần nối lại.');
    await requireDeadlineSource(db, classId, owner, stored.settings.spreadsheetId);
    settings = validateDeadlineConfig(stored.settings, students, assignments);
    const source = await read(settings);
    rows = sheetTaskRows(settings, source.grid);
    for (const task of settings.tasks) {
      const col = (source.grid[1] || []).findIndex((cell, i) => i >= 2 && String(cell?.formattedValue || '').normalize('NFC').trim().replace(/\s+/gu, ' ') === task.header);
      if (stored.columnBindings?.[task.id] !== col) throw new Error('Cột deadline đã đổi; thầy cô cần đọc lại nguồn và lưu ánh xạ trước khi dùng.');
    }
  }
  const [uploads, online, progress] = includeSubmissions ? await Promise.all([
    records(db.collection('submissions').where('classId', '==', classId)),
    records(db.collection('examSubmissions').where('classId', '==', classId)),
    records(db.collection('adaptiveAssignmentProgress').where('classId', '==', classId)),
  ]) : [[], [], []];
  const submissions: Data[] = [...uploads, ...online, ...progress.filter(p => p.attempts?.exitTicket).map((p): Data => ({ ...p, assignmentId: `adaptive:${p.assignmentId}`, status: 'submitted' }))]
    .filter((s: Data) => s.classId === classId && (!s.teacherId || s.teacherId === owner));
  return { classId, teacherId: owner, revision: stored.revision, publicationRevisions: stored.publicationRevisions || {}, settings, students, assignments, submissions, rows };
}
export function studentDeadlineView(bundle: Bundle, studentId: string) {
  const student = bundle.students.find(s => s.id === studentId);
  if (!student || bundle.settings.spreadsheetId && !Object.hasOwn(bundle.settings.studentNames, student.code)) throw new Error('Chưa ghép mã HS với bảng deadline; em nhờ thầy cô kiểm tra.');
  return deadlineTasksForStudent(bundle.settings, student.code, studentId, bundle.rows, bundle.assignments,
    bundle.submissions.filter(s => s.studentId === studentId && s.classId === bundle.classId));
}
export async function deadlineMenuReply(db: Firestore, classId: string, studentId: string): Promise<string> {
  try { return digestText(studentDeadlineView(await loadDeadlineClass(db, classId), studentId), Date.now(), false); }
  catch { return 'Chưa xác minh được danh sách deadline. Em nhắn web để xem bài trên web, hoặc nhắn 0 để về menu. Nhờ thầy cô kiểm tra nguồn và mã HS; thông báo này chưa xác nhận em đã hoàn thành.'; }
}
export function noticesFor(bundle: Bundle, studentId: string): DeadlineNotice[] {
  return studentDeadlineView(bundle, studentId).map(item => {
    const assignment = bundle.assignments.find(a => a.id === item.assignmentId);
    const description = String(assignment?.description || '').replace(/https?:\/\/\S+/gi, bundle.settings.spreadsheetId ? '[mở qua mục deadline]' : '[mở qua web]').slice(0, 2000);
    return { classId: bundle.classId, teacherId: bundle.teacherId, studentId, taskId: item.id, title: item.title, dueAt: item.dueAt,
      description, url: item.url, version: publicationVersion({ dueAt: item.dueAt, description, targetStudentIds: assignment?.targetStudentIds,
        noticeRevision: [item.url, assignment?.noticeRevision || 0,
          bundle.settings.tasks.filter(t => item.assignmentId && t.assignmentId === item.assignmentId || `sheet:${t.id}` === item.id).map(t => [bundle.publicationRevisions?.[t.id] || 0, [...t.studentCodes].sort()])], isOpen: true }) };
  });
}
export const deadlineDispatchEligible = (job: Data, targets: DeadlineTarget[], policy: DeadlineDeliveryPolicy, now: number): boolean =>
  job.botId === policy.botId && deadlineRecipientAllowed(policy, job.userId) && job.nextAt <= now && job.attempts < 3
  && now - job.createdAt < 24 * 3600_000 && targets.some(t => t.linkId === job.linkId && t.userId === job.userId && t.studentId === job.studentId && t.teacherId === job.teacherId);
/** Polling runs separately from publication: provider/source failure cannot undo a teacher's save. */
export async function runDeadlineClass(db: Firestore, classId: string, policy: DeadlineDeliveryPolicy, token: string, now = Date.now()): Promise<void> {
  // ponytail: one Sheet snapshot per class/run, max 60s; a later run refreshes it.
  const startedAt = Date.now(), reads = new Map<string, ReturnType<typeof readDeadlineSheet>>();
  const read: typeof readDeadlineSheet = config => {
    if (Date.now() - startedAt > 60_000) throw new Error('Nguồn deadline cần làm mới ở lượt sau.');
    const key = JSON.stringify([config.spreadsheetId, config.sheetId, config.sheetTitle]);
    if (!reads.has(key)) reads.set(key, readDeadlineSheet(config));
    return reads.get(key)!;
  };
  const initial = await loadDeadlineClass(db, classId, read, false);
  const links = await records(db.collection('channelLinks').where('classId', '==', classId), 500);
  const pending = await db.collection('assistantDeadlineOutbox').where('classId', '==', classId).where('botId', '==', policy.botId)
    .where('state', 'in', ['pending', 'rejected']).where('nextAt', '<=', now).orderBy('nextAt').limit(100).get();
  const pollRef = db.collection('assistantDeadlinePollState').doc(classId), previous = (await pollRef.get()).data();
  const fingerprint = createHash('sha256').update(JSON.stringify([policy, initial, links])).digest('hex');
  const digestDue = initial.settings.digest && digestWindow(now) && previous?.digestDate !== vietnamDate(now);
  // ponytail: poll the bounded class snapshot; read submission history after source/link changes or queued delivery.
  if (previous?.fingerprint === fingerprint && !digestDue && pending.empty) return;
  const bundle = await loadDeadlineClass(db, classId, read);
  const targets: DeadlineTarget[] = links.filter(l => l.active && l.channel === 'zalo_bot' && l.channelAccountId === policy.botId
    && l.role === 'student' && (!l.channelChatId || l.channelChatId === l.channelUserId) && (!l.expiresAt || l.expiresAt > now)
    && bundle.students.some(s => s.id === l.studentId && (!bundle.settings.spreadsheetId || Object.hasOwn(bundle.settings.studentNames, s.code))))
    .sort((a, b) => a.id.localeCompare(b.id)).filter((l, i, all) => all.findIndex(x => x.studentId === l.studentId) === i)
    .map(l => ({ linkId: l.id, userId: l.channelUserId, studentId: l.studentId, classId, teacherId: bundle.teacherId }));
  const notices = targets.flatMap(t => noticesFor(bundle, t.studentId));
  // Off still advances the baseline; enabling later does not broadcast old work.
  await syncDeadlineNotices(db, classId, notices, targets, { ...policy, enabled: policy.enabled && bundle.settings.notifications }, now);
  if (bundle.settings.digest) for (const target of targets) await enqueueDeadlineDigest(db, target, studentDeadlineView(bundle, target.studentId), policy, now);
  const ready = await db.collection('assistantDeadlineOutbox').where('classId', '==', classId).where('botId', '==', policy.botId)
    .where('state', 'in', ['pending', 'rejected']).where('nextAt', '<=', now).orderBy('nextAt').limit(100).get();
  const jobs: Data[] = ready.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  // Ineligible recipients never occupy the send budget. Rotate unapproved jobs so a backlog cannot starve test recipients.
  for (const job of jobs.filter(j => !deadlineDispatchEligible(j, targets, policy, now))) {
    await db.runTransaction(async tx => {
      const ref = db.collection('assistantDeadlineOutbox').doc(job.id), current = (await tx.get(ref)).data();
      if (!current || !['pending', 'rejected'].includes(current.state)) return;
      const target = targets.some(t => t.linkId === current.linkId && t.userId === current.userId && t.studentId === current.studentId && t.teacherId === current.teacherId);
      tx.update(ref, !target || now - current.createdAt >= 24 * 3600_000 || current.attempts >= 3
        ? { state: 'cancelled', updatedAt: now } : { nextAt: now + 300_000 });
    });
  }
  const ids = jobs.filter(j => deadlineDispatchEligible(j, targets, policy, now)).slice(0, 20).map(j => j.id);
  await drainDeadlineOutbox(db, ids, policy, zaloDeadlineSender(token), async job => {
    const fresh = await loadDeadlineClass(db, classId, read);
    if (fresh.teacherId !== job.teacherId) return false;
    if (!fresh.students.some(s => s.id === job.studentId && (!fresh.settings.spreadsheetId || Object.hasOwn(fresh.settings.studentNames, s.code)))) return false;
    if (job.kind === 'digest') return fresh.settings.digest && digestWindow(now) && job.version === vietnamDate(now)
      && digestText(studentDeadlineView(fresh, job.studentId), now, true) === job.text;
    return fresh.settings.notifications && noticesFor(fresh, job.studentId).some(n => n.taskId === job.taskId && n.version === job.version);
  }, now);
  await pollRef.set({ fingerprint, ...(previous?.digestDate ? { digestDate: previous.digestDate } : {}),
    ...(digestDue ? { digestDate: vietnamDate(now) } : {}), updatedAt: now });
}

/** At most three classes per authenticated invocation; scheduler follows nextAfter for the rest. */
export async function runDeadlineBatch(db: Firestore, after = '') {
  const policy = deadlineDeliveryPolicy();
  if (!policy.enabled || !policy.botId || !process.env.ZALO_BOT_TOKEN) return { disabled: true };
  if (!(process.env.ZALO_BOT_ALLOWED_IDS || '').split(',').map(s => s.trim()).includes(policy.botId)) throw new Error('Bot chưa nằm trong danh sách cho phép.');
  const identity = await fetch(`https://bot-api.zaloplatforms.com/bot${encodeURIComponent(process.env.ZALO_BOT_TOKEN)}/getMe`, {
    method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(10_000),
  });
  const result = await identity.json().catch(() => null);
  if (!identity.ok || result?.ok !== true || String(result.result?.id) !== policy.botId) throw new Error('Chưa xác minh đúng bot gửi tin.');
  let query = db.collection('assistantDeadlineConfig').orderBy('__name__').limit(4);
  if (after) query = query.startAfter(after);
  const configs = await query.get(); let processed = 0, failed = 0;
  for (const doc of configs.docs.slice(0, 3)) {
    try { await runDeadlineClass(db, doc.id, policy, process.env.ZALO_BOT_TOKEN); processed++; }
    catch { failed++; } // Only counts leave this endpoint; never source data, names or credentials.
  }
  return { processed, failed, nextAfter: configs.size > 3 ? configs.docs[2].id : null };
}
