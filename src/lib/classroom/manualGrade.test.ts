import { describe, expect, it } from 'vitest';
import type { QuestionResult, SubmissionDoc, SubmissionGrade } from './types';
import { buildManualGradeUpdate, mergeTeacherQuestionResults } from './manualGrade';
import { needsTeacherCheck } from './submissionSelection';

describe('manual photo marks', () => {
  const old = { questionNumber: 'Câu 1', status: 'incorrect' as const, score: 0, maxScore: 1, studentAnswer: 'x=2',
    expectedAnswer: 'x=3', errorType: '', explanation: '', correction: '', nextPractice: '', needsTeacherReview: false,
    photoMarks: [{ imageIndex: 1, imageUrl: 'https://own', x: .1, y: .1, width: .2, height: .1, confidence: .9 }] };
  it('preserves marks on score and correction edits; ignores arbitrary client marks', () => {
    expect(mergeTeacherQuestionResults([old], [{ ...old, score: .5, correction: 'Sửa dấu', photoMarks: [{ ...old.photoMarks[0], imageUrl: 'https://foreign' }] }])[0].photoMarks).toEqual(old.photoMarks);
  });
  it('drops old coordinates on changed reading or status, and honors explicit removal', () => {
    for (const change of [{ studentAnswer: 'x=4' }, { status: 'correct' }, { photoMarks: [] }]) {
      expect(mergeTeacherQuestionResults([old], [{ ...old, ...change }])[0].photoMarks).toBeUndefined();
    }
    expect(mergeTeacherQuestionResults([old], [{ ...old, photoMarks: [] }])[0].teacherEdited).toBeUndefined();
    expect(mergeTeacherQuestionResults([old], [{ ...old, photoMarks: [] }])[0].photoMarksCleared).toBe(true);
  });
});

const submission = (grade?: SubmissionDoc['grade']): SubmissionDoc => ({
  id: 'sub-1',
  teacherId: 'teacher-1',
  classId: 'class-1',
  studentId: 'student-1',
  assignmentId: 'asg-1',
  fileUrls: [],
  note: '',
  status: 'submitted',
  grade,
  createdAt: '2026-08-24T10:00:00.000Z',
  updatedAt: '2026-08-24T10:00:00.000Z',
});

describe('buildManualGradeUpdate', () => {
  it('đưa bài chấm tay về trạng thái graded thật sự và xóa lỗi cũ', () => {
    const update = buildManualGradeUpdate(submission(), {
      score: 7,
      maxScore: 10,
      feedback: 'Em cần sửa câu 2.',
      weakTopics: ['phân thức'],
    }, '2026-08-24T12:00:00.000Z');

    expect(update.status).toBe('graded');
    expect(update.errorMessage).toBe('');
    expect(update['grade.score']).toBe(7);
    expect(update['grade.teacherApproved']).toBe(false);
  });

  it('buộc duyệt lại khi giáo viên sửa bài đã duyệt', () => {
    const existingGrade = {
      score: 8,
      maxScore: 10,
      feedback: 'cũ',
      strengths: ['đúng phương pháp'],
      weaknesses: ['nhầm dấu'],
      teacherApproved: true,
      gradedAt: '2026-08-24T10:00:00.000Z',
    };
    const update = buildManualGradeUpdate(submission(existingGrade), {
      score: 9,
      maxScore: 10,
      feedback: 'mới',
      weakTopics: [],
    }, '2026-08-24T12:00:00.000Z');

    expect(update['grade.teacherApproved']).toBe(false);
    expect(update['grade.strengths']).toEqual(['đúng phương pháp']);
    expect(update['grade.weaknesses']).toEqual(['nhầm dấu']);
  });
});

describe('buildManualGradeUpdate · câu máy đang hỏi lại học sinh', () => {
  it('thầy cô chốt bảng điểm thì câu đang chờ em được đóng lại', () => {
    const q = (n: string, state: 'open' | 'answered') => ({
      questionNumber: n, status: 'unreadable' as const, score: 0, maxScore: 1, studentAnswer: '?', expectedAnswer: 'B',
      errorType: '', explanation: '', correction: '', nextPractice: '', needsTeacherReview: true,
      clarify: { kind: 'mcq' as const, state, reading: '?' },
    });
    const update = buildManualGradeUpdate(submission({
      score: 0, maxScore: 2, feedback: '', strengths: [], weaknesses: [], teacherApproved: false, gradedAt: '2026-10-09T10:00:00.000Z', questionResults: [q('Câu 1', 'open'), q('Câu 2', 'answered')],
    }), { score: 1, maxScore: 2, feedback: '', weakTopics: [] }, '2026-10-09T12:00:00.000Z');
    const rows = update['grade.questionResults'] as Array<{ clarify: { state: string } }>;
    expect(rows.map(r => r.clarify.state)).toEqual(['done', 'answered']);
  });
});

it('keeps text-only teacher edits and invalidates solution on changed answer key', () => {
  const old = { questionNumber: 'Câu 1', status: 'correct' as const, score: 1, maxScore: 1, studentAnswer: 'B', expectedAnswer: 'B',
    errorType: '', explanation: 'Cũ', correction: '', nextPractice: '', needsTeacherReview: false, workedSolution: 'Lời giải cũ', workedSolutionVersion: 'v' };
  for (const change of [{ explanation: 'Giải thích kỹ' }, { correction: 'Sửa dấu' }, { workedSolution: 'GV viết đủ bước' }]) {
    const next = mergeTeacherQuestionResults([old], [{ ...old, ...change }])[0];
    expect(next).toMatchObject({ ...change, teacherEdited: true });
  }
  expect(mergeTeacherQuestionResults([old], [{ ...old, studentAnswer: 'C' }])[0].workedSolution).toBe(old.workedSolution);
  expect(mergeTeacherQuestionResults([old], [{ ...old, expectedAnswer: 'C' }])[0]).not.toHaveProperty('workedSolution');
});

it('sửa điểm MỘT câu khi bài đã có lời giải chung: các câu khác không bị coi là thầy cô sửa', () => {
  const row = (n: string): QuestionResult => ({ questionNumber: n, status: 'incorrect', score: 0, maxScore: 1, studentAnswer: 'A', expectedAnswer: 'B',
    errorType: '', explanation: '', correction: '', nextPractice: '', needsTeacherReview: true });
  const stored = [row('Câu 1'), row('Câu 2')];
  // Bảng giáo viên nhìn thấy: lời giải chung gắn lúc đọc, bản lưu chưa có.
  const seen = stored.map(q => ({ ...q, workedSolution: `Lời giải ${q.questionNumber}`, workedSolutionVersion: 'v1' }));
  const sent = seen.map(q => (q.questionNumber === 'Câu 1' ? { ...q, score: 1, status: 'correct' } : q));
  const [c1, c2] = mergeTeacherQuestionResults(stored, sent, seen);
  expect(c1).toMatchObject({ score: 1, teacherEdited: true });
  expect(c1).not.toHaveProperty('workedSolution');
  expect(c2).toEqual(stored[1]);
  expect(c2.needsTeacherReview).toBe(true);
  // Sửa chính lời giải thì vẫn được ghi nhận
  const edited = mergeTeacherQuestionResults(stored, seen.map(q => ({ ...q, workedSolution: q.questionNumber === 'Câu 2' ? 'GV viết lại' : q.workedSolution })), seen);
  expect(edited[1]).toMatchObject({ workedSolution: 'GV viết lại', teacherEdited: true });
  expect(edited[0].teacherEdited).toBeUndefined();
});

describe('sửa tay tắt cờ lệch sổ điểm', () => {
  it('lượt AI có examCheck.mismatch — grade thầy sửa không còn examCheck, needsTeacherCheck false', () => {
    const aiGrade = {
      score: 8, maxScore: 10, feedback: 'AI chấm', strengths: [], weaknesses: [],
      teacherApproved: true, approvalSource: 'auto_timeout', gradedAt: '2026-10-24T00:00:00.000Z',
      examCheck: { sheetLabel: 'Giữa học kì I', sheetScore: 7, diff: 1, mismatch: true },
    } as unknown as SubmissionGrade;
    const update = buildManualGradeUpdate(submission(aiGrade), {
      score: 7, maxScore: 10, feedback: 'Thầy chốt', weakTopics: [],
    }, '2026-10-24T01:00:00.000Z');

    expect(update['grade.examCheck']).toBeUndefined();
    expect(update['grade.teacherApproved']).toBe(false);
    expect(update['grade.editedByTeacher']).toBe(true);
    // Cờ (nếu nhìn grade mới trọn vẹn) phải tắt:
    expect(needsTeacherCheck({
      score: 7, maxScore: 10, teacherApproved: false, editedByTeacher: true, gradedAt: '2026-10-24T01:00:00.000Z',
    } as unknown as SubmissionGrade)).toBe(false);
  });
});
