import { getStylesForProperty } from 'css-to-react-native';

import { default as buildBorderRadius } from '../builder/border-radius';
import { lengthToNumber } from '../utils';

const regexMap = {
	circle: /circle\((.+)\)/,
	ellipse: /ellipse\((.+)\)/,
	inset: /inset\((.+)\)/,
	path: /path\((.+)\)/,
	polygon: /polygon\((.+)\)/
};

const createShapeParser = (
	{
		width,
		height
	}: {
		width: number;
		height: number;
	},
	style: Record<string, string | number>,
	inheritedStyle: Record<string, string | number>
) => {
	const parseCircle = (str: string) => {
		const res = str.match(regexMap['circle']);

		if (!res) {
			return null;
		}

		const [, value] = res;
		const [radius, pos = ''] = value.split('at').map(v => {
			return v.trim();
		});
		const { x, y } = resolvePosition(pos, width, height);

		return {
			cx: lengthToNumber(
				x,
				inheritedStyle.fontSize as number,
				width,
				inheritedStyle,
				true
			),
			cy: lengthToNumber(
				y,
				inheritedStyle.fontSize as number,
				height,
				inheritedStyle,
				true
			),
			r: lengthToNumber(
				radius,
				inheritedStyle.fontSize as number,
				Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2)) /
					Math.sqrt(2),
				inheritedStyle,
				true
			),
			type: 'circle'
		};
	};
	const parseEllipse = (str: string) => {
		const res = str.match(regexMap['ellipse']);

		if (!res) {
			return null;
		}

		const [, value] = res;
		const [radius, pos = ''] = value.split('at').map(v => {
			return v.trim();
		});
		const [rx, ry] = radius.split(' ');
		const { x, y } = resolvePosition(pos, width, height);

		return {
			cx: lengthToNumber(
				x,
				inheritedStyle.fontSize as number,
				width,
				inheritedStyle,
				true
			),
			cy: lengthToNumber(
				y,
				inheritedStyle.fontSize as number,
				height,
				inheritedStyle,
				true
			),
			rx: lengthToNumber(
				rx || '50%',
				inheritedStyle.fontSize as number,
				width,
				inheritedStyle,
				true
			),
			ry: lengthToNumber(
				ry || '50%',
				inheritedStyle.fontSize as number,
				height,
				inheritedStyle,
				true
			),
			type: 'ellipse'
		};
	};
	const parsePath = (str: string) => {
		const res = str.match(regexMap['path']);

		if (!res) {
			return null;
		}

		const [fillRule, d] = resolveFillRule(res[1]);

		return {
			d,
			'fill-rule': fillRule,
			type: 'path'
		};
	};
	const parsePolygon = (str: string) => {
		const res = str.match(regexMap['polygon']);

		if (!res) {
			return null;
		}

		const [fillRule, points] = resolveFillRule(res[1]);

		return {
			'fill-rule': fillRule,
			points: points
				.split(',')
				.map(v => {
					return v
						.split(' ')
						.map((k, i) => {
							return lengthToNumber(
								k,
								inheritedStyle.fontSize as number,
								i === 0 ? width : height,
								inheritedStyle,
								true
							);
						})
						.join(' ');
				})
				.join(','),
			type: 'polygon'
		};
	};
	const parseInset = (str: string) => {
		const res = str.match(regexMap['inset']);

		if (!res) {
			return null;
		}

		const [inset, radius] = (
			res[1].includes('round') ? res[1] : `${res[1].trim()} round 0`
		).split('round');
		const radiusMap = getStylesForProperty('borderRadius', radius, true);
		const r = Object.values(radiusMap)
			.map(s => {
				return `${s}`;
			})
			.map((s, i) => {
				return (
					lengthToNumber(
						s,
						inheritedStyle.fontSize as number,
						i === 0 || i === 2 ? height : width,
						inheritedStyle,
						true
					) || 0
				);
			});
		const offsets = Object.values(
			getStylesForProperty('margin', inset, true)
		)
			.map(s => {
				return `${s}`;
			})
			.map((s, i) => {
				return (
					lengthToNumber(
						s,
						inheritedStyle.fontSize as number,
						i === 0 || i === 2 ? height : width,
						inheritedStyle,
						true
					) || 0
				);
			});
		const x = offsets[3];
		const y = offsets[0];
		const w = width - (offsets[1] + offsets[3]);
		const h = height - (offsets[0] + offsets[2]);

		if (
			r.some(v => {
				return v > 0;
			})
		) {
			const d = buildBorderRadius(
				{ left: x, top: y, width: w, height: h },
				{ ...style, ...radiusMap }
			);

			return { d, type: 'path' };
		}

		return {
			height: h,
			type: 'rect',
			width: w,
			x,
			y
		};
	};

	return {
		parseCircle,
		parseEllipse,
		parseInset,
		parsePath,
		parsePolygon
	};
};

const resolveFillRule = (str: string) => {
	const [, fillRule = 'nonzero', d] =
		str.replace(/('|")/g, '').match(/^(nonzero|evenodd)?,?(.+)/) || [];

	return [fillRule, d];
};

const resolvePosition = (position: string, xDelta: number, yDelta: number) => {
	const pos = position.split(' ');
	const res: { x: number | string; y: number | string } = {
		x: pos[0] || '50%',
		y: pos[1] || '50%'
	};

	pos.forEach(v => {
		if (v === 'top') {
			res.y = 0;
		} else if (v === 'bottom') {
			res.y = yDelta;
		} else if (v === 'left') {
			res.x = 0;
		} else if (v === 'right') {
			res.x = xDelta;
		} else if (v === 'center') {
			res.x = xDelta / 2;
			res.y = yDelta / 2;
		} else {
			// do nothing
		}
	});

	return res;
};

export { createShapeParser };
