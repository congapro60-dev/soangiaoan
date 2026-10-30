import { execSync } from 'child_process';

try {
  console.log('Fetching origin...');
  execSync('git fetch origin main', { encoding: 'utf8' });

  console.log('Log compare:');
  const log = execSync('git log --oneline -5 origin/main', { encoding: 'utf8' });
  console.log('origin/main:\n', log);

  const localLog = execSync('git log --oneline -5 HEAD', { encoding: 'utf8' });
  console.log('HEAD:\n', localLog);
} catch (err) {
  console.error('ERROR:', err);
}
