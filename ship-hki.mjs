import { execSync } from 'node:child_process';
console.log(execSync('git add -A', { encoding: 'utf8' }));
console.log(execSync('git commit -m "feat(content): HKI 3-4 tier data-anchored hints for all branches (G11+G12), matching HKII V88 standard"', { encoding: 'utf8' }));
console.log(execSync('git push origin codex/universal-content-release', { encoding: 'utf8' }));
console.log('PUSHED');
