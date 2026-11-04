export type QuestionPhase = 'INTRO' | 'QUESTION_BRIEF' | 'QUESTION_OPEN' | 'QUESTION_LOCKED' | 'STATS' | 'REVEAL';
export type RevealPolicy = 'teacher_manual' | 'auto_on_next' | 'show_after_submit' | 'no_reveal';

export interface QuestionRun {
  instanceId: string;
  activityId: string;
  phase: QuestionPhase;
  revealPolicy: RevealPolicy;
  openedAtSec: number;
  deadlineAtSec: number;
  plannedWorkSec?: number;
  pausedAtSec?: number;
  completionRequiredSet: string[];
  nonBlockingRequiredSet: string[];
  responseSet: string[];
  responseValueByStudent: Record<string, string>;
  responseRevisionByStudent: Record<string, number>;
  requiredCompleted: number;
  validResponses: number;
  lockedAtSec?: number;
  statsAtSec?: number;
  revealedAtSec?: number;
  lockReason?: 'ALL_REQUIRED_SUBMITTED' | 'TIMER_EXPIRED' | 'TEACHER' | 'DISCONNECT_GRACE'
    | 'CONFIRMED_ABSENCE' | 'CONFIRMED_LEFT' | 'TEACHER_COHORT';
  savedWorkSec: number;
  runRevision: number;
}

export const prepareQuestion = (
  instanceId: string, activityId: string, revealPolicy: RevealPolicy,
): QuestionRun => {
  if (!instanceId || !activityId) throw new Error('QUESTION_CONFIG_INVALID');
  return {
    instanceId, activityId, phase: 'INTRO', revealPolicy,
    openedAtSec: 0, deadlineAtSec: 0, completionRequiredSet: [], nonBlockingRequiredSet: [], responseSet: [],
    responseRevisionByStudent: {}, responseValueByStudent: {}, requiredCompleted: 0, validResponses: 0,
    savedWorkSec: 0, runRevision: 0,
  };
};

export const briefQuestion = (run: QuestionRun): QuestionRun => {
  if (run.phase !== 'INTRO') throw new Error('QUESTION_PHASE_INVALID');
  return { ...run, phase: 'QUESTION_BRIEF', runRevision: run.runRevision + 1 };
};

export const openQuestion = (input: {
  instanceId: string;
  activityId: string;
  requiredStudentIds: string[];
  openedAtSec: number;
  workBudgetSec: number;
  revealPolicy: RevealPolicy;
}): QuestionRun => {
  if (!input.instanceId || !input.activityId || !Number.isFinite(input.openedAtSec)
    || !Number.isFinite(input.workBudgetSec) || input.workBudgetSec <= 0) throw new Error('QUESTION_CONFIG_INVALID');
  const completionRequiredSet = [...new Set(input.requiredStudentIds)].sort();
  return {
    instanceId: input.instanceId,
    activityId: input.activityId,
    phase: 'QUESTION_OPEN',
    revealPolicy: input.revealPolicy,
    openedAtSec: input.openedAtSec,
    deadlineAtSec: input.openedAtSec + input.workBudgetSec,
    plannedWorkSec: input.workBudgetSec,
    completionRequiredSet,
    nonBlockingRequiredSet: [],
    responseSet: [],
    responseRevisionByStudent: {},
    responseValueByStudent: {},
    requiredCompleted: 0,
    validResponses: 0,
    savedWorkSec: 0,
    runRevision: 0,
  };
};

const plannedWork = (run: QuestionRun): number => run.plannedWorkSec ?? Math.max(0, run.deadlineAtSec - run.openedAtSec);
// Savings measure actual lesson time, including pauses; extensions never manufacture credit.
const savedWork = (run: QuestionRun, nowSec: number): number =>
  Math.max(0, plannedWork(run) - Math.max(0, nowSec - run.openedAtSec));

const lockQuestion = (run: QuestionRun, nowSec: number, reason: QuestionRun['lockReason']): QuestionRun => ({
  ...run,
  phase: 'STATS',
  lockedAtSec: nowSec,
  statsAtSec: nowSec,
  lockReason: reason,
  savedWorkSec: savedWork(run, nowSec),
  runRevision: run.runRevision + 1,
});

export const extendQuestion = (run: QuestionRun, seconds: number): QuestionRun => {
  if (run.phase !== 'QUESTION_OPEN' || !Number.isFinite(seconds) || seconds <= 0) throw new Error('QUESTION_EXTEND_INVALID');
  return { ...run, plannedWorkSec: plannedWork(run), deadlineAtSec: run.deadlineAtSec + seconds, runRevision: run.runRevision + 1 };
};

export const pauseQuestion = (run: QuestionRun, nowSec: number): QuestionRun => {
  if (!Number.isFinite(nowSec)) throw new Error('QUESTION_CLOCK_INVALID');
  if (run.pausedAtSec !== undefined) return run;
  const current = reconcileQuestion(run, nowSec);
  return { ...current, plannedWorkSec: plannedWork(current), pausedAtSec: nowSec, runRevision: current.runRevision + 1 };
};

export const resumeQuestion = (run: QuestionRun, nowSec: number): QuestionRun => {
  if (!Number.isFinite(nowSec)) throw new Error('QUESTION_CLOCK_INVALID');
  if (run.pausedAtSec === undefined) return run;
  if (nowSec < run.pausedAtSec) throw new Error('QUESTION_CLOCK_INVALID');
  const next = { ...run, runRevision: run.runRevision + 1 };
  if (run.phase === 'QUESTION_OPEN') next.deadlineAtSec += nowSec - run.pausedAtSec;
  if (run.phase === 'STATS' && run.statsAtSec !== undefined) {
    next.statsAtSec = run.statsAtSec + nowSec - Math.max(run.pausedAtSec, run.statsAtSec);
  }
  delete next.pausedAtSec;
  return next;
};

export const lockQuestionNow = (run: QuestionRun, nowSec: number): QuestionRun => {
  if (run.phase !== 'QUESTION_OPEN') throw new Error('QUESTION_PHASE_INVALID');
  return {
    ...run, phase: 'QUESTION_LOCKED', lockedAtSec: nowSec, lockReason: 'TEACHER',
    savedWorkSec: savedWork(run, nowSec), runRevision: run.runRevision + 1,
  };
};

export const showQuestionStats = (run: QuestionRun, nowSec: number): QuestionRun => {
  if (run.phase !== 'QUESTION_LOCKED') throw new Error('QUESTION_PHASE_INVALID');
  return { ...run, phase: 'STATS', statsAtSec: nowSec, runRevision: run.runRevision + 1 };
};

export const revealQuestion = (run: QuestionRun, nowSec: number): QuestionRun => {
  if (run.revealPolicy === 'no_reveal') throw new Error('REVEAL_FORBIDDEN');
  if (run.phase !== 'STATS') throw new Error('QUESTION_PHASE_INVALID');
  return { ...run, phase: 'REVEAL', revealedAtSec: nowSec, runRevision: run.runRevision + 1 };
};

export const includeRequiredStudent = (run: QuestionRun, studentId: string): QuestionRun => {
  if (run.phase !== 'QUESTION_OPEN' || !studentId) throw new Error('QUESTION_COHORT_OVERRIDE_INVALID');
  const completionRequiredSet = [...new Set([...run.completionRequiredSet, studentId])].sort();
  const requiredCompleted = completionRequiredSet.filter(id => run.responseSet.includes(id)).length;
  return { ...run, completionRequiredSet, requiredCompleted,
    nonBlockingRequiredSet: run.nonBlockingRequiredSet.filter(id => id !== studentId),
    runRevision: run.runRevision + 1 };
};

export const excludeRequiredStudent = (run: QuestionRun, studentId: string, nowSec: number): QuestionRun => {
  if (run.phase !== 'QUESTION_OPEN' || !run.completionRequiredSet.includes(studentId)) {
    throw new Error('QUESTION_COHORT_OVERRIDE_INVALID');
  }
  const completionRequiredSet = run.completionRequiredSet.filter(id => id !== studentId);
  const requiredCompleted = completionRequiredSet.filter(id => run.responseSet.includes(id)).length;
  const next = { ...run, completionRequiredSet, requiredCompleted,
    nonBlockingRequiredSet: run.nonBlockingRequiredSet.filter(id => id !== studentId),
    runRevision: run.runRevision + 1 };
  return completionRequiredSet.length > 0 && requiredCompleted === completionRequiredSet.length
    ? lockQuestion(next, nowSec, 'TEACHER_COHORT') : next;
};

export const reopenQuestion = (run: QuestionRun, nowSec: number, workBudgetSec: number): QuestionRun => {
  if (run.phase === 'REVEAL') throw new Error('REOPEN_AFTER_REVEAL_FORBIDDEN');
  if (run.phase !== 'QUESTION_LOCKED' && run.phase !== 'STATS') throw new Error('QUESTION_PHASE_INVALID');
  if (!Number.isFinite(nowSec) || !Number.isFinite(workBudgetSec) || workBudgetSec <= 0) {
    throw new Error('QUESTION_REOPEN_INVALID');
  }
  const next = structuredClone(run);
  next.phase = 'QUESTION_OPEN';
  next.openedAtSec = nowSec;
  next.deadlineAtSec = nowSec + workBudgetSec;
  next.plannedWorkSec = workBudgetSec;
  delete next.pausedAtSec;
  next.responseSet = [];
  next.responseValueByStudent = {};
  next.responseRevisionByStudent = {};
  next.requiredCompleted = 0;
  next.validResponses = 0;
  next.savedWorkSec = 0;
  next.runRevision += 1;
  delete next.lockedAtSec;
  delete next.statsAtSec;
  delete next.revealedAtSec;
  delete next.lockReason;
  return next;
};

const resolveNonBlockingRequired = (run: QuestionRun, studentId: string, nowSec: number,
  reason: NonNullable<QuestionRun['lockReason']>, invalidError: string): QuestionRun => {
  if (run.phase !== 'QUESTION_OPEN' || !run.completionRequiredSet.includes(studentId)) {
    throw new Error(invalidError);
  }
  if (run.nonBlockingRequiredSet.includes(studentId)) return run;
  const nonBlockingRequiredSet = [...new Set([...run.nonBlockingRequiredSet, studentId])].sort();
  const next = { ...run, nonBlockingRequiredSet, runRevision: run.runRevision + 1 };
  const blocking = next.completionRequiredSet.filter(id => !nonBlockingRequiredSet.includes(id));
  return blocking.length > 0 && blocking.every(id => next.responseSet.includes(id))
    ? lockQuestion(next, nowSec, reason) : next;
};

export const resolveDisconnectedBlocker = (run: QuestionRun, studentId: string, nowSec: number): QuestionRun =>
  resolveNonBlockingRequired(run, studentId, nowSec, 'DISCONNECT_GRACE', 'QUESTION_DISCONNECT_OVERRIDE_INVALID');

export const resolveConfirmedAbsence = (run: QuestionRun, studentId: string, nowSec: number,
  reason: 'CONFIRMED_ABSENCE' | 'CONFIRMED_LEFT' = 'CONFIRMED_ABSENCE'): QuestionRun =>
  resolveNonBlockingRequired(run, studentId, nowSec, reason, 'QUESTION_ABSENCE_OVERRIDE_INVALID');

export const submitQuestionResponse = (run: QuestionRun, studentId: string, submittedAtSec: number, value = ''): QuestionRun => {
  if (!studentId || !Number.isFinite(submittedAtSec)) throw new Error('QUESTION_RESPONSE_INVALID');
  const current = reconcileQuestion(run, submittedAtSec);
  if (current.pausedAtSec !== undefined) throw new Error('QUESTION_PAUSED');
  if (current.phase !== 'QUESTION_OPEN') throw new Error('QUESTION_LOCKED');
  const responseSet = [...new Set([...current.responseSet, studentId])].sort();
  const requiredCompleted = current.completionRequiredSet.filter(id => responseSet.includes(id)).length;
  const next: QuestionRun = {
    ...current,
    responseSet,
    responseValueByStudent: { ...current.responseValueByStudent, [studentId]: value },
    responseRevisionByStudent: {
      ...current.responseRevisionByStudent,
      [studentId]: (current.responseRevisionByStudent[studentId] ?? 0) + 1,
    },
    requiredCompleted,
    validResponses: responseSet.length,
    runRevision: current.runRevision + 1,
  };
  const blocking = next.completionRequiredSet.filter(id => !next.nonBlockingRequiredSet.includes(id));
  return blocking.length > 0 && blocking.every(id => responseSet.includes(id))
    ? lockQuestion(next, submittedAtSec, 'ALL_REQUIRED_SUBMITTED') : next;
};

export const reconcileQuestion = (run: QuestionRun, nowSec: number): QuestionRun => {
  if (!Number.isFinite(nowSec)) throw new Error('QUESTION_CLOCK_INVALID');
  if (run.pausedAtSec !== undefined) return run;
  if (run.phase === 'QUESTION_OPEN' && nowSec >= run.deadlineAtSec) {
    return lockQuestion(run, run.deadlineAtSec, 'TIMER_EXPIRED');
  }
  if (run.phase === 'STATS' && run.revealPolicy === 'show_after_submit'
    && nowSec >= (run.statsAtSec ?? nowSec) + 3) {
    return { ...run, phase: 'REVEAL', revealedAtSec: nowSec, runRevision: run.runRevision + 1 };
  }
  return run;
};
