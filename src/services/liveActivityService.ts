import { collection, doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { aggregateLiveResponses, mergeLatestResponse, toPublicStats } from '../lib/liveLesson/aggregate';
import type { LiveResponse } from '../lib/liveLesson/types';

export const CLASS_GROUPS = Array.from({ length: 12 }, (_, i) => String(i + 1));
export interface GroupMembership { participantUid: string; groupNumber: string }
export interface LiveGroupProgress {
  cueId: string;
  stepId: string;
  members: Record<string, number>;
  submitted: Record<string, number>;
}
const path = (sessionId: string) => doc(db, 'liveLessonSessions', sessionId);

// Each student declares only the group number announced by the teacher.
// Membership stays private; only bounded numeric counts reach the public TV.
export const chooseLiveGroup = (sessionId: string, uid: string, groupNumber: string) => {
  if (!CLASS_GROUPS.includes(groupNumber)) throw new Error('Chọn nhóm từ 1 đến 12.');
  return setDoc(doc(path(sessionId), 'groupMemberships', uid), { groupNumber, updatedAt: serverTimestamp() });
};
export const subscribeToMyLiveGroup = (sessionId: string, uid: string, onValue: (group: string | null) => void, onError: (error: Error) => void) =>
  onSnapshot(doc(path(sessionId), 'groupMemberships', uid), snapshot => {
    if (snapshot.metadata.hasPendingWrites) return;
    const group = snapshot.data()?.groupNumber;
    onValue(typeof group === 'string' && CLASS_GROUPS.includes(group) ? group : null);
  }, onError);

export const subscribeToLiveGroupMemberships = (sessionId: string, onValue: (rows: GroupMembership[]) => void, onError: (error: Error) => void) =>
  onSnapshot(collection(path(sessionId), 'groupMemberships'), snapshot => {
    onValue(snapshot.docs.flatMap(row => {
      const groupNumber = row.data().groupNumber;
      return typeof groupNumber === 'string' && CLASS_GROUPS.includes(groupNumber)
        ? [{ participantUid: row.id, groupNumber }] : [];
    }));
  }, onError);

export const subscribeToLiveGroupProgress = (sessionId: string, onValue: (value: LiveGroupProgress | null) => void, onError: (error: Error) => void) =>
  onSnapshot(doc(path(sessionId), 'public', 'groupProgress'), snapshot => {
    const data = snapshot.data();
    if (!data || typeof data.cueId !== 'string' || typeof data.stepId !== 'string') { onValue(null); return; }
    const counts = (input: unknown): Record<string, number> => Object.fromEntries(CLASS_GROUPS.map(key => {
      const value = input && typeof input === 'object' ? (input as Record<string, unknown>)[key] : 0;
      return [key, typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0];
    }));
    onValue({ cueId: data.cueId, stepId: data.stepId, members: counts(data.members), submitted: counts(data.submitted) });
  }, onError);

export async function publishLiveActivity(sessionId: string, cueId: string, stepId: string, responses: LiveResponse[], memberships: GroupMembership[] | null) {
  const stats = toPublicStats(aggregateLiveResponses(responses, stepId));
  const selected = mergeLatestResponse(responses).filter(row => row.stepId === stepId && row.responseType !== 'hint');
  const responded = new Set(selected.map(row => row.participantUid));
  const members: Record<string, number> = {};
  const submitted: Record<string, number> = {};
  for (const row of memberships ?? []) {
    members[row.groupNumber] = (members[row.groupNumber] ?? 0) + 1;
    if (responded.has(row.participantUid)) submitted[row.groupNumber] = (submitted[row.groupNumber] ?? 0) + 1;
  }
  await runTransaction(db, async tx => {
    const session = (await tx.get(path(sessionId))).data();
    // A previous activity must not publish after the teacher has moved on or hidden results.
    if (!session || session.currentCueId !== cueId || !session.publicStatsEnabled
      || !session.publicStateEnabled || session.status === 'closed'
      || !session.allowedStepIds?.includes(stepId)) return;
    tx.set(doc(path(sessionId), 'public', 'stats'), { ...stats, updatedAt: serverTimestamp() });
    if (memberships !== null) tx.set(doc(path(sessionId), 'public', 'groupProgress'), {
      cueId, stepId, members, submitted, updatedAt: serverTimestamp(),
    });
  });
}
