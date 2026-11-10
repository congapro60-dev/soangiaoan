import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './_fake-db.js';
import { handleDeadlineConfig, requireDeadlineSource } from '../_assistant-deadline-config.js';
const classId = 'class-1787188523562';
const spreadsheetId = 'synthetic-sheet-file-123456';
const response = () => { const res: any = { code: 200, data: null }; res.status = (code: number) => { res.code = code; return res; }; res.json = (data: unknown) => { res.data = data; return res; }; return res; };
afterEach(() => vi.unstubAllEnvs());
describe('deadline configuration boundaries', () => {
  it('rejects other classes even if a source was approved', async () => {
    const db = new FakeDb();
    db.put('assistantDeadlineSources/other', { active: true, teacherId: 'teacher', spreadsheetId });
    await expect(requireDeadlineSource(db.db, 'other', 'teacher', spreadsheetId)).rejects.toThrow();
    const res = response();
    await handleDeadlineConfig(db.db, { action: 'getDeadlineSettings' }, res, async () => ({ classId: 'other', classData: { teacherId: 'teacher' }, uid: 'teacher' }));
    expect(res.code).toBe(403);
    expect(db.scans).toHaveLength(0);
  });
  it('requires approved source and matching current owner', async () => {
    const db = new FakeDb();
    await expect(requireDeadlineSource(db.db, classId, 'teacher', spreadsheetId)).rejects.toThrow();
    db.put(`assistantDeadlineSources/${classId}`, { active: true, teacherId: 'teacher', spreadsheetId });
    await expect(requireDeadlineSource(db.db, classId, 'teacher', spreadsheetId)).resolves.toBeUndefined();
    await expect(requireDeadlineSource(db.db, classId, 'other', spreadsheetId)).rejects.toThrow();
    await expect(requireDeadlineSource(db.db, classId, 'teacher', 'other-synthetic-sheet-file')).rejects.toThrow();
  });
  it.each([false, true])('delivery flag requires all three server gates: %s', async approved => {
    const db = new FakeDb(), res = response();
    vi.stubEnv('ZALO_DEADLINE_ENABLED', 'true');
    vi.stubEnv('ZALO_DEADLINE_REAL_APPROVED', 'true');
    vi.stubEnv('ZALO_DEADLINE_QUOTA_VERIFIED', String(approved));
    await handleDeadlineConfig(db.db, { action: 'getDeadlineSettings' }, res, async () => ({ classId, classData: { teacherId: 'teacher' }, uid: 'teacher' }));
    expect(res.code).toBe(200);
    expect(res.data.deliveryEnabled).toBe(approved);
  });
});
