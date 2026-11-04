import { execSync } from 'child_process';

try {
  console.log('> git fetch origin main');
  execSync('git fetch origin main', { stdio: 'inherit' });
  
  console.log('> git push origin feat/nop-bai-da-cham:main --force-with-lease');
  const out = execSync('git push origin feat/nop-bai-da-cham:main --force-with-lease', { encoding: 'utf8' });
  console.log('PUSH MAIN OUT:', out);
  console.log('SYNC TO BOTH BRANCHES COMPLETED');
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
