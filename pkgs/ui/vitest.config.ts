import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        runes: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    alias: {
      svelte: resolve(__dirname, 'node_modules/svelte/src/runtime/client/main.js'),
    },
  },
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src'),
    },
    conditions: ['browser', 'import', 'default'],
  },
});
