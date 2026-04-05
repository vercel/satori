import { buildXMLString } from '../utils.js';
import radius from './border-radius.js';

const compareBorderDirections = (a: string, b: string, style: any) => {
	return (
		style[a + 'Width'] === style[b + 'Width'] &&
		style[a + 'Style'] === style[b + 'Style'] &&
		style[a + 'Color'] === style[b + 'Color']
	);
};

const getBorderClipPath = (
	{
		borderPath,
		borderType,
		currentClipPathId,
		height,
		id,
		// Can be `overflow: hidden` from parent containers.
		left,
		top,
		width
	}: {
		borderPath?: string;
		borderType?: 'rect' | 'path';
		currentClipPathId?: string | number;
		height: number;
		id: string;
		left: number;
		top: number;
		width: number;
	},
	style: Record<string, number | string>
) => {
	const hasBorder =
		style.borderTopWidth ||
		style.borderRightWidth ||
		style.borderBottomWidth ||
		style.borderLeftWidth;

	if (!hasBorder) {
		return null;
	}

	// In SVG, stroke is always centered on the path and there is no
	// existing property to make it behave like CSS border. So here we
	// 2x the border width and introduce another clip path to clip the
	// overflowed part.
	const rectClipId = `satori_bc-${id}`;
	const defs = buildXMLString(
		'clipPath',
		{
			'clip-path': currentClipPathId
				? `url(#${currentClipPathId})`
				: undefined,
			id: rectClipId
		},
		buildXMLString(borderType, {
			d: borderPath ? borderPath : undefined,
			height,
			width,
			x: left,
			y: top
		})
	);

	return [defs, rectClipId];
};

const border = (
	{
		asContentMask,
		height,
		left,
		maskBorderOnly,
		props,
		top,
		width
	}: {
		asContentMask?: boolean;
		height: number;
		left: number;
		maskBorderOnly?: boolean;
		props: any;
		top: number;
		width: number;
	},
	style: Record<string, number | string>
) => {
	const directions = [
		'borderTop',
		'borderRight',
		'borderBottom',
		'borderLeft'
	];

	// No border
	if (
		!asContentMask &&
		!directions.some(direction => {
			return style[direction + 'Width'];
		})
	) {
		return '';
	}

	let fullBorder = '';

	let start = 0;
	while (
		start > 0 &&
		compareBorderDirections(
			directions[start],
			directions[(start + 3) % 4],
			style
		)
	) {
		start = (start + 3) % 4;
	}

	let partialSides = [false, false, false, false];
	let currentStyle = [];
	for (let _i = 0; _i < 4; _i++) {
		const i = (start + _i) % 4;
		const ni = (start + _i + 1) % 4;

		const d = directions[i];
		const nd = directions[ni];

		partialSides[i] = true;
		currentStyle = [
			style[d + 'Width'],
			style[d + 'Style'],
			style[d + 'Color'],
			d
		];

		if (!compareBorderDirections(d, nd, style)) {
			const w =
				(currentStyle[0] || 0) +
				(asContentMask && !maskBorderOnly
					? style[d.replace('border', 'padding')] || 0
					: 0);
			if (w) {
				fullBorder += buildXMLString('path', {
					d: radius(
						{ height, left, top, width },
						style as Record<string, number>,
						partialSides
					),
					fill: 'none',
					height,
					stroke: asContentMask ? '#000' : currentStyle[2],
					'stroke-dasharray':
						!asContentMask && currentStyle[1] === 'dashed'
							? w * 2 + ' ' + w
							: undefined,
					'stroke-width': w * 2,
					width,
					...props
				});
			}
			partialSides = [false, false, false, false];
		}
	}

	if (partialSides.some(Boolean)) {
		const w =
			(currentStyle[0] || 0) +
			(asContentMask && !maskBorderOnly
				? style[currentStyle[3].replace('border', 'padding')] || 0
				: 0);
		if (w) {
			fullBorder += buildXMLString('path', {
				d: radius(
					{ height, left, top, width },
					style as Record<string, number>,
					partialSides
				),
				fill: 'none',
				height,
				stroke: asContentMask ? '#000' : currentStyle[2],
				'stroke-dasharray':
					!asContentMask && currentStyle[1] === 'dashed'
						? w * 2 + ' ' + w
						: undefined,
				'stroke-width': w * 2,
				width,
				...props
			});
		}
	}

	return fullBorder;
};

export { getBorderClipPath };
export default border;
