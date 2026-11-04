import { execSync } from 'child_process';

function run(cmd) {
  console.log(`> ${cmd}`);
  const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (out.trim()) console.log(out.trim());
}

try {
  run('git add PENDING.md tasks/giaoan-goc-10-12-88.md tasks/gate-d-10-12-88.md');
  run('git commit -m "feat(gate-d): add Gate D spec and lesson plan for G10 Week 12 Period 88 (Quartiles & Mode)"');
  run('git push origin feat/nop-bai-da-cham');
  run('git push origin feat/nop-bai-da-cham:main');
  console.log('SYNC GATE D SUCCESS');
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
