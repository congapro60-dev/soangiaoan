import { readFileSync } from 'node:fs';

for (const f of [
  'src/data/liveLessonPackages/banToan-w5-w6.snapshot.json',
  'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json',
]) {
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const label = f.includes('batch2') ? 'batch2' : 'MAIN   ';
  for (const [k, e] of Object.entries(j.aiErrors)) {
    const ws = e.wrongSolution.includes('$');
    const co = e.correction.includes('$');
    const pr = (e.proof || '').includes('$');
    const tp = (e.teacherPrompt || '').includes('$');
    console.log(`${label} ${k}  wrongSolution:$${ws ? 'YES' : 'no'}  correction:$${co ? 'YES' : 'no'}  proof:$${pr ? 'YES' : 'no'}  teacherPrompt:$${tp ? 'YES' : 'no'}`);
  }
}
