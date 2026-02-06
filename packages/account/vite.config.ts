import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		devtoolsJson()
		/* Keeping source code here as we haven't migrated the UI package yet
		import UnoCSS from '@unocss/svelte-scoped/vite';
		UnoCSS({
			onlyGlobal: true,
			injectReset: '@unocss/reset/tailwind.css'
		}) */
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.spec.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'src/**/*.svelte.test.{js,ts}'],
					exclude: ['src/**/*.svelte.spec.{js,ts}']
				}
			}
		]
	}
});
