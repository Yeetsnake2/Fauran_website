import { defineConfig } from 'vitest/config';

// Rules tests run in Node against the Firestore emulator.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
