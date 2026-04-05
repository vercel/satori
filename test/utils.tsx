import { Resvg } from '@resvg/resvg-js';
import { beforeAll, expect } from 'vitest';
import { join } from 'path';
import { readFile } from 'node:fs/promises';
import { toMatchImageSnapshot } from 'jest-image-snapshot';

import type { LanguageCode } from '../src/language.js';
import { type Font } from '../src/index.js';

const getDynamicAsset = async (text: string): Promise<Buffer> => {
	const fontPath = join(process.cwd(), 'test', 'assets', text);
	return await readFile(fontPath);
};

const loadDynamicAsset = async (
	code: string,
	text: string
): Promise<Font[]> => {
	return [
		{
			data: await getDynamicAsset(text),
			lang: code === 'unknown' ? undefined : code.split('|')[0],
			name: `satori_${code}_fallback_${text}`,
			style: 'normal',
			weight: 400
		}
	];
};

const loadMissingFont = async (font: {
	languageCode?: LanguageCode;
	segment?: string;
}) => {
	if (!font.languageCode || !font.segment) {
		return null;
	}

	return loadDynamicAsset(font.languageCode, font.segment);
};

const initFonts = (callback: (fonts: Font[]) => void) => {
	beforeAll(async () => {
		const fontPath = join(
			process.cwd(),
			'test',
			'assets',
			'Roboto-Regular.ttf'
		);
		const fontData = await readFile(fontPath);
		callback([
			{
				data: fontData,
				name: 'Roboto',
				style: 'normal',
				weight: 400
			}
		]);
	});
};

const toImage = (svg: string, width = 100) => {
	const resvg = new Resvg(svg, {
		fitTo: {
			mode: 'width',
			value: width
		},
		font: {
			// As system fallback font
			defaultFontFamily: 'Playfair Display',
			fontFiles: [
				join(process.cwd(), 'test', 'assets', 'playfair-display.ttf')
			],
			loadSystemFonts: false
		}
	});
	const pngData = resvg.render();
	return pngData.asPng();
};

declare global {
	namespace jest {
		interface Matchers<R> {
			toMatchImageSnapshot(): R;
		}
	}
}

expect.extend({ toMatchImageSnapshot });

export {
	getDynamicAsset,
	initFonts,
	loadDynamicAsset,
	loadMissingFont,
	toImage
};
