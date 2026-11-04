import type { StudentAssignmentView, SubmissionDoc } from './types.js';
import type { ExamSubmission } from '../../types.js';
import type { PublishedParentReport } from './parentAccess.js';
import type { ParentReportPrintInput } from './parentReportTypes.js';

/** Metadata only; photos and question results arrive when the student opens a work. */
export interface StudentWorkspaceSubmission extends SubmissionDoc {
  clarificationCount: number;
  clarificationRegrading: boolean;
}

export interface StudentWorkspaceIndex {
  assignments: StudentAssignmentView[];
  submissions: StudentWorkspaceSubmission[];
  onlineSubmissions: ExamSubmission[];
}

export interface StudentAssignmentDetail {
  assignment?: StudentAssignmentView;
  submissions: SubmissionDoc[];
  onlineSubmissions: ExamSubmission[];
}

export type StudentReportSummary = Omit<PublishedParentReport, 'input'>;
export interface PublishedStudentReport extends StudentReportSummary {
  input: ParentReportPrintInput;
}
