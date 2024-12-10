import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			'@dojoengine/sdk-svelte': '../dist/index.js',
			'$lib': '/src/lib'
		}
	}
});
