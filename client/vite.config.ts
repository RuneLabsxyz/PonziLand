import { sveltekit } from '@sveltejs/kit/vite';
import wasm from 'vite-plugin-wasm';
import { defineConfig } from 'vitest/config';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  plugins: [sveltekit(), wasm(), mkcert()],
  build: {
    sourcemap: false,
    minify: false,
    target: 'es2022',
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
