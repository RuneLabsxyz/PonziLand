import presetWind4 from '@unocss/preset-wind3';
import { CSSEntry, defineConfig } from 'unocss';
export default defineConfig({
	presets: [
		presetWind4({
			preflights: {
				theme: {
					mode: true, // Default by 'on-demand'
					process: (t) => {
						t[0] = t[0].replace('--colors', '--color');

						if (t[0].includes('--color')) {
							console.log('Color theme detected');
						}
					}
				}
			}
		})
	],
	postprocess: [
		(t) => {
			t.entries = t.entries.map((entry) => {
				if (
					entry[1] == undefined ||
					typeof entry[1] != 'string' ||
					!entry[1].includes('--colors')
				) {
					return entry;
				}

				const newEntry = [entry[0], entry[1].replaceAll('--colors', '--color')] satisfies CSSEntry;

				return newEntry;
			});
		}
	],
	rules: [['pixellate', { 'image-rendering': 'pixelated' }]]
});
