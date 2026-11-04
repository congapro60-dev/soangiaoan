import { describe, expect, it } from 'vitest';
import { createPresenceLedger, claimStudent, reconcileDisconnected } from './presence';
import { openQuestion, submitQuestionResponse } from './questionState';
import { summarizeCoachPresence } from './coachPresence';

describe('V8.4 private Coach cohort summary', () => {
  it('separates late non-required responses from disconnected required blockers', () => {
    let ledger = createPresenceLedger([{ studentId: 'one', name: 'An' },
      { studentId: 'two', name: 'Bình' }, { studentId: 'late', name: 'Chi' }]);
    ledger = claimStudent(ledger, 'one', 'uid-one', 'device-one', 100, false);
    ledger = claimStudent(ledger, 'two', 'uid-two', 'device-two', 100, false);
    ledger = claimStudent(ledger, 'late', 'uid-late', 'device-late', 101, true);
    ledger = reconcileDisconnected({ ...ledger, two: { ...ledger.two, lastSeenAt: 100 } }, 120, 15);
    let run = openQuestion({ instanceId: 'Q1@A1', activityId: 'A1', requiredStudentIds: ['one', 'two'],
      openedAtSec: 101, workBudgetSec: 90, revealPolicy: 'teacher_manual' });
    run = submitQuestionResponse(run, 'one', 105, 'A');
    run = submitQuestionResponse(run, 'late', 106, 'A');
    expect(summarizeCoachPresence(run, ledger)).toEqual({
      requiredTotal: 2, requiredCompleted: 1, validResponses: 2, outsideRequiredResponses: 1,
      disconnectedBlockingNames: ['Bình'], resolvedDisconnectedNames: [], resolvedAbsenceNames: [],
    });
    const resolved = { ...run, nonBlockingRequiredSet: ['two'] };
    expect(summarizeCoachPresence(resolved, ledger).resolvedDisconnectedNames).toEqual(['Bình']);
    expect(summarizeCoachPresence(resolved, ledger).disconnectedBlockingNames).toEqual([]);
    expect(summarizeCoachPresence(resolved, ledger).resolvedAbsenceNames).toEqual([]);
    const absent = { ...ledger, two: { ...ledger.two, attendance: 'ABSENT_CONFIRMED' as const, online: 'OFFLINE' as const } };
    expect(summarizeCoachPresence(resolved, absent).resolvedAbsenceNames).toEqual(['Bình']);
  });
});
