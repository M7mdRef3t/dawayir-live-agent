import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setupTests.js'],
    globals: true,
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.js',
        'scripts/**',
        'public/pcm-player-processor.js',
        'src/test/setupTests.js',
      ],
      thresholds: {
        lines: 2, // Low initial threshold to ensure CI passes
        functions: 5,
        branches: 30,
        statements: 2,
      },
    },
  },
});
