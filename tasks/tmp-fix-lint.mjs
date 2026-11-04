import { readFileSync, writeFileSync } from 'node:fs';

// 1) UnderstandingPulse: bỏ prop onAskAnonymously (dùng window event)
const up = 'src/components/liveLesson/UnderstandingPulse.tsx';
let upT = readFileSync(up, 'utf8');
upT = upT.split(`export function UnderstandingPulse({ sessionId, participantUid, classId, cueId, onAskAnonymously }: {
  sessionId: string;
  participantUid: string;
  classId: string;
  cueId: string;
  onAskAnonymously: () => void;
}) {`).join(`export function UnderstandingPulse({ sessionId, participantUid, classId, cueId }: {
  sessionId: string;
  participantUid: string;
  classId: string;
  cueId: string;
}) {`);
upT = upT.split(`onAskAnonymously: onAskAnonymously,`).join(`onAskAnonymously: () => window.dispatchEvent(new Event('open-anon-question')),`);
upT = upT.split(`onClick={onAskAnonymously}`).join(`onClick={() => window.dispatchEvent(new Event('open-anon-question'))}`);
writeFileSync(up, upT, 'utf8');

// 2) liveQuestionService: rename biến doc trong readMyPulse (đụng import doc)
const sp = 'src/services/liveQuestionService.ts';
let s = readFileSync(sp, 'utf8');
s = s.split(`export const readMyPulse = async (sessionId: string, participantUid: string, cueId: string): Promise<PulseReport | null> => {
  const doc = await getDoc(doc(sessionRef(sessionId), 'pulses', pulseDocId(participantUid, cueId)));
  const value = doc.data()?.selfReport;`).join(`export const readMyPulse = async (sessionId: string, participantUid: string, cueId: string): Promise<PulseReport | null> => {
  const snapshot = await getDoc(doc(sessionRef(sessionId), 'pulses', pulseDocId(participantUid, cueId)));
  const value = snapshot.data()?.selfReport;`);
writeFileSync(sp, s, 'utf8');
console.log('fixed 2 files');
