import type { ReactNode } from 'react';

import kebabCase from 'lodash/kebabCase.js';

import type { LanguageCode } from '../language.js';
import type { Weight } from '../font.js';
import { isReactElement } from '../utils.js';

type FontAlias = string | { key: string; url: string };

type DetectedFont = {
	family: string;
	key: string;
	languageCode?: LanguageCode;
	segment?: string;
	url?: string;
	weight: Weight;
};

type DetectionConfig = {
	aliases?: Record<string, FontAlias>;
	defaultFont?: DetectedFont | null;
	resolveFontWeight?: boolean;
};

type ElementProps = {
	children?: ReactNode;
	style?: Record<string, unknown>;
	[key: string]: unknown;
};

const resolveAlias = (
	slug: string,
	aliases: Record<string, FontAlias>
): { key: string; url?: string } => {
	const alias = aliases[slug] ?? null;

	if (typeof alias === 'string') {
		return { key: alias };
	}

	if (alias) {
		return { key: alias.key, url: alias.url };
	}

	return { key: slug };
};

const resolveFontWeight = (
	style: ElementProps['style'],
	enabled: boolean
): Weight => {
	if (enabled && typeof style?.fontWeight === 'number') {
		return style.fontWeight as Weight;
	}

	return 400;
};

const walkElement = (
	element: unknown,
	fonts: Map<string, DetectedFont>,
	inheritedFamily: string | null,
	config: DetectionConfig
): void => {
	if (!isReactElement(element)) {
		return;
	}

	const { children, style } = (element.props ?? {}) as ElementProps;

	let family = inheritedFamily;

	if (style?.fontFamily && typeof style.fontFamily === 'string') {
		family = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
	}

	if (family) {
		const weight = resolveFontWeight(
			style,
			config.resolveFontWeight ?? false
		);
		const resolved = resolveAlias(kebabCase(family), config.aliases ?? {});
		const key = `${resolved.key}:${weight}`;

		if (!fonts.has(key)) {
			fonts.set(key, { family, weight, ...resolved });
		}
	}

	if (Array.isArray(children)) {
		children.forEach((child: unknown) => {
			walkElement(child, fonts, family, config);
		});
	} else if (children) {
		walkElement(children, fonts, family, config);
	}
};

const detectFonts = (
	element: React.ReactElement,
	config: DetectionConfig = {}
): DetectedFont[] => {
	const fonts = new Map<string, DetectedFont>();
	walkElement(element, fonts, null, config);

	if (fonts.size === 0 && config.defaultFont) {
		fonts.set(
			`${config.defaultFont.key}:${config.defaultFont.weight}`,
			config.defaultFont
		);
	}

	return Array.from(fonts.values());
};

export type { DetectedFont, DetectionConfig };
export { detectFonts };
