import type { PresenceLedger } from './presence';
import type { QuestionRun } from './questionState';

export const summarizeCoachPresence = (run: QuestionRun, ledger: PresenceLedger) => {
  const required = new Set(run.completionRequiredSet);
  const responded = new Set(run.responseSet);
  const nonBlocking = new Set(run.nonBlockingRequiredSet);
  const name = (studentId: string): string => ledger[studentId]?.name ?? 'Học sinh';
  return {
    requiredTotal: run.completionRequiredSet.length,
    requiredCompleted: run.requiredCompleted,
    validResponses: run.validResponses,
    outsideRequiredResponses: run.responseSet.filter(studentId => !required.has(studentId)).length,
    disconnectedBlockingNames: run.completionRequiredSet
      .filter(studentId => ledger[studentId]?.online === 'DISCONNECTED'
        && !responded.has(studentId) && !nonBlocking.has(studentId)).map(name),
    resolvedDisconnectedNames: run.nonBlockingRequiredSet
      .filter(studentId => ledger[studentId]?.online === 'DISCONNECTED').map(name),
    resolvedAbsenceNames: run.nonBlockingRequiredSet
      .filter(studentId => ['ABSENT_CONFIRMED', 'LEFT_CONFIRMED'].includes(ledger[studentId]?.attendance ?? '')).map(name),
  };
};
