import { getPropertyName } from 'css-to-react-native';

import { splitEffects } from '../utils.js';

const getMaskProperty = (
	style: Record<string, string | number>,
	name: string
) => {
	const key = getPropertyName(`mask-${name}`);
	return (style[key] || style[`WebkitM${key.substring(1)}`]) as string;
};

type MaskProperty = {
	clip: string;
	image: string;
	origin: string;
	position: string;
	repeat: string;
	size: string;
};

const parseMask = (style: Record<string, string | number>): MaskProperty[] => {
	const maskImage = (style.maskImage || style.WebkitMaskImage) as string;

	const common = {
		clip: getMaskProperty(style, 'origin') || 'border-box',
		origin: getMaskProperty(style, 'origin') || 'border-box',
		position: getMaskProperty(style, 'position') || '0% 0%',
		repeat: getMaskProperty(style, 'repeat') || 'repeat',
		size: getMaskProperty(style, 'size') || '100% 100%'
	};

	let maskImages = splitEffects(maskImage).filter(v => {
		return v && v !== 'none';
	});

	return maskImages.reverse().map(m => {
		return {
			image: m,
			...common
		};
	});
};

export type { MaskProperty };
export { parseMask };
