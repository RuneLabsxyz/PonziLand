import { sveltekit } from '@sveltejs/kit/vite';
import wasm from 'vite-plugin-wasm';
import { defineConfig } from 'vitest/config';
import glsl from 'vite-plugin-glsl';
import process from 'node:process';

export default defineConfig({
  plugins: [glsl(), sveltekit(), wasm()],
  build: {
    sourcemap: false,
    minify: false,
    target: 'es2022',
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    fs: {
      allow: ['../constracts/manifest_*.json', 'data/'],
    },
    allowedHosts: [
      'api.runelabs.xyz',
      process.env['DEPLOY_NAME'] + '.ponzis.fun',
    ],
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
    noExternal: ['@dojoengine/torii-wasm'],
  },
});
