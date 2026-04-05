import CssDimension from '../vendor/parse-css-dimension/index.js';
import type { ParsedTransformOrigin } from '../transform-origin.js';

import type { Background } from './background-image.js';
import backgroundImage from './background-image.js';
import border, { getBorderClipPath } from './border.js';
import buildMaskImage from './mask-image.js';
import overflow from './overflow.js';
import radius, { getBorderRadiusClipPath } from './border-radius.js';
import transform from './transform.js';
import { boxShadow } from './shadow.js';
import { buildXMLString } from '../utils.js';
import { genClipPath } from './clip-path.js';

/**
 * Parse object-position value into [xOffset, yOffset] in pixels.
 * Supports keywords (left, center, right, top, bottom), percentages, and lengths.
 * Similar to background-position parsing.
 */
const parseObjectPosition = (
	position: string,
	containerWidth: number,
	containerHeight: number
): [number, number] => {
	const parts = position.toLowerCase().trim().split(/\s+/);

	// Convert keyword to percentage
	const keywordToPercent = (keyword: string, axis: 'x' | 'y'): string => {
		const map = {
			bottom: '100%',
			center: '50%',
			left: '0%',
			right: '100%',
			top: '0%'
		};
		return map[keyword] || keyword;
	};

	let xValue: string;
	let yValue: string;

	if (parts.length === 1) {
		const part = parts[0];
		// Single value
		if (part === 'left' || part === 'center' || part === 'right') {
			xValue = keywordToPercent(part, 'x');
			yValue = '50%'; // center
		} else if (part === 'top' || part === 'bottom') {
			xValue = '50%'; // center
			yValue = keywordToPercent(part, 'y');
		} else {
			// Assume it's x value, y defaults to center
			xValue = part;
			yValue = '50%';
		}
	} else {
		// Two or more values
		const first = parts[0];
		const second = parts[1];

		// Check if first is a y-axis keyword (top/bottom)
		if (first === 'top' || first === 'bottom') {
			yValue = keywordToPercent(first, 'y');
			if (
				second === 'left' ||
				second === 'right' ||
				second === 'center'
			) {
				xValue = keywordToPercent(second, 'x');
			} else {
				// Second is a length/percentage, default x to center
				xValue = '50%';
				yValue =
					first === 'top' || first === 'bottom'
						? keywordToPercent(first, 'y')
						: second;
			}
		} else {
			// Normal order: x then y
			xValue = keywordToPercent(first, 'x');
			yValue = keywordToPercent(second, 'y');
		}
	}

	// Convert to absolute pixels
	const parseValue = (value: string, containerSize: number): number => {
		try {
			if (value.endsWith('%')) {
				return (containerSize * parseFloat(value)) / 100;
			}
			const parsed = new CssDimension(value);
			if (parsed.type === 'length' || parsed.type === 'number') {
				return parsed.value;
			}
			return 0;
		} catch (e) {
			return 0;
		}
	};

	return [
		parseValue(xValue, containerWidth),
		parseValue(yValue, containerHeight)
	];
};

const rect = async (
	{
		debug,
		height,
		id,
		isInheritingTransform,
		left,
		src,
		top,
		width
	}: {
		debug?: boolean;
		height: number;
		id: string;
		isInheritingTransform: boolean;
		left: number;
		src?: string;
		top: number;
		width: number;
	},
	style: Record<string, number | string>,
	inheritableStyle: Record<string, number | string>
) => {
	if (style.display === 'none') {
		return '';
	}

	const isImage = !!src;

	let type: 'rect' | 'path' = 'rect';
	let matrix = '';
	let defs = '';
	let fills: string[] = [];
	let opacity = 1;
	let extra = '';

	if (style.backgroundColor) {
		fills.push(style.backgroundColor as string);
	}

	if (style.opacity !== undefined) {
		opacity = +style.opacity;
	}

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

	let backgroundShapes = '';
	if (style.backgroundImage) {
		const backgrounds: string[][] = [];
		const bgImages = style.backgroundImage as unknown as Background[];

		for (let index = 0; index < bgImages.length; index++) {
			const background = bgImages[index];
			const image = await backgroundImage(
				{ height, id: id + '_' + index, left, top, width },
				background,
				inheritableStyle
			);
			if (image) {
				// Background images that come first in the array are rendered last.
				backgrounds.unshift(image);
			}
		}

		for (const background of backgrounds) {
			fills.push(`url(#${background[0]})`);
			defs += background[1];
			if (background[2]) {
				backgroundShapes += background[2];
			}
		}
	}

	const [miId, mi] = await buildMaskImage(
		{ height, id, left, top, width },
		style,
		inheritableStyle
	);

	defs += mi;
	const maskId = miId
		? `url(#${miId})`
		: style._inheritedMaskId
		? `url(#${style._inheritedMaskId})`
		: undefined;

	const path = radius(
		{ height, left, top, width },
		style as Record<string, number>
	);
	if (path) {
		type = 'path';
	}

	const clipPathId = style._inheritedClipPathId as number | undefined;

	if (debug) {
		extra = buildXMLString('rect', {
			'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
			fill: 'transparent',
			height,
			stroke: '#ff5757',
			'stroke-width': 1,
			transform: matrix || undefined,
			width,
			x: left,
			y: top
		});
	}

	const { backgroundClip, mixBlendMode } = style;

	const inlineStyle = mixBlendMode
		? `mix-blend-mode:${mixBlendMode}`
		: undefined;

	const currentClipPath =
		backgroundClip === 'text'
			? `url(#satori_bct-${id})`
			: clipPathId
			? `url(#${clipPathId})`
			: style.clipPath
			? genClipPath(id)
			: undefined;

	const clip = overflow(
		{ currentClipPath, height, id, left, matrix, path, src, top, width },
		style as Record<string, number>,
		inheritableStyle
	);

	// Each background generates a new rectangle.
	// @TODO: Not sure if this is the best way to do it, maybe <pattern> with
	// multiple <image>s is better.
	let shape = fills
		.map(fill => {
			return buildXMLString(type, {
				'clip-path': style.transform ? undefined : currentClipPath,
				d: path ? path : undefined,
				fill,
				height,
				mask: style.transform ? undefined : maskId,
				style: inlineStyle,
				transform: matrix ? matrix : undefined,
				width,
				x: left,
				y: top
			});
		})
		.join('');

	const borderClip = getBorderClipPath(
		{
			borderPath: path,
			borderType: type,
			currentClipPathId: clipPathId,
			height,
			id,
			left,
			top,
			width
		},
		style
	);

	// border radius for images with transform property
	let imageBorderRadius = undefined;

	// If it's an image (<img>) tag, we add an extra layer of the image itself.
	if (isImage) {
		// We need to subtract the border and padding sizes from the image size.
		const offsetLeft =
			((style.borderLeftWidth as number) || 0) +
			((style.paddingLeft as number) || 0);
		const offsetTop =
			((style.borderTopWidth as number) || 0) +
			((style.paddingTop as number) || 0);
		const offsetRight =
			((style.borderRightWidth as number) || 0) +
			((style.paddingRight as number) || 0);
		const offsetBottom =
			((style.borderBottomWidth as number) || 0) +
			((style.paddingBottom as number) || 0);

		const containerInnerWidth = width - offsetLeft - offsetRight;
		const containerInnerHeight = height - offsetTop - offsetBottom;

		// Parse object-position
		const position = (style.objectPosition || 'center').toString();
		const [objPosX, objPosY] = parseObjectPosition(
			position,
			containerInnerWidth,
			containerInnerHeight
		);

		// Get natural image dimensions if available
		const naturalWidth =
			(style.__naturalWidth as number) || containerInnerWidth;
		const naturalHeight =
			(style.__naturalHeight as number) || containerInnerHeight;

		// Calculate objectFit behavior
		let preserveAspectRatio: string;
		let imageWidth = containerInnerWidth;
		let imageHeight = containerInnerHeight;
		let imageX = left + offsetLeft;
		let imageY = top + offsetTop;

		if (style.objectFit === 'contain') {
			// Scale to fit within container while preserving aspect ratio
			const scaleX = containerInnerWidth / naturalWidth;
			const scaleY = containerInnerHeight / naturalHeight;
			const scale = Math.min(scaleX, scaleY);

			imageWidth = naturalWidth * scale;
			imageHeight = naturalHeight * scale;

			// Apply object-position to center the image within the container
			imageX =
				left +
				offsetLeft +
				objPosX -
				(imageWidth * objPosX) / containerInnerWidth;
			imageY =
				top +
				offsetTop +
				objPosY -
				(imageHeight * objPosY) / containerInnerHeight;

			preserveAspectRatio = 'none';
		} else if (style.objectFit === 'cover') {
			// Scale to cover the container while preserving aspect ratio
			const scaleX = containerInnerWidth / naturalWidth;
			const scaleY = containerInnerHeight / naturalHeight;
			const scale = Math.max(scaleX, scaleY);

			imageWidth = naturalWidth * scale;
			imageHeight = naturalHeight * scale;

			// Apply object-position
			imageX =
				left +
				offsetLeft +
				objPosX -
				(imageWidth * objPosX) / containerInnerWidth;
			imageY =
				top +
				offsetTop +
				objPosY -
				(imageHeight * objPosY) / containerInnerHeight;

			preserveAspectRatio = 'none';
		} else if (style.objectFit === 'fill') {
			// Stretch to fill (ignore aspect ratio)
			preserveAspectRatio = 'none';
		} else if (style.objectFit === 'scale-down') {
			if (naturalWidth && naturalHeight) {
				// Calculate if we need to scale down
				const scaleX = containerInnerWidth / naturalWidth;
				const scaleY = containerInnerHeight / naturalHeight;
				const minScale = Math.min(scaleX, scaleY);

				if (minScale >= 1) {
					// Image is smaller than or equal to container
					// Use natural size (don't scale up)
					imageWidth = naturalWidth;
					imageHeight = naturalHeight;
					preserveAspectRatio = 'none';

					// Apply object-position to position the un-scaled image
					imageX =
						left +
						offsetLeft +
						objPosX -
						(imageWidth * objPosX) / containerInnerWidth;
					imageY =
						top +
						offsetTop +
						objPosY -
						(imageHeight * objPosY) / containerInnerHeight;
				} else {
					// Image is larger than container, scale down like 'contain'
					const scale = minScale;
					imageWidth = naturalWidth * scale;
					imageHeight = naturalHeight * scale;

					// Apply object-position
					imageX =
						left +
						offsetLeft +
						objPosX -
						(imageWidth * objPosX) / containerInnerWidth;
					imageY =
						top +
						offsetTop +
						objPosY -
						(imageHeight * objPosY) / containerInnerHeight;

					preserveAspectRatio = 'none';
				}
			} else {
				// Fall back to 'contain' behavior if natural dimensions are unavailable
				const scaleX = containerInnerWidth / naturalWidth;
				const scaleY = containerInnerHeight / naturalHeight;
				const scale = Math.min(scaleX, scaleY);

				imageWidth = naturalWidth * scale;
				imageHeight = naturalHeight * scale;

				imageX =
					left +
					offsetLeft +
					objPosX -
					(imageWidth * objPosX) / containerInnerWidth;
				imageY =
					top +
					offsetTop +
					objPosY -
					(imageHeight * objPosY) / containerInnerHeight;

				preserveAspectRatio = 'none';
			}
		} else {
			// Default/none: fill (stretch)
			preserveAspectRatio = 'none';
		}

		if (style.transform) {
			imageBorderRadius = getBorderRadiusClipPath(
				{
					borderRadiusPath: path,
					borderType: type,
					height,
					id,
					left,
					top,
					width
				},
				style
			);
		}

		shape += buildXMLString('image', {
			'clip-path': style.transform
				? imageBorderRadius
					? `url(#${imageBorderRadius[1]})`
					: undefined
				: `url(#satori_cp-${id})`,
			height: imageHeight,
			href: src,
			mask: style.transform
				? undefined
				: miId
				? `url(#${miId})`
				: `url(#satori_om-${id})`,
			preserveAspectRatio,
			style: inlineStyle,
			transform: matrix ? matrix : undefined,
			width: imageWidth,
			x: imageX,
			y: imageY
		});
	}

	if (borderClip) {
		defs += borderClip[0];
		const rectClipId = borderClip[1];

		shape += border(
			{
				height,
				left,
				props: {
					// When using `background-clip: text`, we need to draw the extra border because
					// it shouldn't be clipped by the clip path, so we are not using currentClipPath here.
					'clip-path': `url(#${rectClipId})`,
					transform: matrix ? matrix : undefined
				},
				top,
				width
			},
			style
		);
	}

	// box-shadow.
	const shadow = boxShadow(
		{
			height,
			id,
			opacity,
			shape: buildXMLString(type, {
				'clip-path': currentClipPath,
				d: path ? path : undefined,
				fill: '#fff',
				height,
				mask: maskId,
				stroke: '#fff',
				'stroke-width': 0,
				transform: matrix ? matrix : undefined,
				width,
				x: left,
				y: top
			}),
			width
		},
		style
	);

	return (
		(defs ? buildXMLString('defs', {}, defs) : '') +
		(shadow ? shadow[0] : '') +
		(imageBorderRadius ? imageBorderRadius[0] : '') +
		clip +
		(opacity !== 1 ? `<g opacity="${opacity}">` : '') +
		(style.transform && (currentClipPath || maskId)
			? `<g${currentClipPath ? ` clip-path="${currentClipPath}"` : ''}${
					maskId ? ` mask="${maskId}"` : ''
			  }>`
			: '') +
		(backgroundShapes || shape) +
		(style.transform && (currentClipPath || maskId) ? '</g>' : '') +
		(opacity !== 1 ? `</g>` : '') +
		(shadow ? shadow[1] : '') +
		extra
	);
};

export default rect;
