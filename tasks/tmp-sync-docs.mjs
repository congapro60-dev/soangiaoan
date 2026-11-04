import { execSync } from 'child_process';

function run(cmd) {
  console.log(`> ${cmd}`);
  const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (out.trim()) console.log(out.trim());
}

try {
  run('git add PENDING.md HANDOFF.md');
  run('git commit -m "docs: finalize PENDING and HANDOFF for COMM-AQ-01 and ASS-MDP-01"');
  run('git push origin feat/nop-bai-da-cham');
  run('git push origin feat/nop-bai-da-cham:main');
  console.log('DOCUMENTATION SYNC SUCCEEDED');
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
