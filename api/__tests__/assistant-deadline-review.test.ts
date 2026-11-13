import { afterEach, describe, expect, it, vi } from 'vitest';
import { digestText, digestWindow, stripLinks, type DeadlineItem } from '../_assistant-deadline';
import { validateDeadlineConfig } from '../_assistant-deadline-config';
import { deadlineDeliveryPolicy, deadlineDispatchEligible, deadlineTargets, digestStillValid } from '../_assistant-deadline-runtime';
import { enqueueDeadlineDigest, jobRecipientAllowed } from '../_assistant-deadline-notify';
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
  it('is short: 2 nearest deadlines, 2 newest web assignments, the rest behind number 11', () => {
    const many: DeadlineItem[] = [
      ...[1, 2, 3].map(n => ({ id: 'sheet:t' + n, source: 'sheet' as const, title: 'Deadline ' + n, dueAt: '2026-11-1' + n + 'T10:00:00+07:00', url: '', status: 'missing' as const })),
      ...[1, 2, 3].map(n => ({ id: 'a' + n, assignmentId: 'a' + n, title: 'Bài ' + n, dueAt: '', url: '', status: 'missing' as const, createdAt: '2026-11-0' + n + 'T00:00:00Z' })),
    ];
    const text = digestText(many, at('07:30'), true, 'parent');
    expect(text).toContain('VIỆC CỦA CON HÔM NAY');
    expect(text).toContain('Deadline 1'); expect(text).toContain('Deadline 2'); expect(text).not.toContain('Deadline 3');
    expect(text).toContain('Bài 3'); expect(text).toContain('Bài 2'); expect(text).not.toContain('Bài 1');
    expect(text).toContain('Còn 2 việc khác');
    expect(text).toContain('*11#'); expect(text).toContain('toàn bộ việc của con');
    expect(text).not.toContain('VIỆC CỦA EM');
    expect(text.length).toBeLessThan(700);
  });
  it('full guardian list is addressed to the child and never links the workbook', () => {
    const text = digestText(items, at('07:30'), false, 'parent');
    expect(text).toContain('TOÀN BỘ VIỆC CỦA CON');
    expect(text).not.toContain('Em nhờ');
    expect(text).not.toContain('docs.google.com');
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
    const policy = { enabled: true, botId: 'bot', testUserIds: ['pu1', 'pu2', 'u-l0'], parentTestUserIds: ['pu1', 'pu2'] };
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

describe('guardian test gate (PARENT_TEST_USER_IDS)', () => {
  const real = { enabled: true, botId: 'bot', testUserIds: [] as string[], realDeliveryApproved: true, quotaVerified: true };
  function fakeDb() {
    const store = new Map<string, any>();
    const ref = (path: string) => ({ path });
    return {
      store,
      collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
      runTransaction: async (fn: (tx: any) => Promise<unknown>) => fn({
        get: async (r: { path: string }) => ({ exists: store.has(r.path), data: () => store.get(r.path) }),
        set: (r: { path: string }, value: unknown) => { store.set(r.path, value); },
      }),
    } as any;
  }
  const base = { classId: 'c1', teacherId: 't1', studentId: 's1' };
  it('parses the list from env and defaults to empty', () => {
    expect(deadlineDeliveryPolicy({}).parentTestUserIds).toEqual([]);
    expect(deadlineDeliveryPolicy({ ZALO_DEADLINE_PARENT_TEST_USER_IDS: 'a, b' }).parentTestUserIds).toEqual(['a', 'b']);
  });
  it('real-delivery flags do not open guardian digests; only listed ids get one, students unaffected', async () => {
    const db = fakeDb();
    const policy = { ...real, parentTestUserIds: ['pu1'] };
    await enqueueDeadlineDigest(db, { ...base, linkId: 'p1', userId: 'pu1', role: 'parent' }, items, policy, at('07:10'));
    await enqueueDeadlineDigest(db, { ...base, linkId: 'p2', userId: 'pu2', role: 'parent' }, items, policy, at('07:10'));
    await enqueueDeadlineDigest(db, { ...base, linkId: 'l1', userId: 'u1', role: 'student' }, items, policy, at('07:10'));
    expect([...db.store.values()].map(j => j.userId).sort()).toEqual(['pu1', 'u1']);
  });
  it('an empty list means no guardian digest at all', async () => {
    const db = fakeDb();
    await enqueueDeadlineDigest(db, { ...base, linkId: 'p1', userId: 'pu1', role: 'parent' }, items, { ...real, parentTestUserIds: [] }, at('07:10'));
    expect(db.store.size).toBe(0);
  });
  it('dispatch ignores queued guardian jobs whose id is not listed', () => {
    const targets = [{ ...base, linkId: 'p2', userId: 'pu2', role: 'parent' as const }];
    const job = { ...base, linkId: 'p2', userId: 'pu2', botId: 'bot', audience: 'parent', nextAt: 0, attempts: 0, createdAt: at('07:10') };
    expect(deadlineDispatchEligible(job, targets, { ...real, parentTestUserIds: [] }, at('07:20'))).toBe(false);
    expect(deadlineDispatchEligible(job, targets, { ...real, parentTestUserIds: ['pu2'] }, at('07:20'))).toBe(true);
  });
});

describe('guardian open-to-all flag (PARENT_ALL)', () => {
  it('opens guardian digests to every guardian only with the explicit flag', () => {
    const policy = { enabled: true, botId: 'bot', testUserIds: [] as string[], realDeliveryApproved: true, quotaVerified: true, parentTestUserIds: [] as string[] };
    expect(jobRecipientAllowed(policy, { userId: 'pu9', audience: 'parent' })).toBe(false);
    expect(jobRecipientAllowed({ ...policy, parentAll: true }, { userId: 'pu9', audience: 'parent' })).toBe(true);
    expect(deadlineDeliveryPolicy({ ZALO_DEADLINE_PARENT_ALL: 'true' }).parentAll).toBe(true);
    expect(deadlineDeliveryPolicy({}).parentAll).toBe(false);
  });
  it('each guardian digest is built from the linked child only', () => {
    const only = (id: string): DeadlineItem[] => [{ id: 'sheet:' + id, source: 'sheet', title: 'Việc của ' + id, dueAt: '2026-11-13T10:00:00+07:00', url: '', status: 'missing' }];
    const a = digestText(only('A'), at('07:30'), true, 'parent'), b = digestText(only('B'), at('07:30'), true, 'parent');
    expect(a).toContain('Việc của A'); expect(a).not.toContain('Việc của B');
    expect(b).toContain('Việc của B'); expect(b).not.toContain('Việc của A');
  });
});

describe('QA 13/11: nội dung gửi PH/HS', () => {
  it('bài đã được thầy cô duyệt điểm chính thức không còn là việc tồn đọng dù máy từng cờ ảnh', async () => {
    const { deadlineTasksForStudent } = await import('../_assistant-deadline');
    const config = { ...settings, tasks: [] } as any;
    const flagged = { assignmentId: 'a1', status: 'graded', grade: { photoReview: { missingQuestionNumbers: [2] } } };
    expect(deadlineTasksForStudent(config, 'HS01', 's1', [], [{ id: 'a1', title: 'BTVN' }], [flagged])[0].status).toBe('review');
    expect(deadlineTasksForStudent(config, 'HS01', 's1', [], [{ id: 'a1', title: 'BTVN' }], [{ ...flagged, gradeState: 'official' }])).toEqual([]);
  });
  it('hạn 00:00 ghi là hết ngày hôm trước; danh sách đầy đủ của PH có tiêu đề nhóm và lời nhắc menu chuẩn', () => {
    const list: DeadlineItem[] = [
      { id: 'sheet:t1', source: 'sheet', title: 'Khảo sát', dueAt: '2026-10-26T17:00:00.000Z', url: '', status: 'missing' },
      { id: 'a1', source: 'web' as any, title: 'BTVN', dueAt: '2026-10-27T01:00:00.000Z', url: '', status: 'missing' },
    ];
    const text = digestText(list, at('13:00'), false, 'parent');
    expect(text).toContain('hết ngày 26/10/26');
    expect(text).toContain('08:00 27/10/26');
    expect(text).toMatch(/DEADLINE TRÊN SHEET[\s\S]*BÀI TẬP TRÊN WEB/);
    expect(text).toContain('Nhắn "0" để xem lại menu.');
    expect(text).not.toContain('vào ô chat');
  });
});
