import { execSync } from 'child_process';

try {
  const commitOut = execSync('git commit -m "feat(w12-g10): add snapshot spec, AI error, and timeline gateD101288 for Period 88 (Quartiles & Mode)"', { encoding: 'utf8' });
  console.log('COMMIT OUT:', commitOut);
  
  const push1 = execSync('git push origin feat/nop-bai-da-cham', { encoding: 'utf8' });
  console.log('PUSH FEAT OUT:', push1);
  
  const push2 = execSync('git push origin feat/nop-bai-da-cham:main', { encoding: 'utf8' });
  console.log('PUSH MAIN OUT:', push2);
  
  console.log('ALL PUSH SUCCESS');
} catch (e) {
  console.error('ERROR:', e.message);
  if (e.stdout) console.log('STDOUT:', e.stdout);
  if (e.stderr) console.error('STDERR:', e.stderr);
  process.exit(1);
}
