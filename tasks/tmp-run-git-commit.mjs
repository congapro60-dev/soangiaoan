import { execSync } from 'child_process';

try {
  const commitMsg = 'feat(liveLesson): ASS-MDP-01 mobile parity, MathFigureZoom, and student paper photo uploader';
  console.log('Running git commit...');
  const outCommit = execSync(`git commit -m "${commitMsg}"`, { encoding: 'utf8' });
  console.log('COMMIT OK:\n', outCommit);

  console.log('Pushing to feat/nop-bai-da-cham...');
  const outPush1 = execSync('git push origin feat/nop-bai-da-cham', { encoding: 'utf8' });
  console.log('PUSH feat OK:\n', outPush1);

  console.log('Pushing to main...');
  const outPush2 = execSync('git push origin feat/nop-bai-da-cham:main', { encoding: 'utf8' });
  console.log('PUSH main OK:\n', outPush2);
} catch (err) {
  console.error('ERROR:', err.stdout || '', err.stderr || '', err.message);
  process.exit(1);
}
