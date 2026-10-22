import type { LessonIRV83 } from './lessonIRSchema';

export interface PendingTeacherConfirmation {
  id: string;
  source: 'learnerEvidence' | 'qualityAudit';
  reason: string;
  material: boolean;
}

export interface LearnerProvenanceIssue {
  evidenceId: string;
  code: 'OBSERVED_WITHOUT_SOURCE' | 'ASSUMPTION_WITHOUT_CONFIRMATION';
}

export interface TeacherConfirmationInspection {
  pending: PendingTeacherConfirmation[];
  provenanceIssues: LearnerProvenanceIssue[];
  releaseBlocked: boolean;
}

export const inspectTeacherConfirmations = (lesson: LessonIRV83): TeacherConfirmationInspection => {
  const pending: PendingTeacherConfirmation[] = [];
  const provenanceIssues: LearnerProvenanceIssue[] = [];

  for (const evidence of lesson.learnerContext.evidence) {
    const isAssumption = evidence.type === 'planning_assumption' || evidence.type === 'unknown';
    if (isAssumption && !evidence.requiresTeacherConfirmation) {
      provenanceIssues.push({ evidenceId: evidence.id, code: 'ASSUMPTION_WITHOUT_CONFIRMATION' });
    }
    if (!isAssumption && !evidence.sourceRef?.trim()) {
      provenanceIssues.push({ evidenceId: evidence.id, code: 'OBSERVED_WITHOUT_SOURCE' });
    }
    if (evidence.requiresTeacherConfirmation && !evidence.confirmedByTeacher) {
      pending.push({
        id: evidence.id,
        source: 'learnerEvidence',
        reason: evidence.summary,
        material: evidence.materialForReadyToTeach !== false,
      });
    }
  }

  for (const confirmation of lesson.qualityAudit.teacherConfirmationsRequired) {
    if (!confirmation.resolved) {
      pending.push({
        id: confirmation.id,
        source: 'qualityAudit',
        reason: confirmation.reason,
        material: confirmation.materialForReadyToTeach,
      });
    }
  }

  return {
    pending,
    provenanceIssues,
    releaseBlocked: provenanceIssues.length > 0 || pending.some(item => item.material),
  };
};
