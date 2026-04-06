/**
 * Generate clip path for the given element.
 */

import { buildXMLString } from '../utils';
import { buildClipPath, genClipPathId } from './clip-path';
import mask from './content-mask';

const overflow = (
	{
		currentClipPath,
		height,
		id,
		left,
		matrix,
		path,
		src,
		top,
		width
	}: {
		currentClipPath: string | string;
		height: number;
		id: string;
		left: number;
		matrix: string | undefined;
		path: string;
		src?: string;
		top: number;
		width: number;
	},
	style: Record<string, string | number>,
	inheritableStyle: Record<string, string | number>
) => {
	let overflowClipPath = '';
	const clipPath =
		style.clipPath && style.clipPath !== 'none'
			? buildClipPath(
					{
						currentClipPath,
						height,
						id,
						left,
						matrix,
						path,
						src,
						top,
						width
					},
					style as Record<string, number>,
					inheritableStyle
			  )
			: '';

	if (style.overflow !== 'hidden' && !src) {
		overflowClipPath = '';
	} else {
		const _id = clipPath ? `satori_ocp-${id}` : genClipPathId(id);

		overflowClipPath = buildXMLString(
			'clipPath',
			{
				'clip-path': currentClipPath,
				id: _id
			},
			buildXMLString(path ? 'path' : 'rect', {
				d: path ? path : undefined,
				height,
				// add transformation matrix to clip path if overflow is hidden AND a
				// transformation style is defined, otherwise children will be clipped
				// relative to the parent's original plane instead of the transformed
				// plane
				transform:
					style.overflow === 'hidden' && style.transform && matrix
						? matrix
						: undefined,
				width,
				x: left,
				y: top
			})
		);
	}

	const contentMask = mask(
		{
			borderOnly: src ? false : true,
			height,
			id: `satori_om-${id}`,
			left,
			matrix,
			top,
			width
		},
		style
	);

	return clipPath + overflowClipPath + contentMask;
};

export default overflow;
