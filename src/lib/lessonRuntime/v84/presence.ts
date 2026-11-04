export interface RosterMember { studentId: string; name: string }
export type Attendance = 'UNCONFIRMED' | 'PRESENT' | 'LATE_JOINED' | 'ABSENT_CONFIRMED' | 'LATE_EXPECTED' | 'LEFT_CONFIRMED';
export type Online = 'OFFLINE' | 'ACTIVE' | 'DISCONNECTED';
export interface PresenceRecord extends RosterMember {
  attendance: Attendance;
  online: Online;
  claimUid?: string;
  deviceTokenHash?: string;
  joinedAt?: number;
  lastSeenAt?: number;
  graceUntil?: number;
  leaveRequestedAt?: number;
}
export type PresenceLedger = Record<string, PresenceRecord>;

const member = (ledger: PresenceLedger, studentId: string): PresenceRecord => {
  const record = ledger[studentId];
  if (!record) throw new Error('STUDENT_NOT_IN_ROSTER');
  return record;
};

export const createPresenceLedger = (roster: readonly RosterMember[]): PresenceLedger => {
  const ledger: PresenceLedger = Object.create(null) as PresenceLedger;
  for (const student of roster) {
    if (!student.studentId || !student.name.trim() || ledger[student.studentId]) throw new Error('ROSTER_INVALID');
    ledger[student.studentId] = { studentId: student.studentId, name: student.name, attendance: 'UNCONFIRMED', online: 'OFFLINE' };
  }
  return ledger;
};

export const claimStudent = (
  ledger: PresenceLedger, studentId: string, uid: string, tokenHash: string, now: number, lessonStarted: boolean,
): PresenceLedger => {
  const current = member(ledger, studentId);
  if (!uid || !tokenHash) throw new Error('CLAIM_IDENTITY_REQUIRED');
  if (current.attendance === 'ABSENT_CONFIRMED' || current.attendance === 'LEFT_CONFIRMED') throw new Error('ATTENDANCE_BLOCKS_CLAIM');
  if (current.claimUid && (current.claimUid !== uid || current.deviceTokenHash !== tokenHash)) throw new Error('DUPLICATE_CLAIM');
  const attendance: Attendance = current.attendance === 'PRESENT' || current.attendance === 'LATE_JOINED'
    ? current.attendance : lessonStarted ? 'LATE_JOINED' : 'PRESENT';
  return {
    ...ledger,
    [studentId]: {
      ...current, attendance, online: 'ACTIVE', claimUid: uid, deviceTokenHash: tokenHash,
      joinedAt: current.joinedAt ?? now, lastSeenAt: now, graceUntil: undefined, leaveRequestedAt: undefined,
    },
  };
};

export const markAttendance = (ledger: PresenceLedger, studentId: string, attendance: Attendance, _now: number): PresenceLedger => {
  const current = member(ledger, studentId);
  if (attendance === 'LATE_JOINED') throw new Error('LATE_JOIN_REQUIRES_CLAIM');
  const revoke = attendance === 'ABSENT_CONFIRMED' || attendance === 'LEFT_CONFIRMED';
  return {
    ...ledger,
    [studentId]: {
      ...current, attendance, online: revoke ? 'OFFLINE' : current.online,
      ...(revoke ? { claimUid: undefined, deviceTokenHash: undefined, graceUntil: undefined, leaveRequestedAt: undefined } : {}),
    },
  };
};

export const recordHeartbeat = (
  ledger: PresenceLedger, studentId: string, uid: string, tokenHash: string, now: number,
): PresenceLedger => {
  const current = member(ledger, studentId);
  if (!current.claimUid || current.claimUid !== uid || current.deviceTokenHash !== tokenHash) throw new Error('CLAIM_MISMATCH');
  if (current.leaveRequestedAt !== undefined) throw new Error('LEAVE_PENDING');
  if (current.attendance === 'ABSENT_CONFIRMED' || current.attendance === 'LEFT_CONFIRMED') throw new Error('ATTENDANCE_BLOCKS_CLAIM');
  return { ...ledger, [studentId]: { ...current, online: 'ACTIVE', lastSeenAt: now, graceUntil: undefined } };
};

export const reconcileDisconnected = (ledger: PresenceLedger, now: number, graceSec: number): PresenceLedger => {
  if (!Number.isFinite(graceSec) || graceSec < 0) throw new Error('GRACE_INVALID');
  let next: PresenceLedger | null = null;
  for (const [studentId, current] of Object.entries(ledger)) {
    if (current.online === 'ACTIVE' && current.lastSeenAt !== undefined && now - current.lastSeenAt > graceSec) {
      next ??= { ...ledger };
      next[studentId] = { ...current, online: 'DISCONNECTED', graceUntil: now + graceSec };
    }
  }
  return next ?? ledger;
};

export const snapshotCompletionRequiredSet = (ledger: PresenceLedger, now: number): string[] => Object.values(ledger)
  .filter(record => (record.attendance === 'PRESENT' || record.attendance === 'LATE_JOINED')
    && Boolean(record.claimUid)
    && (record.online === 'ACTIVE' || (record.online === 'DISCONNECTED' && (record.graceUntil ?? 0) >= now)))
  .map(record => record.studentId)
  .sort();

export const resetDeviceClaim = (ledger: PresenceLedger, studentId: string): PresenceLedger => {
  const current = member(ledger, studentId);
  return {
    ...ledger,
    [studentId]: { ...current, online: 'OFFLINE', claimUid: undefined, deviceTokenHash: undefined,
      graceUntil: undefined, leaveRequestedAt: undefined },
  };
};

export const requestLeave = (ledger: PresenceLedger, studentId: string, uid: string,
  tokenHash: string, now: number, graceSec: number): PresenceLedger => {
  const current = member(ledger, studentId);
  if (current.claimUid !== uid || current.deviceTokenHash !== tokenHash) throw new Error('CLAIM_MISMATCH');
  if (!Number.isFinite(now) || !Number.isFinite(graceSec) || graceSec < 0) throw new Error('LEAVE_TIME_INVALID');
  return { ...ledger, [studentId]: { ...current, online: 'DISCONNECTED', leaveRequestedAt: now,
    graceUntil: now + graceSec } };
};

export const transferDeviceClaim = (
  ledger: PresenceLedger, studentId: string, uid: string, tokenHash: string, now: number,
): PresenceLedger => {
  const current = member(ledger, studentId);
  if (!uid || !tokenHash || !current.claimUid) throw new Error('TRANSFER_INVALID');
  if (Object.values(ledger).some(record => record.studentId !== studentId && record.claimUid === uid)) {
    throw new Error('DEVICE_ALREADY_CLAIMED');
  }
  if (current.attendance === 'ABSENT_CONFIRMED' || current.attendance === 'LEFT_CONFIRMED') throw new Error('ATTENDANCE_BLOCKS_CLAIM');
  return {
    ...ledger,
    [studentId]: { ...current, claimUid: uid, deviceTokenHash: tokenHash, online: 'ACTIVE',
      lastSeenAt: now, graceUntil: undefined, leaveRequestedAt: undefined },
  };
};
