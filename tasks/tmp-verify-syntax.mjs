import { execSync } from 'child_process';

function run(cmd) {
  console.log(`> ${cmd}`);
  const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (out.trim()) console.log(out.trim());
}

try {
  run('npx tsc --noEmit src/lib/liveLesson/v4/lessonAdapter.ts');
  console.log('TYPE CHECK PASSED');
} catch (e) {
  console.error('TYPE ERROR:', e.message);
  if (e.stdout) console.log('STDOUT:', e.stdout);
  if (e.stderr) console.error('STDERR:', e.stderr);
  process.exit(1);
}
