import { describe, expect, it } from 'vitest';
import { buildGroupHomework, validateHomeworkGroups } from '../../src/lib/classroom/groupHomework';

const students = [{ id: 's1', name: 'Em Một' }, { id: 's2', name: 'Em Hai' }, { id: 's3', name: 'Em Ba' }];
const groups = [{ id: '1', leaderStudentId: 's1', memberStudentIds: ['s1', 's2'] }, { id: '2', leaderStudentId: 's3', memberStudentIds: ['s3'] }];
const assignment = { id: 'a1', classId: 'c1', teacherId: 't1', title: 'Bài A', type: 'upload', isOpen: true, createdAt: '2026-11-11T00:00:00Z' };
const attempt = { id: 'x', classId: 'c1', teacherId: 't1', studentId: 's2', assignmentId: 'a1', status: 'graded', createdAt: '2026-11-10T00:00:00Z', fileUrls: ['PRIVATE_PHOTO'], grade: { score: 9, feedback: 'PRIVATE_FEEDBACK' }, note: 'PRIVATE_NOTE', pin: 'SECRET_PIN' };
const build = (changes: Record<string, unknown> = {}) => buildGroupHomework({ classId: 'c1', teacherId: 't1', students, groups, assignments: [assignment], submissions: [attempt], online: [], now: 1794359000000, ...changes } as any);

describe('group homework minimal projection', () => {
  it('reports receipt without declaring homework complete or exposing private content', () => {
    const view = build();
    expect(view.students[1].work[0]).toEqual({ assignmentId: 'a1', status: 'received', submittedAt: '2026-11-10T00:00:00.000Z', firstSubmittedAt: '2026-11-10T00:00:00.000Z' });
    for (const secret of ['PRIVATE_', 'SECRET_PIN', 'score', 'grade', 'fileUrls', 'feedback']) expect(JSON.stringify(view)).not.toContain(secret);
  });
  it('uses the recipient studentId for proxy submissions and never the sender', () => {
    const view = build({ submissions: [{ ...attempt, submittedBy: { studentId: 's1' } }] });
    expect(view.students[0].work[0].status).toBe('missing');
    expect(view.students[1].work[0].status).toBe('received');
  });
  it('keeps the first receipt date but reflects the newest supplement that needs more photos', () => {
    const view = build({ submissions: [attempt, { ...attempt, id: 'supplement', createdAt: '2026-11-11T00:00:00Z', grade: { awaitingClarification: true } }] });
    expect(view.students[1].work[0]).toMatchObject({ status: 'review', firstSubmittedAt: '2026-11-10T00:00:00.000Z', submittedAt: '2026-11-11T00:00:00.000Z' });
  });
  it('detects wrong/missing/unreadable photos and leaves system grading errors as received', () => {
    for (const grade of [{ photoReview: { assignmentMatch: 'possibly_wrong' } }, { photoReview: { missingQuestionNumbers: [2] } }, { photoReview: { unreadablePhotoNumbers: [1] } }]) {
      expect(build({ submissions: [{ ...attempt, grade }] }).students[1].work[0].status).toBe('review');
    }
    expect(build({ submissions: [{ ...attempt, status: 'error', errorReason: 'system' }] }).students[1].work[0].status).toBe('received');
  });
  it('does not mark an online draft as submitted', () => {
    const data = { assignments: [{ ...assignment, type: 'exam' }], submissions: [], online: [{ ...attempt, status: 'in_progress', submittedAt: undefined }] };
    expect(build(data).students[1].work[0].status).toBe('in_progress');
    expect(build({ ...data, online: [{ ...attempt, status: 'submitted', submittedAt: '2026-11-10T01:00:00Z' }] }).students[1].work[0].status).toBe('received');
  });
  it('rejects unrelated class/owner attempts, hides drafts/periodic tests and does not expose targets to unassigned students', () => {
    expect(build({ submissions: [{ ...attempt, classId: 'other' }, { ...attempt, teacherId: 'other' }] }).students[1].work[0].status).toBe('missing');
    expect(build({ assignments: [{ ...assignment, periodicTest: true }, { ...assignment, id: 'draft', status: 'draft' }] }).assignments).toHaveLength(0);
    const view = build({ assignments: [{ ...assignment, targetStudentIds: ['s2'] }] });
    expect(view.students[0].work[0].status).toBe('not_assigned');
  });
  it('includes adaptive homework but does not count its unfinished session as received', () => {
    const assignments = [{ ...assignment, id: 'adaptive:a1', type: 'adaptive' }];
    const submissions = [{ ...attempt, assignmentId: 'adaptive:a1', status: 'in_progress' }];
    expect(build({ assignments, submissions }).students[1].work[0].status).toBe('in_progress');
    const receipt = build({ assignments, submissions: [{ ...submissions[0], status: 'submitted' }] }).students[1].work[0];
    expect(receipt.status).toBe('received');
    expect(receipt).not.toHaveProperty('firstSubmittedAt');
  });
  it('never infers a leader from member ordering; rejects duplicate, missing or cross-group members', () => {
    expect(validateHomeworkGroups(groups, students)).toEqual(groups);
    for (const bad of [[{ ...groups[0], leaderStudentId: 's3' }], [{ ...groups[0], memberStudentIds: ['s1', 'missing'] }], [...groups, { id: '3', leaderStudentId: 's1', memberStudentIds: ['s1'] }]]) {
      expect(() => validateHomeworkGroups(bad, students)).toThrow();
    }
  });
});
