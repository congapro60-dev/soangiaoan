import { describe, expect, it } from 'vitest';
import { runAssistantReadTool } from '../_assistant-tools.js';
import { resolveChannelActor } from '../_assistant-auth.js';

const actor = (firebaseUid: string) => ({ firebaseUid, channel: 'telegram' as const, channelAccountId: 'bot', channelUserId: '123', linkId: 'link', active: true as const });
function fakeDb(seed: Record<string, any[]> = {}) {
  const valueAt = (row: any, path: string) => path.split('.').reduce((v, key) => v?.[key], row);
  const query = (rows: any[], filters: [string, string, unknown][] = [], max = Infinity): any => ({
    where(field: string, op: string, value: unknown) { return query(rows, [...filters, [field, op, value]], max); },
    limit(n: number) { return query(rows, filters, n); },
    async get() {
      const filtered = rows.filter(r => filters.every(([k, op, v]) => op === '==' && valueAt(r, k) === v)).slice(0, max);
      const docs = filtered.map(r => ({ id: r.id, data: () => r, exists: true }));
      return { docs, empty: !docs.length };
    },
    doc(id: string) {
      const row = rows.find(r => r.id === id);
      return { async get() { return { exists: !!row, id, data: () => row }; }, collection(name: string) { return query(seed[`classes/${id}/${name}`] || []); } };
    },
  });
  return { collection: (name: string) => query(seed[name] || []) } as any;
}

describe('assistant private read tools', () => {
  it('scopes owner records and reads lesson by direct ID beyond first 100', async () => {
    const plans = Array.from({ length: 130 }, (_, i) => ({ id: `p${i}`, userId: 'A', title: `Plan ${i}` }));
    const db = fakeDb({ lessonPlans: plans, classes: [{ id: 'a', teacherId: 'A', name: 'A' }, { id: 'b', teacherId: 'B', name: 'B' }] });
    expect((await runAssistantReadTool('getLessonPlan', { lessonPlanId: 'p129' }, actor('A'), db)).data).toMatchObject({ id: 'p129' });
    await expect(runAssistantReadTool('getLessonPlan', { lessonPlanId: 'b' }, actor('A'), fakeDb({ lessonPlans: [{ id: 'b', userId: 'B' }] }))).rejects.toThrow('Resource not found');
    const result = await runAssistantReadTool('listClasses', {}, actor('A'), db);
    expect(result.data).toMatchObject({ items: [{ id: 'a' }], complete: true, truncated: false });
  });
  it('deduplicates per assignment and reports orphan or malformed rows as unknown', async () => {
    const db = fakeDb({
      classes: [{ id: 'c', teacherId: 'A' }],
      'classes/c/students': [{ id: 's1', teacherId: 'A', classId: 'c' }, { id: 's2', teacherId: 'A', classId: 'c' }],
      assignments: [{ id: 'a1', teacherId: 'A', classId: 'c' }, { id: 'a2', teacherId: 'A', classId: 'c' }],
      submissions: [
        { id: '1', teacherId: 'A', classId: 'c', assignmentId: 'a1', studentId: 's1', status: 'submitted', updatedAt: '2026-01-01' },
        { id: '2', teacherId: 'A', classId: 'c', assignmentId: 'a1', studentId: 's1', status: 'graded', updatedAt: '2026-01-02' },
        { id: '3', teacherId: 'A', classId: 'c', assignmentId: 'a2', studentId: 's1', status: 'submitted' },
        { id: '4', teacherId: 'A', classId: 'c', assignmentId: 'a1', studentId: 'outsider', status: 'graded' },
        { id: '5', teacherId: 'A', classId: 'c', assignmentId: 'a1', studentId: 's2', status: 'bogus' },
      ],
    });
    const result = await runAssistantReadTool('getClassSummary', { classId: 'c' }, actor('A'), db);
    expect(result.data).toMatchObject({ submissions: { perAssignment: [
      { assignmentId: 'a1', counts: { graded: 1, missing: 1, unknown: 2 } },
      { assignmentId: 'a2', counts: { submitted: 1, missing: 1, unknown: 0 } },
    ], aggregate: { graded: 1, submitted: 1, missing: 2, unknown: 2 } }, complete: true });
    expect(result.sources.map(s => s.collection)).toEqual(['classes', 'classes/c/students', 'assignments', 'submissions']);
  });
  it('requires assignment ownership by direct ID and lists all read sources', async () => {
    const assignments = Array.from({ length: 120 }, (_, i) => ({ id: `a${i}`, teacherId: 'A', classId: 'c' }));
    const db = fakeDb({ assignments, classes: [{ id: 'c', teacherId: 'A' }], 'classes/c/students': [], submissions: [] });
    const result = await runAssistantReadTool('getAssignmentSubmissionSummary', { assignmentId: 'a119' }, actor('A'), db);
    expect(result.data).toMatchObject({ assignmentId: 'a119', complete: true });
    expect(result.sources.map(s => s.collection)).toEqual(['assignments', 'classes', 'classes/c/students', 'submissions']);
    await expect(runAssistantReadTool('getAssignmentSubmissionSummary', { assignmentId: 'a' }, actor('A'), fakeDb({ assignments: [{ id: 'a', teacherId: 'B', classId: 'c' }] }))).rejects.toThrow('Resource not found');
  });
  it('returns approved grades only and bounds safe fields', async () => {
    const db = fakeDb({ submissions: [
      { id: 'yes', teacherId: 'A', studentId: 's', grade: { teacherApproved: true, score: 8, feedback: 'x'.repeat(4000), strengths: Array(30).fill('ok'), noteForTeacher: 'secret' } },
      { id: 'no', teacherId: 'A', studentId: 's', grade: { teacherApproved: false, score: 10 } },
    ] });
    const result = await runAssistantReadTool('getApprovedGradeSummary', { studentId: 's' }, actor('A'), db);
    const json = JSON.stringify(result);
    expect(json).toContain('"id":"yes"'); expect(json).not.toContain('"id":"no"'); expect(json).not.toContain('secret');
    expect((result.data as any).items[0].grade.feedback).toHaveLength(2000);
    expect((result.data as any).items[0].grade.strengths).toHaveLength(20);
  });
  it('reports truncation, bounds student data, and guards exam/job ownership', async () => {
    const roster = Array.from({ length: 4 }, (_, i) => ({ id: `s${i}`, teacherId: 'A', classId: 'c', name: 'n'.repeat(300), status: 'weird', progress: 120 }));
    const db = fakeDb({ classes: [{ id: 'c', teacherId: 'A' }], 'classes/c/students': roster, exams: Array.from({ length: 3 }, (_, i) => ({ id: `e${i}`, teacherId: 'A' })), assistantJobs: [{ id: 'j', actorUid: 'B' }] });
    expect(await runAssistantReadTool('listStudents', { classId: 'c', limit: 2 }, actor('A'), db)).toMatchObject({ data: { items: [{ name: 'n'.repeat(200) }, { name: 'n'.repeat(200) }], complete: false, truncated: true }, sources: [{ collection: 'classes' }, { collection: 'classes/c/students' }] });
    const observedAt = '2026-10-18T00:00:00.000Z';
    const examResult = await runAssistantReadTool('searchExams', { limit: 2 }, actor('A'), db, observedAt);
    expect(examResult).toMatchObject({ observedAt, data: { complete: false, truncated: true }, sources: [{ collection: 'exams' }] });
    expect(JSON.stringify(examResult)).not.toContain('teacherId');
    const classes = (await runAssistantReadTool('getClassSummary', { classId: 'c' }, actor('A'), db)).data as any;
    expect(classes).toMatchObject({ complete: true, submissions: { aggregate: { unknown: 0 } } });
    await expect(runAssistantReadTool('searchExams', {}, actor('B'), fakeDb({ exams: [{ id: 'x', teacherId: 'A' }] }))).resolves.toMatchObject({ data: { items: [] } });
    expect(await runAssistantReadTool('getStudentTeacherSummary', { classId: 'c', studentId: 's0' }, actor('A'), db)).toMatchObject({ data: { id: 's0' } });
    await expect(runAssistantReadTool('getAssistantJobStatus', { jobId: 'j' }, actor('A'), db)).rejects.toThrow('Resource not found');
  });
  it('does not convert failed queries into zero counts', async () => {
    const db = { collection: () => ({ where() { return this; }, limit() { return this; }, get() { throw new Error('query failed'); } }) } as any;
    await expect(runAssistantReadTool('listClasses', {}, actor('A'), db)).rejects.toThrow('query failed');
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
