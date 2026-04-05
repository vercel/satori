/**
 * When there is border radius, the content area should be clipped by the
 * inner path of border + padding. This applies to <img> element as well as any
 * child element inside a `overflow: hidden` container.
 */

import { buildXMLString } from '../utils.js';
import border from './border.js';

const contentMask = (
	{
		borderOnly,
		height,
		id,
		left,
		matrix,
		top,
		width
	}: {
		borderOnly?: boolean;
		height: number;
		id: string;
		left: number;
		matrix: string | undefined;
		top: number;
		width: number;
	},
	style: Record<string, number | string>
) => {
	const offsetLeft =
		((style.borderLeftWidth as number) || 0) +
		(borderOnly ? 0 : (style.paddingLeft as number) || 0);
	const offsetTop =
		((style.borderTopWidth as number) || 0) +
		(borderOnly ? 0 : (style.paddingTop as number) || 0);
	const offsetRight =
		((style.borderRightWidth as number) || 0) +
		(borderOnly ? 0 : (style.paddingRight as number) || 0);
	const offsetBottom =
		((style.borderBottomWidth as number) || 0) +
		(borderOnly ? 0 : (style.paddingBottom as number) || 0);

	const contentArea = {
		height: height - offsetTop - offsetBottom,
		width: width - offsetLeft - offsetRight,
		x: left + offsetLeft,
		y: top + offsetTop
	};

	const _contentMask = buildXMLString(
		'mask',
		{ id },
		buildXMLString('rect', {
			...contentArea,
			fill: '#fff',
			// add transformation matrix to mask if overflow is hidden AND a
			// transformation style is defined, otherwise children will be clipped
			// incorrectly
			mask: style._inheritedMaskId
				? `url(#${style._inheritedMaskId})`
				: undefined,
			transform:
				style.overflow === 'hidden' && style.transform && matrix
					? matrix
					: undefined
		}) +
			border(
				{
					asContentMask: true,
					height,
					left,
					maskBorderOnly: borderOnly,
					props: {
						transform: matrix ? matrix : undefined
					},
					top,
					width
				},
				style
			)
	);

	return _contentMask;
};

export default contentMask;
