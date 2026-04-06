import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@shuding/opentype': '@shuding/opentype.js/dist/opentype.module'
		}
	},
	test: {
		coverage: {
			reporter: ['text', 'json', 'html']
		}
	}
});
