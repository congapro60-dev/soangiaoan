import { afterEach, describe, expect, it, vi } from 'vitest';
import { homeworkSheetRows, writeHomeworkMirror } from '../_assistant-homework-sheet';
const config = { spreadsheetId: 'abcdefghijklmnopqrstuvwx', sheetId: 456, sheetTitle: '02A. NỘP WEB', writeApproved: true };
const view: any = { updatedAt: '2026-11-11T01:00:00Z', assignments: [{ id: 'a1', title: '=PRIVATE_FORMULA()', dueAt: '', open: true }], students: [{ id: 's1', name: 'Em Một', groupId: '1', work: [{ assignmentId: 'a1', status: 'received', submittedAt: '2026-11-11T00:00:00Z', firstSubmittedAt: '2026-11-10T00:00:00Z' }] }] };
afterEach(() => vi.unstubAllGlobals());
describe('homework Sheet mirror is isolated from notebook checks', () => {
  it('renders receipt labels and login-protected assignment links, never claims Đủ', () => {
    const rows = homeworkSheetRows(view, 'https://giaoandewey.vercel.app');
    expect(JSON.stringify(rows)).toContain('Đã nhận bài');
    expect(JSON.stringify(rows)).not.toContain('✅ Đủ');
    expect(JSON.stringify(rows)).toContain('/?baiGiao=a1');
    expect(JSON.stringify(rows)).not.toContain('s1');
  });
  it('checks the dedicated tab marker and writes string cells only to its approved sheetId', async () => {
    const fetcher = vi.fn(async (_url: unknown, options: any) => options?.method === 'POST' ? new Response('{}') : new Response(JSON.stringify({ sheets: [{ properties: { sheetId: 456, title: config.sheetTitle }, data: [{ rowData: [{ values: [{ formattedValue: 'BTVN TRÊN WEB — TỰ ĐỘNG' }] }] }] }] })));
    vi.stubGlobal('fetch', fetcher);
    await writeHomeworkMirror(config, view, 'https://giaoandewey.vercel.app', async () => 'synthetic');
    const writes = fetcher.mock.calls.filter(([, opts]) => opts.method === 'POST');
    expect(writes).toHaveLength(1);
    const body = JSON.parse(writes[0][1].body);
    expect(body.requests).toHaveLength(1);
    expect(body.requests[0].updateCells.range.sheetId).toBe(456);
    expect(body.requests[0].updateCells.fields).toBe('userEnteredValue');
    expect(JSON.stringify(body)).not.toContain('formulaValue');
    expect(JSON.stringify(body)).toContain('=PRIVATE_FORMULA()');
    expect(body.requests.every((r: any) => r.updateCells?.range?.sheetId === config.sheetId)).toBe(true);
  });
  it('denies absent write approval, wrong title/id before obtaining a token', async () => {
    for (const patch of [{ writeApproved: false }, { sheetTitle: '02. BTVN' }, { sheetId: -1 }, { spreadsheetId: '../secret' }]) {
      const token = vi.fn();
      await expect(writeHomeworkMirror({ ...config, ...patch }, view, 'https://giaoandewey.vercel.app', token)).rejects.toThrow();
      expect(token).not.toHaveBeenCalled();
    }
  });
  it('renews authorization after marker read and blocks POST when a lease has changed', async () => {
    const events: string[] = [];
    const fetcher = vi.fn(async (_url: unknown, options: any) => {
      events.push(options?.method === 'POST' ? 'post' : 'get');
      return new Response(JSON.stringify({ sheets: [{ properties: { sheetId: 456, title: config.sheetTitle }, data: [{ rowData: [{ values: [{ formattedValue: 'BTVN TRÊN WEB — TỰ ĐỘNG' }] }] }] }] }));
    });
    vi.stubGlobal('fetch', fetcher);
    await expect(writeHomeworkMirror(config, view, 'https://giaoandewey.vercel.app', async () => 'synthetic', async () => { events.push('authorize'); throw new Error('lease expired'); })).rejects.toThrow('lease expired');
    expect(events).toEqual(['get', 'authorize']);
  });
  it('does not overwrite a tab renamed/replaced or one that lacks its marker', async () => {
    for (const props of [{ sheetId: 456, title: '02. BTVN' }, { sheetId: 999, title: config.sheetTitle }, { sheetId: 456, title: config.sheetTitle }]) {
      const fetcher = vi.fn(async () => new Response(JSON.stringify({ sheets: [{ properties: props, data: [] }] })));
      vi.stubGlobal('fetch', fetcher);
      await expect(writeHomeworkMirror(config, view, 'https://giaoandewey.vercel.app', async () => 'synthetic')).rejects.toThrow();
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
});
