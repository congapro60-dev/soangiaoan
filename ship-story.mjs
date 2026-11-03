import { execSync } from 'node:child_process';
console.log(execSync('git add -A', { encoding: 'utf8' }));
console.log(execSync('git commit -m "feat(content): HKI stats concepts linked to Bai 14 stock dataset with visuals, dedup retry in makeTask"', { encoding: 'utf8' }));
console.log(execSync('git push origin codex/universal-content-release', { encoding: 'utf8' }));
console.log('PUSHED');
