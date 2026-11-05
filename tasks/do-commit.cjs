const { execSync } = require('child_process');

try {
  execSync('git add -A', { stdio: 'inherit' });
  const msg = 'feat: hoan tat 24 bai Tuan 18 chuan V8.8 ket thuc HK1 (tong 218 bai)';
  const commitOut = execSync(`git commit -m "${msg}"`, { encoding: 'utf8' });
  console.log('Commit output:\n', commitOut);

  console.log('Pushing to feat/nop-bai-da-cham...');
  const pushFeat = execSync('git push origin feat/nop-bai-da-cham', { encoding: 'utf8' });
  console.log('Push feat output:\n', pushFeat);

  console.log('Pushing to main...');
  const pushMain = execSync('git push origin feat/nop-bai-da-cham:main', { encoding: 'utf8' });
  console.log('Push main output:\n', pushMain);
} catch (e) {
  console.error('Error during commit/push:', e.message);
  process.exit(1);
}
