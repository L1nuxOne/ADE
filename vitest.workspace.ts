import { defineProject, defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  defineProject({
    test: {
      name: 'core',
      globals: true,
      include: [
        'packages/**/*.test.ts',
        'packages/**/*.test.tsx',
        'packages/**/*.spec.ts',
        'packages/**/*.spec.tsx',
      ],
      exclude: ['apps/**', 'bo4/**', 'node_modules/**'],
    },
  }),
  defineProject({
    extends: './apps/ade-tauri/vitest.config.ts',
    root: './apps/ade-tauri',
    test: {
      name: 'tauri-app',
      include: ['src/**/*.spec.tsx'],
    },
  }),
]);
