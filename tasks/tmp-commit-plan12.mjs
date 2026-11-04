import { execSync } from 'child_process';

function run(cmd) {
  console.log(`> ${cmd}`);
  const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (out.trim()) console.log(out.trim());
}

try {
  run('git add HANDOFF.md tasks/ke-hoach-ppct-tuan12.md');
  run('git commit -m "docs: save PPCT transition plan from Week 11 to Week 12"');
  run('git push origin feat/nop-bai-da-cham');
  run('git push origin feat/nop-bai-da-cham:main');
  console.log('SYNC SUCCESS');
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
