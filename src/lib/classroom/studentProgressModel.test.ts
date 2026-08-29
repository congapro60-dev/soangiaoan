import { describe, expect, it } from 'vitest';
import { buildStudentProgressSummary } from './studentProgressModel';
import type { AssignmentDoc, PracticeAttemptDoc, PracticeSetDoc, StudentProfileDoc, SubmissionDoc } from './types';
import type { ExamSubmission } from '../../types';

const assignment = (overrides: Partial<AssignmentDoc> = {}): AssignmentDoc => ({
  id: 'upload-1',
  teacherId: 'teacher-1',
  classId: 'class-1',
  title: 'Phiếu bài tập',
  description: '',
  type: 'upload',
  isOpen: true,
  createdAt: '2026-08-28T08:00:00.000Z',
  updatedAt: '2026-08-28T08:00:00.000Z',
  ...overrides,
});

const upload = (overrides: Partial<SubmissionDoc> = {}): SubmissionDoc => ({
  id: 'submission-1',
  teacherId: 'teacher-1',
  classId: 'class-1',
  studentId: 'student-1',
  assignmentId: 'upload-1',
  fileUrls: ['https://storage.example/one.jpg'],
  note: '',
  status: 'graded',
  createdAt: '2026-08-28T09:00:00.000Z',
  updatedAt: '2026-08-28T09:10:00.000Z',
  grade: {
    score: 8,
    maxScore: 10,
    feedback: 'Em đã nắm được ý chính.',
    strengths: ['Lập luận'],
    weaknesses: [],
    teacherApproved: true,
    gradedAt: '2026-08-28T09:10:00.000Z',
  },
  ...overrides,
});

const profile: StudentProfileDoc = {
  studentId: 'student-1',
  classId: 'class-1',
  teacherId: 'teacher-1',
  topics: [],
  skills: [{
    skillId: 'geometry.line-plane',
    masteryEstimate: 0.55,
    confidence: 0.7,
    status: 'developing',
    evidenceCount: 2,
    sourceKinds: ['homework', 'practice'],
    misconceptionCounts: {},
    trend: 'up',
    lastEvidenceAt: '2026-08-28T09:10:00.000Z',
  }],
  updatedAt: '2026-08-28T09:10:00.000Z',
};

describe('student progress model', () => {
  it('hợp nhất bài ảnh, bài online và bài luyện; chỉ điểm official vào tiến trình chính thức', () => {
    const online: ExamSubmission = {
      id: 'attempt-1',
      examId: 'exam-1',
      examCode: 'EX01',
      studentName: 'Nguyễn An',
      studentId: 'student-1',
      classId: 'class-1',
      assignmentId: 'online-1',
      startedAt: '2026-08-28T10:00:00.000Z',
      submittedAt: '2026-08-28T10:20:00.000Z',
      answers: [],
      totalScore: 7,
      maxScore: 10,
      status: 'graded',
      gradeState: 'official',
      gradingSource: 'automatic',
    };
    const practiceSet: PracticeSetDoc = {
      id: 'practice-1',
      studentId: 'student-1',
      classId: 'class-1',
      teacherId: 'teacher-1',
      topics: ['Mặt phẳng'],
      skillIds: ['geometry.line-plane'],
      questions: [{ id: 'p1', question: 'Câu luyện', hint: 'Vẽ hình.' }],
      createdAt: '2026-08-28T11:00:00.000Z',
      updatedAt: '2026-08-28T11:05:00.000Z',
    };
    const practiceAttempt: PracticeAttemptDoc = {
      id: 'practice-attempt-1',
      setId: practiceSet.id,
      studentId: 'student-1',
      classId: 'class-1',
      teacherId: 'teacher-1',
      skillIds: ['geometry.line-plane'],
      answers: { p1: 'Đã làm' },
      status: 'graded',
      score: 1,
      maxScore: 1,
      evidenceType: 'practice',
      createdAt: '2026-08-28T11:10:00.000Z',
      updatedAt: '2026-08-28T11:10:00.000Z',
    };

    const summary = buildStudentProgressSummary({
      studentId: 'student-1',
      assignments: [
        assignment(),
        assignment({ id: 'online-1', title: 'Bài online', type: 'exam', examId: 'exam-1', deliveryMode: 'online' }),
        assignment({ id: 'todo-1', title: 'Bài chưa làm' }),
      ],
      submissions: [upload()],
      examSubmissions: [online],
      practiceSets: [practiceSet],
      practiceAttempts: [practiceAttempt],
      profile,
    });

    expect(summary.activities.map(item => item.id)).toEqual(expect.arrayContaining(['upload-1', 'online-1', 'todo-1', 'practice-1']));
    expect(summary.activities.find(item => item.id === 'online-1')).toEqual(expect.objectContaining({ status: 'official', officialScore: 7, attemptCount: 1 }));
    expect(summary.activities.find(item => item.id === 'practice-1')).toEqual(expect.objectContaining({ status: 'formative_complete', officialScore: null, provisionalScore: 1 }));
    expect(summary.needsAction.map(item => item.id)).toEqual(['todo-1']);
    expect(summary.officialCount).toBe(2);
    expect(summary.officialAveragePercent).toBe(75);
    expect(summary.completionRate).toBe(2 / 3);
    expect(summary.skillStates).toEqual(profile.skills);
    expect(summary.nextAction?.id).toBe('todo-1');
  });

  it('không nhân đôi hoạt động khi có nhiều lượt của cùng bài; vẫn hiển thị số lượt và lấy lượt mới nhất', () => {
    const older = upload({ id: 'submission-old', createdAt: '2026-08-28T09:00:00.000Z', updatedAt: '2026-08-28T09:01:00.000Z', grade: undefined });
    const summary = buildStudentProgressSummary({
      studentId: 'student-1',
      assignments: [assignment()],
      submissions: [older, upload()],
    });

    expect(summary.activities).toHaveLength(1);
    expect(summary.activities[0]).toEqual(expect.objectContaining({ id: 'upload-1', attemptCount: 2, officialScore: 8 }));
  });
});
