import cssColorParse from 'parse-css-color';
import type { ColorStop } from 'css-gradient-parser';

import { lengthToNumber } from '../../utils.js';

type Stop = {
	color: string;
	offset?: number;
};

const normalizeStops = (
	totalLength: number,
	colorStops: ColorStop[],
	inheritedStyle: Record<string, string | number>,
	repeating: boolean,
	from?: 'background' | 'mask'
) => {
	// Resolve the color stops based on the spec:
	// https://drafts.csswg.org/css-images/#color-stop-syntax
	const stops: Stop[] = [];
	const lastColorStop = colorStops.at(-1);
	const totalPercentage =
		lastColorStop &&
		lastColorStop.offset &&
		lastColorStop.offset.unit === '%' &&
		repeating
			? +lastColorStop.offset.value
			: 100;
	for (const stop of colorStops) {
		const { color } = stop;
		if (!stops.length) {
			// First stop, ensure it's at the start.
			stops.push({
				color,
				offset: 0
			});

			if (!stop.offset) {
				continue;
			}
			if (stop.offset.value === '0') {
				continue;
			}
		}

		// All offsets are relative values (0-1) in SVG.
		const offset =
			typeof stop.offset === 'undefined'
				? undefined
				: stop.offset.unit === '%'
				? +stop.offset.value / totalPercentage
				: Number(
						lengthToNumber(
							`${stop.offset.value}${stop.offset.unit}`,
							inheritedStyle.fontSize as number,
							totalLength,
							inheritedStyle,
							true
						)
				  ) / totalLength;

		stops.push({
			color,
			offset
		});
	}
	if (!stops.length) {
		stops.push({
			color: 'transparent',
			offset: 0
		});
	}
	// Last stop, ensure it's at the end.
	const lastStop = stops[stops.length - 1];
	if (lastStop.offset !== 1) {
		if (typeof lastStop.offset === 'undefined') {
			lastStop.offset = 1;
		} else if (repeating) {
			stops[stops.length - 1] = {
				color: lastStop.color,
				offset: 1
			};
		} else {
			stops.push({
				color: lastStop.color,
				offset: 1
			});
		}
	}

	let previousStop = 0;
	let nextStop = 1;
	// Evenly distribute the missing stop offsets.
	for (let i = 0; i < stops.length; i++) {
		if (typeof stops[i].offset === 'undefined') {
			// Find the next stop that has an offset.
			if (nextStop < i) {
				nextStop = i;
			}
			while (typeof stops[nextStop].offset === 'undefined') {
				nextStop++;
			}

			stops[i].offset =
				((stops[nextStop].offset - stops[previousStop].offset) /
					(nextStop - previousStop)) *
					(i - previousStop) +
				stops[previousStop].offset;
		} else {
			previousStop = i;
		}
	}

	if (from === 'mask') {
		return stops.map(stop => {
			const color = cssColorParse(stop.color);
			if (!color) {
				return stop;
			}
			if (color.alpha === 0) {
				return { ...stop, color: `rgba(0, 0, 0, 1)` };
			} else {
				return {
					...stop,
					color: `rgba(255, 255, 255, ${color.alpha})`
				};
			}
		});
	}

	return stops;
};

export { normalizeStops };
