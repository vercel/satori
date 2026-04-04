import CssDimension from '../vendor/parse-css-dimension/index.js';
import { buildXMLString } from '../utils.js';

import { resolveImageData } from '../handler/image.js';
import { buildLinearGradient } from './gradient/linear.js';
import { buildRadialGradient } from './gradient/radial.js';
import cssColorParse from 'parse-css-color';

interface Background {
	attachment?: string;
	color?: string;
	clip: string;
	image: string;
	origin?: string;
	position: string;
	size: string;
	repeat: string;
}

function toAbsoluteValue(v: string | number, base: number) {
	if (typeof v === 'string' && v.endsWith('%')) {
		return (base * parseFloat(v)) / 100;
	}
	return typeof v === 'string' ? parseFloat(v) || 0 : +v;
}

function calculateKeywordSize(
	keyword: string,
	containerWidth: number,
	containerHeight: number,
	imageWidth: number,
	imageHeight: number
): [number, number] {
	if (!imageWidth || !imageHeight) {
		return [containerWidth, containerHeight];
	}

	if (keyword === 'cover') {
		// Scale to cover the container (use max scale to ensure it covers)
		const scaleX = containerWidth / imageWidth;
		const scaleY = containerHeight / imageHeight;
		const scale = Math.max(scaleX, scaleY);
		return [imageWidth * scale, imageHeight * scale];
	}

	if (keyword === 'contain') {
		// Scale to fit within the container (use min scale to ensure it fits)
		const scaleX = containerWidth / imageWidth;
		const scaleY = containerHeight / imageHeight;
		const scale = Math.min(scaleX, scaleY);
		return [imageWidth * scale, imageHeight * scale];
	}

	// For 'auto' or other values, handle auto
	if (keyword === 'auto' || keyword.includes('auto')) {
		const parts = keyword.split(' ');
		const widthPart = parts[0] || 'auto';
		const heightPart = parts[1] || parts[0] || 'auto';

		let finalWidth = imageWidth;
		let finalHeight = imageHeight;

		if (widthPart === 'auto' && heightPart !== 'auto') {
			// Width is auto, height is specified
			const parsedHeight = toAbsoluteValue(heightPart, containerHeight);
			finalHeight = parsedHeight;
			finalWidth = (imageWidth / imageHeight) * parsedHeight;
		} else if (heightPart === 'auto' && widthPart !== 'auto') {
			// Height is auto, width is specified
			const parsedWidth = toAbsoluteValue(widthPart, containerWidth);
			finalWidth = parsedWidth;
			finalHeight = (imageHeight / imageWidth) * parsedWidth;
		}
		// If both are auto, use intrinsic dimensions

		return [finalWidth, finalHeight];
	}

	return [containerWidth, containerHeight];
}

const positionKeywordMap: Record<string, string> = {
	bottom: '100%',
	center: '50%',
	left: '0%',
	right: '100%',
	top: '0%'
};

export function parsePositionValues(str: string): { x: string; y: string } {
	if (!str) {
		return { x: '0%', y: '0%' };
	}

	const parts = str.split(' ').filter(Boolean);

	if (parts.length === 1) {
		const part = parts[0];

		if (part in positionKeywordMap) {
			if (part === 'top' || part === 'bottom') {
				return { x: '50%', y: positionKeywordMap[part] };
			}

			return { x: positionKeywordMap[part], y: '50%' };
		}

		return { x: part, y: '50%' };
	}

	return {
		x: positionKeywordMap[parts[0]] || parts[0],
		y: positionKeywordMap[parts[1]] || parts[1]
	};
}

export function computeBgPositionOffset(
	rawValue: string,
	containerSize: number,
	imageSize: number
): number {
	if (rawValue.endsWith('%')) {
		const percentage = parseFloat(rawValue) / 100;
		// CSS spec: offset = (containerSize - imageSize) * percentage
		return (containerSize - imageSize) * percentage;
	}

	try {
		const parsed = new CssDimension(rawValue);

		return parsed.type === 'length' || parsed.type === 'number'
			? parsed.value
			: toAbsoluteValue(parsed.value + parsed.unit, containerSize);
	} catch {
		return 0;
	}
}

function parseLengthPairs(
	str: string,
	{
		x,
		y,
		defaultX,
		defaultY
	}: {
		x: number;
		y: number;
		defaultX: number | string;
		defaultY: number | string;
	}
) {
	const parsed = str
		? str
				.split(' ')
				.map(value => {
					try {
						const dim = new CssDimension(value);
						return dim.type === 'length' || dim.type === 'number'
							? dim.value
							: dim.value + dim.unit;
					} catch (e) {
						return null;
					}
				})
				.filter(v => v !== null)
		: [defaultX, defaultY];

	if (parsed.length === 0) {
		return [toAbsoluteValue(defaultX, x), toAbsoluteValue(defaultY, y)];
	}

	if (parsed.length === 1) {
		parsed.push(defaultY);
	}

	return parsed.map((v, index) => toAbsoluteValue(v, [x, y][index]));
}

export default async function backgroundImage(
	{
		id,
		width,
		height,
		left,
		top
	}: { id: string; width: number; height: number; left: number; top: number },
	{ image, size, position, repeat }: Background,
	inheritableStyle: Record<string, number | string>,
	from?: 'background' | 'mask'
): Promise<string[]> {
	// Default to `repeat`.
	repeat = repeat || 'repeat';
	from = from || 'background';

	// CSS spec: default background-size is 'auto' (use intrinsic dimensions).
	size = size || 'auto';

	// CSS spec: single-value size means "<value> auto" (maintain aspect ratio).
	if (
		size !== 'cover' &&
		size !== 'contain' &&
		size !== 'auto' &&
		!size.includes(' ')
	) {
		size = `${size} auto`;
	}

	const repeatX = repeat === 'repeat-x' || repeat === 'repeat';
	const repeatY = repeat === 'repeat-y' || repeat === 'repeat';

	// Check if size is a keyword (cover, contain, auto) that needs to be calculated later
	const isKeywordSize =
		size &&
		(size === 'cover' ||
			size === 'contain' ||
			size === 'auto' ||
			size.includes('auto'));

	// For gradients, keyword sizes (cover, contain, auto) resolve to the
	// container dimensions since gradients have no intrinsic size.
	// For url() images, keyword sizes are calculated later using the image's
	// intrinsic dimensions.
	const isGradient =
		image.startsWith('linear-gradient(') ||
		image.startsWith('repeating-linear-gradient(') ||
		image.startsWith('radial-gradient(') ||
		image.startsWith('repeating-radial-gradient(');

	const dimensions =
		isKeywordSize && isGradient
			? [width, height] // Gradients have no intrinsic size; keyword sizes resolve to container
			: isKeywordSize
			? [0, 0] // Will be calculated later when we have image dimensions
			: parseLengthPairs(size, {
					x: width,
					y: height,
					defaultX: width,
					defaultY: height
			  });
	const normalizedPos = parsePositionValues(position);

	if (
		image.startsWith('linear-gradient(') ||
		image.startsWith('repeating-linear-gradient(')
	) {
		const offsets = [
			computeBgPositionOffset(normalizedPos.x, width, dimensions[0]),
			computeBgPositionOffset(normalizedPos.y, height, dimensions[1])
		];
		return buildLinearGradient(
			{ id, width, height, repeatX, repeatY },
			image,
			dimensions,
			offsets,
			inheritableStyle,
			from
		);
	}

	if (
		image.startsWith('radial-gradient(') ||
		image.startsWith('repeating-radial-gradient(')
	) {
		const offsets = [
			computeBgPositionOffset(normalizedPos.x, width, dimensions[0]),
			computeBgPositionOffset(normalizedPos.y, height, dimensions[1])
		];
		return buildRadialGradient(
			{ id, width, height, repeatX, repeatY },
			image,
			dimensions,
			offsets,
			inheritableStyle,
			from
		);
	}

	if (image.startsWith('url(')) {
		const imageSrc = image.slice(4, -1);
		if (!imageSrc) {
			return [];
		}
		const [src, imageWidth, imageHeight] = await resolveImageData(imageSrc);

		let resolvedWidth: number;
		let resolvedHeight: number;

		if (isKeywordSize) {
			// Calculate dimensions based on keyword (cover, contain, auto)
			const [calcWidth, calcHeight] = calculateKeywordSize(
				size,
				width,
				height,
				imageWidth,
				imageHeight
			);
			resolvedWidth = calcWidth;
			resolvedHeight = calcHeight;
		} else {
			// Use the previously parsed dimensions
			const dimensionsWithoutFallback = parseLengthPairs(size, {
				x: width,
				y: height,
				defaultX: 0,
				defaultY: 0
			});
			resolvedWidth =
				from === 'mask'
					? imageWidth || dimensionsWithoutFallback[0]
					: dimensionsWithoutFallback[0] || imageWidth;
			resolvedHeight =
				from === 'mask'
					? imageHeight || dimensionsWithoutFallback[1]
					: dimensionsWithoutFallback[1] || imageHeight;
		}

		if (isKeywordSize) {
			// For keyword sizes (cover, contain, auto), apply CSS background-position
			// formula: offset = (containerSize - imageSize) * percentage
			const rawPos = parsePositionValues(position);
			const imageOffsetX = computeBgPositionOffset(
				rawPos.x,
				width,
				resolvedWidth
			);
			const imageOffsetY = computeBgPositionOffset(
				rawPos.y,
				height,
				resolvedHeight
			);

			return [
				`satori_bi${id}`,
				buildXMLString(
					'pattern',
					{
						id: `satori_bi${id}`,
						patternContentUnits: 'userSpaceOnUse',
						patternUnits: 'userSpaceOnUse',
						x: (repeatX ? imageOffsetX : 0) + left,
						y: (repeatY ? imageOffsetY : 0) + top,
						width: repeatX ? resolvedWidth : '100%',
						height: repeatY ? resolvedHeight : '100%'
					},
					buildXMLString('image', {
						x: repeatX ? 0 : imageOffsetX,
						y: repeatY ? 0 : imageOffsetY,
						width: resolvedWidth,
						height: resolvedHeight,
						preserveAspectRatio: 'none',
						href: src
					})
				)
			];
		}

		const rawPos = parsePositionValues(position);
		const imageOffsetX = computeBgPositionOffset(
			rawPos.x,
			width,
			resolvedWidth
		);
		const imageOffsetY = computeBgPositionOffset(
			rawPos.y,
			height,
			resolvedHeight
		);

		return [
			`satori_bi${id}`,
			buildXMLString(
				'pattern',
				{
					id: `satori_bi${id}`,
					patternContentUnits: 'userSpaceOnUse',
					patternUnits: 'userSpaceOnUse',
					x: (repeatX ? imageOffsetX : 0) + left,
					y: (repeatY ? imageOffsetY : 0) + top,
					width: repeatX ? resolvedWidth : '100%',
					height: repeatY ? resolvedHeight : '100%'
				},
				buildXMLString('image', {
					x: repeatX ? 0 : imageOffsetX,
					y: repeatY ? 0 : imageOffsetY,
					width: resolvedWidth,
					height: resolvedHeight,
					preserveAspectRatio: 'none',
					href: src
				})
			)
		];
	}

	if (cssColorParse(image)) {
		const colorObj = cssColorParse(image);
		const [r, g, b, a] = colorObj.values;
		const alpha = a !== undefined ? a : 1;
		const color = `rgba(${r},${g},${b},${alpha})`;

		return [
			`satori_bi${id}`,
			buildXMLString(
				'pattern',
				{
					id: `satori_bi${id}`,
					patternContentUnits: 'userSpaceOnUse',
					patternUnits: 'userSpaceOnUse',
					x: left,
					y: top,
					width: width,
					height: height
				},
				buildXMLString('rect', {
					x: 0,
					y: 0,
					width: width,
					height: height,
					fill: color
				})
			)
		];
	}

	throw new Error(`Invalid background image: "${image}"`);
}
