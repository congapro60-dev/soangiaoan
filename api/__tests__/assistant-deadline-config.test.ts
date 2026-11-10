import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../_assistant-deadline-sheet', () => ({ readDeadlineSheet: vi.fn() }));
import { readDeadlineSheet } from '../_assistant-deadline-sheet';
import { handleDeadlineConfig, validateDeadlineConfig, publicationVersion } from '../_assistant-deadline-config';
const base = { spreadsheetId: 'abcdefghijklmnopqrstuvwx', sheetId: 12, sheetTitle: '01. DEADLINE', studentNames: { HS01: 'Em Một' }, tasks: [{ id: 't1', header: 'Khảo sát', state: 'draft', optional: false, studentCodes: [] }], notifications: false, digest: false };
const roster = [{ id: 's1', code: 'HS01', name: 'Em Một' }];
describe('teacher deadline config validation', () => {
  it('accepts explicit code mappings and defaults delivery switches off', () => {
    const { notifications: _notifications, digest: _digest, ...unset } = base;
    const result = validateDeadlineConfig(unset, roster);
    expect(result.studentNames).toEqual({ HS01: 'Em Một' }); expect(result.digest).toBe(false);
  });
  it('does not accept unknown codes, duplicate names, ids or arbitrary tabs', () => {
    for (const patch of [{ studentNames: { HS02: 'Em Hai' } }, { tasks: [base.tasks[0], base.tasks[0]] }, { sheetTitle: '04. QUỸ LỚP' }, { tasks: [{ ...base.tasks[0], studentCodes: ['HS02'] }] }]) {
      expect(() => validateDeadlineConfig({ ...base, ...patch }, roster)).toThrow();
    }
  });
  it('will not assign unknown web assignments or accept prototype keys', () => {
    expect(() => validateDeadlineConfig({ ...base, tasks: [{ ...base.tasks[0], assignmentId: 'other' }] }, roster, [])).toThrow();
    expect(() => validateDeadlineConfig({ ...base, studentNames: JSON.parse('{"__proto__":"Em Một"}') }, roster)).toThrow();
  });
  it('requires explicit targets for optional published tasks', () => {
    expect(() => validateDeadlineConfig({ ...base, tasks: [{ ...base.tasks[0], state: 'published', optional: true }] }, roster)).toThrow();
  });
  it('delivery version changes for due/description but ignores cosmetic/private grading fields', () => {
    const original = { title: 'Bài', dueAt: '2026-11-10', description: 'Làm câu 1', isOpen: true };
    expect(publicationVersion(original)).toBe(publicationVersion({ ...original, title: 'Bài đổi tên', answerKey: 'secret', updatedAt: 'later' }));
    expect(publicationVersion(original)).not.toBe(publicationVersion({ ...original, dueAt: '2026-11-11' }));
    expect(publicationVersion(original)).not.toBe(publicationVersion({ ...original, description: 'Làm câu 2' }));
  });
});

describe('teacher deadline authorization and persistence', () => {
  let current: any;
  let approval: any;
  const ref = { get: async () => ({ data: () => current }) };
  const rosterDoc = { id: 's1', data: () => roster[0] };
  const db: any = {
    collection: (name: string) => ({
      doc: () => name === 'assistantDeadlineSources' ? { get: async () => ({ data: () => approval }) } : name === 'assistantDeadlineConfig' ? ref : { collection: () => ({ get: async () => ({ docs: [rosterDoc] }) }) },
      where: () => ({ get: async () => ({ docs: [] }) }),
    }),
    runTransaction: async (work: any) => work({ get: (r: any) => r.get(), set: (_r: any, value: any) => { current = value; } }),
  };
  const authorize = vi.fn(async () => ({ uid: 'gv', classId: 'c1', classData: { teacherId: 'gv', sheetSync: { spreadsheetId: base.spreadsheetId } } }));
  const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });
  beforeEach(() => {
    current = undefined; vi.clearAllMocks();
    approval = { teacherId: 'gv', spreadsheetId: base.spreadsheetId, active: true };
    vi.mocked(readDeadlineSheet).mockResolvedValue({ grid: [[], [{ formattedValue: 'Tên việc' }, {}, { formattedValue: 'Khảo sát' }], [{ formattedValue: 'Hạn chót (tự tính)' }], [], [], [{ formattedValue: 'Link' }], [], [], [{}, { formattedValue: 'Học sinh' }], [{}, { formattedValue: 'Em Một' }]], headers: ['Khảo sát'], studentNames: ['Em Một'], sheetId: 12 });
  });
  it('rejects unauthenticated access before reading Firestore or Google', async () => {
    const spy = vi.spyOn(db, 'collection'); const res = response();
    await handleDeadlineConfig(db, { action: 'getDeadlineSettings' }, res as any, async () => null);
    expect(spy).not.toHaveBeenCalled(); expect(readDeadlineSheet).not.toHaveBeenCalled(); spy.mockRestore();
  });
  it('does not use service credentials to probe an unrelated workbook', async () => {
    const res = response(); await handleDeadlineConfig(db, { action: 'previewDeadlineSettings', settings: { spreadsheetId: 'anotherprivatefile12345678' } }, res as any, authorize);
    expect(res.status).toHaveBeenCalledWith(422); expect(readDeadlineSheet).not.toHaveBeenCalled();
  });
  it.each([undefined, { teacherId: 'other', spreadsheetId: base.spreadsheetId, active: true }, { teacherId: 'gv', spreadsheetId: base.spreadsheetId, active: false }])('requires a server-approved file bound to the current owner: %s', async value => {
    approval = value;
    const res = response();
    await handleDeadlineConfig(db, { action: 'previewDeadlineSettings', settings: { spreadsheetId: base.spreadsheetId } }, res as any, authorize);
    expect(res.status).toHaveBeenCalledWith(422); expect(readDeadlineSheet).not.toHaveBeenCalled();
  });
  it('rejects a missing spreadsheet ID even when legacy class metadata is absent', async () => {
    const res = response();
    await handleDeadlineConfig(db, { action: 'previewDeadlineSettings', settings: {} }, res as any, async () => ({ uid: 'gv', classId: 'c1', classData: { teacherId: 'gv' } }));
    expect(res.status).toHaveBeenCalledWith(422); expect(readDeadlineSheet).not.toHaveBeenCalled();
  });
  it('discovers only the fixed deadline tab before any student mapping exists', async () => {
    const res = response(); await handleDeadlineConfig(db, { action: 'previewDeadlineSettings', settings: { spreadsheetId: base.spreadsheetId } }, res as any, authorize);
    expect(readDeadlineSheet).toHaveBeenCalledWith({ spreadsheetId: base.spreadsheetId, sheetTitle: '01. DEADLINE', sheetId: -1 });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ sheetId: 12 }));
  });
  it('saves only validated settings with optimistic revision, never overwrites a newer save', async () => {
    const res = response(); await handleDeadlineConfig(db, { action: 'saveDeadlineSettings', settings: base, revision: 0 }, res as any, authorize);
    expect(current.revision).toBe(1); expect(current.teacherId).toBe('gv');
    const old = structuredClone(current);
    await handleDeadlineConfig(db, { action: 'saveDeadlineSettings', settings: { ...base, digest: true }, revision: 0 }, res as any, authorize);
    expect(res.status).toHaveBeenLastCalledWith(422); expect(current).toEqual(old);
  });
  it('persists reopening even if polling missed the closed state', async () => {
    const res = response();
    for (const [revision, state] of ['published', 'closed', 'published'].entries()) {
      await handleDeadlineConfig(db, { action: 'saveDeadlineSettings', settings: { ...base, tasks: [{ ...base.tasks[0], state }] }, revision }, res as any, authorize);
    }
    expect(current.publicationRevisions.t1).toBe(2);
    expect(current.columnBindings.t1).toBe(2);
  });
});
