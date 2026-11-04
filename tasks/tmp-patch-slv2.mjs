import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/components/liveLesson/StudentLiveView.tsx';
let t = readFileSync(p, 'utf8');
const anchor = "import { pulseCuesFor } from '../../services/liveQuestionService';";
if (!t.includes(anchor)) throw new Error('anchor missing');
t = t.split(anchor).join(anchor + `
import { StudentPublishedQuestion } from './StudentPublishedQuestion';`);
const slotAnchor = '      <div className="student-slot" data-slot="notices">';
if (!t.includes(slotAnchor)) throw new Error('slot missing');
t = t.split(slotAnchor).join(`      <div className="student-slot" data-slot="published-question">
        <StudentPublishedQuestion sessionId={sessionId} />
      </div>
` + slotAnchor);
writeFileSync(p, t, 'utf8');
console.log('patched');
