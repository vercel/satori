import type { FontOptions } from '../font.js';
import type { DetectedFont } from './detection.js';

const fontCache = new Map<string, FontOptions>();
const fontPending = new Map<string, Promise<FontOptions | null>>();

const loadFont = async (
	detected: DetectedFont,
	load: (font: DetectedFont) => Promise<FontOptions | null>
): Promise<FontOptions | null> => {
	const cacheKey = `${detected.key}:${detected.weight}`;
	const cached = fontCache.get(cacheKey);

	if (cached) {
		return cached;
	}

	const pending = fontPending.get(cacheKey);

	if (pending) {
		return pending;
	}

	const promise = (async () => {
		const font = await load(detected);

		if (font) {
			fontCache.set(cacheKey, font);
		}

		fontPending.delete(cacheKey);

		return font;
	})();

	fontPending.set(cacheKey, promise);

	return promise;
};

const loadFonts = async (
	entries: DetectedFont[],
	load: (font: DetectedFont) => Promise<FontOptions | null>
): Promise<FontOptions[]> => {
	const results = await Promise.all(
		entries.map(entry => {
			return loadFont(entry, load);
		})
	);

	return results.filter((font): font is FontOptions => {
		return font !== null;
	});
};

export { fontCache, fontPending, loadFont, loadFonts };
