const { execSync } = require('child_process');
const cwd = 'C:\\Users\\ADMIN\\.codex\\worktrees\\universal-content-release';
const run = cmd => { const out = execSync(cmd, {cwd, encoding: 'utf8'}); if (out.trim()) console.log(out.trim()); };
try {
  run('git add -A');
  run('git commit -m "feat(game): add five new classroom games (speedway, bellring, bomb, farm, arena) with engine, boards, guides and tests"');
  run('git push origin codex/universal-content-release');
} catch (e) {
  console.error('ERROR:', e.message);
  if (e.stdout) console.log(e.stdout.toString());
  if (e.stderr) console.error(e.stderr.toString());
  process.exit(1);
}
