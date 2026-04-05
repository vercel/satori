import type { ReactElement, ReactNode } from 'react';

import { cache, inflightRequests } from './handler/image.js';
import { detectAndLoadFonts } from './fonts/index.js';
import { detectLanguageCode, LangCode, Locale } from './language.js';
import { getYoga, TYoga } from './yoga.js';
import { preProcessNode } from './handler/preprocess.js';
import { segment } from './utils.js';
import FontLoader, { FontOptions } from './font.js';
import layout from './layout.js';
import svg from './builder/svg.js';
import type { FontsConfig } from './fonts/index.js';
import type { SatoriNode } from './layout.js';

// We don't need to initialize the opentype instances every time.
const fontCache = new WeakMap();

type SatoriOptions = (
	| {
			width: number;
			height: number;
	  }
	| {
			width: number;
	  }
	| {
			height: number;
	  }
) & {
	debug?: boolean;
	embedFont?: boolean;
	fonts: FontOptions[] | FontsConfig;
	graphemeImages?: Record<string, string>;
	onNodeDetected?: (node: SatoriNode) => void;
	onTailwind?: (
		className: string,
		style: Record<string, string | number>
	) => void;
	pointScaleFactor?: number;
	tailwind?: boolean | string;
};

const getRootNode = (
	Yoga: TYoga,
	pointScaleFactor?: SatoriOptions['pointScaleFactor']
) => {
	if (!pointScaleFactor) {
		return Yoga.Node.create();
	} else {
		const config = Yoga.Config.create();
		config.setPointScaleFactor(pointScaleFactor);
		return Yoga.Node.createWithConfig(config);
	}
};

const convertToLanguageCodes = (
	segmentsMissingFont: { word: string; locale?: Locale }[]
): Partial<Record<LangCode, string[]>> => {
	const languageCodes = {};
	let wordsByCode = {};

	for (const { word, locale } of segmentsMissingFont) {
		const code = detectLanguageCode(word, locale).join('|');
		wordsByCode[code] = wordsByCode[code] || '';
		wordsByCode[code] += word;
	}

	Object.keys(wordsByCode).forEach((code: LangCode) => {
		languageCodes[code] = languageCodes[code] || [];
		if (code === 'emoji') {
			languageCodes[code].push(
				...unique(segment(wordsByCode[code], 'grapheme'))
			);
		} else {
			languageCodes[code][0] = languageCodes[code][0] || '';
			languageCodes[code][0] += unique(
				segment(
					wordsByCode[code],
					'grapheme',
					code === 'unknown' ? undefined : code
				)
			).join('');
		}
	});

	return languageCodes;
};

const unique = <T>(arr: T[]): T[] => {
	return Array.from(new Set(arr));
};

const isFontsConfig = (
	fonts: FontOptions[] | FontsConfig
): fonts is FontsConfig => {
	return (
		!Array.isArray(fonts) &&
		typeof (fonts as FontsConfig).load === 'function'
	);
};

const satori = async (
	_element: ReactNode,
	options: SatoriOptions
): Promise<string> => {
	let element = _element;
	const Yoga = await getYoga();
	if (!Yoga || !Yoga.Node) {
		throw new Error(
			'Satori is not initialized: expect `yoga` to be loaded, got ' + Yoga
		);
	}
	const definedWidth = 'width' in options ? options.width : undefined;
	const definedHeight = 'height' in options ? options.height : undefined;

	const root = getRootNode(Yoga, options.pointScaleFactor);
	if (definedWidth) {
		root.setWidth(definedWidth);
	}
	if (definedHeight) {
		root.setHeight(definedHeight);
	}
	root.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);
	root.setFlexWrap(Yoga.WRAP_WRAP);
	root.setAlignContent(Yoga.ALIGN_AUTO);
	root.setAlignItems(Yoga.ALIGN_FLEX_START);
	root.setJustifyContent(Yoga.JUSTIFY_FLEX_START);
	root.setOverflow(Yoga.OVERFLOW_HIDDEN);

	const graphemeImages = { ...options.graphemeImages };
	// Some Chinese characters have different glyphs in Chinese and
	// Japanese, but their Unicode is the same. If the user needs to display
	// the Chinese and Japanese characters simultaneously correctly, the user
	// needs to download the Chinese and Japanese fonts, respectively.
	// Assuming that the user has downloaded the corresponding Japanese font,
	// to let the program realize that the font has not been downloaded in Chinese,
	// we need to prohibit Japanese as the fallback when executing `engine.has`.
	//
	// This causes a problem. Consider a scenario where we need to display Chinese
	// correctly under tags with `lang="ja"` set. `engine.has` will repeatedly treat
	// the Chinese as missing font because we have removed the Chinese as a fallback.
	// To address this situation, we may need to add `processedWordsMissingFont`
	const processedWordsMissingFonts = new Set();

	cache.clear();
	inflightRequests.clear();

	if (options.tailwind) {
		const { initTw, transformTwNode } = await import('./tw/index.js');
		const customCss =
			typeof options.tailwind === 'string' ? options.tailwind : undefined;
		await initTw(customCss);
		element = await transformTwNode(element, options.onTailwind);
	}

	// Normalize fonts option
	let fontsConfig: FontsConfig | null = null;
	let fontOptions: FontOptions[];

	if (isFontsConfig(options.fonts)) {
		fontsConfig = options.fonts;
		const detectedFonts = await detectAndLoadFonts(
			element as ReactElement,
			fontsConfig
		);
		fontOptions = [...(fontsConfig.data || []), ...detectedFonts];
	} else {
		fontOptions = options.fonts || [];
	}

	let font: FontLoader;
	if (fontCache.has(fontOptions)) {
		font = fontCache.get(fontOptions);
	} else {
		fontCache.set(fontOptions, (font = new FontLoader(fontOptions)));
	}

	await preProcessNode(element);

	const handler = layout(element, {
		id: 'id',
		parentStyle: {},
		inheritedStyle: {
			fontSize: 16,
			fontWeight: 'normal',
			fontFamily: 'serif',
			fontStyle: 'normal',
			lineHeight: 'normal',
			color: 'black',
			opacity: 1,
			whiteSpace: 'normal',

			// Special style properties:
			_viewportWidth: definedWidth,
			_viewportHeight: definedHeight
		},
		parent: root,
		font,
		embedFont: options.embedFont,
		debug: options.debug,
		graphemeImages,
		canLoadMissingFonts: !!fontsConfig,
		onNodeDetected: options.onNodeDetected
	});

	const segmentsMissingFont = (await handler.next()).value as {
		word: string;
		locale?: Locale;
	}[];

	if (fontsConfig && segmentsMissingFont.length) {
		const languageCodes = convertToLanguageCodes(segmentsMissingFont);
		const fonts: FontOptions[] = [];
		const images: Record<string, string> = {};

		await Promise.all(
			Object.entries(languageCodes).flatMap(([code, segments]) => {
				return segments.map(_segment => {
					const key = `${code}_${_segment}`;
					if (processedWordsMissingFonts.has(key)) {
						return null;
					}
					processedWordsMissingFonts.add(key);

					return (async () => {
						const result = await fontsConfig.load({
							family: code,
							key: code,
							languageCode: code,
							segment: _segment,
							weight: 400
						});

						if (typeof result === 'string') {
							images[_segment] = result;
						} else if (result) {
							if (Array.isArray(result)) {
								fonts.push(...result);
							} else {
								fonts.push(result);
							}
						}
					})();
				});
			})
		);

		font.addFonts(fonts);
		Object.assign(graphemeImages, images);
	}

	await handler.next();
	root.calculateLayout(definedWidth, definedHeight, Yoga.DIRECTION_LTR);

	const content = (await handler.next([0, 0])).value as string;

	const computedWidth = root.getComputedWidth();
	const computedHeight = root.getComputedHeight();

	root.freeRecursive();

	return svg({ content, height: computedHeight, width: computedWidth });
};

export type { SatoriNode, SatoriOptions };
export default satori;
