import { describe, expect, it } from 'vitest';
import { runAssistantReadTool } from '../_assistant-tools.js';
import { resolveChannelActor } from '../_assistant-auth.js';

const actor = (firebaseUid: string) => ({ firebaseUid, channel: 'telegram' as const, channelAccountId: 'bot', channelUserId: '123', linkId: 'link', active: true as const });
function fakeDb(seed: Record<string, any[]> = {}) {
  const query = (rows: any[], filters: [string, unknown][] = []): any => ({
    where(field: string, _op: string, value: unknown) { return query(rows, [...filters, [field, value]]); },
    limit(_n: number) { return this; },
    async get() { const docs = rows.filter(r => filters.every(([k, v]) => r[k] === v)).map(r => ({ id: r.id, data: () => r, exists: true, ref: { collection: (name: string) => query(seed[name] || []) } })); return { docs, empty: !docs.length }; },
    doc(id: string) { const row = rows.find(r => r.id === id); return { async get() { return { exists: !!row, id, data: () => row, ref: { collection: (name: string) => query(seed[name] || []) } }; } }; },
  });
  return { collection: (name: string) => query(seed[name] || []) } as any;
}

describe('assistant private read tools', () => {
  it('scopes owner records to actor and rejects another teacher', async () => {
    const db = fakeDb({ classes: [{ id: 'a', teacherId: 'A', name: 'A' }, { id: 'b', teacherId: 'B', name: 'B' }] });
    const result = await runAssistantReadTool('listClasses', {}, actor('A'), db);
    expect(result.data).toEqual([{ id: 'a', name: 'A', grade: undefined, track: undefined, studentCount: undefined, updatedAt: undefined }]);
    await expect(runAssistantReadTool('getLessonPlan', { lessonPlanId: 'b' }, actor('A'), fakeDb({ lessonPlans: [{ id: 'b', userId: 'B' }] }))).rejects.toThrow('Resource not found');
  });
  it('does not convert failed queries into zero counts', async () => {
    const db = { collection: () => ({ where() { return this; }, limit() { return this; }, get() { throw new Error('query failed'); } }) } as any;
    await expect(runAssistantReadTool('listClasses', {}, actor('A'), db)).rejects.toThrow('query failed');
  });
  it('deduplicates attempts, distinguishes missing and unknown, and omits private grade data', async () => {
    const db = fakeDb({ submissions: [
      { id: 'old', teacherId: 'A', studentId: 's1', status: 'error', updatedAt: '2026-01-01' },
      { id: 'new', teacherId: 'A', studentId: 's1', status: 'graded', updatedAt: '2026-01-02', grade: { score: 8, feedback: 'ok', noteForTeacher: 'secret', teacherNote: 'private', teacherApproved: false } },
      { id: 'odd', teacherId: 'A', studentId: 's2', status: 'queued', updatedAt: '2026-01-03' },
    ] });
    const data = await runAssistantReadTool('getStudentSubmissionHistory', { studentId: 's1' }, actor('A'), db);
    expect(JSON.stringify(data)).not.toContain('secret'); expect(JSON.stringify(data)).not.toContain('private');
    expect(data.data).toMatchObject([{ id: 'new', status: 'graded' }]);
  });
  it('refuses unlinked identities and exposes only the linked owner', async () => {
    const db = fakeDb({ channelLinks: [{ id: 'l', firebaseUid: 'A', channel: 'telegram', channelAccountId: 'bot', channelUserId: '123', createdAt: 1, updatedAt: 1, active: true }] });
    await expect(resolveChannelActor('telegram', 'bot', '123', '123', db)).resolves.toMatchObject({ firebaseUid: 'A' });
    await expect(resolveChannelActor('telegram', 'bot', '999', '999', db)).rejects.toThrow('Channel is not linked');
  });
  it('blocks unsupported tool names', async () => {
    await expect(runAssistantReadTool('genericQuery', {}, actor('A'), fakeDb())).rejects.toThrow('Unsupported read tool');
  });
});
