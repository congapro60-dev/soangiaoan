import { describe, expect, it } from 'vitest';
import {
  claimStudent, createPresenceLedger, markAttendance, recordHeartbeat,
  reconcileDisconnected, resetDeviceClaim, snapshotCompletionRequiredSet, transferDeviceClaim,
  requestLeave,
} from './presence';

const roster = [
  { studentId: 'one', name: 'An' },
  { studentId: 'two', name: 'Bình' },
  { studentId: 'three', name: 'Chi' },
];

describe('V8.4 class presence', () => {
  it('does not turn roster membership into attendance or a completion obligation', () => {
    const ledger = createPresenceLedger(roster);
    expect(ledger.one.attendance).toBe('UNCONFIRMED');
    expect(ledger.one.online).toBe('OFFLINE');
    expect(snapshotCompletionRequiredSet(ledger, 100)).toEqual([]);
  });

  it('snapshots active claimed participants and excludes confirmed absences', () => {
    let ledger = createPresenceLedger(roster);
    ledger = claimStudent(ledger, 'one', 'uid-one', 'device-one', 100, false);
    ledger = claimStudent(ledger, 'two', 'uid-two', 'device-two', 100, false);
    ledger = markAttendance(ledger, 'two', 'ABSENT_CONFIRMED', 105);
    expect(snapshotCompletionRequiredSet(ledger, 110)).toEqual(['one']);
    expect(ledger.two.online).toBe('OFFLINE');
  });

  it('accepts a late claim without mutating an already frozen question cohort', () => {
    let ledger = claimStudent(createPresenceLedger(roster), 'one', 'uid-one', 'device-one', 100, false);
    const currentQuestionCohort = snapshotCompletionRequiredSet(ledger, 110);
    ledger = claimStudent(ledger, 'two', 'uid-two', 'device-two', 120, true);
    expect(currentQuestionCohort).toEqual(['one']);
    expect(ledger.two.attendance).toBe('LATE_JOINED');
    expect(snapshotCompletionRequiredSet(ledger, 130)).toEqual(['one', 'two']);
  });

  it('rejects a second device claim while allowing same-device reconnect', () => {
    let ledger = claimStudent(createPresenceLedger(roster), 'one', 'uid-one', 'device-one', 100, false);
    expect(() => claimStudent(ledger, 'one', 'uid-other', 'device-other', 110, false)).toThrow('DUPLICATE_CLAIM');
    ledger = reconcileDisconnected(ledger, 140, 20);
    expect(ledger.one.online).toBe('DISCONNECTED');
    ledger = claimStudent(ledger, 'one', 'uid-one', 'device-one', 145, true);
    expect(ledger.one.online).toBe('ACTIVE');
    expect(ledger.one.attendance).toBe('PRESENT');
  });

  it('keeps a disconnected required participant during grace, then excludes them from a new cohort', () => {
    let ledger = claimStudent(createPresenceLedger(roster), 'one', 'uid-one', 'device-one', 100, false);
    ledger = recordHeartbeat(ledger, 'one', 'uid-one', 'device-one', 110);
    ledger = reconcileDisconnected(ledger, 140, 20);
    expect(snapshotCompletionRequiredSet(ledger, 145)).toEqual(['one']);
    expect(snapshotCompletionRequiredSet(ledger, 161)).toEqual([]);
  });

  it('does not report a presence change when every heartbeat is still fresh', () => {
    const ledger = claimStudent(createPresenceLedger(roster), 'one', 'uid-one', 'device-one', 100, false);
    expect(reconcileDisconnected(ledger, 105, 20)).toBe(ledger);
  });

  it('excludes a confirmed departure from future questions without erasing the prior cohort', () => {
    let ledger = claimStudent(createPresenceLedger(roster), 'one', 'uid-one', 'device-one', 100, false);
    const earlier = snapshotCompletionRequiredSet(ledger, 110);
    ledger = markAttendance(ledger, 'one', 'LEFT_CONFIRMED', 120);
    expect(earlier).toEqual(['one']);
    expect(snapshotCompletionRequiredSet(ledger, 130)).toEqual([]);
  });

  it('lets a teacher reset a stale claim without changing actual attendance to absent', () => {
    let ledger = claimStudent(createPresenceLedger(roster), 'one', 'uid-old', 'device-old', 100, false);
    ledger = resetDeviceClaim(ledger, 'one');
    expect(ledger.one.attendance).toBe('PRESENT');
    expect(ledger.one.online).toBe('OFFLINE');
    expect(snapshotCompletionRequiredSet(ledger, 120)).toEqual([]);
    ledger = claimStudent(ledger, 'one', 'uid-new', 'device-new', 125, true);
    expect(ledger.one.claimUid).toBe('uid-new');
  });

  it('transfers a claim only by explicit teacher action and rejects a UID claimed by another student', () => {
    let ledger = claimStudent(createPresenceLedger(roster), 'one', 'uid-one', 'device-one', 100, false);
    ledger = claimStudent(ledger, 'two', 'uid-two', 'device-two', 100, false);
    expect(() => transferDeviceClaim(ledger, 'one', 'uid-two', 'device-new', 120)).toThrow('DEVICE_ALREADY_CLAIMED');
    ledger = transferDeviceClaim(ledger, 'one', 'uid-new', 'device-new', 125);
    expect(ledger.one.claimUid).toBe('uid-new');
    expect(() => recordHeartbeat(ledger, 'one', 'uid-one', 'device-one', 130)).toThrow('CLAIM_MISMATCH');
  });

  it('records a student leave request without fabricating confirmed absence', () => {
    let ledger = claimStudent(createPresenceLedger(roster), 'one', 'uid-one', 'device-one', 100, false);
    ledger = requestLeave(ledger, 'one', 'uid-one', 'device-one', 110, 20);
    expect(ledger.one).toMatchObject({ attendance: 'PRESENT', online: 'DISCONNECTED',
      leaveRequestedAt: 110, graceUntil: 130 });
    expect(snapshotCompletionRequiredSet(ledger, 115)).toEqual(['one']);
    expect(snapshotCompletionRequiredSet(ledger, 131)).toEqual([]);
    expect(() => recordHeartbeat(ledger, 'one', 'uid-one', 'device-one', 115)).toThrow('LEAVE_PENDING');
    ledger = claimStudent(ledger, 'one', 'uid-one', 'device-one', 120, true);
    expect(ledger.one.online).toBe('ACTIVE');
    expect(ledger.one.leaveRequestedAt).toBeUndefined();
  });
});
