// Root ESLint flat config for every workspace.
import js from '@eslint/js';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const WEB_FILES = ['frontend/**/*.{js,jsx,ts,tsx,mjs}'];

/** Scope the Next.js presets to the web workspace only. */
const scopeToWeb = (configs) => configs.map((config) => ({ ...config, files: WEB_FILES }));

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/next-env.d.ts',
      'backend/src/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['backend/**/*.ts', 'shared/**/*.ts', '*.mjs', '*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Nest resolves constructor injection through emitted decorator metadata, which
    // `import type` would erase — keep value imports for injected classes.
    files: ['backend/**/*.ts'],
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
  ...scopeToWeb(nextCoreWebVitals),
  ...scopeToWeb(nextTypescript),
  {
    files: WEB_FILES,
    settings: { next: { rootDir: 'frontend' } },
    languageOptions: { globals: { ...globals.browser } },
  },
);
