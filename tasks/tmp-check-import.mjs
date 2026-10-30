import { readFileSync } from 'node:fs';
const t = readFileSync('src/components/liveLesson/StudentLiveView.tsx', 'utf8');
const hasImport = t.includes('MathFigureZoom');
const lines = t.split('\n');
console.log('import MathFigureZoom?', hasImport && lines.findIndex((l) => l.includes("from './MathFigureZoom'")) >= 0);
lines.slice(0, 16).forEach((l, i) => console.log((i + 1) + ': ' + l));
