import { describe, expect, it } from 'vitest';
import type { Exam, ExamSubmission } from '../../types';
import type {
  AssignmentDoc,
  PracticeAttemptDoc,
  PracticeSetDoc,
  SubmissionDoc,
} from './types';
import { buildStudentActivityViews } from './activityModel';

const assignment = (overrides: Partial<AssignmentDoc> = {}): AssignmentDoc => ({
  id: 'assignment-1',
  teacherId: 'teacher-1',
  classId: 'class-1',
  title: 'Bài tập tuần 1',
  description: 'Làm bài',
  type: 'upload',
  isOpen: true,
  createdAt: '2026-08-28T08:00:00.000Z',
  updatedAt: '2026-08-28T08:00:00.000Z',
  ...overrides,
});

const uploadSubmission = (overrides: Partial<SubmissionDoc> = {}): SubmissionDoc => ({
  id: 'submission-1',
  teacherId: 'teacher-1',
  classId: 'class-1',
  studentId: 'student-1',
  assignmentId: 'assignment-1',
  fileUrls: ['https://example.test/page-1.jpg'],
  note: '',
  status: 'graded',
  grade: {
    score: 8,
    maxScore: 10,
    feedback: 'Tốt',
    strengths: [],
    weaknesses: [],
    teacherApproved: true,
    gradedAt: '2026-08-28T09:00:00.000Z',
  },
  createdAt: '2026-08-28T09:00:00.000Z',
  updatedAt: '2026-08-28T09:00:00.000Z',
  ...overrides,
});

const exam = (overrides: Partial<Exam> = {}): Exam => ({
  id: 'exam-1',
  code: 'ABC123',
  title: 'Đề luyện tuần 1',
  subjectId: 'toan',
  teacherId: 'teacher-1',
  teacherName: 'Cô giáo',
  questions: [{
    id: 'q1',
    type: 'multiple_choice',
    content: '1 + 1 = ?',
    options: ['1', '2'],
    correctAnswer: '2',
    points: 1,
  }],
  durationMinutes: 30,
  maxScore: 1,
  isActive: true,
  allowReview: true,
  shuffleQuestions: false,
  createdAt: '2026-08-28T08:00:00.000Z',
  updatedAt: '2026-08-28T08:00:00.000Z',
  ...overrides,
});

const examSubmission = (overrides: Partial<ExamSubmission> = {}): ExamSubmission => ({
  id: 'exam-submission-1',
  examId: 'exam-1',
  examCode: 'ABC123',
  studentName: 'Nguyễn An',
  studentClass: '10A1',
  studentId: 'student-1',
  startedAt: '2026-08-28T09:00:00.000Z',
  submittedAt: '2026-08-28T09:10:00.000Z',
  answers: [{ questionId: 'q1', answer: '2', autoScore: 1 }],
  totalScore: 1,
  maxScore: 1,
  status: 'graded',
  ...overrides,
});

const practiceSet = (overrides: Partial<PracticeSetDoc> = {}): PracticeSetDoc => ({
  id: 'practice-1',
  studentId: 'student-1',
  classId: 'class-1',
  teacherId: 'teacher-1',
  topics: ['Phương trình'],
  skillIds: ['algebra.linear'],
  questions: [{ id: 'pq1', question: 'Giải x + 1 = 2', hint: 'Trừ 1 ở hai vế', skillIds: ['algebra.linear'] }],
  createdAt: '2026-08-28T08:00:00.000Z',
  updatedAt: '2026-08-28T08:00:00.000Z',
  ...overrides,
});

const practiceAttempt = (overrides: Partial<PracticeAttemptDoc> = {}): PracticeAttemptDoc => ({
  id: 'practice-attempt-1',
  setId: 'practice-1',
  studentId: 'student-1',
  classId: 'class-1',
  teacherId: 'teacher-1',
  skillIds: ['algebra.linear'],
  answers: { pq1: 'x = 1' },
  status: 'graded',
  score: 1,
  maxScore: 1,
  feedback: 'Đúng',
  evidenceType: 'practice',
  createdAt: '2026-08-28T09:20:00.000Z',
  updatedAt: '2026-08-28T09:20:00.000Z',
  ...overrides,
});

describe('buildStudentActivityViews', () => {
  it('maps legacy upload assignment and keeps the newest official grade while counting attempts', () => {
    const views = buildStudentActivityViews({
      studentId: 'student-1',
      assignments: [assignment()],
      submissions: [
        uploadSubmission({
          id: 'submission-old',
          createdAt: '2026-08-28T08:30:00.000Z',
          updatedAt: '2026-08-28T08:30:00.000Z',
          grade: {
            score: 6,
            maxScore: 10,
            feedback: 'Cần cố gắng',
            strengths: [],
            weaknesses: [],
            teacherApproved: true,
            gradedAt: '2026-08-28T08:30:00.000Z',
          },
        }),
        uploadSubmission(),
      ],
    });

    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({
      id: 'assignment-1',
      sourceType: 'assignment',
      purpose: 'assignment',
      deliveryMode: 'file',
      contentVersion: 'legacy:assignment:assignment-1',
      attemptCount: 2,
      officialScore: 8,
      status: 'official',
    });
  });

  it('separates an unapproved upload grade as provisional', () => {
    const views = buildStudentActivityViews({
      studentId: 'student-1',
      assignments: [assignment()],
      submissions: [uploadSubmission({
        grade: {
          score: 5,
          maxScore: 10,
          feedback: 'Đang chờ giáo viên duyệt',
          strengths: [],
          weaknesses: [],
          teacherApproved: false,
          gradedAt: '2026-08-28T09:00:00.000Z',
        },
      })],
    });

    expect(views[0]).toMatchObject({
      provisionalScore: 5,
      officialScore: null,
      status: 'pending_teacher',
    });
  });

  it('joins a class exam assignment with exam submissions and legacy graded status', () => {
    const views = buildStudentActivityViews({
      studentId: 'student-1',
      assignments: [assignment({ id: 'assignment-exam', type: 'exam', examId: 'exam-1', title: 'Kiểm tra online' })],
      exams: [exam()],
      examSubmissions: [examSubmission()],
    });

    expect(views[0]).toMatchObject({
      id: 'assignment-exam',
      sourceType: 'online_exam',
      examId: 'exam-1',
      purpose: 'assignment',
      deliveryMode: 'online',
      attemptCount: 1,
      officialScore: 1,
      status: 'official',
    });
  });

  it('keeps practice formative and never promotes its score to official', () => {
    const views = buildStudentActivityViews({
      studentId: 'student-1',
      practiceSets: [practiceSet()],
      practiceAttempts: [practiceAttempt()],
    });

    expect(views[0]).toMatchObject({
      sourceType: 'practice',
      purpose: 'practice',
      deliveryMode: 'online',
      attemptCount: 1,
      provisionalScore: 1,
      officialScore: null,
      status: 'formative_complete',
    });
  });

  it('does not project another student submission into the activity', () => {
    const views = buildStudentActivityViews({
      studentId: 'student-1',
      assignments: [assignment()],
      submissions: [uploadSubmission({ studentId: 'student-2' })],
      examSubmissions: [examSubmission({ studentId: 'student-2' })],
    });

    expect(views[0]).toMatchObject({
      attemptCount: 0,
      status: 'not_started',
      officialScore: null,
    });
  });
});
