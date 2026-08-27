import type { Student } from '../../types';
import type { ClassAssignmentReport, ClassReportSubmissionProjection } from './classReportModel';

export interface ClassProgressReportInput {
  reports: readonly ClassAssignmentReport[];
}

export interface ClassProgressAssignment {
  id: string;
  title: string;
  type: string;
  maxScore: number | null;
}

export interface ClassProgressCell {
  assignmentId: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  official: boolean;
  attemptCount: number;
}

export interface ClassProgressStudentRow {
  studentKey: string;
  studentName: string;
  studentCode: string;
  submittedCount: number;
  assignmentCount: number;
  completionRate: number;
  officialCount: number;
  averagePercent: number | null;
  cells: ClassProgressCell[];
}

export interface ClassProgressMatrix {
  assignments: ClassProgressAssignment[];
  rows: ClassProgressStudentRow[];
  totalAttempts: number;
  totalSubmitted: number;
  totalOfficial: number;
}

const asFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const attemptCountOf = (submission: ClassReportSubmissionProjection): number => {
  const count = asFiniteNumber(submission.attemptCount);
  return count !== null && count > 0 ? Math.max(1, Math.floor(count)) : 1;
};

const officialScorePair = (submission: ClassReportSubmissionProjection): { score: number; maxScore: number } | null => {
  if (!submission.official || submission.status.toLocaleLowerCase('vi-VN') !== 'graded') return null;
  const score = asFiniteNumber(submission.score);
  const maxScore = asFiniteNumber(submission.maxScore);
  if (score === null || maxScore === null || maxScore <= 0 || score < 0 || score > maxScore) return null;
  return { score, maxScore };
};

const cellFromSubmission = (assignmentId: string, submission?: ClassReportSubmissionProjection): ClassProgressCell => {
  if (!submission) {
    return { assignmentId, status: 'missing', score: null, maxScore: null, official: false, attemptCount: 0 };
  }
  return {
    assignmentId,
    status: submission.status,
    score: asFiniteNumber(submission.score),
    maxScore: asFiniteNumber(submission.maxScore),
    official: officialScorePair(submission) !== null,
    attemptCount: attemptCountOf(submission),
  };
};

export const buildClassProgressMatrix = (
  students: readonly Student[],
  reports: readonly ClassAssignmentReport[],
): ClassProgressMatrix => {
  const assignments = reports.map(report => ({
    id: report.assignment.id,
    title: report.assignment.title,
    type: report.assignment.type,
    maxScore: asFiniteNumber(report.assignment.maxScore),
  }));

  const rows = students.map(student => {
    const cells = reports.map(report => {
      const submission = report.latest.find(item => item.studentKey === student.id);
      return cellFromSubmission(report.assignment.id, submission);
    });
    const officialScores = reports
      .map(report => report.latest.find(item => item.studentKey === student.id))
      .map(submission => submission ? officialScorePair(submission) : null)
      .filter((pair): pair is { score: number; maxScore: number } => pair !== null);
    const submittedCount = cells.filter(cell => cell.attemptCount > 0 && cell.status !== 'in_progress').length;
    const averagePercent = officialScores.length > 0
      ? officialScores.reduce((sum, pair) => sum + (pair.score / pair.maxScore) * 100, 0) / officialScores.length
      : null;

    return {
      studentKey: student.id,
      studentName: student.name,
      studentCode: student.code,
      submittedCount,
      assignmentCount: reports.length,
      completionRate: reports.length > 0 ? submittedCount / reports.length : 0,
      officialCount: officialScores.length,
      averagePercent,
      cells,
    };
  });

  return {
    assignments,
    rows,
    totalAttempts: rows.reduce((sum, row) => sum + row.cells.reduce((rowSum, cell) => rowSum + cell.attemptCount, 0), 0),
    totalSubmitted: rows.reduce((sum, row) => sum + row.submittedCount, 0),
    totalOfficial: rows.reduce((sum, row) => sum + row.officialCount, 0),
  };
};
