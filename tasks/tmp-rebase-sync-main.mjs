import { execSync } from 'child_process';

function run(cmd) {
  console.log(`> ${cmd}`);
  const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (out.trim()) console.log(out.trim());
}

try {
  run('git fetch origin main');
  run('git rebase origin/main');
  run('git push --force-with-lease origin feat/nop-bai-da-cham');
  run('git push origin feat/nop-bai-da-cham:main');
  console.log('BOTH BRANCHES PERFECTLY SYNCED!');
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
