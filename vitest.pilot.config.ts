import { defineConfig } from 'vitest/config';

// Local service-layer pilot: requires Firestore + Auth emulators.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/pilot/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
  },
});
