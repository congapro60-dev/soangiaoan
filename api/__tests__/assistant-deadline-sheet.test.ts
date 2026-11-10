import { afterEach, describe, expect, it, vi } from 'vitest';
import { deadlineReadToken, readDeadlineSheet } from '../_assistant-deadline-sheet';
import { generateKeyPairSync } from 'node:crypto';
const config = { spreadsheetId: 'abcdefghijklmnopqrstuvwx', sheetTitle: '01. DEADLINE', sheetId: 12 };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('read-only bounded deadline source', () => {
  it.each(['snake', 'camel'])('reuses %s service-account keys and requests ONLY read-only scope', async shape => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_KEY', JSON.stringify(shape === 'snake' ? { client_email: 'synthetic@example.invalid', private_key: privateKey } : { clientEmail: 'synthetic@example.invalid', privateKey }));
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ access_token: 'synthetic-read-token', expires_in: 3600 })));
    vi.stubGlobal('fetch', fetcher);
    expect(await deadlineReadToken()).toBe('synthetic-read-token');
    const body = (fetcher.mock.calls[0] as any)[1].body as URLSearchParams;
    const payload = JSON.parse(Buffer.from(body.get('assertion')!.split('.')[1], 'base64url').toString());
    expect(payload.scope).toBe('https://www.googleapis.com/auth/spreadsheets.readonly');
  });
  it('requests exactly one configured tab, bounded cells and public fields, with a read-only bearer', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ sheets: [{ properties: { sheetId: 12, title: '01. DEADLINE' }, data: [{ rowData: [{ values: [{ formattedValue: 'DEADLINE' }] }] }] }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const read = await readDeadlineSheet(config, async () => 'fake-test-token');
    expect(read.grid[0][0].formattedValue).toBe('DEADLINE');
    const url = new URL(fetcher.mock.calls[0][0] as any);
    expect(url.searchParams.get('ranges')).toBe("'01. DEADLINE'!A1:GR200");
    expect(url.searchParams.get('fields')).not.toContain('userEntered');
    expect(url.searchParams.get('fields')).toBe('sheets(properties(sheetId,title),data(startRow,startColumn,rowData(values(formattedValue,hyperlink,effectiveValue))))');
    expect((fetcher.mock.calls[0][1] as any).method).toBe('GET');
  });
  it('rejects missing/wrong tab identity and never follows redirects', async () => {
    for (const response of [new Response('', { status: 403 }), new Response(JSON.stringify({ sheets: [{ properties: { sheetId: 13, title: '01. DEADLINE' }, data: [] }] }))]) {
      vi.stubGlobal('fetch', vi.fn(async () => response));
      await expect(readDeadlineSheet(config, async () => 'fake-test-token')).rejects.toThrow(/Sheet|tab|quyền/);
    }
  });
  it('rejects arbitrary spreadsheet paths before credential use', async () => {
    const token = vi.fn(); await expect(readDeadlineSheet({ ...config, spreadsheetId: '../private' }, token)).rejects.toThrow(); expect(token).not.toHaveBeenCalled();
  });
  it('fails closed on oversized source payloads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { headers: { 'content-length': '99999999' } })));
    await expect(readDeadlineSheet(config, async () => 'fake-test-token')).rejects.toThrow(/lớn|giới hạn/);
  });
});
