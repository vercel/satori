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

	// brightness(N) or brightness(N%)
	const brightnessMatch = value.match(/brightness\(([\d.]+)(%?)\)/);
	if (brightnessMatch) {
		const val =
			brightnessMatch[2] === '%'
				? parseFloat(brightnessMatch[1]) / 100
				: parseFloat(brightnessMatch[1]);
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

	// contrast(N) or contrast(N%)
	const contrastMatch = value.match(/contrast\(([\d.]+)(%?)\)/);
	if (contrastMatch) {
		const val =
			contrastMatch[2] === '%'
				? parseFloat(contrastMatch[1]) / 100
				: parseFloat(contrastMatch[1]);
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

	// sepia(N) or sepia(N%)
	const sepiaMatch = value.match(/sepia\(([\d.]+)(%?)\)/);
	if (sepiaMatch) {
		const raw =
			sepiaMatch[2] === '%'
				? parseFloat(sepiaMatch[1]) / 100
				: parseFloat(sepiaMatch[1]);
		const s = Math.min(raw, 1);
		const result = 'satori_bfsep';
		// W3C sepia matrix interpolated with identity by (1 - amount).
		const m = [
			0.393 + 0.607 * (1 - s),
			0.769 - 0.769 * (1 - s),
			0.189 - 0.189 * (1 - s),
			0,
			0,
			0.349 - 0.349 * (1 - s),
			0.686 + 0.314 * (1 - s),
			0.168 - 0.168 * (1 - s),
			0,
			0,
			0.272 - 0.272 * (1 - s),
			0.534 - 0.534 * (1 - s),
			0.131 + 0.869 * (1 - s),
			0,
			0,
			0,
			0,
			0,
			1,
			0
		];
		primitives += buildXMLString('feColorMatrix', {
			in: lastResult,
			result,
			type: 'matrix',
			values: m.join(' ')
		});
		lastResult = result;
	}

	// hue-rotate(Ndeg)
	const hueRotateMatch = value.match(/hue-rotate\(([\d.]+)deg\)/);
	if (hueRotateMatch) {
		const degrees = parseFloat(hueRotateMatch[1]);
		const result = 'satori_bfhue';
		primitives += buildXMLString('feColorMatrix', {
			in: lastResult,
			result,
			type: 'hueRotate',
			values: degrees
		});
		lastResult = result;
	}

	// invert(N) or invert(N%)
	const invertMatch = value.match(/invert\(([\d.]+)(%?)\)/);
	if (invertMatch) {
		const raw =
			invertMatch[2] === '%'
				? parseFloat(invertMatch[1]) / 100
				: parseFloat(invertMatch[1]);
		const val = Math.min(raw, 1);
		const result = 'satori_bfinv';
		const tableValues = `${val} ${1 - val}`;
		primitives += buildXMLString(
			'feComponentTransfer',
			{ in: lastResult, result },
			buildXMLString('feFuncR', { tableValues, type: 'table' }) +
				buildXMLString('feFuncG', { tableValues, type: 'table' }) +
				buildXMLString('feFuncB', { tableValues, type: 'table' })
		);
		lastResult = result;
	}

	// opacity(N) or opacity(N%)
	const opacityMatch = value.match(/opacity\(([\d.]+)(%?)\)/);
	if (opacityMatch) {
		const raw =
			opacityMatch[2] === '%'
				? parseFloat(opacityMatch[1]) / 100
				: parseFloat(opacityMatch[1]);
		const val = Math.min(raw, 1);
		const result = 'satori_bfopa';
		primitives += buildXMLString(
			'feComponentTransfer',
			{ in: lastResult, result },
			buildXMLString('feFuncA', {
				tableValues: `0 ${val}`,
				type: 'table'
			})
		);
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

const buildBackdropFilter = (
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
			'color-interpolation-filters': 'linearRGB',
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

export { buildBackdropFilter };
