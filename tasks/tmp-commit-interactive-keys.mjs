import { execSync } from 'child_process';

try {
  console.log('> git add src/lib/liveLesson/v4/sequentialPublication.ts src/lib/liveLesson/v4/interactiveUpgrade.test.ts src/lib/liveLesson/v4/week11Catalog.test.ts');
  execSync('git add src/lib/liveLesson/v4/sequentialPublication.ts src/lib/liveLesson/v4/interactiveUpgrade.test.ts src/lib/liveLesson/v4/week11Catalog.test.ts', { stdio: 'inherit' });

  console.log('> git commit');
  const commit = execSync('git commit -m "feat(w12): add 10-12-88 to INTERACTIVE_SOURCE_KEYS for V8.8 interactive lesson publishing"', { encoding: 'utf8' });
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
