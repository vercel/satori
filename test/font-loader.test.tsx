import { beforeAll, it, describe, expect } from 'vitest';
import { join } from 'path';
import { readFile } from 'node:fs/promises';

import satori from '../src';
import { toImage } from './utils';

let fontData: Buffer;

describe('fonts config', () => {
	beforeAll(async () => {
		const fontPath = join(
			process.cwd(),
			'test',
			'assets',
			'Roboto-Regular.ttf'
		);

		fontData = await readFile(fontPath);
	});

	it('should detect and load fonts via fonts.load', async () => {
		const svg = await satori(
			<div
				style={{
					display: 'flex',
					fontFamily: 'Roboto',
					height: '100%',
					width: '100%'
				}}
			>
				Hello via fontLoader
			</div>,
			{
				width: 200,
				height: 100,
				fonts: {
					defaultFont: {
						family: 'Roboto',
						key: 'roboto',
						weight: 400
					},
					load: async font => {
						if (font.key === 'roboto') {
							return {
								data: fontData,
								name: font.family,
								style: 'normal',
								weight: font.weight
							};
						}

						return null;
					}
				}
			}
		);
		expect(toImage(svg, 200)).toMatchImageSnapshot();
	});

	it('should use defaultfont when no fontfamily in element', async () => {
		const svg = await satori(
			<div
				style={{
					display: 'flex',
					height: '100%',
					width: '100%'
				}}
			>
				Fallback font
			</div>,
			{
				width: 200,
				height: 100,
				fonts: {
					defaultFont: {
						family: 'Roboto',
						key: 'roboto',
						weight: 400
					},
					load: async font => {
						if (font.key === 'roboto') {
							return {
								data: fontData,
								name: font.family,
								style: 'normal',
								weight: font.weight
							};
						}

						return null;
					}
				}
			}
		);
		expect(toImage(svg, 200)).toMatchImageSnapshot();
	});

	it('should resolve aliases', async () => {
		const svg = await satori(
			<div
				style={{
					display: 'flex',
					fontFamily: 'ui-sans-serif, sans-serif',
					height: '100%',
					width: '100%'
				}}
			>
				Aliased font
			</div>,
			{
				width: 200,
				height: 100,
				fonts: {
					aliases: { 'ui-sans-serif': 'roboto' },
					defaultFont: {
						family: 'Roboto',
						key: 'roboto',
						weight: 400
					},
					load: async font => {
						if (font.key === 'roboto') {
							return {
								data: fontData,
								name: font.family,
								style: 'normal',
								weight: font.weight
							};
						}

						return null;
					}
				}
			}
		);
		expect(toImage(svg, 200)).toMatchImageSnapshot();
	});

	it('should load multiple fonts from element tree', async () => {
		const svg = await satori(
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					fontFamily: 'Roboto',
					height: '100%',
					width: '100%'
				}}
			>
				<span>First font</span>
				<span style={{ fontFamily: 'CustomFont' }}>Second font</span>
			</div>,
			{
				width: 200,
				height: 100,
				fonts: {
					defaultFont: {
						family: 'Roboto',
						key: 'roboto',
						weight: 400
					},
					load: async font => {
						return {
							data: fontData,
							name: font.family,
							style: 'normal',
							weight: font.weight
						};
					}
				}
			}
		);
		expect(toImage(svg, 200)).toMatchImageSnapshot();
	});

	it('should work with tailwind and fonts together', async () => {
		const svg = await satori(
			<div className='flex w-full h-full bg-blue-500 font-sans'>
				Tailwind + fontLoader
			</div>,
			{
				width: 200,
				height: 100,
				fonts: {
					defaultFont: {
						family: 'Roboto',
						key: 'roboto',
						weight: 400
					},
					load: async font => {
						return {
							data: fontData,
							name: font.family,
							style: 'normal',
							weight: font.weight
						};
					}
				},
				tailwind: true
			}
		);
		expect(toImage(svg, 200)).toMatchImageSnapshot();
	});
});
