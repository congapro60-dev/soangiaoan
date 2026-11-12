import { afterEach, describe, expect, it, vi } from 'vitest';
import { digestText, digestWindow, stripLinks, type DeadlineItem } from '../_assistant-deadline';
import { validateDeadlineConfig } from '../_assistant-deadline-config';
import { deadlineDeliveryPolicy, deadlineTargets, digestStillValid } from '../_assistant-deadline-runtime';
import { enqueueDeadlineDigest } from '../_assistant-deadline-notify';
import { readDeadlineSheet } from '../_assistant-deadline-sheet';

// Regression tests for the 2026-11-10 review findings that still applied to the current code.
const at = (hhmm: string, date = '2026-11-12') => Date.parse(`${date}T${hhmm}:00+07:00`);
const settings = { spreadsheetId: 'abcdefghijklmnopqrstuvwx', sheetId: 12, sheetTitle: '01. DEADLINE', studentNames: { HS01: 'Em Một' },
  tasks: [{ id: 't1', header: 'Khảo sát', state: 'draft', optional: false, studentCodes: [] }], notifications: false, digest: false };
const roster = [{ id: 's1', code: 'HS01', name: 'Em Một' }];
const items: DeadlineItem[] = [
  { id: 'sheet:t1', source: 'sheet', title: 'Khảo sát tuần 5', dueAt: '2026-11-12T10:00:00+07:00', url: '', status: 'missing' },
  { id: 'sheet:t2', source: 'sheet', title: 'Bài nộp', dueAt: '2026-11-12T12:00:00+07:00', url: '', status: 'review',
    note: 'Bảng đã đánh dấu hoàn thành; web chưa ghi nhận bài nộp. Em nhờ thầy cô đối chiếu.' },
];

describe('digest catch-up window (TT-3)', () => {
  it('opens from 07:00 to 11:59 Vietnam time only', () => {
    expect(digestWindow(at('06:59'))).toBe(false);
    expect(digestWindow(at('07:00'))).toBe(true);
    expect(digestWindow(at('11:59'))).toBe(true);
    expect(digestWindow(at('12:00'))).toBe(false);
  });
  it('a digest queued at 07:10 stays valid later the same day and dies on a new date, a disabled flag or changed content', () => {
    const job = { kind: 'digest', version: '2026-11-12', audience: 'student', text: digestText(items, at('07:10'), true) };
    expect(digestStillValid(job, items, true, at('10:30'))).toBe(true);
    expect(digestStillValid(job, items, true, at('10:30', '2026-11-13'))).toBe(false);
    expect(digestStillValid(job, items, false, at('10:30'))).toBe(false);
    expect(digestStillValid(job, [items[0]], true, at('10:30'))).toBe(false);
  });
});

describe('link stripping (PRIV-03)', () => {
  it('replaces scheme-less www links as well as https links', () => {
    expect(stripLinks('Nộp tại https://a.example/x www.docs.example/y nhé', '[mở]')).toBe('Nộp tại [mở] [mở] nhé');
  });
});

describe('teacher config validation (AUTH-WEB-3, sheet-5, PRIV-02 switches)', () => {
  it('rejects task ids that are not strings even when they coerce to valid text', () => {
    for (const id of [123, ['t1'], { toString: () => 't1' }]) {
      expect(() => validateDeadlineConfig({ ...settings, tasks: [{ ...settings.tasks[0], id }] } as any, roster)).toThrow();
    }
  });
  it('requires roster codes to match mapping keys exactly, because lookups use the stored code', () => {
    expect(() => validateDeadlineConfig({ ...settings, studentNames: { ' HS01': 'Em Một' } } as any, roster)).toThrow();
  });
  it('treats digest and notification switches as literal booleans only', () => {
    const result = validateDeadlineConfig({ ...settings, digest: 'true', notifications: 1 } as any, roster);
    expect(result.digest).toBe(false);
    expect(result.notifications).toBe(false);
  });
});

describe('Sheets read mask (sheet-1)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it('sends a balanced fields mask that Google can parse', async () => {
    const fetchMock = vi.fn(async (_url: unknown, _init?: unknown) => new Response(JSON.stringify({
      sheets: [{ properties: { sheetId: 12, title: '01. DEADLINE' }, data: [{ startRow: 0, startColumn: 0, rowData: [] }] }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await readDeadlineSheet(settings, async () => 'token');
    const fields = new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('fields') || '';
    expect(fields.split('(').length - 1).toBe(fields.split(')').length - 1);
    expect(fields).toBe('sheets(properties(sheetId,title),data(startRow,startColumn,rowData(values(formattedValue,hyperlink,effectiveValue))))');
  });
});

describe('guardian digest wording (PH digest)', () => {
  it('addresses the child and never shows student commands, the workbook or the student-only note', () => {
    const text = digestText(items, at('07:30'), true, 'parent');
    expect(text).toContain('VIỆC CỦA CON HÔM NAY');
    expect(text).toContain('báo cáo học tập của con');
    expect(text).not.toContain('VIỆC CỦA EM');
    expect(text).not.toContain('"deadline"');
    expect(text).not.toContain('Em nhờ');
    expect(text).toContain('Nhờ thầy cô đối chiếu');
  });
  it('keeps the student digest wording unchanged', () => {
    const text = digestText(items, at('07:30'), true);
    expect(text).toContain('VIỆC CỦA EM HÔM NAY');
    expect(text).toContain('Nhắn "deadline"');
    expect(text).toContain('Em nhờ thầy cô đối chiếu');
  });
});

describe('recipient selection (DLV-1 window, PH digest targets)', () => {
  const bundle = { classId: 'c1', teacherId: 't1', students: [{ id: 's1', code: 'HS01' }, { id: 's2', code: 'HS02' }], settings } as any;
  const link = (id: string, patch: Record<string, unknown> = {}) => {
    const channelUserId = (patch.channelUserId as string | undefined) ?? `u-${id}`;
    return { id, active: true, channel: 'zalo_bot', channelAccountId: 'bot', role: 'student', studentId: 's1',
      channelChatId: channelUserId, ...patch, channelUserId };
  };
  it('keeps one student link per student; guardian links appear only when the switch is on, students first', () => {
    const links = [
      link('p2', { role: 'parent', channelUserId: 'pu2' }),
      link('l1'),
      link('l0'),
      link('p1', { role: 'parent', channelUserId: 'pu1' }),
      link('x-expired', { role: 'parent', expiresAt: at('06:00') }),
      link('x-inactive', { role: 'parent', active: false }),
      link('x-other-bot', { role: 'parent', channelAccountId: 'other' }),
      link('x-unmapped', { studentId: 's2' }),
      link('x-chat', { role: 'parent', channelChatId: 'other-chat' }),
    ];
    expect(deadlineTargets(links, bundle, 'bot', at('08:00')).map(t => t.linkId)).toEqual(['l0']);
    const targets = deadlineTargets(links, bundle, 'bot', at('08:00'), true);
    expect(targets.map(t => [t.linkId, t.role])).toEqual([['l0', 'student'], ['p1', 'parent'], ['p2', 'parent']]);
  });
  it('the guardian digest switch is off unless the env value is literally "true"', () => {
    expect(deadlineDeliveryPolicy({}).parentDigest).toBe(false);
    expect(deadlineDeliveryPolicy({ ZALO_DEADLINE_PARENT_DIGEST: '1' }).parentDigest).toBe(false);
    expect(deadlineDeliveryPolicy({ ZALO_DEADLINE_PARENT_DIGEST: 'true' }).parentDigest).toBe(true);
  });
});

describe('guardian digest jobs (PH digest)', () => {
  function fakeDb() {
    const store = new Map<string, any>();
    const ref = (path: string) => ({ path });
    const db: any = {
      store,
      collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
      runTransaction: async (fn: (tx: any) => Promise<unknown>) => fn({
        get: async (r: { path: string }) => ({ exists: store.has(r.path), data: () => store.get(r.path) }),
        set: (r: { path: string }, value: unknown) => { store.set(r.path, value); },
      }),
    };
    return db;
  }
  it('queues one digest per guardian link and keeps the student digest key separate', async () => {
    const db = fakeDb();
    const policy = { enabled: true, botId: 'bot', testUserIds: ['pu1', 'pu2', 'u-l0'] };
    const base = { classId: 'c1', teacherId: 't1', studentId: 's1' };
    await enqueueDeadlineDigest(db, { ...base, linkId: 'p1', userId: 'pu1', role: 'parent' }, items, policy, at('07:10'));
    await enqueueDeadlineDigest(db, { ...base, linkId: 'p2', userId: 'pu2', role: 'parent' }, items, policy, at('07:10'));
    await enqueueDeadlineDigest(db, { ...base, linkId: 'l0', userId: 'u-l0', role: 'student' }, items, policy, at('07:10'));
    const jobs = [...db.store.values()];
    expect(jobs).toHaveLength(3);
    expect(jobs.map(j => j.audience).sort()).toEqual(['parent', 'parent', 'student']);
    expect(jobs.filter(j => j.audience === 'parent').every(j => j.text.includes('VIỆC CỦA CON'))).toBe(true);
    expect(jobs.find(j => j.audience === 'student').text).toContain('VIỆC CỦA EM');
  });
});
