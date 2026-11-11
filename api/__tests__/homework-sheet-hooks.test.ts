import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleCreateAssignment, handleTeacherAction, handleUpdateAssignment } from '../_classroom-teacher';

const h = vi.hoisted(() => ({
  db: null as any,
  store: {} as Record<string, Record<string, any>>,
  notify: vi.fn(async (_db: unknown, _classId: string) => undefined),
}));
vi.mock('../_assistant-homework-sheet.js', () => ({ notifyHomeworkSheet: h.notify }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({
  verifyIdToken: async () => ({ uid: 'teacher', email: 'teacher@example.test' }),
  getUser: async () => ({ email: 'teacher@example.test' }),
}) }));
vi.mock('../_classroom-access.js', async importOriginal => ({
  ...await importOriginal<typeof import('../_classroom-access.js')>(),
  readClassAccess: async (_db: unknown, classId: string) => classId === 'class' ? {
    ref: h.db.collection('classes').doc(classId), data: h.store['classes/class'],
    access: { canManageMembers: true, ownerId: 'teacher' },
  } : null,
}));

beforeEach(() => {
  h.notify.mockReset();
  h.store = { 'classes/class': { teacherId: 'teacher' }, 'assignments/existing': { classId: 'class', teacherId: 'teacher', title: 'Old', type: 'upload' } };
  h.db = { collection: (name: string) => ({ doc: (id: string) => ({
    id, get: async () => ({ exists: `${name}/${id}` in h.store, data: () => h.store[`${name}/${id}`] }),
    set: async (data: Record<string, unknown>) => { h.store[`${name}/${id}`] = data; },
    update: async (data: Record<string, unknown>) => { Object.assign(h.store[`${name}/${id}`], data); },
  }) }) };
});
const response = () => {
  const res = { statusCode: 0, payload: {} as any, status(code: number) { this.statusCode = code; return this; }, json(payload: unknown) { this.payload = payload; return this; } };
  return res;
};

describe('BTVN server mutation hooks', () => {
  it('enqueues the authenticated class only after an assignment is saved', async () => {
    h.notify.mockImplementationOnce(async (_db, classId) => {
      expect(classId).toBe('class');
      expect(h.store['assignments/new'].title).toBe('New');
    });
    const res = response();
    await handleCreateAssignment(h.db, { idToken: 'token', classId: 'forged', assignment: { id: 'new', classId: 'class', title: 'New' } }, res as never);
    expect(res.statusCode).toBe(200);
    expect(h.notify).toHaveBeenCalledExactlyOnceWith(h.db, 'class');
  });
  it.each([
    { action: 'renameAssignment', title: 'Renamed' },
    { action: 'updateAssignmentDeadline', dueAt: '2026-12-01T00:00:00Z' },
    { action: 'setAssignmentOpen', isOpen: true },
  ])('enqueues successful $action using the persisted assignment class', async patch => {
    const res = response();
    await handleUpdateAssignment(h.db, { idToken: 'token', assignmentId: 'existing', ...patch }, res as never);
    expect(res.statusCode).toBe(200);
    expect(h.notify).toHaveBeenCalledExactlyOnceWith(h.db, 'class');
  });
  it('does not enqueue rejected or invalid writes', async () => {
    const invalid = response();
    await handleCreateAssignment(h.db, { idToken: 'token', assignment: { classId: 'class', title: '' } }, invalid as never);
    expect(invalid.statusCode).toBe(422);
    const forbidden = response();
    await handleCreateAssignment(h.db, { idToken: 'token', assignment: { classId: 'other', title: 'New' } }, forbidden as never);
    expect(forbidden.statusCode).toBe(403);
    expect(h.notify).not.toHaveBeenCalled();
  });
  it('returns only safe counters and timestamps from the authenticated class sync state', async () => {
    h.store['classes/class'].sheetSync = { spreadsheetId: 'sheet', sheetId: 5 };
    h.store['assistantHomeworkSheets/class'] = { enabled: true, writeApproved: true, teacherId: 'teacher', spreadsheetId: 'sheet', sheetId: 5, sheetTitle: '02. BTVN', private: 'never return' };
    h.store['assistantHomeworkSources/class'] = { active: true, teacherId: 'teacher', spreadsheetId: 'sheet', sheetId: 5, sheetTitle: '02. BTVN' };
    h.store['assistantHomeworkSyncState/class'] = { revision: 3, syncedRevision: 2, syncedAt: 100, failed: true, nextAt: 200, lease: 'private', counts: { created: 2, statusWrites: 4, keptHuman: 3, skipped: 1, unmatched: 0, private: 'secret' } };
    const res = response();
    expect(await handleTeacherAction(h.db, { action: 'getClassSheetSyncStatus', idToken: 'token', classId: 'class' }, res as never)).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ enabled: true, syncedAt: 100, failed: true, pending: true, nextAt: 200, counts: { created: 2, statusWrites: 4, keptHuman: 3, skipped: 1, unmatched: 0 } });
    expect(h.notify).not.toHaveBeenCalled();
  });
  it.each(['02. BTVN', '10. OLINDA', '12. TOÁN LT1'])('requires a separate exact BTVN approval for %s; deadline access grants nothing', async sheetTitle => {
    const scope = { teacherId: 'teacher', spreadsheetId: 'sheet', sheetId: 5, sheetTitle };
    h.store['classes/class'].sheetSync = { spreadsheetId: 'sheet', sheetId: 5 };
    h.store['assistantHomeworkSheets/class'] = { enabled: true, writeApproved: true, ...scope };
    h.store['assistantHomeworkSyncState/class'] = { syncedAt: 100, revision: 2, syncedRevision: 1, private: 'never return' };
    h.store['assistantDeadlineSources/class'] = { active: true, ...scope };
    const check = async () => {
      const res = response();
      await handleTeacherAction(h.db, { action: 'getClassSheetSyncStatus', idToken: 'token', classId: 'class' }, res as never);
      return res.payload;
    };
    expect(await check()).toMatchObject({ enabled: false, syncedAt: null, pending: false });
    h.store['assistantHomeworkSources/class'] = { active: true, ...scope, sheetId: 6 };
    expect(await check()).toMatchObject({ enabled: false, syncedAt: null, pending: false });
    h.store['assistantHomeworkSources/class'] = { active: true, ...scope };
    expect(await check()).toEqual({ enabled: true, syncedAt: 100, pending: true, failed: false, nextAt: null, counts: { created: 0, statusWrites: 0, keptHuman: 0, skipped: 0, unmatched: 0 } });
    h.store['assistantHomeworkSources/class'].active = false;
    expect(await check()).toMatchObject({ enabled: false, syncedAt: null, pending: false });
  });
  it('rejects another class and disables old-owner or wrong-tab configurations', async () => {
    const denied = response();
    await handleTeacherAction(h.db, { action: 'getClassSheetSyncStatus', idToken: 'token', classId: 'other' }, denied as never);
    expect(denied.statusCode).toBe(403);
    for (const config of [
      { enabled: true, teacherId: 'previous-owner', sheetTitle: '02. BTVN' },
      { enabled: true, teacherId: 'teacher', sheetTitle: '02A. NỘP WEB' },
    ]) {
      h.store['assistantHomeworkSheets/class'] = config;
      const res = response();
      await handleTeacherAction(h.db, { action: 'getClassSheetSyncStatus', idToken: 'token', classId: 'class' }, res as never);
      expect(res.statusCode).toBe(200);
      expect(res.payload.enabled).toBe(false);
      expect(res.payload.syncedAt).toBeNull();
    }
  });
});
