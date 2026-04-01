import { buildXMLString } from '../utils.js';
import radius from './border-radius.js';

type BuildBackdropFilterOptions = {
	bgGroupId: string;
	filterValue: string;
	height: number;
	id: string;
	left: number;
	maskId?: string;
	style: Record<string, any>;
	top: number;
	width: number;
};

const parseFilterValue = (value: string): string => {
	let primitives = '';
	let lastResult = 'SourceGraphic';
	let hasBlur = false;

	// blur(Npx)
	const blurMatch = value.match(/blur\(([\d.]+)(?:px)?\)/);
	if (blurMatch) {
		hasBlur = true;
		const sigma = parseFloat(blurMatch[1]);
		const pad = Math.ceil(sigma * 3);

		// Extend content beyond source bounds using 4 diagonal offset copies.
		// Without this, feGaussianBlur samples transparent pixels at the edges,
		// creating a semi-transparent fade. The copies provide real pixel data
		// in all directions (edges + corners) so the blur is consistent.
		primitives += buildXMLString('feOffset', {
			dx: -pad,
			dy: -pad,
			in: 'SourceGraphic',
			result: 'satori_bfTL'
		});
		primitives += buildXMLString('feOffset', {
			dx: pad,
			dy: -pad,
			in: 'SourceGraphic',
			result: 'satori_bfTR'
		});
		primitives += buildXMLString('feOffset', {
			dx: -pad,
			dy: pad,
			in: 'SourceGraphic',
			result: 'satori_bfBL'
		});
		primitives += buildXMLString('feOffset', {
			dx: pad,
			dy: pad,
			in: 'SourceGraphic',
			result: 'satori_bfBR'
		});
		primitives += buildXMLString(
			'feMerge',
			{ result: 'satori_bfext' },
			buildXMLString('feMergeNode', { in: 'satori_bfTL' }) +
				buildXMLString('feMergeNode', { in: 'satori_bfTR' }) +
				buildXMLString('feMergeNode', { in: 'satori_bfBL' }) +
				buildXMLString('feMergeNode', { in: 'satori_bfBR' }) +
				buildXMLString('feMergeNode', { in: 'SourceGraphic' })
		);
		lastResult = 'satori_bfext';

		const result = 'satori_bfblur';
		primitives += buildXMLString('feGaussianBlur', {
			edgeMode: 'duplicate',
			in: lastResult,
			result,
			stdDeviation: sigma
		});
		lastResult = result;
	}

	// saturate(N) or saturate(N%)
	const saturateMatch = value.match(/saturate\(([\d.]+)(%?)\)/);
	if (saturateMatch) {
		const val =
			saturateMatch[2] === '%'
				? parseFloat(saturateMatch[1]) / 100
				: parseFloat(saturateMatch[1]);
		const result = 'satori_bfsat';
		primitives += buildXMLString('feColorMatrix', {
			in: lastResult,
			result,
			type: 'saturate',
			values: val
		});
		lastResult = result;
	}

	// brightness(N)
	const brightnessMatch = value.match(/brightness\(([\d.]+)\)/);
	if (brightnessMatch) {
		const val = parseFloat(brightnessMatch[1]);
		const result = 'satori_bfbri';
		primitives += buildXMLString(
			'feComponentTransfer',
			{ in: lastResult, result },
			buildXMLString('feFuncR', { slope: val, type: 'linear' }) +
				buildXMLString('feFuncG', { slope: val, type: 'linear' }) +
				buildXMLString('feFuncB', { slope: val, type: 'linear' })
		);
		lastResult = result;
	}

	// contrast(N)
	const contrastMatch = value.match(/contrast\(([\d.]+)\)/);
	if (contrastMatch) {
		const val = parseFloat(contrastMatch[1]);
		const intercept = -(0.5 * val) + 0.5;
		const result = 'satori_bfcon';
		primitives += buildXMLString(
			'feComponentTransfer',
			{ in: lastResult, result },
			buildXMLString('feFuncR', {
				intercept,
				slope: val,
				type: 'linear'
			}) +
				buildXMLString('feFuncG', {
					intercept,
					slope: val,
					type: 'linear'
				}) +
				buildXMLString('feFuncB', {
					intercept,
					slope: val,
					type: 'linear'
				})
		);
		lastResult = result;
	}

	// grayscale(N) or grayscale(N%)
	const grayscaleMatch = value.match(/grayscale\(([\d.]+)(%?)\)/);
	if (grayscaleMatch) {
		const val =
			grayscaleMatch[2] === '%'
				? parseFloat(grayscaleMatch[1]) / 100
				: parseFloat(grayscaleMatch[1]);
		const result = 'satori_bfgray';
		primitives += buildXMLString('feColorMatrix', {
			in: lastResult,
			result,
			type: 'saturate',
			values: 1 - Math.min(val, 1)
		});
		lastResult = result;
	}

	// Fix blur edge transparency: composite with source to force opaque output
	// where the original was opaque. Without this, feGaussianBlur fades to
	// transparent at content boundaries (edgeMode="duplicate" is not widely
	// supported by SVG renderers like resvg).
	if (hasBlur) {
		primitives += buildXMLString('feComposite', {
			in: lastResult,
			in2: 'SourceGraphic',
			operator: 'atop'
		});
	}

	return primitives;
};

export const buildBackdropFilter = (
	options: BuildBackdropFilterOptions
): string => {
	const {
		bgGroupId,
		filterValue,
		height,
		id,
		left,
		maskId,
		style,
		top,
		width
	} = options;

	const primitives = parseFilterValue(filterValue);
	if (!primitives) {
		return '';
	}

	const filterId = `satori_bf-${id}`;
	const clipId = `satori_bfc-${id}`;

	// Filter definition with generous region for blur overflow.
	const filterDef = buildXMLString(
		'filter',
		{
			height: '200%',
			id: filterId,
			width: '200%',
			x: '-50%',
			y: '-50%'
		},
		primitives
	);

	// Clip path — use border-radius path when available, else a rect.
	const borderRadiusPath = radius({ height, left, top, width }, style);
	const clipContent = borderRadiusPath
		? buildXMLString('path', { d: borderRadiusPath })
		: buildXMLString('rect', { height, width, x: left, y: top });
	const clipDef = buildXMLString('clipPath', { id: clipId }, clipContent);

	const defs = buildXMLString('defs', {}, filterDef + clipDef);

	// Build the <use> inside a clip group. The filter is on the <use> so the
	// blur operates on the FULL content, then the outer <g> clips the result.
	const useElement = buildXMLString('use', {
		filter: `url(#${filterId})`,
		href: `#${bgGroupId}`
	});

	// Outer <g> clips the blurred result; mask is also on the outer group.
	const gAttrs: Record<string, string> = {
		'clip-path': `url(#${clipId})`
	};

	if (maskId) {
		gAttrs.mask = `url(#${maskId})`;
	}

	return defs + buildXMLString('g', gAttrs, useElement);
};
