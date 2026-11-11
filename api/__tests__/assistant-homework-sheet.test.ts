import { afterEach, describe, expect, it, vi } from 'vitest';
import { readHomeworkSnapshot, writeHomeworkBtvn } from '../_assistant-homework-sheet';
const config = { spreadsheetId: 'abcdefghijklmnopqrstuvwx', sheetId: 456, sheetTitle: '02. BTVN', writeApproved: true };
const labels = ['BTVN', 'Hướng dẫn', 'Môn', 'Nội dung', 'Hạn kiểm tra', 'Link', 'Tính lỗi?', 'Đủ', 'Thiếu', 'Chưa làm', 'Tổ'];
const options = ['✅ Đủ', '⚠️ Thiếu', '❌ Chưa làm', '⏰ Nộp muộn', '➖ Không áp dụng'];
function source(value = '', note = '', title = config.sheetTitle): any {
 const rows: any[] = Array.from({ length: 12 }, (_, i) => ({ values: [{ formattedValue: labels[i] || '' }] }));
 rows[11].values = [{}, { formattedValue: 'Em Một' }, { formattedValue: value, note, dataValidation: { condition: { type: 'ONE_OF_LIST', values: options.map(v => ({ userEnteredValue: v })) } } }];
 return { properties: { timeZone: 'Asia/Saigon' }, sheets: [{ properties: { sheetId: 456, title, gridProperties: { rowCount: 200, columnCount: 61 } }, data: [{ rowData: rows }] }] };
}
const view: any = { updatedAt: '2026-11-11T01:00:00Z', assignments: [{ id: 'a1', title: '=PRIVATE_FORMULA()', dueAt: '', open: true }], students: [{ id: 's1', name: 'Em Một', groupId: '1', work: [{ assignmentId: 'a1', status: 'received', submittedAt: '2026-11-11T00:00:00Z', firstSubmittedAt: '2026-11-10T00:00:00Z' }] }] };
afterEach(() => vi.unstubAllGlobals());
describe('existing BTVN server writer', () => {
 it.each(['02. BTVN', '10. OLINDA', '12. TOÁN LT1'])('accepts exactly approved homework tab %s', async title => {
  const requests: any[] = [];
  const fetcher = vi.fn(async (_url: unknown, o: any) => {
   if (o.method === 'POST') { requests.push(...JSON.parse(o.body).requests); return new Response('{}'); }
   return new Response(JSON.stringify(source('', '', title)));
  });
  vi.stubGlobal('fetch', fetcher);
  const result = await writeHomeworkBtvn({ ...config, sheetTitle: title }, view, 'https://giaoandewey.vercel.app', async () => 'synthetic');
  expect(result.statusWrites).toBe(1);
  expect(fetcher.mock.calls.filter(([, o]) => o.method === 'GET').every(([url]) => new URL(String(url)).searchParams.get('ranges')?.startsWith(`'${title}'!`))).toBe(true);
  expect(requests.every(r => (r.updateCells || r.setDataValidation).range.sheetId === config.sheetId)).toBe(true);
 });
 it('blocks the Columbus LINK mirror and any IMPORTRANGE template before writing', async () => {
  const token = vi.fn(async () => 'synthetic');
  await expect(writeHomeworkBtvn({ ...config, sheetTitle: '11.COLUMBUS(LINK)' }, view, 'https://giaoandewey.vercel.app', token)).rejects.toThrow();
  expect(token).not.toHaveBeenCalled();
  const input = source('', '', '10. OLINDA');
  input.sheets[0].data[0].rowData[0].values[0] = { formattedValue: 'BTVN', userEnteredValue: { formulaValue: '=IMPORTRANGE("external";"A1:BI91")' } };
  const fetcher = vi.fn(async () => new Response(JSON.stringify(input)));
  vi.stubGlobal('fetch', fetcher);
  await expect(writeHomeworkBtvn({ ...config, sheetTitle: '10. OLINDA' }, view, 'https://giaoandewey.vercel.app', token)).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('creates a column and receipt through surgical cells, never whole-tab clear or penalty', async () => {
  const requests: any[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_u: unknown, o: any) => {
   if (o.method === 'POST') { requests.push(...JSON.parse(o.body).requests); return new Response('{}'); }
   return new Response(JSON.stringify(source()));
  }));
  const result = await writeHomeworkBtvn(config, view, 'https://giaoandewey.vercel.app', async () => 'synthetic');
  expect(result.statusWrites).toBe(1);
  expect(requests.length).toBeGreaterThan(2);
  for (const r of requests) {
   const body = r.updateCells || r.setDataValidation;
   expect(body.range.sheetId).toBe(456);
   if (r.updateCells) {
    expect(body.range.endRowIndex - body.range.startRowIndex).toBe(1);
    expect(body.range.endColumnIndex - body.range.startColumnIndex).toBe(1);
    expect([6, 7, 8, 9]).not.toContain(body.range.startRowIndex);
   }
  }
  expect(JSON.stringify(requests)).toContain('📥 Đã nộp web');
  expect(JSON.stringify(requests)).toContain('=PRIVATE_FORMULA()');
  expect(JSON.stringify(requests)).not.toContain('formulaValue');
 });
 it('preserves manual statuses, unrelated notes, and formulas', async () => {
  for (const [value, note, formula] of [['⚠️ Thiếu', '', ''], ['', 'Ghi chú của tổ trưởng', ''], ['', '', '=IF(TRUE;"";"x")']]) {
   const input = source(value, note);
   input.sheets[0].data[0].rowData[3].values[2] = { formattedValue: 'Bài đã liên kết' };
   input.sheets[0].data[0].rowData[5].values[2] = { formattedValue: 'https://giaoandewey.vercel.app/?baiGiao=a1' };
   if (formula) input.sheets[0].data[0].rowData[11].values[2].userEnteredValue = { formulaValue: formula };
   const posts: any[] = [];
   vi.stubGlobal('fetch', vi.fn(async (_u: unknown, o: any) => { if (o.method === 'POST') posts.push(JSON.parse(o.body)); return new Response(JSON.stringify(input)); }));
   await writeHomeworkBtvn(config, view, 'https://giaoandewey.vercel.app', async () => 'synthetic');
   expect(posts.flatMap(p => p.requests).filter(r => r.updateCells?.range.startRowIndex === 11)).toHaveLength(0);
  }
 });
 it('refuses a changed sheet before POST so a concurrent manual edit is not lost', async () => {
  let reads = 0; const post = vi.fn();
  vi.stubGlobal('fetch', vi.fn(async (_u: unknown, o: any) => {
   if (o.method === 'POST') { post(); return new Response('{}'); }
   return new Response(JSON.stringify(++reads === 1 ? source() : source('⚠️ Thiếu')));
  }));
  await expect(writeHomeworkBtvn(config, view, 'https://giaoandewey.vercel.app', async () => 'synthetic')).rejects.toThrow();
  expect(post).not.toHaveBeenCalled();
 });
 it('blocks unapproved/replaced tabs and wrong origins before writes', async () => {
  for (const patch of [{ writeApproved: false }, { sheetTitle: '02A. NỘP WEB' }, { sheetId: -1 }, { spreadsheetId: '../secret' }]) {
   const token = vi.fn();
   await expect(writeHomeworkBtvn({ ...config, ...patch }, view, 'https://giaoandewey.vercel.app', token)).rejects.toThrow();
   expect(token).not.toHaveBeenCalled();
  }
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ...source(), sheets: [] }))));
  await expect(readHomeworkSnapshot(config, 'synthetic')).rejects.toThrow();
 });
 it('rechecks authorization before POST and surfaces Google errors for retry', async () => {
  const fetcher = vi.fn(async (_u: unknown, o: any) => o.method === 'POST' ? new Response('{}', { status: 429 }) : new Response(JSON.stringify(source())));
  vi.stubGlobal('fetch', fetcher);
  await expect(writeHomeworkBtvn(config, view, 'https://giaoandewey.vercel.app', async () => 'synthetic', async () => { throw new Error('lease changed'); })).rejects.toThrow('lease changed');
  expect(fetcher.mock.calls.every(([, o]) => o.method !== 'POST')).toBe(true);
  await expect(writeHomeworkBtvn(config, view, 'https://giaoandewey.vercel.app', async () => 'synthetic')).rejects.toThrow();
 });
});
