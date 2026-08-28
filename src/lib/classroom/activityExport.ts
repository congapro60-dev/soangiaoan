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
