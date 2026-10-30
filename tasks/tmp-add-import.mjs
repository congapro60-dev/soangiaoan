import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/components/liveLesson/StudentLiveView.tsx';
let t = readFileSync(p, 'utf8');
const anchor = "import { StudentPublishedQuestion } from './StudentPublishedQuestion';";
if (!t.includes(anchor)) throw new Error('missing');
t = t.split(anchor).join(anchor + "\nimport { MathFigureZoom } from './MathFigureZoom';");
writeFileSync(p, t, 'utf8');
console.log('import added:', t.includes("from './MathFigureZoom'"));
