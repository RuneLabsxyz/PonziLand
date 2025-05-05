import { sveltekit } from '@sveltejs/kit/vite';
import wasm from 'vite-plugin-wasm';
import { defineConfig } from 'vitest/config';
import topLevelAwait from 'vite-plugin-top-level-await';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  plugins: [sveltekit(), wasm(), topLevelAwait(), mkcert()],
  build: {
    sourcemap: false,
    minify: false,
  },
  server: {
    host: 'localhost',
    port: 3000,
    fs: {
      allow: ['../constracts/manifest_*.json', 'data/'],
    },
  },
  resolve: {
    alias: {
      '@dojoengine/sdk-svelte': '../dist/index.js',
      $lib: '/src/lib',
    },
    conditions: process.env.VITEST ? ['browser'] : undefined,
  },
  define: {
    global: {},
  },

  ssr: {
    noExternal: ['@dojoengine/torii-client'],
  },
});
