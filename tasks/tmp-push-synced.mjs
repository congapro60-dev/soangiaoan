import { execSync } from 'child_process';

function run(cmd) {
  console.log(`> ${cmd}`);
  const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (out.trim()) console.log(out.trim());
}

try {
  console.log('Pushing feat/nop-bai-da-cham (with force lease since rebased)...');
  run('git push --force-with-lease origin feat/nop-bai-da-cham');
  console.log('Pushing to main (fast-forward)...');
  run('git push origin feat/nop-bai-da-cham:main');
  console.log('SYNC TO BOTH BRANCHES SUCCEEDED!');
} catch (e) {
  console.error('ERROR:', e.message);
  if (e.stdout) console.log('STDOUT:', e.stdout);
  if (e.stderr) console.error('STDERR:', e.stderr);
  process.exit(1);
}
