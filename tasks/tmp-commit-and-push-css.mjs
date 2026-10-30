import { execSync } from 'child_process';

function run(cmd) {
  console.log(`> ${cmd}`);
  const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (out.trim()) console.log(out.trim());
}

try {
  run('git add src/components/liveLesson/liveClassroom.css');
  run('git commit -m "fix(liveLesson): complete ASS-MDP-01 CSS classes for MathFigureZoom and student paper photo"');
  console.log('Pushing to feat/nop-bai-da-cham...');
  run('git push origin feat/nop-bai-da-cham');
  console.log('Pushing to main...');
  run('git push origin feat/nop-bai-da-cham:main');
  console.log('SUCCESS');
} catch (e) {
  console.error('ERROR:', e.message);
  if (e.stdout) console.log('STDOUT:', e.stdout);
  if (e.stderr) console.error('STDERR:', e.stderr);
  process.exit(1);
}
