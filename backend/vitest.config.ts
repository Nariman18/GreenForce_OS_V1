import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Integration tests use the same connection settings as the app: real env, then .env, then .env.example.
for (const file of ['.env', '.env.example']) {
  try {
    process.loadEnvFile(file);
  } catch {
    // optional file
  }
}

// SWC compiles the Nest sources so decorator metadata (used for dependency injection) is emitted.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
