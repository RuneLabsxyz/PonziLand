import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [sveltekit()],
  css: {
    postcss: './postcss.config.js'
  },
  publicDir: 'static',
  server: {
    fs: {
      // Allow serving files from the package directory
      allow: ['..']
    }
  },
  resolve: {
    alias: [
      // Map static asset requests to the actual static directory
      {
        find: /^(.*)\/static\/(.*)/,
        replacement: join(__dirname, 'static', '$2')
      }
    ]
  },
  assetsInclude: ['**/*.ttf', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg']
});