import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/pages/LiveLessonPage.tsx';
let t = readFileSync(p, 'utf8');
const importAnchor = "import { TvSlowGroups } from '../components/liveLesson/TvSlowGroups';";
if (!t.includes(importAnchor)) throw new Error('import anchor missing');
t = t.split(importAnchor).join(importAnchor + `
import { TvQuestionsPanel } from '../components/liveLesson/TvQuestionsPanel';`);

const anchor = "      <TvSlowGroups sessionId={session.id} definition={definition} session={session} />";
if (!t.includes(anchor)) throw new Error('slowgroups anchor missing');
t = t.split(anchor).join(anchor + `
      <TvQuestionsPanel sessionId={session.id} sessionActive={session.status !== 'closed'} />`);
writeFileSync(p, t, 'utf8');
console.log('LiveLessonPage patched');
