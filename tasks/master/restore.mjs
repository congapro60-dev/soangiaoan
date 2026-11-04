import { execSync } from 'node:child_process';
const files = [
  'src/data/liveLessonPackages/banToan-w5-w6.snapshot.json',
  'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json',
];
execSync(`git checkout -- ${files.join(' ')}`, { stdio: 'inherit' });
console.log('restored from HEAD');
