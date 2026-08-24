import type { SubmissionDoc } from './types';

export interface ManualGradeInput {
  score: number;
  maxScore: number;
  feedback: string;
  weakTopics: string[];
  teacherNote?: string;
}

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
  const maxScore = Number.isFinite(input.maxScore) && input.maxScore > 0 ? input.maxScore : 10;
  const rawScore = Number.isFinite(input.score) ? input.score : 0;
  const score = Math.min(Math.max(rawScore, 0), maxScore);
  const oldGrade = submission.grade;

  return {
    status: 'graded',
    errorMessage: '',
    'grade.score': score,
    'grade.maxScore': maxScore,
    'grade.feedback': input.feedback.trim(),
    'grade.weakTopics': input.weakTopics.map(topic => topic.trim()).filter(Boolean),
    'grade.teacherNote': input.teacherNote?.trim() || '',
    'grade.strengths': oldGrade?.strengths || [],
    'grade.weaknesses': oldGrade?.weaknesses || [],
    'grade.questionResults': oldGrade?.questionResults || [],
    'grade.gradedWithoutAnswerKey': oldGrade?.gradedWithoutAnswerKey ?? false,
    'grade.teacherApproved': oldGrade?.teacherApproved ?? false,
    'grade.editedByTeacher': true,
    'grade.gradedAt': now,
    updatedAt: now,
  };
};
