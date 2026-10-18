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
      const docs = filtered.map(r => ({ id: r._documentId || r.id, data: () => r, exists: true }));
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
    const conflictingId = fakeDb({ classes: [{ id: 'spoofed', _documentId: 'canonical', teacherId: 'A', name: 'canonical', spoofed: true }] });
    expect((await runAssistantReadTool('listClasses', {}, actor('A'), conflictingId)).data).toMatchObject({ items: [{ id: 'canonical' }] });
  });
  it('redacts token-bearing Storage URLs in lesson content and search snippets only', async () => {
    const storageUrl = 'https://firebasestorage.googleapis.com/v0/b/example/o/lesson_images%2Fimg.png?alt=media&token=secret-token';
    const content = `Giữ phần này. ![ảnh](${storageUrl}) ![ảnh HTML](https://firebasestorage.googleapis.com/v0/b/example/o/lesson_images%2Fhtml.png?alt=media&amp;token=secret) Và https://example.com/public.png vẫn công khai.`;
    const db = fakeDb({ lessonPlans: [{ id: 'p', userId: 'A', title: 'Lesson', content, fileUrls: [storageUrl], answerKey: 'secret answer' }] });
    const lesson = (await runAssistantReadTool('getLessonPlan', { lessonPlanId: 'p' }, actor('A'), db)).data as any;
    const search = (await runAssistantReadTool('searchLessonPlans', {}, actor('A'), db)).data as any;
    for (const output of [lesson.content, search.items[0].snippet]) {
      expect(output).toContain('Giữ phần này.');
      expect(output).toContain('![ảnh HTML]([liên kết riêng tư đã ẩn])');
      expect(output).toContain('Và https://example.com/public.png vẫn công khai.');
      expect(output).not.toContain('firebasestorage.googleapis.com');
      expect(output).not.toContain('secret-token');
    }
    expect(JSON.stringify({ lesson, search })).not.toContain('secret answer');
    expect(JSON.stringify({ lesson, search })).not.toContain('fileUrls');
    const nearLimit = 'a'.repeat(225) + ' https://firebasestorage.googleapis.com/o/file?alt=media&token=' + 'secret-token'.repeat(10);
    const bounded = (await runAssistantReadTool('searchLessonPlans', {}, actor('A'), fakeDb({ lessonPlans: [{ id: 'long', userId: 'A', title: 'Long', content: nearLimit }] }))).data as any;
    expect(bounded.items[0].snippet).not.toContain('secret-token');
    expect(bounded.items[0].snippet).not.toContain('firebasestorage.googleapis.com');
  });
  it('bounds metadata strings and omits malformed fields or student counts', async () => {
    const db = fakeDb({
      classes: [{ id: 'c', teacherId: 'A', name: 'n'.repeat(250), grade: 7, track: 't'.repeat(120), studentCount: '4', updatedAt: 'u'.repeat(120) }],
      assignments: [
        { id: 'a', teacherId: 'A', classId: 'c', title: 't'.repeat(350), type: false, dueAt: 'd'.repeat(120), isOpen: 'true' },
        { id: 'b', teacherId: 'A', classId: 'c', isOpen: false },
      ],
    });
    const classes = (await runAssistantReadTool('listClasses', {}, actor('A'), db)).data as any;
    expect(classes.items[0]).toEqual({ id: 'c', name: 'n'.repeat(200), track: 't'.repeat(100), updatedAt: 'u'.repeat(100) });
    const assignments = (await runAssistantReadTool('listAssignments', {}, actor('A'), db)).data as any;
    expect(assignments.items).toEqual([
      { id: 'a', classId: 'c', title: 't'.repeat(300), dueAt: 'd'.repeat(100) },
      { id: 'b', classId: 'c', isOpen: false },
    ]);
  });
  it('aggregates adaptive sessions from StudentLearningProfile.totalSessions', async () => {
    const db = fakeDb({ studentLearningProfiles: [
      { id: 's1', teacherId: 'A', totalSessions: 3, sessionCount: 99 },
      { id: 's2', teacherId: 'A', totalSessions: 5 },
    ] });
    await expect(runAssistantReadTool('getAdaptiveProgressSummary', {}, actor('A'), db)).resolves.toMatchObject({ data: { sessions: 8 } });
  });
  it('whitelists malformed submission status as unknown', async () => {
    const db = fakeDb({ submissions: [{ id: 'bad', teacherId: 'A', studentId: 's', status: 'bogus', privateField: 'hidden' }] });
    const result = await runAssistantReadTool('getStudentSubmissionHistory', { studentId: 's' }, actor('A'), db);
    expect(result.data).toMatchObject({ items: [{ id: 'bad', status: 'unknown' }] });
    expect(JSON.stringify(result)).not.toContain('privateField');
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
      { assignmentId: 'a1', counts: { graded: 1, missing: 0, unknown: 2 } },
      { assignmentId: 'a2', counts: { submitted: 1, missing: 1, unknown: 0 } },
    ], aggregate: { graded: 1, submitted: 1, missing: 1, unknown: 2 } }, complete: true });
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
