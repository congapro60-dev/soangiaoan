import { createHash } from 'node:crypto';
import type { VercelResponse } from '@vercel/node';
import type { Firestore } from 'firebase-admin/firestore';
import { sheetTaskRows, type DeadlineConfig } from './_assistant-deadline.js';
import { readDeadlineSheet } from './_assistant-deadline-sheet.js';

type Data = Record<string, any>;
const text = (v: unknown) => typeof v === 'string' ? v.normalize('NFC').trim().replace(/\s+/gu, ' ') : '';
const fail = (): never => { throw new Error('Cấu hình deadline chưa hợp lệ: kiểm tra mã HS, mã việc, tab và người được giao.'); };
export const deadlineOwner = (cls: Data): string => typeof (cls.ownerId || cls.teacherId) === 'string' ? cls.ownerId || cls.teacherId : '';
/** Admin-provisioned, server-only allowlist. Teacher-written class metadata grants no service-account access. */
export async function requireDeadlineSource(db: Firestore, classId: string, owner: string, spreadsheetId: unknown): Promise<void> {
  if (classId !== 'class-1787188523562') throw new Error('Nguồn deadline này chỉ dành cho lớp 11 Columbus.');
  if (!owner || typeof spreadsheetId !== 'string' || !/^[A-Za-z0-9_-]{20,200}$/.test(spreadsheetId)) throw new Error('Chưa chọn nguồn deadline hợp lệ.');
  const approved = (await db.collection('assistantDeadlineSources').doc(classId).get()).data();
  if (approved?.active !== true || approved.teacherId !== owner || approved.spreadsheetId !== spreadsheetId) throw new Error('Nguồn deadline chưa được quản trị phê duyệt cho lớp và chủ lớp hiện tại.');
}
export const publicationVersion = (item: Data): string => createHash('sha256').update(JSON.stringify([
  item.dueAt || '', item.description || '', item.isOpen !== false,
  Array.isArray(item.targetStudentIds) ? [...item.targetStudentIds].sort() : [], item.noticeRevision || 0,
])).digest('hex');

export function validateDeadlineConfig(raw: Data, roster: Data[], assignments: Data[] = []): DeadlineConfig {
  if (!raw || !/^[A-Za-z0-9_-]{20,200}$/.test(raw.spreadsheetId) || raw.sheetTitle !== '01. DEADLINE'
    || !Number.isSafeInteger(raw.sheetId) || raw.sheetId < 0 || !raw.studentNames || typeof raw.studentNames !== 'object'
    || Array.isArray(raw.studentNames) || !Array.isArray(raw.tasks) || raw.tasks.length > 60) fail();
  const codes = roster.map(s => text(s.code)), names = Object.entries(raw.studentNames);
  if (names.length > 100 || new Set(names.map(([, name]) => text(name))).size !== names.length) fail();
  for (const [code, name] of names) if (!code || ['__proto__', 'constructor', 'prototype'].includes(code) || codes.filter(c => c === code).length !== 1 || !text(name) || text(name).length > 150) fail();
  const ids = new Set<string>(), headers = new Set<string>();
  const tasks = raw.tasks.map((task: Data) => {
    if (!task || typeof task !== 'object' || !/^[A-Za-z0-9_-]{1,100}$/.test(task.id) || ids.has(task.id) || !text(task.header)
      || text(task.header).length > 1000 || headers.has(text(task.header)) || !['draft', 'published', 'closed'].includes(task.state)
      || typeof task.optional !== 'boolean' || !Array.isArray(task.studentCodes)
      || task.studentCodes.some((code: unknown) => typeof code !== 'string' || !Object.hasOwn(raw.studentNames, code))
      || task.state === 'published' && task.optional && !task.studentCodes.length
      || task.assignmentId && !assignments.some(a => a.id === task.assignmentId)) fail();
    ids.add(task.id); headers.add(text(task.header));
    return { id: task.id, header: text(task.header), state: task.state, optional: task.optional, studentCodes: [...new Set<string>(task.studentCodes)], ...(task.assignmentId ? { assignmentId: task.assignmentId } : {}) };
  });
  return { spreadsheetId: raw.spreadsheetId, sheetTitle: raw.sheetTitle, sheetId: raw.sheetId,
    studentNames: Object.fromEntries(names.map(([code, name]) => [code, text(name)])), tasks,
    notifications: raw.notifications === true, digest: raw.digest === true };
}

/** Authorization is supplied by the existing teacherContext; no browser token or configuration is trusted as authority. */
export async function handleDeadlineConfig(db: Firestore, body: Data, res: VercelResponse,
  authorize: (db: Firestore, body: Data, res: VercelResponse) => Promise<{ classId: string; classData: Data; uid: string } | null>): Promise<boolean> {
  if (!['getDeadlineSettings', 'previewDeadlineSettings', 'saveDeadlineSettings'].includes(body.action)) return false;
  const context = await authorize(db, body, res); if (!context) return true;
  if (context.classId !== 'class-1787188523562') { res.status(403).json({ error: 'Deadline hiện chỉ dành cho lớp 11 Columbus.' }); return true; }
  const owner = deadlineOwner(context.classData);
  const ref = db.collection('assistantDeadlineConfig').doc(context.classId);
  const [snapshot, students, assignmentSnap, adaptiveSnap] = await Promise.all([ref.get(), db.collection('classes').doc(context.classId).collection('students').get(), db.collection('assignments').where('classId', '==', context.classId).get(), db.collection('adaptiveAssignments').where('classId', '==', context.classId).get()]);
  const roster = students.docs.map(doc => ({ id: doc.id, code: String(doc.data().code || ''), name: String(doc.data().name || '') }));
  const assignments = [...assignmentSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })), ...adaptiveSnap.docs.map(doc => ({ ...doc.data(), id: `adaptive:${doc.id}` }))]
    .filter((doc: Data) => doc.teacherId === owner).map((doc: Data) => ({ id: doc.id, title: String(doc.title || '') }));
  if (body.action === 'getDeadlineSettings') {
    const approved = (await db.collection('assistantDeadlineSources').doc(context.classId).get()).data();
    res.status(200).json({ settings: snapshot.data()?.settings || null, revision: snapshot.data()?.revision || 0, roster, assignments,
      sources: approved?.active === true && approved.teacherId === owner ? [{ spreadsheetId: approved.spreadsheetId }] : [], deliveryEnabled: process.env.ZALO_DEADLINE_ENABLED === 'true' && process.env.ZALO_DEADLINE_REAL_APPROVED === 'true' && process.env.ZALO_DEADLINE_QUOTA_VERIFIED === 'true' }); return true;
  }
  try {
    const input = body.settings || {};
    await requireDeadlineSource(db, context.classId, owner, input.spreadsheetId);
    if (body.action === 'previewDeadlineSettings') {
      const source = await readDeadlineSheet({ spreadsheetId: input.spreadsheetId, sheetTitle: '01. DEADLINE', sheetId: -1 });
      res.status(200).json({ studentNames: source.studentNames, headers: source.headers, sheetId: source.sheetId }); return true;
    }
    const settings = validateDeadlineConfig(input, roster, assignments);
    const source = await readDeadlineSheet(settings);
    sheetTaskRows(settings, source.grid);
    const columnBindings = Object.fromEntries(settings.tasks.map(t => [t.id, source.grid[1].findIndex((cell, i) => i >= 2 && text(cell?.formattedValue) === t.header)]));
    const revision = await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if ((current?.revision || 0) !== body.revision) throw new Error('Cấu hình đã đổi ở cửa sổ khác. Hãy tải lại trước khi lưu.');
      const revision = (current?.revision || 0) + 1;
      const publicationRevisions = { ...current?.publicationRevisions };
      for (const task of settings.tasks) {
        const before = current?.settings?.tasks?.find((t: Data) => t.id === task.id);
        if (task.state === 'published' && before?.state !== 'published') publicationRevisions[task.id] = (publicationRevisions[task.id] || 0) + 1;
      }
      tx.set(ref, { settings, columnBindings, publicationRevisions, revision, teacherId: owner, updatedBy: context.uid, updatedAt: Date.now() });
      return revision;
    });
    res.status(200).json({ saved: true, revision });
  } catch (error) { res.status(422).json({ error: error instanceof Error ? error.message : 'Chưa đọc được nguồn deadline.' }); }
  return true;
}
