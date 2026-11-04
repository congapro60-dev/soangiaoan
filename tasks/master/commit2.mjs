import { execSync } from 'node:child_process';
import fs from 'node:fs';

const files = [
  'src/data/liveLessonPackages/banToan-w5-w6.snapshot.json',
  'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json',
];
for (const f of fs.readdirSync('tasks/master')) if (f.endsWith('.mjs')) files.push(`tasks/master/${f}`);

const keys = process.argv.slice(2);
for (const k of keys) {
  files.push(`tasks/gate-d-${k}.md`);
  const g = `tasks/giaoan-goc-${k}.md`;
  if (fs.existsSync(g)) files.push(g);
}

execSync(`git add ${files.join(' ')}`, { stdio: 'inherit' });
const msg = `feat(liveLesson): nang cap ${keys.length} bai ${keys[0]}..${keys[keys.length - 1]} chuan V8.8 Master Teacher`;
console.log(execSync(`git commit -m "${msg}"`, { encoding: 'utf8' }).trim());
execSync('git push origin feat/nop-bai-da-cham', { stdio: 'inherit' });
execSync('git push origin feat/nop-bai-da-cham:main --force-with-lease', { stdio: 'inherit' });
console.log('PUSHED');
