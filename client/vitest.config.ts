import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  resolve: process.env.VITEST
    ? {
        conditions: ['browser'],
      }
    : undefined,
  test: {
    globals: true,
  },
});
