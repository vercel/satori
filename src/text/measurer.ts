import { FontEngine } from '../font.js';
import { segment } from '../utils.js';

const genMeasurer = (
	engine: FontEngine,
	isImage: (grapheme: string) => boolean,
	style: {
		fontSize: number;
		letterSpacing: number;
	}
): {
	measureGrapheme: (grapheme: string) => number;
	measureGraphemeArray: (graphemes: string[]) => number;
	measureText: (text: string) => number;
} => {
	const { fontSize, letterSpacing } = style;

	const cache = new Map<string, number>();

	const measureGrapheme = (grapheme: string): number => {
		let width = cache.get(grapheme);

		if (width === undefined) {
			width = engine.measure(grapheme, { fontSize, letterSpacing });
			cache.set(grapheme, width);
		}

		return width;
	};

	const measureGraphemeArray = (graphemes: string[]): number => {
		let width = 0;

		for (const grapheme of graphemes) {
			if (isImage(grapheme)) {
				width += fontSize;
			} else {
				width += measureGrapheme(grapheme);
			}
		}

		return width;
	};

	const measureText = (text: string): number => {
		return measureGraphemeArray(segment(text, 'grapheme'));
	};

	return {
		measureGrapheme,
		measureGraphemeArray,
		measureText
	};
};

export { genMeasurer };
