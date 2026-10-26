import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./check-deployment-source.mjs', import.meta.url));
const check = (extra) => spawnSync(process.execPath, [script], {
  encoding: 'utf8',
  env: {
    ...process.env,
    VERCEL_ENV: '',
    VERCEL_GIT_PROVIDER: '',
    VERCEL_GIT_COMMIT_REF: '',
    VERCEL_GIT_COMMIT_SHA: '',
    ...extra,
  },
});

const sha = 'a'.repeat(40);
assert.equal(check({}).status, 0, 'local build');
assert.equal(check({ VERCEL_ENV: 'preview' }).status, 0, 'preview build');
assert.equal(check({ VERCEL_ENV: 'production', VERCEL_GIT_PROVIDER: 'github', VERCEL_GIT_COMMIT_REF: 'main', VERCEL_GIT_COMMIT_SHA: sha }).status, 0, 'GitHub main production build');
for (const extra of [
  {},
  { VERCEL_GIT_PROVIDER: 'github', VERCEL_GIT_COMMIT_REF: 'main' },
  { VERCEL_GIT_PROVIDER: 'github', VERCEL_GIT_COMMIT_REF: 'feature', VERCEL_GIT_COMMIT_SHA: sha },
  { VERCEL_GIT_PROVIDER: 'github', VERCEL_GIT_COMMIT_REF: 'main', VERCEL_GIT_COMMIT_SHA: 'bad' },
  { VERCEL_GIT_PROVIDER: 'gitlab', VERCEL_GIT_COMMIT_REF: 'main', VERCEL_GIT_COMMIT_SHA: sha },
]) {
  assert.notEqual(check({ VERCEL_ENV: 'production', ...extra }).status, 0, JSON.stringify(extra));
}
console.log('deployment source checks passed');
