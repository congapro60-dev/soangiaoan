import { execSync } from 'node:child_process';

console.log('git add -A...');
execSync('git add -A', { stdio: 'inherit' });

console.log('git commit...');
execSync('git commit -m "fix(content): case-insensitive solidKey assignment and e2e matching across hk builders (69 g11-hkii tasks fixed)"', { stdio: 'inherit' });

console.log('git push...');
execSync('git push origin codex/universal-content-release', { stdio: 'inherit' });

console.log('Done!');
