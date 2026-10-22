import { isClarifyPending } from './clarification.js';
import { invalidateWorkedSolution } from './workedSolutions.js';
import { projectPhotoMarks } from './photoMarks.js';
import type { QuestionResult, QuestionResultStatus, SubmissionDoc, SubmissionGrade } from './types.js';

export interface ManualGradeInput {
  score: number;
  maxScore: number;
  feedback: string;
  weakTopics: string[];
  teacherNote?: string;
  /** Bảng từng câu thầy cô đã soát; thiếu thì giữ nguyên bảng cũ. */
  questionResults?: QuestionResult[];
}

const STATUSES: readonly QuestionResultStatus[] = ['correct', 'partially_correct', 'incorrect', 'unreadable', 'not_attempted'];
const MAX_FIELD = 4000;

/**
 * Nhận bảng câu thầy cô sửa nhưng chỉ trên KHUNG của bảng cũ: không thêm/bớt câu, không đổi tên
 * câu, không đổi điểm tối đa từng câu; điểm câu kẹp trong 0..tối đa. Câu nào có chỗ khác bản cũ
 * thì gắn `teacherEdited` để AI chấm lại về sau không đè lên.
 */
export const mergeTeacherQuestionResults = (
  previous: QuestionResult[],
  input: unknown,
  /**
   * Bảng thầy cô ĐANG NHÌN khi sửa (đã gắn lời giải chung của bài). Hộp sửa điểm gửi lại lời giải của mọi câu,
   * nên lời giải chỉ tính là "thầy cô sửa" khi khác chữ thầy cô đã thấy — không thì một lần sửa điểm khoá cả bảng.
   */
  seen: QuestionResult[] = previous,
): QuestionResult[] => {
  const seenSolution = new Map(seen.map(row => [row.questionNumber, row.workedSolution ?? '']));
  if (!Array.isArray(input)) return previous;
  const byNumber = new Map<string, Record<string, unknown>>();
  for (const item of input) {
    if (item && typeof item === 'object' && typeof (item as Record<string, unknown>).questionNumber === 'string') {
      byNumber.set((item as Record<string, string>).questionNumber, item as Record<string, unknown>);
    }
  }
  // Ô rỗng gửi lên KHÔNG xoá chữ đã lưu: bản chiếu cũ từng ẩn đáp án/giải thích (gửi về chuỗi rỗng),
  // nhận rỗng là xoá đáp án thật của cả bảng chỉ vì thầy cô bấm Lưu.
  const text = (raw: unknown, fallback: string, keepIfEmpty = false) => (
    typeof raw === 'string' && !(keepIfEmpty && raw.trim() === '') ? raw.slice(0, MAX_FIELD) : fallback
  );
  return previous.map(old => {
    const raw = byNumber.get(old.questionNumber);
    if (!raw) return old;
    const solution = typeof raw.workedSolution === 'string' ? raw.workedSolution.slice(0, 16000) : undefined;
    const solutionEdited = solution !== undefined && solution !== (seenSolution.get(old.questionNumber) ?? old.workedSolution ?? '');
    const score = Number(raw.score);
    const status = STATUSES.find(s => s === raw.status) || old.status;
    let next: QuestionResult = {
      ...old,
      score: Number.isFinite(score) ? Math.min(Math.max(score, 0), old.maxScore) : old.score,
      status,
      studentAnswer: text(raw.studentAnswer, old.studentAnswer),
      expectedAnswer: text(raw.expectedAnswer, old.expectedAnswer, true),
      errorType: text(raw.errorType, old.errorType),
      explanation: text(raw.explanation, old.explanation, true),
      correction: text(raw.correction, old.correction),
      nextPractice: text(raw.nextPractice, old.nextPractice),
      ...(solutionEdited ? { workedSolution: solution, workedSolutionStatus: solution.trim() ? 'ready' as const : 'unavailable' as const } : {}),
    };
    const changed = next.score !== old.score || next.status !== old.status
      || next.studentAnswer !== old.studentAnswer || next.expectedAnswer !== old.expectedAnswer
      || next.explanation !== old.explanation || next.correction !== old.correction || next.nextPractice !== old.nextPractice
      || next.errorType !== old.errorType || solutionEdited;
    if (next.expectedAnswer !== old.expectedAnswer) next = invalidateWorkedSolution(next);
    // Client chỉ được bỏ dấu; đổi phần đọc/status/đáp án làm tọa độ cũ không còn đáng tin.
    const removedByTeacher = Array.isArray(raw.photoMarks) && raw.photoMarks.length === 0;
    if (removedByTeacher) next.photoMarksCleared = true;
    const clearMarks = removedByTeacher
      || next.studentAnswer !== old.studentAnswer || next.status !== old.status || next.expectedAnswer !== old.expectedAnswer;
    const marks = clearMarks ? [] : projectPhotoMarks(next, (old.photoMarks || []).flatMap(m => m.imageUrl ? [m.imageUrl] : []));
    delete next.photoMarks;
    if (clearMarks) delete next.photoSteps;
    if (next.studentAnswer !== old.studentAnswer || next.expectedAnswer !== old.expectedAnswer) delete next.readingRegions;
    if (marks.length) next.photoMarks = marks;
    return changed || old.teacherEdited
      ? { ...next, teacherEdited: true, needsTeacherReview: false }
      : clearMarks || old.photoMarks ? next : old;
  });
};

export const buildManualGrade = (
  submission: SubmissionDoc,
  input: ManualGradeInput,
  now: string,
  /** Bảng câu thầy cô đã thấy (có gắn lời giải chung); xem `mergeTeacherQuestionResults`. */
  seenQuestionResults?: QuestionResult[],
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
    // Thầy cô đã chốt bảng điểm: câu nào máy còn đang hỏi lại học sinh thì đóng lại, em không phải trả lời nữa.
    questionResults: mergeTeacherQuestionResults(oldGrade?.questionResults || [], input.questionResults, seenQuestionResults ?? oldGrade?.questionResults ?? [])
      .map(q => (isClarifyPending(q) && q.clarify ? { ...q, clarify: { ...q.clarify, state: 'done' as const } } : q)),
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
