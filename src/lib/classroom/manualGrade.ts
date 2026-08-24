import type { SubmissionDoc, SubmissionGrade } from './types.js';

export interface ManualGradeInput {
  score: number;
  maxScore: number;
  feedback: string;
  weakTopics: string[];
  teacherNote?: string;
}

export const buildManualGrade = (
  submission: SubmissionDoc,
  input: ManualGradeInput,
  now: string,
): SubmissionGrade => {
  const maxScore = Number.isFinite(input.maxScore) && input.maxScore > 0 ? input.maxScore : 10;
  const rawScore = Number.isFinite(input.score) ? input.score : 0;
  const score = Math.min(Math.max(rawScore, 0), maxScore);
  const oldGrade = submission.grade;

  return {
    score,
    maxScore,
    feedback: input.feedback.trim(),
    ...(input.teacherNote?.trim() ? { teacherNote: input.teacherNote.trim() } : {}),
    strengths: oldGrade?.strengths || [],
    weaknesses: oldGrade?.weaknesses || [],
    questionResults: oldGrade?.questionResults || [],
    weakTopics: input.weakTopics.map(topic => topic.trim()).filter(Boolean),
    gradedWithoutAnswerKey: oldGrade?.gradedWithoutAnswerKey ?? false,
    ...(oldGrade?.noteForTeacher ? { noteForTeacher: oldGrade.noteForTeacher } : {}),
    // Sửa điểm làm thay đổi kết luận; giáo viên phải xác nhận lại trước khi vào hồ sơ.
    teacherApproved: false,
    editedByTeacher: true,
    gradedAt: now,
  };
};

/**
 * Dựng patch Firestore cho chấm tay ở một chỗ duy nhất.
 * Quan trọng nhất: status phải là `graded`; chỉ cập nhật các field con của grade mà giữ status
 * cũ sẽ làm UI hiện tại tưởng đã chấm nhưng tải lại lại quay về "Chờ chấm".
 */
export const buildManualGradeUpdate = (
  submission: SubmissionDoc,
  input: ManualGradeInput,
  now: string,
): Record<string, unknown> => {
  const grade = buildManualGrade(submission, input, now);

  return {
    status: 'graded',
    errorMessage: '',
    'grade.score': grade.score,
    'grade.maxScore': grade.maxScore,
    'grade.feedback': grade.feedback,
    'grade.weakTopics': grade.weakTopics || [],
    'grade.teacherNote': grade.teacherNote || '',
    'grade.strengths': grade.strengths,
    'grade.weaknesses': grade.weaknesses,
    'grade.questionResults': grade.questionResults || [],
    'grade.gradedWithoutAnswerKey': grade.gradedWithoutAnswerKey ?? false,
    'grade.teacherApproved': grade.teacherApproved,
    'grade.editedByTeacher': grade.editedByTeacher,
    'grade.noteForTeacher': grade.noteForTeacher || '',
    'grade.gradedAt': grade.gradedAt,
    updatedAt: now,
  };
};
