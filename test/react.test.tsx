import { forwardRef } from 'react';
import { it, describe, expect } from 'vitest';

import { initFonts, toImage } from './utils.js';
import satori, { type Font } from '../src/index.js';

describe('react apis', () => {
	let fonts: Font[];
	initFonts(f => {
		fonts = f;
	});

	it('should support `forwardref` wrapped components', async () => {
		const Foo = forwardRef(function _() {
			return <div>hello</div>;
		});

		const svg = await satori(
			<div
				style={{
					display: 'flex',
					color: 'red',
					fontSize: 14
				}}
			>
				<Foo />
			</div>,
			{
				width: 100,
				height: 100,
				fonts
			}
		);
		expect(toImage(svg, 100)).toMatchImageSnapshot();
	});
});
