import CssDimension from '../vendor/parse-css-dimension/index.js';
import cssColorParse from 'parse-css-color';
import { buildXMLString } from '../utils.js';

import { buildLinearGradient } from './gradient/linear.js';
import { buildRadialGradient } from './gradient/radial.js';
import { resolveImageData } from '../handler/image.js';

type Background = {
	attachment?: string;
	clip: string;
	color?: string;
	image: string;
	origin?: string;
	position: string;
	repeat: string;
	size: string;
};

const toAbsoluteValue = (v: string | number, base: number) => {
	if (typeof v === 'string' && v.endsWith('%')) {
		return (base * parseFloat(v)) / 100;
	}
	return typeof v === 'string' ? parseFloat(v) || 0 : +v;
};

const calculateKeywordSize = (
	keyword: string,
	containerWidth: number,
	containerHeight: number,
	imageWidth: number,
	imageHeight: number
): [number, number] => {
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
};

const positionKeywordMap: Record<string, string> = {
	bottom: '100%',
	center: '50%',
	left: '0%',
	right: '100%',
	top: '0%'
};

const parsePositionValues = (str: string): { x: string; y: string } => {
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
};

const computeBgPositionOffset = (
	rawValue: string,
	containerSize: number,
	imageSize: number
): number => {
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
};

const parseLengthPairs = (
	str: string,
	{
		defaultX,
		defaultY,
		x,
		y
	}: {
		defaultX: number | string;
		defaultY: number | string;
		x: number;
		y: number;
	}
) => {
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
				.filter(v => {
					return v !== null;
				})
		: [defaultX, defaultY];

	if (parsed.length === 0) {
		return [toAbsoluteValue(defaultX, x), toAbsoluteValue(defaultY, y)];
	}

	if (parsed.length === 1) {
		parsed.push(defaultY);
	}

	return parsed.map((v, index) => {
		return toAbsoluteValue(v, [x, y][index]);
	});
};

const backgroundImage = async (
	{
		height,
		id,
		left,
		top,
		width
	}: { height: number; id: string; left: number; top: number; width: number },
	{ image, position, repeat, size }: Background,
	inheritableStyle: Record<string, number | string>,
	from?: 'background' | 'mask'
): Promise<string[]> => {
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
					defaultX: width,
					defaultY: height,
					x: width,
					y: height
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
			{ height, id, repeatX, repeatY, width },
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
			{ height, id, repeatX, repeatY, width },
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
				defaultX: 0,
				defaultY: 0,
				x: width,
				y: height
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
						height: repeatY ? resolvedHeight : '100%',
						id: `satori_bi${id}`,
						patternContentUnits: 'userSpaceOnUse',
						patternUnits: 'userSpaceOnUse',
						width: repeatX ? resolvedWidth : '100%',
						x: (repeatX ? imageOffsetX : 0) + left,
						y: (repeatY ? imageOffsetY : 0) + top
					},
					buildXMLString('image', {
						height: resolvedHeight,
						href: src,
						preserveAspectRatio: 'none',
						width: resolvedWidth,
						x: repeatX ? 0 : imageOffsetX,
						y: repeatY ? 0 : imageOffsetY
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
					height: repeatY ? resolvedHeight : '100%',
					id: `satori_bi${id}`,
					patternContentUnits: 'userSpaceOnUse',
					patternUnits: 'userSpaceOnUse',
					width: repeatX ? resolvedWidth : '100%',
					x: (repeatX ? imageOffsetX : 0) + left,
					y: (repeatY ? imageOffsetY : 0) + top
				},
				buildXMLString('image', {
					height: resolvedHeight,
					href: src,
					preserveAspectRatio: 'none',
					width: resolvedWidth,
					x: repeatX ? 0 : imageOffsetX,
					y: repeatY ? 0 : imageOffsetY
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
					height: height,
					id: `satori_bi${id}`,
					patternContentUnits: 'userSpaceOnUse',
					patternUnits: 'userSpaceOnUse',
					width: width,
					x: left,
					y: top
				},
				buildXMLString('rect', {
					fill: color,
					height: height,
					width: width,
					x: 0,
					y: 0
				})
			)
		];
	}

	throw new Error(`Invalid background image: "${image}"`);
};

export type { Background };
export { computeBgPositionOffset, parsePositionValues };
export default backgroundImage;
