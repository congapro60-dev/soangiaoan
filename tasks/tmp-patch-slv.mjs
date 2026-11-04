import { readFileSync, writeFileSync } from 'node:fs';

// 1) StudentLiveView: import + slot ask-bar + pulseActive
const p = 'src/components/liveLesson/StudentLiveView.tsx';
let t = readFileSync(p, 'utf8');
const importAnchor = "import { subscribeToLiveGroupProgress, subscribeToMyLiveGroup, type LiveGroupProgress } from '../../services/liveActivityService';";
if (!t.includes(importAnchor)) throw new Error('import anchor missing');
t = t.split(importAnchor).join(importAnchor + `
import { StudentAskBar } from './StudentAskBar';
import { UnderstandingPulse } from './UnderstandingPulse';
import { pulseCuesFor } from '../../services/liveQuestionService';`);

// computed pulseActive cạnh isGroupActivity
const ga = "  const isGroupActivity = publicState.cueId === 'P20' || publicState.cueId === 'P22' || step?.id === 'cp-group-product';";
if (!t.includes(ga)) throw new Error('group anchor missing');
t = t.split(ga).join(ga + `
  const pulseActive = pulseCuesFor(definitionKey).includes(publicState.cueId);`);

// slot chèn sau slot language (trước notices)
const slotAnchor = '      <div className="student-slot" data-slot="notices">';
if (!t.includes(slotAnchor)) throw new Error('slot anchor missing');
const slot = `      <div className="student-slot" data-slot="ask-bar">
        {participantUid && student && <StudentAskBar sessionId={sessionId} participantUid={participantUid} classId={student.classId} studentName={student.studentName} activityId={definitionKey} />}
        {participantUid && student && pulseActive && <UnderstandingPulse sessionId={sessionId} participantUid={participantUid} classId={student.classId} cueId={publicState.cueId} />}
      </div>
` + slotAnchor;
t = t.split(slotAnchor).join(slot);
writeFileSync(p, t, 'utf8');
console.log('StudentLiveView patched');
