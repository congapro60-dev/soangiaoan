import { execSync } from 'node:child_process';
console.log(execSync('git add -A', { encoding: 'utf8' }));
console.log(execSync('git commit -m "fix(content): restore THPTQG pilot wiped by HKI rebuild; patch taskVisualOf into 5 test stubs; rebuild HKI catalogue"', { encoding: 'utf8' }));
console.log(execSync('git push origin codex/universal-content-release', { encoding: 'utf8' }));
console.log('PUSHED');
