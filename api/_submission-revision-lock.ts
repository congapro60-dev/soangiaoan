import { createHash } from 'node:crypto';

/** Shared by web and bot: reading even an absent lock serializes first submissions. */
export const submissionRevisionLockId = (classId: string, studentId: string, assignmentId: string): string =>
  createHash('sha256').update(`${classId}|${studentId}|${assignmentId}`).digest('hex');
