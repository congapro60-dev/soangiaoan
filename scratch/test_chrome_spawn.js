import { spawn } from 'child_process';
import path from 'path';

const port = 9222;
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(process.cwd(), 'bot_profile');

console.log('Spawning Chrome...');
const proc = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  '--no-first-run',
  '--no-default-browser-check'
], { stdio: 'pipe' });

proc.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

proc.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

proc.on('error', (err) => {
  console.error('SPAWN ERROR:', err);
});

setTimeout(() => {
  console.log('Process exitCode after 5s:', proc.exitCode);
  proc.kill();
  process.exit(0);
}, 5000);
