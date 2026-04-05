import { buildXMLString } from '../utils.js';
import type { MaskProperty } from '../parser/mask.js';

import buildBackgroundImage from './background-image.js';

const genMaskImageId = (id: string) => {
	return `satori_mi-${id}`;
};

const buildMaskImage = async (
	v: {
		height: number;
		id: string;
		left: number;
		top: number;
		width: number;
	},
	style: Record<string, string | number>,
	inheritedStyle: Record<string, string | number>
): Promise<[string, string]> => {
	if (!style.maskImage) {
		return ['', ''];
	}
	const { height, id, left, top, width } = v;
	const maskImage = style.maskImage as unknown as MaskProperty[];
	const length = maskImage.length;
	if (!length) {
		return ['', ''];
	}
	const miId = genMaskImageId(id);

	let mask = '';

	for (let i = 0; i < length; i++) {
		const m = maskImage[i];

		const [_id, def] = await buildBackgroundImage(
			{ height, id: `${miId}-${i}`, left, top, width },
			m,
			inheritedStyle,
			'mask'
		);

		mask +=
			def +
			buildXMLString('rect', {
				fill: `url(#${_id})`,
				height,
				width,
				x: left,
				y: top
			});
	}

	mask = buildXMLString('mask', { id: miId }, mask);

	return [miId, mask];
};

export default buildMaskImage;
