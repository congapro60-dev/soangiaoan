import type { ExamQuestion, ExamSubmission, StudentAnswer } from '../../types.js';
import type {
  GradeState,
  GradingPolicy,
  GradingSource,
  QuestionResult,
  SubmissionGrade,
} from './types.js';

export interface OnlineGradeSource {
  answers: StudentAnswer[];
  maxScore: number;
  totalScore?: number;
  status?: ExamSubmission['status'];
  grade?: SubmissionGrade;
  gradeState?: GradeState;
  gradingSource?: GradingSource;
  approvalMode?: ExamSubmission['approvalMode'];
  teacherApprovedAt?: string;
}

export interface OnlineGradeUpdate extends OnlineGradeSource {
  status: ExamSubmission['status'];
  totalScore?: number;
  grade?: SubmissionGrade;
  gradeState?: GradeState;
  gradingSource?: GradingSource;
  approvalMode?: ExamSubmission['approvalMode'];
  teacherApprovedAt?: string;
}

export interface AutomaticOnlineGradeInput {
  questions: ExamQuestion[];
  answers: StudentAnswer[];
  maxScore: number;
  gradingPolicy?: GradingPolicy;
  now: string;
}

export interface TeacherOnlineGradeEdit {
  questionScores?: Record<string, number>;
  questionFeedback?: Record<string, string>;
  score?: number;
  feedback?: string;
  weakTopics?: string[];
  strengths?: string[];
  weaknesses?: string[];
  teacherNote?: string;
}

export interface OnlineAiGradeSuggestion {
  score: number;
  maxScore: number;
  feedback: string;
  noteForTeacher?: string;
  strengths: string[];
  weaknesses: string[];
  weakTopics: string[];
  questionResults: QuestionResult[];
  gradedWithoutAnswerKey?: boolean;
}

export class OnlineGradeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OnlineGradeValidationError';
  }
}

const normalize = (value: string): string => value.trim().toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ');

const parsedTrueFalse = (value: string): Record<string, string> => {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key.toLowerCase(), String(item)]))
      : {};
  } catch {
    return {};
  }
};

const isCompoundTrueFalse = (question: ExamQuestion): boolean => (
  question.type === 'true_false' && Array.isArray(question.options) && question.options.length > 0
);

const trueFalseValue = (value: string): string => {
  const normalized = normalize(value);
  if (['đ', 'đúng', 'true', 't'].includes(normalized)) return 'đ';
  if (['s', 'sai', 'false', 'f'].includes(normalized)) return 's';
  return normalized;
};

const scoreObjectiveAnswer = (question: ExamQuestion, answer: string): number | undefined => {
  if (question.type === 'essay') return undefined;
  if (!answer.trim()) return 0;

  if (question.type === 'multiple_choice') {
    return normalize(answer) === normalize(question.correctAnswer || '') ? question.points : 0;
  }

  if (isCompoundTrueFalse(question)) {
    const student = parsedTrueFalse(answer);
    const correctRaw = question.correctAnswer || '';
    const correctParts = correctRaw.includes(',')
      ? correctRaw.split(',').map(part => part.trim())
      : [];
    const keys = ['a', 'b', 'c', 'd'];
    const correct = keys.map((key, index) => trueFalseValue(correctParts[index] || student[key] || ''));
    const matched = keys.filter((key, index) => trueFalseValue(student[key] || '') === correct[index]).length;
    return matched === keys.length ? question.points : 0;
  }

  return normalize(answer) === normalize(question.correctAnswer || '') ? question.points : 0;
};

const scoreFor = (question: ExamQuestion, answer: StudentAnswer | undefined): number | undefined => {
  if (!answer) return undefined;
  if (answer.teacherScore !== undefined) return answer.teacherScore;
  if (answer.aiScore !== undefined) return answer.aiScore;
  if (answer.autoScore !== undefined) return answer.autoScore;
  return scoreObjectiveAnswer(question, answer.answer);
};

const resultStatus = (question: ExamQuestion, answer: StudentAnswer | undefined, score: number | undefined): QuestionResult['status'] => {
  if (!answer?.answer?.trim()) return 'not_attempted';
  if (score === undefined) return 'unreadable';
  if (score >= question.points) return 'correct';
  if (score > 0) return 'partially_correct';
  return 'incorrect';
};

const resultFor = (question: ExamQuestion, index: number, answer: StudentAnswer | undefined, score: number | undefined): QuestionResult => {
  const status = resultStatus(question, answer, score);
  const teacherFeedback = answer?.teacherFeedback?.trim();
  const aiFeedback = answer?.aiFeedback?.trim();
  return {
    questionNumber: `Câu ${index + 1}`,
    status,
    score: score ?? 0,
    maxScore: question.points,
    studentAnswer: answer?.answer || '',
    expectedAnswer: question.correctAnswer || '',
    errorType: status === 'correct' ? '' : status === 'not_attempted' ? 'Chưa làm' : status === 'unreadable' ? 'Chưa đủ dữ liệu để chấm' : 'Cần đối chiếu với mốc đáp án',
    explanation: teacherFeedback || aiFeedback || question.explanation || '',
    correction: status === 'correct' ? '' : question.explanation || 'Đối chiếu từng bước với đáp án hoặc mốc cần đạt.',
    nextPractice: status === 'correct' ? 'Tiếp tục vận dụng ở mức độ cao hơn.' : 'Làm lại câu tương tự và kiểm tra từng bước trước khi nộp.',
    needsTeacherReview: score === undefined,
  };
};

const cleanList = (values: string[] | undefined, maxLength: number): string[] => (
  (values || []).filter(value => typeof value === 'string').map(value => value.trim()).filter(Boolean).slice(0, maxLength)
);

const clampScore = (value: number, maxScore: number): number => Math.round(Math.min(Math.max(value, 0), maxScore) * 100) / 100;

const buildGrade = (
  questions: ExamQuestion[],
  answers: StudentAnswer[],
  maxScore: number,
  now: string,
  metadata: {
    gradeState: GradeState;
    gradingSource: GradingSource;
    approvalMode: NonNullable<ExamSubmission['approvalMode']>;
    teacherApproved: boolean;
    feedback?: string;
    weakTopics?: string[];
    strengths?: string[];
    weaknesses?: string[];
    teacherNote?: string;
    existing?: SubmissionGrade;
    editedByTeacher?: boolean;
  },
): { grade: SubmissionGrade; totalScore: number; complete: boolean } => {
  const byId = new Map(answers.map(answer => [answer.questionId, answer]));
  const questionResults = questions.map((question, index) => resultFor(question, index, byId.get(question.id), scoreFor(question, byId.get(question.id))));
  const totalScore = clampScore(questionResults.reduce((sum, result) => sum + result.score, 0), maxScore);
  const complete = questionResults.every((result, index) => {
    if (questions[index].type !== 'essay') return result.score !== undefined;
    const answer = byId.get(questions[index].id);
    return result.score !== undefined && (answer?.teacherScore !== undefined || answer?.aiScore !== undefined);
  });
  const correct = questionResults.filter(result => result.status === 'correct').map(result => result.questionNumber);
  const needsWork = questionResults.filter(result => result.status !== 'correct').map(result => result.questionNumber);
  const existing = metadata.existing;
  const feedback = metadata.feedback?.trim() || existing?.feedback || (
    needsWork.length === 0
      ? 'Em đã hoàn thành các câu trong bài. Tiếp tục duy trì cách trình bày này.'
      : `Em đã hoàn thành ${correct.length}/${questions.length} câu. Hãy xem từng câu cần sửa và làm lại theo hướng dẫn.`
  );
  const grade: SubmissionGrade = {
    score: totalScore,
    maxScore,
    feedback,
    ...(metadata.teacherNote?.trim() ? { teacherNote: metadata.teacherNote.trim() } : existing?.teacherNote ? { teacherNote: existing.teacherNote } : {}),
    ...(existing?.noteForTeacher ? { noteForTeacher: existing.noteForTeacher } : {}),
    strengths: cleanList(metadata.strengths || existing?.strengths || (correct.length ? [`Hoàn thành ${correct.length} câu đúng.`] : []), 20),
    weaknesses: cleanList(metadata.weaknesses || existing?.weaknesses || (needsWork.length ? [`Cần xem lại ${needsWork.length} câu/phần.`] : []), 20),
    questionResults,
    weakTopics: cleanList(metadata.weakTopics || existing?.weakTopics, 50),
    gradedAt: now,
    teacherApproved: metadata.teacherApproved,
    ...(metadata.editedByTeacher ? { editedByTeacher: true } : existing?.editedByTeacher ? { editedByTeacher: true } : {}),
  };
  return { grade, totalScore, complete };
};

export const buildAutomaticOnlineGrade = (input: AutomaticOnlineGradeInput): OnlineGradeUpdate => {
  const answersById = new Map(input.answers.map(answer => [answer.questionId, answer]));
  const answers = input.questions.map(question => {
    const answer = answersById.get(question.id) || { questionId: question.id, answer: '' };
    const autoScore = scoreObjectiveAnswer(question, answer.answer);
    return autoScore === undefined
      ? { questionId: question.id, answer: answer.answer }
      : { questionId: question.id, answer: answer.answer, autoScore };
  });
  const automaticPolicy = input.gradingPolicy === 'automatic';
  const built = buildGrade(input.questions, answers, input.maxScore, input.now, {
    gradeState: automaticPolicy && input.questions.every(question => question.type !== 'essay') ? 'official' : 'pending_teacher_review',
    gradingSource: 'automatic',
    approvalMode: automaticPolicy && input.questions.every(question => question.type !== 'essay') ? 'automatic_policy' : 'teacher',
    teacherApproved: automaticPolicy && input.questions.every(question => question.type !== 'essay'),
  });
  return {
    answers,
    maxScore: input.maxScore,
    totalScore: built.totalScore,
    status: built.complete ? 'graded' : 'submitted',
    grade: built.grade,
    gradeState: automaticPolicy && input.questions.every(question => question.type !== 'essay') ? 'official' : 'pending_teacher_review',
    gradingSource: 'automatic',
    approvalMode: automaticPolicy && input.questions.every(question => question.type !== 'essay') ? 'automatic_policy' : 'teacher',
  };
};

export const applyTeacherOnlineGradeEdit = (
  source: OnlineGradeSource,
  questions: ExamQuestion[],
  edit: TeacherOnlineGradeEdit,
  now: string,
): OnlineGradeUpdate => {
  const scores = edit.questionScores || {};
  const feedbacks = edit.questionFeedback || {};
  const answers = questions.map(question => {
    const previous = source.answers.find(answer => answer.questionId === question.id) || { questionId: question.id, answer: '' };
    const next: StudentAnswer = { ...previous };
    if (Object.prototype.hasOwnProperty.call(scores, question.id)) {
      const score = Number(scores[question.id]);
      if (!Number.isFinite(score) || score < 0 || score > question.points) {
        throw new OnlineGradeValidationError(`Điểm câu ${question.id} phải nằm trong khoảng 0 – ${question.points}.`);
      }
      next.teacherScore = Math.round(score * 100) / 100;
    }
    if (Object.prototype.hasOwnProperty.call(feedbacks, question.id)) {
      const feedback = String(feedbacks[question.id] || '').trim();
      if (feedback.length > 4000) throw new OnlineGradeValidationError('Nhận xét theo câu quá dài.');
      next.teacherFeedback = feedback;
    }
    return next;
  });
  const built = buildGrade(questions, answers, source.maxScore, now, {
    gradeState: 'pending_teacher_review',
    gradingSource: 'teacher',
    approvalMode: 'teacher',
    teacherApproved: false,
    feedback: edit.feedback,
    weakTopics: edit.weakTopics,
    strengths: edit.strengths,
    weaknesses: edit.weaknesses,
    teacherNote: edit.teacherNote,
    existing: source.grade,
    editedByTeacher: true,
  });
  if (edit.score !== undefined && Math.abs(edit.score - built.totalScore) > 0.01) {
    throw new OnlineGradeValidationError('Điểm tổng phải bằng tổng điểm các câu sau khi sửa.');
  }
  return {
    answers,
    maxScore: source.maxScore,
    totalScore: built.totalScore,
    status: built.complete ? 'graded' : 'submitted',
    grade: built.grade,
    gradeState: 'pending_teacher_review',
    gradingSource: 'teacher',
    approvalMode: 'teacher',
  };
};

export const applyAiOnlineGradeSuggestion = (
  source: OnlineGradeSource,
  questions: ExamQuestion[],
  suggestion: OnlineAiGradeSuggestion,
  now: string,
): OnlineGradeUpdate => {
  if (!Number.isFinite(suggestion.maxScore) || Math.abs(suggestion.maxScore - source.maxScore) > 0.000001) {
    throw new OnlineGradeValidationError('Thang điểm của kết quả AI không khớp bài giao.');
  }
  if (suggestion.questionResults.length !== questions.length) {
    throw new OnlineGradeValidationError('AI chưa trả đủ kết quả theo từng câu.');
  }
  const answers = questions.map((question, index) => {
    const previous = source.answers.find(answer => answer.questionId === question.id);
    const result = suggestion.questionResults[index];
    const next: StudentAnswer = { questionId: question.id, answer: previous?.answer || '' };
    const score = Number(result.score);
    if (!Number.isFinite(score) || score < 0 || score > question.points) {
      throw new OnlineGradeValidationError(`Điểm AI ở câu ${index + 1} không hợp lệ.`);
    }
    if (result.status !== 'unreadable' && result.needsTeacherReview !== true) next.aiScore = Math.round(score * 100) / 100;
    if (result.explanation.trim()) next.aiFeedback = result.explanation.trim().slice(0, 4000);
    return next;
  });
  const built = buildGrade(questions, answers, source.maxScore, now, {
    gradeState: 'provisional',
    gradingSource: 'ai',
    approvalMode: 'teacher',
    teacherApproved: false,
    feedback: suggestion.feedback,
    weakTopics: suggestion.weakTopics,
    strengths: suggestion.strengths,
    weaknesses: suggestion.weaknesses,
  });
  if (Math.abs(suggestion.score - built.totalScore) > 0.01) {
    throw new OnlineGradeValidationError('Điểm tổng AI không khớp tổng điểm các câu.');
  }
  const calculatedResults = built.grade.questionResults || [];
  const questionResults = suggestion.questionResults.map((result, index) => ({
    ...calculatedResults[index],
    errorType: result.errorType.trim() || calculatedResults[index].errorType,
    explanation: result.explanation.trim() || calculatedResults[index].explanation,
    correction: result.correction.trim() || calculatedResults[index].correction,
    nextPractice: result.nextPractice.trim() || calculatedResults[index].nextPractice,
    ...(result.confidence === undefined ? {} : { confidence: result.confidence }),
    ...(result.ignoredByTeacherInstruction === undefined ? {} : { ignoredByTeacherInstruction: result.ignoredByTeacherInstruction }),
    needsTeacherReview: result.needsTeacherReview || calculatedResults[index].needsTeacherReview,
  }));
  const grade: SubmissionGrade = {
    ...built.grade,
    questionResults,
    ...(suggestion.noteForTeacher?.trim() ? { noteForTeacher: suggestion.noteForTeacher.trim().slice(0, 4000) } : {}),
    ...(suggestion.gradedWithoutAnswerKey === undefined ? {} : { gradedWithoutAnswerKey: suggestion.gradedWithoutAnswerKey }),
  };
  return {
    answers,
    maxScore: source.maxScore,
    totalScore: built.totalScore,
    status: built.complete ? 'graded' : 'submitted',
    grade,
    gradeState: 'provisional',
    gradingSource: 'ai',
    approvalMode: 'teacher',
  };
};

export const approveOnlineGrade = (source: OnlineGradeSource, now: string): OnlineGradeUpdate => {
  if (!source.grade) throw new OnlineGradeValidationError('Bài làm chưa có kết quả chấm để duyệt.');
  if (source.grade.questionResults?.some(result => result.needsTeacherReview)) {
    throw new OnlineGradeValidationError('Bài còn câu cần giáo viên xem lại trước khi duyệt.');
  }
  return {
    ...source,
    status: 'graded',
    totalScore: source.grade.score,
    grade: { ...source.grade, teacherApproved: true },
    gradeState: 'official',
    gradingSource: source.gradingSource || 'teacher',
    approvalMode: 'teacher',
    teacherApprovedAt: now,
  };
};

export const removeOnlineGrade = (source: OnlineGradeSource, questions: ExamQuestion[]): OnlineGradeUpdate => {
  const questionIds = new Set(questions.map(question => question.id));
  return {
    ...source,
    answers: source.answers
      .filter(answer => questionIds.has(answer.questionId))
      .map(answer => ({ questionId: answer.questionId, answer: answer.answer })),
    status: 'submitted',
    totalScore: undefined,
    grade: undefined,
    gradeState: undefined,
    gradingSource: undefined,
    approvalMode: undefined,
    teacherApprovedAt: undefined,
  };
};

/**
 * Projection kết quả gửi cho học sinh. Đáp án/mốc chấm và ghi chú nội bộ chỉ
 * xuất hiện sau khi đề cho phép xem lại; không dựa vào việc ẩn ở UI.
 */
export const projectOnlineGradeForStudent = (
  grade: SubmissionGrade,
  allowReview: boolean,
): SubmissionGrade => {
  const { noteForTeacher: _noteForTeacher, teacherNote: _teacherNote, questionResults, ...publicGrade } = grade;
  return {
    ...publicGrade,
    ...(questionResults
      ? {
          questionResults: questionResults.map(result => ({
            ...result,
            ...(allowReview ? {} : { expectedAnswer: '', explanation: '' }),
          })),
        }
      : {}),
  };
};
