import { beforeAll, it, describe, expect } from 'vitest';
import { join } from 'path';
import { readFile } from 'node:fs/promises';

import satori from '../src/index.js';
import { toImage } from './utils.js';

let fontData: Buffer;

describe('fontLoader', () => {
	beforeAll(async () => {
		const fontPath = join(
			process.cwd(),
			'test',
			'assets',
			'Roboto-Regular.ttf'
		);

		fontData = await readFile(fontPath);
	});

	it('should detect and load fonts via fontLoader', async () => {
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
				fonts: [],
				fontLoader: {
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

	it('should use fallbackFont when no fontFamily in element', async () => {
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
				fonts: [],
				fontLoader: {
					fallbackFont: {
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

	it('should resolve aliases via fontLoader config', async () => {
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
				fonts: [],
				fontLoader: {
					aliases: { 'ui-sans-serif': 'roboto' },
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

	it('should merge fontLoader detected fonts with explicit fonts', async () => {
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
				<span>Explicit font</span>
				<span style={{ fontFamily: 'CustomFont' }}>Detected font</span>
			</div>,
			{
				width: 200,
				height: 100,
				fonts: [
					{
						data: fontData,
						name: 'CustomFont',
						style: 'normal',
						weight: 400
					}
				],
				fontLoader: {
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

	it('should work with tailwind and fontLoader together', async () => {
		const svg = await satori(
			<div className='flex w-full h-full bg-blue-500 font-sans'>
				Tailwind + fontLoader
			</div>,
			{
				width: 200,
				height: 100,
				fonts: [],
				fontLoader: {
					fallbackFont: {
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
