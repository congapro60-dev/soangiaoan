const { execSync } = require('child_process');
const fs = require('fs');
if (fs.existsSync('commit_and_push.cjs')) fs.unlinkSync('commit_and_push.cjs');
if (fs.existsSync('clean_push.cjs')) fs.unlinkSync('clean_push.cjs');
execSync('git add -A', { stdio: 'inherit' });
try {
  execSync('git commit -m "chore: cleanup temporary scripts"', { stdio: 'inherit' });
  execSync('git push origin feat/nop-bai-da-cham', { stdio: 'inherit' });
  execSync('git push origin feat/nop-bai-da-cham:main', { stdio: 'inherit' });
} catch (e) {
  console.log('No extra commit needed or done');
}
