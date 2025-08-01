import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        runes: true
      }
    }),
    dts({
      insertTypesEntry: true,
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PonzilandUI',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['svelte', 'svelte/store', 'svelte/motion', 'svelte/transition', 'svelte/elements', 'svelte/easing'],
      output: {
        globals: {
          svelte: 'Svelte'
        },
        assetFileNames: 'assets/[name][extname]'
      }
    },
    sourcemap: true,
    minify: false,
    assetsInclude: ['**/*.png', '**/*.ttf']
  },
  resolve: {
    alias: {
      '$lib': resolve(__dirname, 'src')
    }
  }
});