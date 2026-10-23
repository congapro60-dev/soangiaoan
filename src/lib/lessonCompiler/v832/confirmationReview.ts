import type { LessonIRV83 } from './lessonIRSchema';
import { inspectTeacherConfirmations, type PendingTeacherConfirmation } from './teacherConfirmation';
import { computeLessonContentHash } from '../../lessonReview/v832/repairLifecycle';

export interface TeacherConfirmationCard {
  key: string;
  label: string;
  refs: string[];
  reasons: string[];
  materialForReadyToTeach: boolean;
}

export type TeacherConfirmationDecisionKind =
  | 'confirm_planning_assumption'
  | 'confirm_quality_contract'
  | 'confirm_group';

export interface TeacherConfirmationDecision {
  teacherUid: string;
  baseLessonVersion: string;
  baseContentHash: string;
  decision: TeacherConfirmationDecisionKind;
  rationale: string;
  confirmedAt: string;
  acknowledgedRefs?: string[];
}

export interface TeacherConfirmationAuditRecord {
  lessonId: string;
  lessonVersion: string;
  teacherUid: string;
  decision: TeacherConfirmationDecisionKind;
  confirmationRefs: string[];
  rationale: string;
  confirmedAt: string;
  baseContentHash: string;
  resultingContentHash: string;
}

const LABELS: Record<string, string> = {
  'learner-context': 'Căn cứ về lớp',
  'handoff-timing': 'Thời gian chuyển bề mặt',
  'formative-cycle': 'Kiểm tra, can thiệp và kiểm tra lại',
  'content-key': 'Nội dung cần chốt',
};

const refFor = (item: PendingTeacherConfirmation): string => `${item.source}:${item.id}`;

export const buildTeacherConfirmationCards = (
  lesson: LessonIRV83,
  assignments: Readonly<Record<string, string>> = {},
): TeacherConfirmationCard[] => {
  const cards = new Map<string, TeacherConfirmationCard>();
  for (const item of inspectTeacherConfirmations(lesson).pending) {
    const ref = refFor(item);
    const assigned = assignments[ref] ?? assignments[item.id];
    const key = assigned?.trim()
      || (item.source === 'learnerEvidence' ? `learner:${item.id}` : `quality:${item.id}`);
    const card = cards.get(key) ?? {
      key, label: LABELS[key] ?? (item.source === 'learnerEvidence' ? 'Căn cứ về lớp' : 'Quyết định cần xác nhận'),
      refs: [], reasons: [], materialForReadyToTeach: false,
    };
    card.refs.push(ref);
    card.reasons.push(item.reason);
    card.materialForReadyToTeach ||= item.material;
    cards.set(key, card);
  }
  return [...cards.values()];
};

export const confirmTeacherDecision = async (
  lesson: LessonIRV83,
  card: TeacherConfirmationCard,
  decision: TeacherConfirmationDecision,
): Promise<{ lessonIR: LessonIRV83; audit: TeacherConfirmationAuditRecord }> => {
  if (!decision.teacherUid.trim() || !Number.isFinite(Date.parse(decision.confirmedAt))) {
    throw new Error('TEACHER_IDENTITY_OR_TIME_REQUIRED');
  }
  if (decision.rationale.trim().length < 12) throw new Error('TEACHER_RATIONALE_REQUIRED');
  if (decision.baseLessonVersion !== lesson.lesson.lessonVersion) throw new Error('LESSON_VERSION_MISMATCH');
  const currentHash = await computeLessonContentHash(lesson);
  if (decision.baseContentHash !== currentHash) throw new Error('CONTENT_HASH_MISMATCH');
  if (!card.refs.length || new Set(card.refs).size !== card.refs.length) throw new Error('CONFIRMATION_CARD_INVALID');

  const pending = new Set(inspectTeacherConfirmations(lesson).pending.map(refFor));
  if (!card.refs.every(ref => pending.has(ref))) throw new Error('CONFIRMATION_CARD_STALE');
  const sources = new Set(card.refs.map(ref => ref.split(':', 1)[0]));
  if (sources.size > 1) {
    const acknowledged = decision.acknowledgedRefs ?? [];
    if (decision.decision !== 'confirm_group' || acknowledged.length !== card.refs.length
      || !card.refs.every(ref => acknowledged.includes(ref))) {
      throw new Error('MIXED_GROUP_ACKNOWLEDGEMENT_REQUIRED');
    }
  } else if (sources.has('learnerEvidence') && decision.decision !== 'confirm_planning_assumption'
    || sources.has('qualityAudit') && decision.decision !== 'confirm_quality_contract') {
    throw new Error('CONFIRMATION_DECISION_KIND_MISMATCH');
  }

  const next = structuredClone(lesson);
  for (const ref of card.refs) {
    const [source, id] = ref.split(':');
    if (source === 'learnerEvidence') {
      const evidence = next.learnerContext.evidence.find(item => item.id === id);
      if (!evidence || (evidence.type !== 'planning_assumption' && evidence.type !== 'unknown')) {
        throw new Error(`LEARNER_EVIDENCE_REQUIRES_REVIEW:${id}`);
      }
      evidence.confirmedByTeacher = true;
    } else if (source === 'qualityAudit') {
      const confirmation = next.qualityAudit.teacherConfirmationsRequired.find(item => item.id === id);
      if (!confirmation) throw new Error(`QUALITY_CONFIRMATION_NOT_FOUND:${id}`);
      confirmation.resolved = true;
    } else {
      throw new Error(`CONFIRMATION_SOURCE_INVALID:${source}`);
    }
  }
  next.buildStatus = 'QUALITY_AUDIT';
  next.qualityAudit.passedRules = [];
  delete next.generatedArtifacts;
  const resultingContentHash = await computeLessonContentHash(next);
  return {
    lessonIR: next,
    audit: {
      lessonId: lesson.lesson.lessonId,
      lessonVersion: lesson.lesson.lessonVersion,
      teacherUid: decision.teacherUid,
      decision: decision.decision,
      confirmationRefs: [...card.refs],
      rationale: decision.rationale.trim(),
      confirmedAt: decision.confirmedAt,
      baseContentHash: currentHash,
      resultingContentHash,
    },
  };
};
