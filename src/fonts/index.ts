import type { ReactElement } from 'react';

import type { FontOptions } from '../font.js';
import type { DetectedFont } from './detection.js';
import { detectFonts } from './detection.js';
import { loadFonts } from './loader.js';

type FontLoaderConfig = {
	aliases?: Record<string, string | { key: string; url: string }>;
	fallbackFont?: DetectedFont | null;
	load: (font: DetectedFont) => Promise<FontOptions | null>;
	resolveFontWeight?: boolean;
};

const detectAndLoadFonts = async (
	element: ReactElement,
	config: FontLoaderConfig
): Promise<FontOptions[]> => {
	const detected = detectFonts(element, {
		aliases: config.aliases,
		fallbackFont: config.fallbackFont,
		resolveFontWeight: config.resolveFontWeight
	});

	return loadFonts(detected, config.load);
};

export type { DetectedFont, FontLoaderConfig };
export { detectAndLoadFonts, detectFonts, loadFonts };
