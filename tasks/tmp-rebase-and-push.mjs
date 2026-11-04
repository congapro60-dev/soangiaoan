import { execSync } from 'child_process';

try {
  console.log('Stashing unstaged changes...');
  execSync('git stash push -m "pending and handoff docs"', { encoding: 'utf8' });

  console.log('Rebasing onto origin/main...');
  const outRebase = execSync('git rebase origin/main', { encoding: 'utf8' });
  console.log('REBASE OK:\n', outRebase);

  console.log('Popping stash...');
  execSync('git stash pop', { encoding: 'utf8' });

  console.log('Adding docs to commit or stage...');
  execSync('git add HANDOFF.md PENDING.md', { encoding: 'utf8' });
  execSync('git commit -m "docs: update HANDOFF and PENDING for ASS-MDP-01 Phase B"', { encoding: 'utf8' });

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
