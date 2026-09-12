import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        statements: 75,
        branches: 65,
        functions: 78,
        lines: 77,
      },
    },
  },
});
