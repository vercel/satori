import type { ReactElement } from 'react';

import type { Font } from '../font';
import type { DetectedFont } from './detection';
import { detectFonts } from './detection';
import { loadFonts } from './loader';

type FontsConfig = {
	aliases?: Record<string, string | { key: string; url: string }>;
	data?: Font[];
	defaultFont: DetectedFont;
	load: (font: DetectedFont) => Promise<Font | Font[] | string | null>;
	resolveFontWeight?: boolean;
};

const detectAndLoadFonts = async (
	element: ReactElement,
	config: FontsConfig
): Promise<Font[]> => {
	const detected = detectFonts(element, {
		aliases: config.aliases,
		defaultFont: config.defaultFont,
		resolveFontWeight: config.resolveFontWeight
	});

	return loadFonts(detected, config.load);
};

export type { DetectedFont, FontsConfig };
export { detectAndLoadFonts, detectFonts, loadFonts };
