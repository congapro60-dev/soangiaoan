import { createHash, randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { buildGroupHomework, type GroupHomeworkView } from '../src/lib/classroom/groupHomework.js';
import { buildSheetRequests, checkSheetLayout, planSheetSync, type SheetCell, type SheetSnapshot } from '../src/lib/classroom/sheetSync.js';
import { deadlineOwner, requireDeadlineSource } from './_assistant-deadline-config.js';
import { boundedSheetJson, homeworkWriteToken } from './_assistant-deadline-sheet.js';

type Data = Record<string, any>;
export type HomeworkSheetConfig = { spreadsheetId: string; sheetId: number; sheetTitle: string; writeApproved: boolean };
const TITLE = '02. BTVN';
const validConfig = (c: HomeworkSheetConfig) => c?.writeApproved === true && /^[A-Za-z0-9_-]{20,200}$/.test(c.spreadsheetId)
  && c.sheetTitle === TITLE && Number.isSafeInteger(c.sheetId) && c.sheetId >= 0;
const fingerprint = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');

/** One bounded read of the existing template. No other tab, private contact data or sheet-wide writes. */
export async function readHomeworkSnapshot(config: HomeworkSheetConfig, token: string): Promise<{ snapshot: SheetSnapshot; grid: Data[][] }> {
  if (!validConfig(config)) throw new Error('Tab BTVN chưa được phê duyệt.');
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}`);
  // ponytail: template ceiling BI91; refuse a larger roster instead of guessing rows or extending conduct formulas.
  url.searchParams.set('ranges', "'02. BTVN'!A1:BI91"); url.searchParams.set('includeGridData', 'true');
  url.searchParams.set('fields', 'properties(timeZone),sheets(properties(sheetId,title,gridProperties),data(startRow,startColumn,rowData(values(userEnteredValue,effectiveValue,formattedValue,note,dataValidation))))');
  const response = await fetch(url, { method: 'GET', redirect: 'error', headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error('Chưa đọc được tab BTVN.');
  const body = await boundedSheetJson(response), sheet = body.sheets?.[0], data = sheet?.data?.[0];
  if (body.sheets?.length !== 1 || sheet?.properties?.sheetId !== config.sheetId || sheet.properties.title !== TITLE
    || sheet.data?.length !== 1 || data?.startRow || data?.startColumn || !Array.isArray(data?.rowData) || data.rowData.length > 91) throw new Error('Tab BTVN đã đổi hoặc không đúng khuôn.');
  const grid: Data[][] = data.rowData.map((r: Data) => r.values || []);
  const cell = (r: number, c: number): SheetCell => {
    const v = grid[r - 1]?.[c - 1] || {}, e = v.effectiveValue || {}, u = v.userEnteredValue || {};
    return { value: e.stringValue ?? e.numberValue ?? e.boolValue ?? v.formattedValue ?? u.stringValue ?? u.numberValue ?? u.boolValue ?? null,
      ...(u.formulaValue ? { formula: u.formulaValue } : {}), ...(v.note ? { note: v.note } : {}) };
  };
  let lastColumn = 2; let statusOptions: string[] = [];
  for (let c = 3; c <= Math.min(61, sheet.properties.gridProperties?.columnCount || 61); c++) {
    const rule = grid[11]?.[c - 1]?.dataValidation?.condition;
    if (rule?.type === 'ONE_OF_LIST') { lastColumn = c; if (!statusOptions.length) statusOptions = rule.values.map((v: Data) => String(v.userEnteredValue)); }
  }
  const students: SheetSnapshot['students'] = [];
  for (let r = 12; r <= grid.length; r++) { const name = String(cell(r, 2).value || '').trim(); if (name) students.push({ row: r, name }); }
  const snapshot: SheetSnapshot = { sheetId: config.sheetId, sheetTitle: TITLE, timeZone: body.properties?.timeZone || 'Asia/Ho_Chi_Minh',
    labels: Array.from({ length: 11 }, (_, i) => cell(i + 1, 1)), students,
    headers: Array.from({ length: lastColumn - 2 }, (_, i) => ({ column: i + 3, subject: cell(3, i + 3), content: cell(4, i + 3), deadline: cell(5, i + 3), link: cell(6, i + 3) })),
    statusCells: {}, statusOptions, lastColumn, countFormulas: {} };
  for (const s of students) for (let c = 3; c <= lastColumn; c++) snapshot.statusCells[`${s.row}:${c}`] = cell(s.row, c);
  if (checkSheetLayout(snapshot)) throw new Error('Tab BTVN không đúng khuôn, chưa ghi ô nào.');
  return { snapshot, grid };
}

export async function writeHomeworkBtvn(config: HomeworkSheetConfig, view: GroupHomeworkView, origin: string, token = homeworkWriteToken, beforeWrite?: () => Promise<void>) {
  if (!validConfig(config)) throw new Error('Tab BTVN chưa được phê duyệt.');
  if (origin !== 'https://giaoandewey.vercel.app') throw new Error('Địa chỉ web BTVN chưa hợp lệ.');
  const access = await token(), source = await readHomeworkSnapshot(config, access);
  const plan = planSheetSync({ snapshot: source.snapshot, assignments: view.assignments,
    roster: view.students.map(s => ({ studentId: s.id, name: s.name })), receiptOnly: true,
    submissions: view.students.flatMap(s => s.work.map(w => ({ studentId: s.id, assignmentId: w.assignmentId, createdAt: w.submittedAt || '', firstSubmittedAt: w.firstSubmittedAt, receiptStatus: w.status }))),
    appOrigin: origin, nowMs: Date.now(), addLateOption: false });
  if (plan.students.ambiguous.length || plan.students.rosterWithoutRow.length) throw new Error('Danh sách HS chưa khớp; chưa ghi Sheet.');
  // Plan can be partial when capacity is exhausted: retain existing columns, surface skipped count for teacher.
  const requests = buildSheetRequests({ ...plan, upgradedStatusOptions: null }, source.snapshot);
  const validations: Data[] = [];
  for (const write of plan.writes) if (write.kind === 'status') {
    const existing = source.grid[write.row - 1]?.[write.column - 1]?.dataValidation;
    if (existing?.condition?.type !== 'ONE_OF_LIST') throw new Error('Ô HS chưa có danh sách chọn; chưa ghi Sheet.');
    const options = existing.condition.values?.map((v: Data) => String(v.userEnteredValue)) || [];
    if (write.value && !options.includes(write.value)) validations.push({ setDataValidation: {
      range: { sheetId: config.sheetId, startRowIndex: write.row - 1, endRowIndex: write.row, startColumnIndex: write.column - 1, endColumnIndex: write.column },
      rule: { ...existing, condition: { type: 'ONE_OF_LIST', values: [...options, write.value].map(userEnteredValue => ({ userEnteredValue })) } },
    } });
  }
  if (requests.length) {
    // Sheets has no per-cell CAS. Refuse edits made during planning; retain a small unavoidable HTTP-write window.
    const fresh = await readHomeworkSnapshot(config, access);
    if (fingerprint(source) !== fingerprint(fresh)) throw new Error('Sheet vừa được sửa; sẽ đối soát lại.');
    await beforeWrite?.();
    const result = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}:batchUpdate`, {
      method: 'POST', redirect: 'error', headers: { authorization: `Bearer ${access}`, 'content-type': 'application/json' },
      body: JSON.stringify({ requests: [...validations, ...requests] }), signal: AbortSignal.timeout(20_000),
    });
    if (!result.ok) throw new Error('Chưa cập nhật được BTVN; bài nộp vẫn được giữ và sẽ thử lại.');
  }
  return { ...plan.counts, skipped: plan.skipped.length, unmatched: plan.students.rowsWithoutStudent.length };
}

async function loadHomework(db: Firestore, classId: string, teacherId: string): Promise<GroupHomeworkView> {
  const read = async (name: string, max: number) => {
    const q = name === 'students' ? db.collection('classes').doc(classId).collection('students') : db.collection(name).where('classId', '==', classId);
    const snap = await q.limit(max + 1).get();
    if (snap.size > max) throw new Error('Dữ liệu BTVN vượt giới hạn, chưa xác minh đầy đủ.');
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  };
  const [students, assignments, submissions, online] = await Promise.all([read('students', 80), read('assignments', 200), read('submissions', 3000), read('examSubmissions', 3000)]);
  const homework = assignments.filter((a: Data) => (a.purpose ?? 'assignment') === 'assignment');
  return buildGroupHomework({ classId, teacherId, students, assignments: homework, submissions, online,
    groups: [{ id: 'class', leaderStudentId: '', memberStudentIds: students.map(s => s.id) }], now: Date.now() });
}

/** Durable revision + short immediate attempt. Busy workers leave dirty revisions for reconciliation. */
export async function notifyHomeworkSheet(db: Firestore, classId: string): Promise<void> {
  if (typeof classId !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(classId)) return;
  try {
    const cfg = db.collection('assistantHomeworkSheets').doc(classId), ref = db.collection('assistantHomeworkSyncState').doc(classId);
    const enabled = await db.runTransaction(async tx => {
      const [c, s] = await Promise.all([tx.get(cfg), tx.get(ref)]);
      if (c.data()?.enabled !== true || !validConfig(c.data() as HomeworkSheetConfig)) return false;
      tx.set(ref, { revision: (s.data()?.revision || 0) + 1, dirtyAt: Date.now() }, { merge: true }); return true;
    });
    if (!enabled) return;
    const work = syncHomeworkSheet(db, classId).catch(() => undefined);
    const context = (globalThis as Record<symbol, any>)[Symbol.for('@vercel/request-context')]?.get?.();
    if (typeof context?.waitUntil === 'function') context.waitUntil(work); else await work;
  } catch { /* Submission has already committed. Reconciliation scans enabled configs even if enqueue fails. */ }
}

export async function syncHomeworkSheet(db: Firestore, classId: string, catchUp = false): Promise<'synced' | 'failed' | 'skipped'> {
  const cfg = db.collection('assistantHomeworkSheets').doc(classId), ref = db.collection('assistantHomeworkSyncState').doc(classId), lease = randomUUID();
  const taken = await db.runTransaction(async tx => {
    const [c, s] = await Promise.all([tx.get(cfg), tx.get(ref)]), config = c.data(), state = s.data() || {};
    if (config?.enabled !== true || !validConfig(config as HomeworkSheetConfig) || (state.leaseUntil || 0) > Date.now() || (state.nextAt || 0) > Date.now()) return null;
    tx.set(ref, { lease, leaseUntil: Date.now() + 120_000 }, { merge: true });
    return { config, revision: state.revision || 0 };
  });
  if (!taken) return 'skipped';
  try {
    const cls = (await db.collection('classes').doc(classId).get()).data() || {};
    if (deadlineOwner(cls) !== taken.config.teacherId || cls.sheetSync?.spreadsheetId !== taken.config.spreadsheetId || cls.sheetSync?.sheetId !== taken.config.sheetId) throw new Error('Nguồn BTVN hoặc chủ lớp đã thay đổi.');
    await requireDeadlineSource(db, classId, taken.config.teacherId, taken.config.spreadsheetId);
    const namespace = String(cls.teacherId || taken.config.teacherId);
    const view = await loadHomework(db, classId, namespace);
    const counts = await writeHomeworkBtvn(taken.config as HomeworkSheetConfig, view, 'https://giaoandewey.vercel.app', homeworkWriteToken, async () => {
      await db.runTransaction(async tx => {
        const [s, c, liveClass, approved] = await Promise.all([tx.get(ref), tx.get(cfg), tx.get(db.collection('classes').doc(classId)), tx.get(db.collection('assistantDeadlineSources').doc(classId))]);
        if (s.data()?.lease !== lease || s.data()!.leaseUntil <= Date.now() || fingerprint(c.data()) !== fingerprint(taken.config)
          || deadlineOwner(liveClass.data() || {}) !== taken.config.teacherId || String(liveClass.data()?.teacherId || taken.config.teacherId) !== namespace
          || liveClass.data()?.sheetSync?.spreadsheetId !== taken.config.spreadsheetId
          || liveClass.data()?.sheetSync?.sheetId !== taken.config.sheetId || approved.data()?.active !== true
          || approved.data()?.teacherId !== taken.config.teacherId || approved.data()?.spreadsheetId !== taken.config.spreadsheetId) throw new Error('Quyền hoặc nguồn đồng bộ đã thay đổi.');
        tx.set(ref, { leaseUntil: Date.now() + 120_000 }, { merge: true });
      });
    });
    const dirty = await db.runTransaction(async tx => {
      const s = (await tx.get(ref)).data(); if (s?.lease !== lease) return false;
      tx.set(ref, { syncedRevision: taken.revision, syncedAt: Date.now(), leaseUntil: 0, nextAt: 0, failed: false, counts }, { merge: true });
      return (s.revision || 0) > taken.revision;
    });
    // One catch-up pass; continuous bursts are drained by the independent scheduler.
    if (dirty && !catchUp) return syncHomeworkSheet(db, classId, true);
    return 'synced';
  } catch {
    await db.runTransaction(async tx => {
      if ((await tx.get(ref)).data()?.lease === lease) tx.set(ref, { leaseUntil: 0, nextAt: Date.now() + 60_000, failed: true, checkedAt: Date.now() }, { merge: true });
    });
    return 'failed';
  }
}

/** Independent of Zalo notification policy/token. Scheduler uses the same authenticated route. */
export async function runHomeworkSheetBatch(db: Firestore, after = '') {
  let q = db.collection('assistantHomeworkSheets').orderBy('__name__').limit(4); if (after) q = q.startAfter(after);
  const configs = await q.get(); let processed = 0, failed = 0;
  for (const d of configs.docs.slice(0, 3)) {
    if (d.data()?.enabled !== true) continue;
    try { if (await syncHomeworkSheet(db, d.id) === 'failed') failed++; else processed++; } catch { failed++; }
  }
  return { processed, failed, nextAfter: configs.size > 3 ? configs.docs[2].id : null };
}
