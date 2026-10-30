import { execSync } from 'child_process';

try {
  console.log('Adding resolved HANDOFF.md and PENDING.md...');
  execSync('git add HANDOFF.md PENDING.md', { encoding: 'utf8' });

  console.log('Committing merge/docs update...');
  const outCommit = execSync('git commit -m "docs: sync HANDOFF and PENDING for ASS-MDP-01 Phase B"', { encoding: 'utf8' });
  console.log('COMMIT DOCS OK:\n', outCommit);

  console.log('Pushing to feat/nop-bai-da-cham...');
  const outPushFeat = execSync('git push origin feat/nop-bai-da-cham', { encoding: 'utf8' });
  console.log('PUSH FEAT OK:\n', outPushFeat);

  console.log('Pushing to main...');
  const outPushMain = execSync('git push origin feat/nop-bai-da-cham:main', { encoding: 'utf8' });
  console.log('PUSH MAIN OK:\n', outPushMain);
} catch (err) {
  console.error('ERROR:', err.stdout || '', err.stderr || '', err.message);
  process.exit(1);
}
