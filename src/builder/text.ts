import escapeHTML from 'escape-html';
import type { ParsedTransformOrigin } from '../transform-origin.js';

import { buildXMLString } from '../utils.js';
import transform from './transform.js';

const container = (
	{
		height,
		isInheritingTransform,
		left,
		top,
		width
	}: {
		height: number;
		isInheritingTransform: boolean;
		left: number;
		top: number;
		width: number;
	},
	style: Record<string, number | string>
) => {
	let matrix = '';
	let opacity = 1;

	if (style.transform) {
		matrix = transform(
			{
				height,
				left,
				top,
				width
			},
			style.transform as unknown as number[],
			isInheritingTransform,
			style.transformOrigin as ParsedTransformOrigin | undefined
		);
	}

	if (style.opacity !== undefined) {
		opacity = +style.opacity;
	}

	return { matrix, opacity };
};

const buildText = (
	{
		clipPathId,
		content,
		debug,
		decorationShape,
		fauxBoldStrokeWidth,
		filter,
		height,
		id,
		image,
		left,
		matrix,
		opacity,
		shape,
		top,
		width
	}: {
		clipPathId?: string;
		content: string;
		debug?: boolean;
		decorationShape?: string;
		fauxBoldStrokeWidth?: number;
		filter: string;
		height: number;
		id: string;
		image: string | null;
		left: number;
		matrix: string;
		opacity: number;
		shape?: boolean;
		top: number;
		width: number;
	},
	style: Record<string, number | string>
) => {
	let extra = '';
	if (debug) {
		extra = buildXMLString('rect', {
			'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
			fill: 'transparent',
			height,
			stroke: '#575eff',
			'stroke-width': 1,
			transform: matrix || undefined,
			width,
			x: left,
			y: top - height
		});
	}

	// This grapheme should be rendered as an image.
	if (image) {
		const shapeProps = {
			'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
			height,
			href: image,
			transform: matrix || undefined,
			width,
			x: left,
			y: top
		};
		return [
			(filter ? `${filter}<g filter="url(#satori_s-${id})">` : '') +
				buildXMLString('image', {
					...shapeProps,
					opacity: opacity !== 1 ? opacity : undefined
				}) +
				(decorationShape || '') +
				(filter ? '</g>' : '') +
				extra,
			// SVG doesn't support `<image>` as the shape.
			''
		];
	}

	// Do not embed the font, use <text> with the raw content instead.
	const hasWebkitStroke = !!style.WebkitTextStrokeWidth;
	const needsFauxBold = fauxBoldStrokeWidth !== undefined;
	const bothActive = hasWebkitStroke && needsFauxBold;
	const textProps = {
		'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
		'font-family': style.fontFamily,
		'font-size': style.fontSize,
		'font-style': style.fontStyle,
		'font-weight': style.fontWeight,
		height,
		'letter-spacing': style.letterSpacing || undefined,
		transform: matrix || undefined,
		width,
		x: left,
		y: top
	};

	// When both faux bold and webkit-text-stroke apply, render a background
	// <text> with a wider webkit stroke that wraps around the faux bold body.
	// Uses miter join (not round) to preserve sharp glyph corners matching
	// the faux bold foreground text — round is only used for webkit-text-stroke
	// alone, where visible stroke corners benefit from rounding.
	const fauxBoldBgText = bothActive
		? buildXMLString(
				'text',
				{
					...textProps,
					fill: style.color,
					opacity: opacity !== 1 ? opacity : undefined,
					'paint-order': 'stroke',
					stroke: style.WebkitTextStrokeColor,
					'stroke-linejoin': 'miter',
					'stroke-width': `${
						Number(style.WebkitTextStrokeWidth) +
						fauxBoldStrokeWidth
					}px`
				},
				escapeHTML(content)
		  )
		: '';

	const shapeProps = {
		...textProps,
		'paint-order': hasWebkitStroke || needsFauxBold ? 'stroke' : undefined,
		stroke: bothActive
			? style.color
			: hasWebkitStroke
			? style.WebkitTextStrokeColor
			: needsFauxBold
			? style.color
			: undefined,
		'stroke-linejoin':
			hasWebkitStroke && !bothActive
				? 'round'
				: needsFauxBold
				? 'miter'
				: undefined,
		'stroke-width': bothActive
			? `${fauxBoldStrokeWidth}`
			: hasWebkitStroke
			? `${style.WebkitTextStrokeWidth}px`
			: needsFauxBold
			? `${fauxBoldStrokeWidth}`
			: undefined
	};
	return [
		(filter ? `${filter}<g filter="url(#satori_s-${id})">` : '') +
			fauxBoldBgText +
			buildXMLString(
				'text',
				{
					...shapeProps,
					fill: style.color,
					opacity: opacity !== 1 ? opacity : undefined
				},
				escapeHTML(content)
			) +
			(decorationShape || '') +
			(filter ? '</g>' : '') +
			extra,
		shape ? buildXMLString('text', shapeProps, escapeHTML(content)) : ''
	];
};

export { container };
export default buildText;
