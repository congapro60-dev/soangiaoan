const { execSync } = require('child_process');

function run(cmd) {
  console.log('> ' + cmd);
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    if (out.trim()) console.log(out.trim());
  } catch (err) {
    console.error('ERROR in cmd:', cmd);
    if (err.stdout) console.log('stdout:', err.stdout.toString());
    if (err.stderr) console.error('stderr:', err.stderr.toString());
    process.exit(1);
  }
}

run('git add -A');
run('git commit -m "feat(liveLesson): hoan tat 24 bai Tuan 14 nang tong so len 124 bai V8.8 Master Teacher"');
run('git push origin feat/nop-bai-da-cham');
run('git push origin feat/nop-bai-da-cham:main');
console.log('Push complete!');
