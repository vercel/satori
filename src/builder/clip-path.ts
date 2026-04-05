import { buildXMLString } from '../utils.js';
import { createShapeParser } from '../parser/shape.js';

const genClipPathId = (id: string) => {
	return `satori_cp-${id}`;
};

const genClipPath = (id: string) => {
	return `url(#${genClipPathId(id)})`;
};

const buildClipPath = (
	v: {
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
	inheritedStyle: Record<string, string | number>
) => {
	if (style.clipPath === 'none') {
		return '';
	}

	const parser = createShapeParser(v, style, inheritedStyle);
	const clipPath = style.clipPath as string;

	let tmp: { type: string; [p: string]: string | number } = { type: '' };

	for (const k of Object.keys(parser)) {
		tmp = parser[k](clipPath);
		if (tmp) {
			break;
		}
	}

	if (tmp) {
		const { type, ...rest } = tmp;
		return buildXMLString(
			'clipPath',
			{
				'clip-path': v.currentClipPath,
				id: genClipPathId(v.id),
				transform: `translate(${v.left}, ${v.top})`
			},
			buildXMLString(type, rest)
		);
	}
	return '';
};

export { buildClipPath, genClipPath, genClipPathId };
