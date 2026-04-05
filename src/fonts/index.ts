import type { ReactElement } from 'react';

import type { FontOptions } from '../font.js';
import type { DetectedFont } from './detection.js';
import { detectFonts } from './detection.js';
import { loadFonts } from './loader.js';

type FontsConfig = {
	aliases?: Record<string, string | { key: string; url: string }>;
	data?: FontOptions[];
	defaultFont: DetectedFont;
	load: (
		font: DetectedFont
	) => Promise<FontOptions | FontOptions[] | string | null>;
	resolveFontWeight?: boolean;
};

const detectAndLoadFonts = async (
	element: ReactElement,
	config: FontsConfig
): Promise<FontOptions[]> => {
	const detected = detectFonts(element, {
		aliases: config.aliases,
		defaultFont: config.defaultFont,
		resolveFontWeight: config.resolveFontWeight
	});

	return loadFonts(detected, config.load);
};

export type { DetectedFont, FontsConfig };
export { detectAndLoadFonts, detectFonts, loadFonts };
