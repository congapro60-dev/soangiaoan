#!/usr/bin/env node

if (process.env.VERCEL_ENV !== 'production') process.exit(0);

const { VERCEL_GIT_PROVIDER, VERCEL_GIT_COMMIT_REF, VERCEL_GIT_COMMIT_SHA } = process.env;
if (VERCEL_GIT_PROVIDER !== 'github' || VERCEL_GIT_COMMIT_REF !== 'main' || !/^[0-9a-f]{40}$/i.test(VERCEL_GIT_COMMIT_SHA ?? '')) {
  console.error('Production build requires GitHub main commit metadata (VERCEL_GIT_PROVIDER, VERCEL_GIT_COMMIT_REF, VERCEL_GIT_COMMIT_SHA).');
  process.exit(1);
}

console.log(`Production source metadata: github/main ${VERCEL_GIT_COMMIT_SHA}`);
