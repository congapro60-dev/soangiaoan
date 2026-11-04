import { execSync } from 'node:child_process';
import fs from 'node:fs';

const files = [
  'src/data/liveLessonPackages/banToan-w5-w6.snapshot.json',
  'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json',
];
for (const f of fs.readdirSync('tasks/master')) if (f.endsWith('.mjs')) files.push(`tasks/master/${f}`);

const keys = ['10-12-88', '11-12-82', '10-5-31', '10-5-32', '10-5-33', '10-5-34', '10-5-35', '10-5-36', '10-5-37', '10-5-38', '10-6-39', '10-6-40', '10-6-41', '10-6-42', '10-6-43', '10-6-44', '10-6-45', '10-6-46'];
for (const k of keys) {
  files.push(`tasks/gate-d-${k}.md`);
  const giaoan = `tasks/giaoan-goc-${k}.md`;
  if (fs.existsSync(giaoan)) files.push(giaoan);
}

execSync(`git add ${files.join(' ')}`, { stdio: 'inherit' });
const msg = process.argv[2] || 'feat(liveLesson): nang cap 18 bai Kh10 tuan 5-6 va Kh10/11 tuan 12 chuan V8.8 Master Teacher';
console.log(execSync(`git commit -m "${msg}"`, { encoding: 'utf8' }).trim());
execSync('git push origin feat/nop-bai-da-cham', { stdio: 'inherit' });
execSync('git push origin feat/nop-bai-da-cham:main --force-with-lease', { stdio: 'inherit' });
console.log('PUSHED');
