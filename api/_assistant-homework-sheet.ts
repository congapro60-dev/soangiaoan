import { createHash, randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { HOMEWORK_RECEIPT_LABELS, type GroupHomeworkView } from '../src/lib/classroom/groupHomework.js';
import { homeworkGroupsContext, loadGroupHomework } from './_classroom-group-homework.js';
import { requireDeadlineSource } from './_assistant-deadline-config.js';
import { boundedSheetJson, homeworkWriteToken } from './_assistant-deadline-sheet.js';

export const HOMEWORK_MIRROR_MARKER = 'BTVN TRÊN WEB — TỰ ĐỘNG';
const TITLE = '02A. NỘP WEB';
type MirrorConfig = { spreadsheetId: string; sheetId: number; sheetTitle: string; writeApproved: boolean };
export function homeworkSheetRows(view: GroupHomeworkView, origin: string): string[][] {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.origin !== origin) throw new Error('Địa chỉ web chưa hợp lệ.');
  const time = (s: string) => new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const rows = [[HOMEWORK_MIRROR_MARKER, `Cập nhật ${time(view.updatedAt)}. Chỉ ghi nhận nộp web; kiểm vở ở tab 02. BTVN.`],
    ['Tổ', 'Học sinh', ...view.assignments.map(a => a.title)],
    ['', 'Hạn nộp', ...view.assignments.map(a => a.dueAt ? time(a.dueAt) : 'Chưa có hạn')],
    ['', 'Mở bài trên web', ...view.assignments.map(a => a.id.startsWith('adaptive:') ? `${url.origin}/lop` : `${url.origin}/?baiGiao=${encodeURIComponent(a.id)}`)],
    ...view.students.map(s => [s.groupId, s.name, ...view.assignments.map(a => {
      const w = s.work.find(w => w.assignmentId === a.id);
      return w ? `${HOMEWORK_RECEIPT_LABELS[w.status]}${!a.open ? ' · đã đóng' : ''}${w.submittedAt ? `\nLượt mới: ${time(w.submittedAt)}` : ''}${w.firstSubmittedAt ? `\nLần đầu: ${time(w.firstSubmittedAt)}` : ''}` : 'Chưa xác minh';
    })])];
  // ponytail: class mirror ceiling 120 rows x 250 columns; increase explicit tab bounds before larger classes/history.
  if (rows.length > 120 || rows.some(row => row.length > 250)) throw new Error('Bản BTVN vượt giới hạn tab tự động.');
  return rows;
}
export async function writeHomeworkMirror(config: MirrorConfig, view: GroupHomeworkView, origin: string, token = homeworkWriteToken, beforeWrite?: () => Promise<void>): Promise<void> {
  if (!config.writeApproved || !/^[A-Za-z0-9_-]{20,200}$/.test(config.spreadsheetId) || config.sheetTitle !== TITLE || !Number.isSafeInteger(config.sheetId) || config.sheetId < 0) throw new Error('Tab ghi BTVN chưa được phê duyệt.');
  const rows = homeworkSheetRows(view, origin);
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}`, auth = `Bearer ${await token()}`;
  const url = new URL(base); url.searchParams.set('ranges', `'${TITLE}'!A1:A1`); url.searchParams.set('includeGridData', 'true');
  url.searchParams.set('fields', 'sheets(properties(sheetId,title),data(rowData(values(formattedValue))))');
  const response = await fetch(url, { headers: { authorization: auth }, redirect: 'error', signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error('Chưa đọc được tab BTVN tự động.');
  const source = await boundedSheetJson(response), sheet = source.sheets?.[0];
  if (source.sheets?.length !== 1 || sheet.properties?.sheetId !== config.sheetId || sheet.properties?.title !== TITLE
    || sheet.data?.[0]?.rowData?.[0]?.values?.[0]?.formattedValue !== HOMEWORK_MIRROR_MARKER) throw new Error('Tab BTVN tự động không đúng dấu nhận diện.');
  await beforeWrite?.();
  const result = await fetch(`${base}:batchUpdate`, { method: 'POST', redirect: 'error', headers: { authorization: auth, 'content-type': 'application/json' },
    body: JSON.stringify({ requests: [{ updateCells: { range: { sheetId: config.sheetId, startRowIndex: 0, endRowIndex: 120, startColumnIndex: 0, endColumnIndex: 250 },
      rows: rows.map(row => ({ values: row.map(text => ({ userEnteredValue: { stringValue: text } })) })), fields: 'userEnteredValue' } }] }), signal: AbortSignal.timeout(20_000) });
  if (!result.ok) throw new Error('Chưa cập nhật được Sheet BTVN. Bài nộp trên web vẫn được giữ.');
}

/** Polling retries replace an app-owned snapshot; they never append duplicates or edit notebook cells. */
export async function syncHomeworkSheet(db: Firestore, classId: string): Promise<void> {
  const configRef = db.collection('assistantHomeworkSheets').doc(classId), stateRef = db.collection('assistantHomeworkSyncState').doc(classId);
  const lease = randomUUID(), now = Date.now();
  const config = await db.runTransaction(async tx => {
    const [cfg, state] = await Promise.all([tx.get(configRef), tx.get(stateRef)]);
    const data = cfg.data();
    if (data?.enabled !== true || data.writeApproved !== true || (state.data()?.leaseUntil || 0) > now) return null;
    tx.set(stateRef, { lease, leaseUntil: now + 120_000 }, { merge: true });
    return data;
  });
  if (!config) return;
  try {
    // Load after acquiring the lease: an older pending worker cannot overwrite a newer snapshot.
    const context = await homeworkGroupsContext(db, classId);
    if (!context || context.teacherId !== config.teacherId) throw new Error('Chủ lớp hoặc nhóm BTVN đã thay đổi.');
    await requireDeadlineSource(db, classId, context.teacherId, config.spreadsheetId);
    const view = await loadGroupHomework(db, context);
    if (!view) throw new Error('Chưa ghép tổ BTVN.');
    const hash = createHash('sha256').update(JSON.stringify({ ...view, updatedAt: '', config })).digest('hex');
    const state = (await stateRef.get()).data();
    if (state?.lease !== lease || state.leaseUntil - Date.now() < 45_000) throw new Error('Lượt đồng bộ đã hết hạn.');
    if (state.hash !== hash) {
      const freshConfig = (await configRef.get()).data();
      if (JSON.stringify(freshConfig) !== JSON.stringify(config)) throw new Error('Cấu hình đồng bộ vừa thay đổi.');
      await writeHomeworkMirror(config as MirrorConfig, view, new URL(process.env.ASSISTANT_WEB_ORIGIN || 'https://giaoandewey.vercel.app').origin, homeworkWriteToken, async () => {
        await db.runTransaction(async tx => {
          const [liveState, liveConfig, liveClass, liveGroups] = await Promise.all([tx.get(stateRef), tx.get(configRef), tx.get(db.collection('classes').doc(classId)), tx.get(db.collection('classHomeworkGroups').doc(classId))]);
          if (liveState.data()?.lease !== lease || liveState.data()!.leaseUntil <= Date.now()
            || JSON.stringify(liveConfig.data()) !== JSON.stringify(config) || liveClass.data()?.teacherId !== config.teacherId
            || liveGroups.data()?.active !== true || liveGroups.data()?.teacherId !== config.teacherId
            || JSON.stringify(liveGroups.data()?.groups) !== JSON.stringify(context.groups)) throw new Error('Quyền hoặc lượt đồng bộ đã thay đổi.');
          tx.set(stateRef, { leaseUntil: Date.now() + 120_000 }, { merge: true });
        });
      });
    }
    await db.runTransaction(async tx => {
      const current = (await tx.get(stateRef)).data();
      if (current?.lease === lease) tx.set(stateRef, { hash, syncedAt: Date.now(), leaseUntil: 0, failed: false }, { merge: true });
    });
  } catch {
    await db.runTransaction(async tx => {
      if ((await tx.get(stateRef)).data()?.lease === lease) tx.set(stateRef, { leaseUntil: Date.now() + 120_000, failed: true, checkedAt: Date.now() }, { merge: true });
    });
    // Mirror failure must not interrupt submission or deadline delivery; monitor server-only state.
  }
}
