import { describe, expect, it } from 'vitest';
import { deadlineDeliveryPolicy, deadlineDispatchEligible, loadDeadlineClass, noticesFor, studentDeadlineView } from '../_assistant-deadline-runtime';
import { vi } from 'vitest';

const settings = { spreadsheetId: 'abcdefghijklmnopqrstuvwx', sheetId: 1, sheetTitle: '01. DEADLINE', studentNames: { HS01: 'Em Một' }, tasks: [], notifications: false, digest: false };
const bundle: any = { settings, rows: [], students: [{ id: 's1', code: 'HS01' }], assignments: [{ id: 'a1', classId: 'c1', teacherId: 'gv', title: 'Bài' }], submissions: [{ classId: 'c1', studentId: 's2', assignmentId: 'a1', status: 'graded' }], classId: 'c1', teacherId: 'gv' };
describe('deadline runtime boundaries', () => {
  it('does not trust another student submission', () => expect(studentDeadlineView(bundle, 's1')[0].status).toBe('missing'));
  it('blocks unknown students and unmapped identities rather than claiming all clear', () => {
    expect(() => studentDeadlineView(bundle, 's2')).toThrow();
    expect(() => studentDeadlineView({ ...bundle, settings: { ...settings, studentNames: {} } }, 's1')).toThrow();
  });
  it('accepted online submission suppresses a reminder', () => expect(studentDeadlineView({ ...bundle, submissions: [{ classId: 'c1', studentId: 's1', assignmentId: 'a1', status: 'submitted' }] }, 's1')).toEqual([]));
  it('requires all three server switches for real delivery', () => {
    expect(deadlineDeliveryPolicy({}).enabled).toBe(false);
    const policy = deadlineDeliveryPolicy({ ZALO_DEADLINE_ENABLED: 'true', ZALO_BOT_ID: 'bot', ZALO_DEADLINE_REAL_APPROVED: 'true' });
    expect(policy.quotaVerified).toBe(false); expect(policy.testUserIds).toEqual([]);
  });
  it('filters recipient eligibility before the send budget, including stale/unmapped jobs', () => {
    const target = { linkId: 'l1', userId: 'test', studentId: 's1', classId: 'c1', teacherId: 'gv' };
    const policy = { enabled: true, botId: 'bot', testUserIds: ['test'] };
    const valid = { ...target, id: 'good', botId: 'bot', nextAt: 1, createdAt: 1, attempts: 0 };
    const jobs = [...Array.from({ length: 1001 }, (_, i) => ({ ...valid, id: String(i), userId: 'real' })), valid];
    expect(jobs.filter(j => deadlineDispatchEligible(j, [target], policy, 2)).slice(0, 20).map(j => j.id)).toEqual(['good']);
    expect(deadlineDispatchEligible(valid, [], policy, 2)).toBe(false);
    expect(deadlineDispatchEligible(valid, [target], policy, 86400002)).toBe(false);
  });
  it('reopening one Sheet task does not change another task notification version', () => {
    const tasks = ['t1', 't2'].map(id => ({ id, header: id, state: 'published', optional: false, studentCodes: [] }));
    const own: any = { ...bundle, assignments: [], settings: { ...settings, tasks }, rows: tasks.map(t => ({ id: t.id, title: t.header, studentCode: 'HS01', complete: false, dueAt: '', url: '' })), publicationRevisions: { t1: 1, t2: 1 } };
    const before = noticesFor(own, 's1'); own.publicationRevisions.t2 = 2;
    const after = noticesFor(own, 's1');
    expect(before[0].version).toBe(after[0].version); expect(before[1].version).not.toBe(after[1].version);
  });
});

function sourceDb(change: Record<string, any> = {}) {
  const data: Record<string, any> = {
    'classes/c1': { teacherId: 'gv', sheetSync: { spreadsheetId: settings.spreadsheetId } },
    'assistantDeadlineConfig/c1': { teacherId: 'gv', revision: 1, settings },
    'assistantDeadlineSources/c1': { teacherId: 'gv', spreadsheetId: settings.spreadsheetId, active: true },
    'classes/c1/students/s1': { code: 'HS01' },
    'assignments/a1': { teacherId: 'gv', classId: 'c1', title: 'Bài' },
    'assignments/other': { teacherId: 'other', classId: 'c1', title: 'Bài riêng' },
    'submissions/another': { teacherId: 'gv', classId: 'c1', studentId: 's2', assignmentId: 'a1', status: 'graded' },
    ...change,
  };
  const snap = (path: string): any => ({ id: path.split('/').at(-1), exists: !!data[path], data: () => data[path] });
  const collection = (path: string, filters: any[] = [], max = 10000): any => ({
    doc: (id: string) => ({ get: async () => snap(`${path}/${id}`), collection: (name: string) => collection(`${path}/${id}/${name}`) }),
    where: (key: string, op: string, value: unknown) => collection(path, [...filters, [key, value]], max),
    limit: (count: number) => collection(path, filters, count),
    get: async () => { const docs = Object.keys(data).filter(p => p.startsWith(path + '/') && p.slice(path.length + 1).indexOf('/') < 0 && filters.every(([key, value]) => data[p]?.[key] === value)).slice(0, max).map(snap); return { docs, size: docs.length }; },
  });
  return { collection } as any;
}
const read = () => vi.fn(async () => ({ grid: [[], [{ formattedValue: 'Tên việc' }], [{ formattedValue: 'Hạn chót (tự tính)' }], [], [], [{ formattedValue: 'Link' }], [], [], [{}, { formattedValue: 'Học sinh' }], [{}, { formattedValue: 'Em Một' }]], studentNames: ['Em Một'], headers: [], sheetId: 1 }));
describe('deadline source loader', () => {
  it('source-only polling never reads submission history', async () => {
    const db = sourceDb(), collection = db.collection;
    const collections: string[] = [];
    db.collection = (path: string) => { collections.push(path); return collection(path); };
    const result = await loadDeadlineClass(db, 'c1', read(), false);
    expect(result.submissions).toEqual([]);
    expect(collections).not.toContain('submissions');
    expect(collections).not.toContain('examSubmissions');
    expect(collections).not.toContain('adaptiveAssignmentProgress');
  });
  it('reads only the configured class and filters foreign-owner tasks', async () => {
    const reader = read(); const result = await loadDeadlineClass(sourceDb(), 'c1', reader);
    expect(result.assignments.map(a => a.id)).toEqual(['a1']);
    expect(studentDeadlineView(result, 's1')[0].status).toBe('missing');
    expect(reader).toHaveBeenCalledWith(settings);
  });
  it('does not read Google when the class owner/source binding has changed', async () => {
    for (const change of [{ 'classes/c1': { teacherId: 'other', sheetSync: { spreadsheetId: settings.spreadsheetId } } }, { 'classes/c1': { teacherId: 'gv', sheetSync: { spreadsheetId: 'anotherfile1234567890123456' } } }]) {
      const reader = read(); await expect(loadDeadlineClass(sourceDb(change), 'c1', reader)).rejects.toThrow(); expect(reader).not.toHaveBeenCalled();
    }
  });
  it('propagates a failed source read instead of generating an empty success', async () => {
    await expect(loadDeadlineClass(sourceDb(), 'c1', vi.fn(async () => { throw new Error('source unavailable'); }))).rejects.toThrow('source unavailable');
  });
  it('never trusts a teacher-written class file ID as service-account authority', async () => {
    const reader = read();
    await expect(loadDeadlineClass(sourceDb({ 'assistantDeadlineSources/c1': undefined }), 'c1', reader)).rejects.toThrow();
    expect(reader).not.toHaveBeenCalled();
  });
  it('current ownerId overrides a legacy teacherId', async () => {
    const reader = read();
    await expect(loadDeadlineClass(sourceDb({ 'classes/c1': { teacherId: 'gv', ownerId: 'new-owner' } }), 'c1', reader)).rejects.toThrow();
    expect(reader).not.toHaveBeenCalled();
  });
  it('blocks column-only moves until the teacher explicitly remaps and saves', async () => {
    const configured = { ...settings, tasks: [{ id: 't1', header: 'Khảo sát', state: 'published', optional: false, studentCodes: [] }] };
    const reader = read();
    const source = await reader(); source.grid[1].push({ formattedValue: '' }, { formattedValue: 'Khảo sát' });
    await expect(loadDeadlineClass(sourceDb({ 'assistantDeadlineConfig/c1': { teacherId: 'gv', settings: configured, columnBindings: { t1: 3 } } }), 'c1', async () => source)).rejects.toThrow('Cột deadline');
  });
});
