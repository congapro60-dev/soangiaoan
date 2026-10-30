import { readFileSync } from 'node:fs';
const t = readFileSync('src/components/liveLesson/StudentLiveView.tsx', 'utf8');
const classes = [...new Set((t.match(/className="([^"]+)"/g) || []).map((s) => s.slice(11, -1)))];
console.log('== classes trong StudentLiveView ==');
console.log(classes.join('\n'));
const html = readFileSync('index.html', 'utf8');
const m = html.match(/<meta name="viewport"[^>]*>/);
console.log('viewport meta:', m ? m[0] : '(KHONG CO)');
