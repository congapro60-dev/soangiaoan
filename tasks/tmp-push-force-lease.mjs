import { execSync } from 'child_process';

try {
  console.log('Pushing feat with force-with-lease (since we rebased on main)...');
  const outPushFeat = execSync('git push origin feat/nop-bai-da-cham --force-with-lease', { encoding: 'utf8' });
  console.log('PUSH FEAT OK:\n', outPushFeat);

  console.log('Pushing main...');
  const outPushMain = execSync('git push origin feat/nop-bai-da-cham:main', { encoding: 'utf8' });
  console.log('PUSH MAIN OK:\n', outPushMain);
} catch (err) {
  console.error('ERROR:', err.stdout || '', err.stderr || '', err.message);
  process.exit(1);
}
