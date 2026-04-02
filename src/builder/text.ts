import escapeHTML from 'escape-html';
import type { ParsedTransformOrigin } from '../transform-origin.js';
import transform from './transform.js';
import { buildXMLString } from '../utils.js';

export function container(
	{
		left,
		top,
		width,
		height,
		isInheritingTransform
	}: {
		left: number;
		top: number;
		width: number;
		height: number;
		isInheritingTransform: boolean;
	},
	style: Record<string, number | string>
) {
	let matrix = '';
	let opacity = 1;

	if (style.transform) {
		matrix = transform(
			{
				left,
				top,
				width,
				height
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
}

export default function buildText(
	{
		id,
		content,
		filter,
		left,
		top,
		width,
		height,
		matrix,
		opacity,
		image,
		clipPathId,
		debug,
		fauxBoldStrokeWidth,
		shape,
		decorationShape
	}: {
		content: string;
		filter: string;
		id: string;
		left: number;
		top: number;
		width: number;
		height: number;
		matrix: string;
		opacity: number;
		image: string | null;
		clipPathId?: string;
		debug?: boolean;
		fauxBoldStrokeWidth?: number;
		shape?: boolean;
		decorationShape?: string;
	},
	style: Record<string, number | string>
) {
	let extra = '';
	if (debug) {
		extra = buildXMLString('rect', {
			x: left,
			y: top - height,
			width,
			height,
			fill: 'transparent',
			stroke: '#575eff',
			'stroke-width': 1,
			transform: matrix || undefined,
			'clip-path': clipPathId ? `url(#${clipPathId})` : undefined
		});
	}

	// This grapheme should be rendered as an image.
	if (image) {
		const shapeProps = {
			href: image,
			x: left,
			y: top,
			width,
			height,
			transform: matrix || undefined,
			'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
			style: style.filter ? `filter:${style.filter}` : undefined
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
		x: left,
		y: top,
		width,
		height,
		'font-weight': style.fontWeight,
		'font-style': style.fontStyle,
		'font-size': style.fontSize,
		'font-family': style.fontFamily,
		'letter-spacing': style.letterSpacing || undefined,
		transform: matrix || undefined,
		'clip-path': clipPathId ? `url(#${clipPathId})` : undefined
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
		style: style.filter ? `filter:${style.filter}` : undefined,
		'stroke-width': bothActive
			? `${fauxBoldStrokeWidth}`
			: hasWebkitStroke
			? `${style.WebkitTextStrokeWidth}px`
			: needsFauxBold
			? `${fauxBoldStrokeWidth}`
			: undefined,
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
		'paint-order': hasWebkitStroke || needsFauxBold ? 'stroke' : undefined
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
}
