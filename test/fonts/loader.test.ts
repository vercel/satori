import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FontOptions } from '../../src/font.js';
import type { DetectedFont } from '../../src/fonts/detection.js';
import {
	fontCache,
	fontPending,
	loadFont,
	loadFonts
} from '../../src/fonts/loader.js';

const mockFont = (detected: DetectedFont): FontOptions => {
	return {
		data: new ArrayBuffer(8),
		name: detected.family,
		style: 'normal',
		weight: detected.weight
	};
};

describe('fonts/loader', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		fontCache.clear();
		fontPending.clear();
	});

	describe('loadFont', () => {
		it('should load font at requested weight', async () => {
			const load = vi.fn(async (detected: DetectedFont) => {
				return mockFont(detected);
			});

			const font = await loadFont(
				{ family: 'Inter', key: 'inter', weight: 700 },
				load
			);

			expect(font).toMatchObject({
				name: 'Inter',
				style: 'normal',
				weight: 700
			});
			expect(load).toHaveBeenCalledTimes(1);
		});

		it('should return cached font on second call', async () => {
			const load = vi.fn(async (detected: DetectedFont) => {
				return mockFont(detected);
			});

			const first = await loadFont(
				{ family: 'Inter', key: 'inter', weight: 400 },
				load
			);
			const second = await loadFont(
				{ family: 'Inter', key: 'inter', weight: 400 },
				load
			);

			expect(first).toEqual(second);
			expect(load).toHaveBeenCalledTimes(1);
		});

		it('should deduplicate by key for cache', async () => {
			const load = vi.fn(async (detected: DetectedFont) => {
				return mockFont(detected);
			});

			const first = await loadFont(
				{ family: 'Open Sans', key: 'open-sans', weight: 400 },
				load
			);
			const second = await loadFont(
				{ family: 'open sans', key: 'open-sans', weight: 400 },
				load
			);

			expect(first).toEqual(second);
			expect(load).toHaveBeenCalledTimes(1);
		});

		it('should deduplicate concurrent calls via fontPending', async () => {
			const load = vi.fn(async (detected: DetectedFont) => {
				return mockFont(detected);
			});

			const detected: DetectedFont = {
				family: 'Inter',
				key: 'inter',
				weight: 400
			};
			const [first, second] = await Promise.all([
				loadFont(detected, load),
				loadFont(detected, load)
			]);

			expect(first).toEqual(second);
			expect(load).toHaveBeenCalledTimes(1);
		});

		it('should handle null return from load', async () => {
			const load = vi.fn(async () => {
				return null;
			});

			const font = await loadFont(
				{ family: 'Unknown', key: 'unknown', weight: 400 },
				load
			);

			expect(font).toEqual(null);
			expect(load).toHaveBeenCalledTimes(1);
		});

		it('should not cache null results', async () => {
			const load = vi.fn(async () => {
				return null;
			});

			await loadFont(
				{ family: 'Unknown', key: 'unknown', weight: 400 },
				load
			);
			await loadFont(
				{ family: 'Unknown', key: 'unknown', weight: 400 },
				load
			);

			expect(load).toHaveBeenCalledTimes(2);
		});
	});

	describe('loadFonts', () => {
		it('should load multiple fonts from detected entries', async () => {
			const load = vi.fn(async (detected: DetectedFont) => {
				return mockFont(detected);
			});

			const fonts = await loadFonts(
				[
					{ family: 'Inter', key: 'inter', weight: 400 },
					{ family: 'Roboto', key: 'roboto', weight: 700 }
				],
				load
			);

			expect(fonts).toHaveLength(2);
			expect(fonts[0]).toMatchObject({
				name: 'Inter',
				weight: 400
			});
			expect(fonts[1]).toMatchObject({
				name: 'Roboto',
				weight: 700
			});
		});

		it('should filter out null results', async () => {
			let callCount = 0;
			const load = vi.fn(async (detected: DetectedFont) => {
				callCount++;

				if (callCount === 2) {
					return null;
				}

				return mockFont(detected);
			});

			const fonts = await loadFonts(
				[
					{ family: 'Inter', key: 'inter', weight: 400 },
					{ family: 'Unknown', key: 'unknown', weight: 400 },
					{ family: 'Roboto', key: 'roboto', weight: 700 }
				],
				load
			);

			expect(fonts).toHaveLength(2);
			expect(fonts[0]).toMatchObject({ name: 'Inter' });
			expect(fonts[1]).toMatchObject({ name: 'Roboto' });
		});

		it('should deduplicate fonts with same key and weight', async () => {
			const load = vi.fn(async (detected: DetectedFont) => {
				return mockFont(detected);
			});

			const fonts = await loadFonts(
				[
					{ family: 'Inter', key: 'inter', weight: 400 },
					{ family: 'Inter', key: 'inter', weight: 400 }
				],
				load
			);

			expect(fonts).toHaveLength(2);
			expect(load).toHaveBeenCalledTimes(1);
		});
	});
});
