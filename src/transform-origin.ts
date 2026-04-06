import valueParser from 'postcss-value-parser';

import CssDimension from './vendor/parse-css-dimension';

/**
 * If key for each direction is missing, assume default (50%)
 */
type ParsedTransformOrigin = {
	/** Absolute horizontal transform origin in pixels */
	xAbsolute?: number;
	/** Relative horizontal transform origin in % */
	xRelative?: number;
	/** Absolute horizontal transform origin in pixels */
	yAbsolute?: number;
	/** Relative vertical transform origin in % */
	yRelative?: number;
};

type ParsedUnit = {
	/** Absolute unit in pixels */
	absolute?: number;
	/** Relative unit in % */
	relative?: number;
};

const parseUnit = (word: string, baseFontSize: number): ParsedUnit => {
	try {
		const parsed = new CssDimension(word);
		switch (parsed.unit) {
			case 'px':
				return { absolute: parsed.value };
			case 'em':
				return { absolute: parsed.value * baseFontSize };
			case 'rem':
				return { absolute: parsed.value * 16 };
			case '%':
				return { relative: parsed.value };
			default:
				return {};
		}
	} catch (e) {
		return {};
	}
};

const handleWord = (
	word: string,
	baseFontSize: number,
	unitIsHorizontal: boolean
) => {
	switch (word) {
		case 'top':
			return { yRelative: 0 };
		case 'left':
			return { xRelative: 0 };
		case 'right':
			return { xRelative: 100 };
		case 'bottom':
			return { yRelative: 100 };
		case 'center':
			return {};
		default: {
			const parsedUnit = parseUnit(word, baseFontSize);
			return parsedUnit.absolute
				? {
						[unitIsHorizontal ? 'xAbsolute' : 'yAbsolute']:
							parsedUnit.absolute
				  }
				: parsedUnit.relative
				? {
						[unitIsHorizontal ? 'xRelative' : 'yRelative']:
							parsedUnit.relative
				  }
				: {};
		}
	}
};

const parseTransformOrigin = (
	value: string | number,
	baseFontSize: number
): ParsedTransformOrigin => {
	// If it's a single value and a number, then it's horizontal
	if (typeof value === 'number') {
		return { xAbsolute: value };
	}
	let words: string[];
	try {
		words = valueParser(value)
			.nodes.filter(node => {
				return node.type === 'word';
			})
			.map(node => {
				return node.value;
			});
	} catch (e) {
		return {};
	}

	if (words.length === 1) {
		// If it's a single value and a number, then it's horizontal, so
		// pass `true` to `unitIsHorizontal`
		return handleWord(words[0], baseFontSize, true);
	} else if (words.length === 2) {
		// Make words to be [horizontal, vertical]
		if (
			words[0] === 'top' ||
			words[0] === 'bottom' ||
			words[1] === 'left' ||
			words[1] === 'right'
		) {
			words.reverse();
		}

		return {
			...handleWord(words[0], baseFontSize, true),
			...handleWord(words[1], baseFontSize, false)
		};
	} else {
		return {};
	}
};

export type { ParsedTransformOrigin };
export default parseTransformOrigin;
