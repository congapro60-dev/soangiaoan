import { describe, expect, it } from 'vitest';
import { canUseAssistantShare } from '../_assistant-types.js';
import { runAssistantReadTool } from '../_assistant-tools.js';

const actor = (firebaseUid: string) => ({ firebaseUid, channel: 'telegram' as const, channelAccountId: 'bot', channelUserId: '123', linkId: 'link', active: true as const });
function fakeDb(seed: Record<string, any[]> = {}) {
  const query = (rows: any[], filters: [string, unknown][] = []): any => ({
    where(field: string, _op: string, value: unknown) { return query(rows, [...filters, [field, value]]); },
    limit() { return this; },
    async get() {
      const matches = rows.filter(row => filters.every(([field, value]) => field.split('.').reduce((current, key) => current?.[key], row) === value));
      return { docs: matches.map(row => ({ id: row.id, data: () => row, exists: true })), empty: !matches.length };
    },
    doc(id: string) { const row = rows.find(item => item.id === id); return { async get() { return { id, exists: !!row, data: () => row }; }, collection(name: string) { return query(seed[`classes/${id}/${name}`] || []); } }; },
  });
  return { collection: (name: string) => query(seed[name] || []) } as any;
}
const share = (patch: Record<string, unknown> = {}) => ({ resourceType: 'class', resourceId: 'c1', ownerUid: 'owner', granteeUid: 'teacher', role: 'read', status: 'active', createdAt: 900, ...patch });

describe('assistant explicit sharing', () => {
  it('authorizes only matching active shares and denies write escalation to read tools', () => {
    expect(canUseAssistantShare(share() as any, 'teacher', 'class', 'c1', 'read', 1000)).toBe(true);
    expect(canUseAssistantShare(share() as any, 'teacher', 'class', 'c2', 'read', 1000)).toBe(false);
    expect(canUseAssistantShare(share({ resourceType: 'lessonPlan' }) as any, 'teacher', 'class', 'c1', 'read', 1000)).toBe(false);
    expect(canUseAssistantShare(share({ status: 'revoked', revokedAt: 999 }) as any, 'teacher', 'class', 'c1', 'read', 1000)).toBe(false);
    expect(canUseAssistantShare(share({ role: 'write' }) as any, 'teacher', 'class', 'c1', 'write', 1000)).toBe(true);
    expect(canUseAssistantShare(share({ role: 'write' }) as any, 'teacher', 'class', 'c1', 'read', 1000)).toBe(false);
  });

  it('allows only an active grant for the exact owner resource, and never exposes student-level reads to grantees', async () => {
    const db = fakeDb({
      classes: [{ id: 'c1', teacherId: 'owner', name: 'Class' }],
      assistantShares: [share({ role: 'write' })],
      assignments: [{ id: 'a1', teacherId: 'owner', classId: 'c1' }],
      submissions: [],
      'classes/c1/students': [{ id: 's1', teacherId: 'owner', classId: 'c1' }],
    });
    await expect(runAssistantReadTool('getClassSummary', { classId: 'c1' }, actor('teacher'), db)).rejects.toThrow('Resource not found');
    await expect(runAssistantReadTool('listStudents', { classId: 'c1' }, actor('teacher'), db)).rejects.toThrow('Resource not found');
    await expect(runAssistantReadTool('approveGrade', { classId: 'c1' }, actor('teacher'), db)).rejects.toThrow('Unsupported read tool');
    await expect(runAssistantReadTool('getClassSummary', { classId: 'c2' }, actor('teacher'), db)).rejects.toThrow('Resource not found');
    const revoked = fakeDb({ classes: [{ id: 'c1', teacherId: 'owner' }], assistantShares: [share({ status: 'revoked', revokedAt: 999 })] });
    await expect(runAssistantReadTool('getClassSummary', { classId: 'c1' }, actor('teacher'), revoked)).rejects.toThrow('Resource not found');
    await expect(runAssistantReadTool('getClassSummary', { classId: 'c1' }, actor('other'), db)).rejects.toThrow('Resource not found');
  });

  it('limits class read grants to roster, assignments, submission status, and approved grades', async () => {
    const db = fakeDb({
      classes: [{ id: 'c1', teacherId: 'owner' }], assistantShares: [share()],
      assignments: [{ id: 'a1', teacherId: 'owner', classId: 'c1', title: 'Bài', rubric: 'private' }],
      submissions: [{ id: 'sub1', teacherId: 'owner', classId: 'c1', assignmentId: 'a1', studentId: 's1', status: 'graded', fileUrl: 'private', grade: { teacherApproved: true, score: 8 } }, { id: 'sub2', teacherId: 'owner', classId: 'c1', assignmentId: 'a1', studentId: 's1', status: 'graded', grade: { teacherApproved: false, score: 10 } }],
      'classes/c1/students': [{ id: 's1', teacherId: 'owner', classId: 'c1', name: 'Student' }],
    });
    await expect(runAssistantReadTool('listStudents', { classId: 'c1' }, actor('teacher'), db)).resolves.toMatchObject({ data: { items: [{ id: 's1', name: 'Student' }] } });
    await expect(runAssistantReadTool('listAssignments', { classId: 'c1' }, actor('teacher'), db)).resolves.toMatchObject({ data: { items: [{ id: 'a1', title: 'Bài' }] } });
    await expect(runAssistantReadTool('getClassSummary', { classId: 'c1' }, actor('teacher'), db)).resolves.toMatchObject({ data: { students: 1, assignments: 1 } });
    await expect(runAssistantReadTool('getAssignmentSubmissionSummary', { assignmentId: 'a1' }, actor('teacher'), db)).resolves.toMatchObject({ data: { assignmentId: 'a1' } });
    await expect(runAssistantReadTool('getApprovedGradeSummary', { classId: 'c1', studentId: 's1' }, actor('teacher'), db)).resolves.toMatchObject({ data: { items: [{ id: 'sub1', grade: { teacherApproved: true, score: 8 } }] } });
    await expect(runAssistantReadTool('getStudentSubmissionHistory', { classId: 'c1', studentId: 's1' }, actor('teacher'), db)).resolves.toMatchObject({ data: { items: [{ status: 'graded', grade: { teacherApproved: true, score: 8 } }, { status: 'graded' }] } });
    expect(JSON.stringify(await runAssistantReadTool('getApprovedGradeSummary', { classId: 'c1', studentId: 's1' }, actor('teacher'), db))).not.toContain('fileUrl');
    await expect(runAssistantReadTool('getStudentSubmissionHistory', { classId: 'c1', studentId: 'missing' }, actor('teacher'), db)).rejects.toThrow('Resource not found');
  });

  it('allows matching lesson-plan reads through active grants only', async () => {
    const writeDb = fakeDb({ lessonPlans: [{ id: 'p1', userId: 'owner', title: 'Shared' }], assistantShares: [share({ resourceType: 'lessonPlan', resourceId: 'p1', role: 'write' })] });
    await expect(runAssistantReadTool('getLessonPlan', { lessonPlanId: 'p1' }, actor('teacher'), writeDb)).rejects.toThrow('Resource not found');
    const db = fakeDb({ lessonPlans: [{ id: 'p1', userId: 'owner', title: 'Shared' }], assistantShares: [share({ resourceType: 'lessonPlan', resourceId: 'p1' })] });
    await expect(runAssistantReadTool('getLessonPlan', { lessonPlanId: 'p1' }, actor('teacher'), db)).resolves.toMatchObject({ data: { title: 'Shared' } });
    await expect(runAssistantReadTool('getLessonPlan', { lessonPlanId: 'p2' }, actor('teacher'), db)).rejects.toThrow('Resource not found');
  });
});
