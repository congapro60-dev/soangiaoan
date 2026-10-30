import { execSync } from 'child_process';

function run(cmd) {
  console.log(`> ${cmd}`);
  const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (out.trim()) console.log(out.trim());
}

try {
  run('npm --prefix "C:\\Users\\ADMIN\\Downloads\\smart-lesson-plan-ai" test src/components/liveLesson/MathFigureZoom.test.ts');
  console.log('UNIT TEST PASSED');
} catch (e) {
  console.error('ERROR:', e.message);
  if (e.stdout) console.log('STDOUT:', e.stdout);
  if (e.stderr) console.error('STDERR:', e.stderr);
  process.exit(1);
}
