import { sveltekit } from '@sveltejs/kit/vite';
import wasm from 'vite-plugin-wasm';
import { defineConfig } from 'vitest/config';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [sveltekit(), wasm(), topLevelAwait()],
  build: {
    sourcemap: false,
    minify: false,
  },
  server: {
    host: 'localhost',
    port: 3000,
  },
  resolve: {
    alias: {
      '@dojoengine/sdk-svelte': '../dist/index.js',
      $lib: '/src/lib',
    },
    conditions: process.env.VITEST ? ['browser'] : undefined,
  },
  ssr: {
    noExternal: ['@dojoengine/torii-client'],
  },
});
