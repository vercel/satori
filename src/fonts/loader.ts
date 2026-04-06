import type { Font } from '../font';
import type { DetectedFont } from './detection';

type LoadFn = (font: DetectedFont) => Promise<Font | Font[] | string | null>;

const fontCache = new Map<string, Font>();
const fontPending = new Map<string, Promise<Font | null>>();

const loadFont = async (
	detected: DetectedFont,
	load: LoadFn
): Promise<Font | null> => {
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
		const result = await load(detected);
		const font = Array.isArray(result)
			? result[0]
			: typeof result === 'string'
			? null
			: result;

		if (font) {
			fontCache.set(cacheKey, font);
		}

		fontPending.delete(cacheKey);

		return font ?? null;
	})();

	fontPending.set(cacheKey, promise);

	return promise;
};

const loadFonts = async (
	entries: DetectedFont[],
	load: LoadFn
): Promise<Font[]> => {
	const results = await Promise.all(
		entries.map(entry => {
			return loadFont(entry, load);
		})
	);

	return results.filter((font): font is Font => {
		return font !== null;
	});
};

export { fontCache, fontPending, loadFont, loadFonts };
