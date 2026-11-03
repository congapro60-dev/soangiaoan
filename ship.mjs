import { execSync } from 'node:child_process';
console.log(execSync('git add -A', { encoding: 'utf8' }));
console.log(execSync('git commit -m "feat(content): storyline linked to interactive lesson Bai 14, 3-4 tier data-anchored hints, stats dataset visuals, glue fixes"', { encoding: 'utf8' }));
console.log(execSync('git push origin codex/universal-content-release', { encoding: 'utf8' }));
console.log('PUSHED');
