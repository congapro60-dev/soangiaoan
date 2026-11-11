import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../_assistant-deadline-sheet.js', async importOriginal => ({
  ...await importOriginal<typeof import('../_assistant-deadline-sheet.js')>(), homeworkWriteToken: vi.fn(async () => 'synthetic-token'),
}));
import { notifyHomeworkSheet, runHomeworkSheetBatch, syncHomeworkSheet } from '../_assistant-homework-sheet';
import { runDeadlineBatch } from '../_assistant-deadline-runtime';

type Data = Record<string, any>;
const configPath = 'assistantHomeworkSheets/c1', statePath = 'assistantHomeworkSyncState/c1';
const config = { teacherId: 'gv', enabled: true, writeApproved: true, spreadsheetId: 'abcdefghijklmnopqrstuvwx', sheetId: 456, sheetTitle: '02. BTVN' };
function fakeDb(patch: Data = {}) {
  const data: Data = {
    [configPath]: { ...config }, [statePath]: { revision: 0 },
    'classes/c1': { teacherId: 'gv', sheetSync: { ...config } },
    'classes/c1/students/s1': { name: 'Em Một' },
    'assistantDeadlineSources/c1': { active: true, teacherId: 'gv', spreadsheetId: config.spreadsheetId },
    'assignments/a1': { classId: 'c1', teacherId: 'gv', title: 'Bài 1', type: 'upload', createdAt: '2026-11-11T00:00:00Z' },
    'submissions/w1': { classId: 'c1', teacherId: 'gv', studentId: 's1', assignmentId: 'a1', status: 'submitted', createdAt: '2026-11-11T01:00:00Z' },
    ...patch,
  };
  const snap = (path: string) => ({ id: path.split('/').at(-1)!, exists: data[path] !== undefined, data: () => data[path] === undefined ? undefined : structuredClone(data[path]) });
  const ref = (path: string): any => ({ path, id: path.split('/').at(-1), get: async () => snap(path), collection: (name: string) => col(`${path}/${name}`) });
  const col = (path: string, filters: any[] = [], limit = 10000, after = ''): any => ({
    doc: (id: string) => ref(`${path}/${id}`),
    where: (key: string, _op: string, value: unknown) => col(path, [...filters, [key, value]], limit, after),
    limit: (n: number) => col(path, filters, n, after), orderBy: () => col(path, filters, limit, after),
    startAfter: (id: string) => col(path, filters, limit, id),
    get: async () => { const docs = Object.keys(data).filter(p => data[p] !== undefined && p.startsWith(path + '/') && !p.slice(path.length + 1).includes('/') && p.split('/').at(-1)! > after && filters.every(([key, value]) => data[p][key] === value)).sort().slice(0, limit).map(snap); return { docs, size: docs.length }; },
  });
  let tail = Promise.resolve();
  const db: any = { collection: col, runTransaction: (run: (tx: any) => Promise<unknown>) => {
    const attempt = tail.then(() => run({ get: (r: any) => r.get(), set: (r: any, value: any, options: any) => { data[r.path] = options?.merge ? { ...data[r.path], ...value } : value; } }));
    tail = attempt.then(() => undefined, () => undefined); return attempt;
  } };
  return { db, data };
}
function sheet() {
  const labels = ['BTVN', 'Hướng dẫn', 'Môn', 'Nội dung', 'Hạn kiểm tra', 'Link', 'Tính lỗi?', 'Đủ', 'Thiếu', 'Chưa làm', 'Tổ'];
  const rows: any[] = Array.from({ length: 12 }, (_, i) => ({ values: [{ formattedValue: labels[i] || '' }] }));
  rows[3].values[2] = { formattedValue: 'Bài 1' };
  rows[5].values[2] = { formattedValue: 'https://giaoandewey.vercel.app/?baiGiao=a1' };
  rows[11].values = [{}, { formattedValue: 'Em Một' }, { dataValidation: { condition: { type: 'ONE_OF_LIST', values: ['✅ Đủ', '❌ Chưa làm'].map(userEnteredValue => ({ userEnteredValue })) } } }];
  return { properties: { timeZone: 'Asia/Saigon' }, sheets: [{ properties: { sheetId: 456, title: '02. BTVN', gridProperties: { rowCount: 200, columnCount: 61 } }, data: [{ rowData: rows }] }] };
}
function stubSheets(post: () => void | Promise<void> = () => {}) {
  const fetcher = vi.fn(async (_url: unknown, options: any) => { if (options.method === 'POST') { await post(); return new Response('{}'); } return new Response(JSON.stringify(sheet())); });
  vi.stubGlobal('fetch', fetcher); return fetcher;
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('BTVN durable worker', () => {
  it('retains a durable dirty revision when another worker owns the lease', async () => {
    const { db, data } = fakeDb({ [statePath]: { revision: 4, syncedRevision: 3, lease: 'running', leaseUntil: Date.now() + 60_000 } });
    const fetcher = stubSheets();
    await notifyHomeworkSheet(db, 'c1');
    expect(data[statePath]).toMatchObject({ revision: 5, syncedRevision: 3, lease: 'running' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('only the lease owner writes while two syncs overlap', async () => {
    const { db, data } = fakeDb();
    let release!: () => void, started!: () => void;
    const blocked = new Promise<void>(r => { release = r; }), reading = new Promise<void>(r => { started = r; });
    const fetcher = vi.fn(async (_url: unknown, options: any) => { if (options.method === 'GET') { started(); await blocked; } return new Response(options.method === 'GET' ? JSON.stringify(sheet()) : '{}'); });
    vi.stubGlobal('fetch', fetcher);
    const first = syncHomeworkSheet(db, 'c1'); await reading;
    await syncHomeworkSheet(db, 'c1'); release(); await first;
    expect(fetcher.mock.calls.filter(([, o]) => o.method === 'POST')).toHaveLength(1);
    expect(data[statePath]).toMatchObject({ leaseUntil: 0, failed: false, syncedRevision: 0 });
  });
  it('persists failure/backoff and a failed external write never rejects a committed submission notification', async () => {
    const { db, data } = fakeDb();
    const fetcher = vi.fn(async (_url: unknown, options: any) => options.method === 'POST' ? new Response('{}', { status: 429 }) : new Response(JSON.stringify(sheet())));
    vi.stubGlobal('fetch', fetcher); const before = Date.now();
    await expect(notifyHomeworkSheet(db, 'c1')).resolves.toBeUndefined();
    expect(data[statePath]).toMatchObject({ revision: 1, failed: true, leaseUntil: 0 });
    expect(data[statePath].nextAt).toBeGreaterThanOrEqual(before + 60_000);
    const calls = fetcher.mock.calls.length; await syncHomeworkSheet(db, 'c1');
    expect(fetcher).toHaveBeenCalledTimes(calls);
  });
  it('rejects owner/source changes before Google writes', async () => {
    for (const changed of [
      { 'classes/c1': { teacherId: 'other', sheetSync: { ...config } } },
      { 'assistantDeadlineSources/c1': { teacherId: 'gv', active: false, spreadsheetId: config.spreadsheetId } },
      { 'classes/c1': { teacherId: 'gv', sheetSync: { ...config, sheetId: 99 } } },
    ]) {
      const { db, data } = fakeDb(changed), fetcher = stubSheets();
      await syncHomeworkSheet(db, 'c1');
      expect(fetcher).not.toHaveBeenCalled(); expect(data[statePath].failed).toBe(true);
    }
  });
  it('catches up one dirty revision then leaves continuous bursts pending for scheduler', async () => {
    const { db, data } = fakeDb(); let writes = 0;
    stubSheets(() => { writes++; data[statePath].revision++; });
    await syncHomeworkSheet(db, 'c1');
    expect(writes).toBe(2); expect(data[statePath]).toMatchObject({ revision: 2, syncedRevision: 1, leaseUntil: 0, failed: false });
  });
  it('reconciles enabled homework configs without any Zalo token or notification switch', async () => {
    const { db, data } = fakeDb(); const fetcher = stubSheets();
    vi.stubEnv('ZALO_BOT_TOKEN', ''); vi.stubEnv('ZALO_DEADLINE_ENABLED', 'false');
    try {
      const result = await runHomeworkSheetBatch(db);
      expect(result).toMatchObject({ processed: 1, failed: 0, nextAfter: null });
      expect(fetcher.mock.calls.some(([, o]) => o.method === 'POST')).toBe(true);
      expect(data[statePath].syncedAt).toBeGreaterThan(0);
    } finally { vi.unstubAllEnvs(); }
  });
  it('reports actual write failures in batch results', async () => {
    const { db } = fakeDb();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    expect(await runHomeworkSheetBatch(db)).toMatchObject({ failed: 1, processed: 0 });
  });
  it('authenticated scheduler still runs homework reconciliation when message delivery is disabled', async () => {
    const { db, data } = fakeDb(); const fetcher = stubSheets();
    vi.stubEnv('ZALO_BOT_TOKEN', ''); vi.stubEnv('ZALO_DEADLINE_ENABLED', 'false');
    try {
      const result = await runDeadlineBatch(db);
      expect(result).toMatchObject({ disabled: false, processed: 1, failed: 0, homework: { processed: 1, failed: 0 } });
      expect(data[statePath].syncedAt).toBeGreaterThan(0);
      expect(fetcher.mock.calls.every(([url]) => !String(url).includes('zaloplatforms'))).toBe(true);
    } finally { vi.unstubAllEnvs(); }
  });
  it('disabled configs and invalid class IDs do not enqueue work', async () => {
    const { db, data } = fakeDb({ [configPath]: { ...config, enabled: false } }); const fetcher = stubSheets();
    await notifyHomeworkSheet(db, '../c1'); await notifyHomeworkSheet(db, 'c1');
    expect(data[statePath].revision).toBe(0); expect(fetcher).not.toHaveBeenCalled();
  });
});
