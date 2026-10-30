import { execSync } from 'child_process';

try {
  console.log('> git add -A');
  execSync('git add -A', { stdio: 'inherit' });

  console.log('> git commit');
  const commit = execSync('git commit -m "feat(w12): register 10-12-88 in W11BATCH2 catalog and pulse cues"', { encoding: 'utf8' });
  console.log(commit.trim());

  console.log('> git push origin feat/nop-bai-da-cham');
  execSync('git push origin feat/nop-bai-da-cham', { stdio: 'inherit' });

  console.log('> git push origin feat/nop-bai-da-cham:main --force-with-lease');
  execSync('git push origin feat/nop-bai-da-cham:main --force-with-lease', { stdio: 'inherit' });

  console.log('SYNC SUCCESS');
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
