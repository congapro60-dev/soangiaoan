import { describe, expect, it } from 'vitest';
import type { Exam, ExamSubmission, Student } from '../../../types';
import type { AssignmentDoc, SubmissionDoc } from '../../../lib/classroom/types';
import {
  adaptOnlineSubmission,
  adaptUploadSubmission,
  buildClassReportCsv,
  getQuestionOutcomeRows,
} from './ClassAssignmentReport';

const roster: Student[] = [
  { id: 'student-1', name: 'Nguyễn Minh An', code: '001', progress: 0, status: 'active' },
  { id: 'student-2', name: 'Trần Bình', code: '002', progress: 0, status: 'active' },
];

describe('ClassAssignmentReport adapters', () => {
  it('maps upload grading data to the safe report contract', () => {
    const submission = {
      id: 'upload-submission',
      studentId: 'student-1',
      createdAt: '2026-08-25T08:00:00.000Z',
      status: 'graded',
      grade: {
        score: 6,
        maxScore: 10,
        teacherApproved: true,
        weakTopics: ['Hàm số'],
        questionResults: [{
          questionNumber: '1',
          status: 'partial',
          score: 1,
          maxScore: 2,
          errorType: 'Sai dấu',
          weakTopics: ['Đồ thị'],
          studentAnswer: 'raw answer',
        }],
        noteForTeacher: 'internal note',
      },
      note: 'student note',
    } as unknown as SubmissionDoc;
    const assignment = { id: 'upload-1', title: 'Bài ảnh', maxScore: 10 } as AssignmentDoc;

    const adapted = adaptUploadSubmission(submission, assignment);

    expect(adapted).toEqual(expect.objectContaining({
      id: 'upload-submission',
      studentKey: 'student-1',
      score: 6,
      maxScore: 10,
      official: true,
      weakTopics: ['Hàm số'],
    }));
    expect(adapted.questionResults).toEqual([expect.objectContaining({
      questionNumber: '1',
      status: 'partial',
      score: 1,
      maxScore: 2,
      errorType: 'Sai dấu',
      weakTopics: ['Đồ thị'],
    })]);
    expect(JSON.stringify(adapted)).not.toContain('raw answer');
    expect(JSON.stringify(adapted)).not.toContain('noteForTeacher');
  });

  it('matches online submissions by student id, then normalized name and class', () => {
    const exam = {
      id: 'exam-1',
      maxScore: 5,
      questions: [
        { id: 'q1', points: 2 },
        { id: 'q2', points: 2 },
        { id: 'q3', points: 1 },
      ],
    } as Exam;
    const submission = {
      id: 'exam-submission',
      studentName: '  Nguyễn   Minh An ',
      studentClass: ' 10A ',
      startedAt: '2026-08-25T07:00:00.000Z',
      submittedAt: '2026-08-25T08:00:00.000Z',
      status: 'graded',
      totalScore: 2.5,
      maxScore: 99,
      answers: [
        { questionId: 'q1', answer: 'A', autoScore: 2 },
        { questionId: 'q2', answer: 'B', aiScore: 0.5 },
        { questionId: 'q3', answer: 'C' },
      ],
    } as ExamSubmission;

    const adapted = adaptOnlineSubmission(submission, exam, roster, '10A');

    expect(adapted).toEqual(expect.objectContaining({
      studentKey: 'student-1',
      createdAt: '2026-08-25T08:00:00.000Z',
      score: 2.5,
      maxScore: 5,
      official: true,
    }));
    expect(adapted?.questionResults).toEqual([
      expect.objectContaining({ questionNumber: '1', status: 'correct', score: 2, maxScore: 2 }),
      expect.objectContaining({ questionNumber: '2', status: 'partial', score: 0.5, maxScore: 2 }),
      expect.objectContaining({ questionNumber: '3', status: 'not_attempted', score: null, maxScore: 1 }),
    ]);
    expect(JSON.stringify(adapted)).not.toContain('answer');
  });

  it('drops online submissions that cannot be matched to the current roster', () => {
    const exam = { id: 'exam-1', maxScore: 10, questions: [] } as Exam;
    const submission = {
      id: 'unknown',
      studentName: 'Không có trong lớp',
      studentClass: '10A',
      startedAt: '2026-08-25T07:00:00.000Z',
      status: 'graded',
      answers: [],
      maxScore: 10,
    } as ExamSubmission;

    expect(adaptOnlineSubmission(submission, exam, roster, '10A')).toBeNull();
  });

  it('rejects name fallback when a non-empty submitted class differs from the selected class', () => {
    const exam = { id: 'exam-1', maxScore: 10, questions: [] } as Exam;
    const submission = {
      id: 'wrong-class',
      studentName: 'Nguyễn Minh An',
      studentClass: '10B',
      startedAt: '2026-08-25T07:00:00.000Z',
      status: 'graded',
      answers: [],
      maxScore: 10,
    } as ExamSubmission;

    expect(adaptOnlineSubmission(submission, exam, roster, '10A')).toBeNull();
  });

  it('allows legacy name fallback when the submitted class is empty', () => {
    const exam = { id: 'exam-1', maxScore: 10, questions: [] } as Exam;
    const submission = {
      id: 'legacy-no-class',
      studentName: ' Nguyễn   Minh An ',
      studentClass: '',
      startedAt: '2026-08-25T07:00:00.000Z',
      status: 'graded',
      answers: [],
      maxScore: 10,
    } as ExamSubmission;

    expect(adaptOnlineSubmission(submission, exam, roster, '10A')?.studentKey).toBe('student-1');
  });

  it('rejects an ambiguous name fallback instead of assigning the first matching student', () => {
    const exam = { id: 'exam-1', maxScore: 10, questions: [] } as Exam;
    const duplicateRoster = [
      ...roster,
      { id: 'student-3', name: 'Nguyễn Minh An', code: '003', progress: 0, status: 'active' },
    ] satisfies Student[];
    const submission = {
      id: 'ambiguous-name',
      studentName: 'Nguyễn Minh An',
      studentClass: '10A',
      startedAt: '2026-08-25T07:00:00.000Z',
      status: 'graded',
      answers: [],
      maxScore: 10,
    } as ExamSubmission;

    expect(adaptOnlineSubmission(submission, exam, duplicateRoster, '10A')).toBeNull();
  });

  it('rejects an explicit student id when the submitted name conflicts with the roster', () => {
    const exam = { id: 'exam-1', maxScore: 10, questions: [] } as Exam;
    const submission = {
      id: 'mismatched-identity',
      studentId: 'student-1',
      studentName: 'Trần Bình',
      studentClass: '10A',
      startedAt: '2026-08-25T07:00:00.000Z',
      status: 'graded',
      answers: [],
      maxScore: 10,
    } as ExamSubmission;

    expect(adaptOnlineSubmission(submission, exam, roster, '10A')).toBeNull();
  });

  it('does not call a zero-point question correct just because its score is zero', () => {
    const exam = { id: 'exam-1', maxScore: 0, questions: [{ id: 'q1', points: 0 }] } as Exam;
    const submission = {
      id: 'zero-point',
      studentId: 'student-1',
      studentName: 'Nguyễn Minh An',
      studentClass: '10A',
      startedAt: '2026-08-25T07:00:00.000Z',
      status: 'graded',
      answers: [{ questionId: 'q1', answer: 'A', autoScore: 0 }],
      maxScore: 0,
    } as ExamSubmission;

    expect(adaptOnlineSubmission(submission, exam, roster, '10A')?.questionResults[0].status).toBe('incorrect');
  });

  it('keeps incorrect and unreadable as separate question outcomes', () => {
    const question = {
      questionNumber: '1',
      evidenceCount: 10,
      correct: 2,
      partial: 1,
      incorrect: 3,
      unreadable: 2,
      notAttempted: 2,
      correctRate: 0.2,
      scoreRate: 0.2,
    };
    const outcomes = getQuestionOutcomeRows(question);

    expect(outcomes.map(outcome => [outcome.metric, outcome.count])).toEqual([
      ['Đúng', 2],
      ['Đúng một phần', 1],
      ['Sai', 3],
      ['Không đọc được', 2],
      ['Chưa làm', 2],
    ]);
  });

  it('exports only aggregate rows', () => {
    const csv = buildClassReportCsv([{
      assignment: { id: 'a1', title: 'Bài tổng hợp', type: 'upload', maxScore: 10 },
      latest: [],
      official: [],
      counters: { roster: 2, submitted: 1, graded: 1, official: 1, pending: 0, missing: 1 },
      metrics: { averagePercent: 75, medianPercent: 75, officialEvidenceCount: 1 },
      averagePercent: 75,
      medianPercent: 75,
      scoreDistribution: { '0-<5': 0, '5-<6.5': 0, '6.5-<8': 0, '8-10': 1 },
      distribution: { '0-<5': 0, '5-<6.5': 0, '6.5-<8': 0, '8-10': 1 },
      questionStats: [{ questionNumber: '1', evidenceCount: 10, correct: 2, partial: 1, incorrect: 3, unreadable: 2, notAttempted: 2, correctRate: 0.2, scoreRate: 0.2 }],
      errorStats: [],
      topicStats: [],
      recommendations: [],
    }]);

    expect(csv).toContain('Bài tổng hợp');
    expect(csv).toContain('Câu 1');
    expect(csv).toMatch(/,Sai,Câu 1,3,/);
    expect(csv).toMatch(/,Không đọc được,Câu 1,2,/);
    expect(csv).toMatch(/,Chưa làm,Câu 1,2,/);
    expect(csv).not.toContain('Chưa đạt');
    expect(csv).not.toContain('studentKey');
    expect(csv).not.toContain('studentAnswer');
    expect(csv).not.toContain('noteForTeacher');
  });
});
