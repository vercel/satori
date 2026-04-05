import { beforeAll, describe, expect, it } from 'vitest';

import { buildCss, initCompiler } from '../../src/tw/compiler.js';

describe('tw/compiler', () => {
	describe('buildCss before init', () => {
		it('should throw when compiler not initialized', () => {
			try {
				buildCss(['flex']);
				throw new Error('expected to throw');
			} catch (err) {
				expect((err as Error).message).toEqual(
					'tw not initialized — call initTw() first'
				);
			}
		});
	});

	describe('after init', () => {
		beforeAll(async () => {
			await initCompiler();
		});

		it('should initialize without error', () => {
			expect(true).toEqual(true);
		});

		it('should be idempotent', async () => {
			await initCompiler();
			expect(true).toEqual(true);
		});

		it('should return CSS containing @layer utilities for valid classes', () => {
			const css = buildCss(['flex']);
			expect(css).toContain('@layer utilities');
			expect(css).toContain('display');
			expect(css).toContain('flex');
		});

		it('should build CSS for multiple utility classes', () => {
			const css = buildCss(['flex', 'p-4', 'text-red-500']);
			expect(css).toContain('@layer utilities');
			expect(css).toContain('display');
			expect(css).toContain('padding');
			expect(css).toContain('color');
		});
	});
});
