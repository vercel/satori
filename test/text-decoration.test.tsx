import { it, describe, expect } from 'vitest';

import { initFonts, loadMissingFont, toImage } from './utils';
import satori, { Font } from '../src';

describe('text decoration', () => {
	let fonts: Font[];
	initFonts(f => {
		fonts = f;
	});

	it('should work correctly when `text-decoration-line: line-through` and `text-align: right`', async () => {
		const svg = await satori(
			<div
				style={{
					height: '100%',
					width: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: '#fff',
					fontSize: 20,
					fontWeight: 600
				}}
			>
				<div
					style={{
						maxWidth: '190px',
						backgroundColor: '#91a8d0',
						textDecorationLine: 'line-through',
						color: 'white',
						textAlign: 'center'
					}}
				>
					你好! It doesn’t 안녕! exist, it never has. I’m nostalgic
					for a place that never existed.
				</div>
			</div>,
			{
				width: 200,
				height: 200,
				fonts: {
					data: fonts,
					defaultFont: {
						family: 'Roboto',
						key: 'roboto',
						weight: 400
					},
					load: async font => {
						return loadMissingFont(font);
					}
				}
			}
		);
		expect(toImage(svg, 200)).toMatchImageSnapshot();
	});

	it('should work correctly when `text-decoration-line: underline` and `text-align: right`', async () => {
		const svg = await satori(
			<div
				style={{
					height: '100%',
					width: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: '#fff',
					fontSize: 20,
					fontWeight: 600
				}}
			>
				<div
					style={{
						maxWidth: '190px',
						backgroundColor: '#91a8d0',
						textDecorationLine: 'underline',
						color: 'white',
						textAlign: 'right'
					}}
				>
					你好! It doesn’t 안녕! exist, it never has. I’m nostalgic
					for a place that never existed.
				</div>
			</div>,
			{
				width: 200,
				height: 200,
				fonts: {
					data: fonts,
					defaultFont: {
						family: 'Roboto',
						key: 'roboto',
						weight: 400
					},
					load: async font => {
						return loadMissingFont(font);
					}
				}
			}
		);
		expect(toImage(svg, 200)).toMatchImageSnapshot();
	});

	it('should work correctly when `text-decoration-style: dotted`', async () => {
		const svg = await satori(
			<div
				style={{
					height: '100%',
					width: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: '#fff',
					fontSize: 20,
					fontWeight: 600
				}}
			>
				<div
					style={{
						maxWidth: '190px',
						backgroundColor: '#91a8d0',
						textDecorationLine: 'underline',
						textDecorationStyle: 'dotted',
						color: 'white'
					}}
				>
					It doesn’t exist, it never has. I’m nostalgic for a place
					that never existed.
				</div>
			</div>,
			{ width: 200, height: 200, fonts }
		);
		expect(toImage(svg, 200)).toMatchImageSnapshot();
	});

	it('should work correctly when `text-decoration-style: dashed`', async () => {
		const svg = await satori(
			<div
				style={{
					height: '100%',
					width: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: '#fff',
					fontSize: 20,
					fontWeight: 600
				}}
			>
				<div
					style={{
						maxWidth: '190px',
						backgroundColor: '#91a8d0',
						textDecorationLine: 'underline',
						textDecorationStyle: 'dashed',
						color: 'white'
					}}
				>
					It doesn’t exist, it never has. I’m nostalgic for a place
					that never existed.
				</div>
			</div>,
			{ width: 200, height: 200, fonts }
		);
		expect(toImage(svg, 200)).toMatchImageSnapshot();
	});

	it('should work correctly with `text-decoration` and `transform`', async () => {
		const svg = await satori(
			<div
				style={{
					height: '100%',
					width: '100%',
					display: 'flex',
					padding: 10,
					backgroundColor: '#fff',
					fontSize: 32
				}}
			>
				<div
					style={{
						display: 'flex',
						transform: 'translate(5px, 5px)',
						padding: 10,
						textDecoration: 'underline'
					}}
				>
					lynn
				</div>
			</div>,
			{
				width: 100,
				height: 100,
				fonts: {
					data: fonts,
					defaultFont: {
						family: 'Roboto',
						key: 'roboto',
						weight: 400
					},
					load: async font => {
						return loadMissingFont(font);
					}
				}
			}
		);
		expect(toImage(svg, 100)).toMatchImageSnapshot();
	});

	it('should work correctly when `text-decoration-style: double`', async () => {
		const svg = await satori(
			<div
				style={{
					height: '100%',
					width: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: '#fff',
					fontSize: 20,
					fontWeight: 600
				}}
			>
				<div
					style={{
						backgroundColor: '#91a8d0',
						textDecoration: 'underline double',
						color: 'white'
					}}
				>
					It doesn’t exist, it never has. I’m nostalgic for a place
					that never existed.
				</div>
				<div
					style={{
						backgroundColor: '#000',
						textDecoration: 'line-through double',
						color: 'white'
					}}
				>
					It doesn’t exist, it never has. I’m nostalgic for a place
					that never existed.
				</div>
			</div>,
			{ width: 200, height: 200, fonts }
		);
		expect(toImage(svg, 200)).toMatchImageSnapshot();
	});

	it('should skip ink by default when `text-decoration-line: underline`', async () => {
		const svg = await satori(
			<div
				style={{
					height: '100%',
					width: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: '#fff',
					fontSize: 40,
					color: '#000',
					textDecorationLine: 'underline'
				}}
			>
				abgpqapa
			</div>,
			{ width: 260, height: 120, fonts }
		);

		expect(toImage(svg, 260)).toMatchImageSnapshot();
	});

	it('should render continuous line when `text-decoration-skip-ink: none`', async () => {
		const svg = await satori(
			<div
				style={{
					height: '100%',
					width: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: '#fff',
					fontSize: 40,
					color: '#000',
					textDecorationLine: 'underline',
					textDecorationSkipInk: 'none'
				}}
			>
				abgpqapa
			</div>,
			{ width: 260, height: 120, fonts }
		);

		expect(toImage(svg, 260)).toMatchImageSnapshot();
	});

	it('should skip ink correctly with complex descenders', async () => {
		const svg = await satori(
			<div
				style={{
					height: '100%',
					width: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: '#fff',
					fontSize: 40,
					color: '#000',
					textDecorationLine: 'underline'
				}}
			>
				agayaqapajaya;a,a|a
			</div>,
			{ width: 360, height: 160, fonts }
		);

		expect(toImage(svg, 360)).toMatchImageSnapshot();
	});
});
