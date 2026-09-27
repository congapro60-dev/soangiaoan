import type { Exam, ExamQuestion } from '../../types';
import {
  buildExamContentSnapshot,
  type ExamContentSnapshot,
  type StudentExamQuestion,
} from './activitySnapshot';
import type { ActivityExportBundle } from './types';

export type ActivityExportFormat = 'pdf' | 'docx';

export interface ActivityExportPlan {
  examId: string;
  title: string;
  contentVersion: string;
  contentHash: string;
  requestedFormats: ActivityExportFormat[];
  student: {
    contentVersion: string;
    contentHash: string;
    questions: StudentExamQuestion[];
  };
  teacher: {
    contentVersion: string;
    contentHash: string;
    questions: ExamQuestion[];
  };
  snapshot: ExamContentSnapshot;
}

export interface ActivityExportOutputs {
  studentPdfUrl?: string;
  studentDocxUrl?: string;
  teacherKeyPdfUrl?: string;
  teacherKeyDocxUrl?: string;
  generatedAt?: string;
}

export type ActivityExportAudience = 'student' | 'teacher';

const requestedFormatsFor = (format: ActivityExportFormat | 'both'): ActivityExportFormat[] =>
  format === 'both' ? ['pdf', 'docx'] : [format];

const hasUrl = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export const buildActivityExportPlan = (
  exam: Exam,
  format: ActivityExportFormat | 'both',
): ActivityExportPlan => {
  const snapshot = buildExamContentSnapshot(exam);
  return {
    examId: exam.id,
    title: exam.title,
    contentVersion: snapshot.contentVersion,
    contentHash: snapshot.contentHash,
    requestedFormats: requestedFormatsFor(format),
    student: {
      contentVersion: snapshot.contentVersion,
      contentHash: snapshot.contentHash,
      questions: snapshot.studentQuestions,
    },
    teacher: {
      contentVersion: snapshot.contentVersion,
      contentHash: snapshot.contentHash,
      questions: snapshot.teacherQuestions,
    },
    snapshot,
  };
};

/** Tạo đúng nội dung tài liệu từ snapshot; không gọi AI và không đọc lại đề nguồn. */
export const buildExamExportMarkdown = (
  plan: Pick<ActivityExportPlan, 'title' | 'student' | 'teacher'>,
  audience: ActivityExportAudience,
): string => {
  const questions = audience === 'student' ? plan.student.questions : plan.teacher.questions;
  const lines = [`# ${plan.title}`, '', audience === 'student' ? '## Phiếu luyện tập' : '## Đáp án và hướng dẫn chấm', ''];
  questions.forEach((question, index) => {
    const teacherQuestion = audience === 'teacher' ? plan.teacher.questions[index] : undefined;
    lines.push(`## Câu ${index + 1}`);
    lines.push(question.content.trim());
    if (question.options?.length) {
      question.options.forEach((option, optionIndex) => {
        lines.push(`${String.fromCharCode(65 + optionIndex)}. ${option}`);
      });
    }
    lines.push(`Điểm: ${question.points}`);
    if (teacherQuestion) {
      lines.push(`Đáp án chuẩn: ${teacherQuestion.correctAnswer?.trim() || 'Giáo viên chấm theo bài làm và rubric.'}`);
      if (teacherQuestion.explanation?.trim()) lines.push(`Giải thích: ${teacherQuestion.explanation.trim()}`);
    }
    lines.push('');
  });
  return lines.join('\n').trim();
};

export const finalizeActivityExportBundle = (
  plan: Pick<ActivityExportPlan, 'contentVersion' | 'contentHash' | 'requestedFormats'>,
  outputs: ActivityExportOutputs,
): ActivityExportBundle => {
  const missing: string[] = [];
  if (plan.requestedFormats.includes('pdf')) {
    if (!hasUrl(outputs.studentPdfUrl)) missing.push('PDF học sinh');
    if (!hasUrl(outputs.teacherKeyPdfUrl)) missing.push('PDF giáo viên');
  }
  if (plan.requestedFormats.includes('docx')) {
    if (!hasUrl(outputs.studentDocxUrl)) missing.push('DOCX học sinh');
    if (!hasUrl(outputs.teacherKeyDocxUrl)) missing.push('DOCX giáo viên');
  }

  return {
    status: missing.length === 0 ? 'ready' : 'error',
    contentVersion: plan.contentVersion,
    contentHash: plan.contentHash,
    ...(hasUrl(outputs.studentPdfUrl) ? { studentPdfUrl: outputs.studentPdfUrl } : {}),
    ...(hasUrl(outputs.studentDocxUrl) ? { studentDocxUrl: outputs.studentDocxUrl } : {}),
    ...(hasUrl(outputs.teacherKeyPdfUrl) ? { teacherKeyPdfUrl: outputs.teacherKeyPdfUrl } : {}),
    ...(hasUrl(outputs.teacherKeyDocxUrl) ? { teacherKeyDocxUrl: outputs.teacherKeyDocxUrl } : {}),
    ...(outputs.generatedAt ? { generatedAt: outputs.generatedAt } : {}),
    ...(missing.length > 0 ? { errorMessage: `Chưa tạo đủ bản backup: ${missing.join(', ')}.` } : {}),
  };
};
