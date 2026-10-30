import { execSync } from 'child_process';

const log = execSync('git log --oneline -5 HEAD', { encoding: 'utf8' });
console.log('CURRENT HEAD LOG:\n', log);
