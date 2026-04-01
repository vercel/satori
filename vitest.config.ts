import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@shuding/opentype.js':
				'@shuding/opentype.js/dist/opentype.module.js'
		}
	},
	test: {
		coverage: {
			reporter: ['text', 'json', 'html']
		}
	}
});
