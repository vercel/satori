import { beforeAll, it, describe, expect } from 'vitest';
import { join } from 'path';
import { readFile } from 'node:fs/promises';

import { toImage } from './utils.js';
import satori from '../src/index.js';
import type { SatoriOptions } from '../src/index.js';

describe('faux-bold', () => {
	let fontsRegularOnly: SatoriOptions['fonts'];
	let fontsWithBold: SatoriOptions['fonts'];

	beforeAll(async () => {
		const regularPath = join(
			process.cwd(),
			'test',
			'assets',
			'Roboto-Regular.ttf'
		);
		const regularData = await readFile(regularPath);

		fontsRegularOnly = [
			{
				data: regularData,
				name: 'Roboto',
				style: 'normal',
				weight: 400
			}
		];

		fontsWithBold = [
			{
				data: regularData,
				name: 'Roboto',
				style: 'normal',
				weight: 400
			},
			{
				data: regularData,
				name: 'Roboto',
				style: 'normal',
				weight: 700
			}
		];
	});

	const getStrokeWidth = (svg: string) => {
		const match = svg.match(/stroke-width="([^"]+)"/);
		return match ? parseFloat(match[1]) : 0;
	};

	describe('activation', () => {
		it('should apply faux bold when only regular weight font is loaded', async () => {
			const svg = await satori(
				<div
					style={{
						display: 'flex',
						fontSize: 24,
						fontWeight: 700
					}}
				>
					Bold text
				</div>,
				{ width: 200, height: 50, fonts: fontsRegularOnly }
			);

			expect(svg).toContain('stroke-width');
			expect(svg).toContain('paint-order="stroke"');
			expect(svg).toContain('stroke-linejoin="round"');
		});

		it('should not apply faux bold when matching bold font is loaded', async () => {
			const svg = await satori(
				<div
					style={{
						display: 'flex',
						fontSize: 24,
						fontWeight: 700
					}}
				>
					Bold text
				</div>,
				{ width: 200, height: 50, fonts: fontsWithBold }
			);

			expect(svg).not.toContain('stroke-width');
			expect(svg).not.toContain('paint-order');
		});

		it('should not apply faux bold for normal weight text', async () => {
			const svg = await satori(
				<div
					style={{
						display: 'flex',
						fontSize: 24,
						fontWeight: 400
					}}
				>
					Normal text
				</div>,
				{ width: 200, height: 50, fonts: fontsRegularOnly }
			);

			expect(svg).not.toContain('stroke-width');
			expect(svg).not.toContain('paint-order');
		});
	});

	describe('weight threshold', () => {
		it('should apply faux bold for fontWeight 600 (boundary)', async () => {
			const svg = await satori(
				<div
					style={{
						display: 'flex',
						fontSize: 24,
						fontWeight: 600
					}}
				>
					Semibold text
				</div>,
				{ width: 200, height: 50, fonts: fontsRegularOnly }
			);

			expect(svg).toContain('stroke-width');
			expect(svg).toContain('paint-order="stroke"');
		});

		it('should not apply faux bold for fontWeight 500', async () => {
			const svg = await satori(
				<div
					style={{
						display: 'flex',
						fontSize: 24,
						fontWeight: 500
					}}
				>
					Medium text
				</div>,
				{ width: 200, height: 50, fonts: fontsRegularOnly }
			);

			expect(svg).not.toContain('stroke-width');
			expect(svg).not.toContain('paint-order');
		});

		it('should normalize fontWeight "bold" to 700 and apply faux bold', async () => {
			const svg = await satori(
				<div
					style={{
						display: 'flex',
						fontSize: 24,
						fontWeight: 'bold'
					}}
				>
					Bold string text
				</div>,
				{ width: 200, height: 50, fonts: fontsRegularOnly }
			);

			expect(svg).toContain('stroke-width');
			expect(svg).toContain('paint-order="stroke"');
		});

		it('should normalize fontWeight "normal" to 400 and not apply faux bold', async () => {
			const svg = await satori(
				<div
					style={{
						display: 'flex',
						fontSize: 24,
						fontWeight: 'normal'
					}}
				>
					Normal string text
				</div>,
				{ width: 200, height: 50, fonts: fontsRegularOnly }
			);

			expect(svg).not.toContain('stroke-width');
			expect(svg).not.toContain('paint-order');
		});
	});

	describe('HTML semantic tags', () => {
		it('should apply faux bold for <strong> tag', async () => {
			const svg = await satori(
				<div style={{ display: 'flex', fontSize: 24 }}>
					<strong>Strong text</strong>
				</div>,
				{ width: 200, height: 50, fonts: fontsRegularOnly }
			);

			expect(svg).toContain('stroke-width');
			expect(svg).toContain('paint-order="stroke"');
		});

		it('should apply faux bold for <b> tag', async () => {
			const svg = await satori(
				<div style={{ display: 'flex', fontSize: 24 }}>
					<b>Bold text</b>
				</div>,
				{ width: 200, height: 50, fonts: fontsRegularOnly }
			);

			expect(svg).toContain('stroke-width');
			expect(svg).toContain('paint-order="stroke"');
		});
	});

	describe('stroke scaling', () => {
		it('should scale stroke width with weight difference (700 < 900)', async () => {
			const svg700 = await satori(
				<div style={{ display: 'flex', fontSize: 24, fontWeight: 700 }}>
					Text
				</div>,
				{ width: 200, height: 50, fonts: fontsRegularOnly }
			);

			const svg900 = await satori(
				<div style={{ display: 'flex', fontSize: 24, fontWeight: 900 }}>
					Text
				</div>,
				{ width: 200, height: 50, fonts: fontsRegularOnly }
			);

			const strokeWidth700 = getStrokeWidth(svg700);
			const strokeWidth900 = getStrokeWidth(svg900);

			expect(strokeWidth700).toBeGreaterThan(0);
			expect(strokeWidth900).toBeGreaterThan(strokeWidth700);
		});

		it('should scale stroke width with font size', async () => {
			const svgSmall = await satori(
				<div style={{ display: 'flex', fontSize: 12, fontWeight: 700 }}>
					Text
				</div>,
				{ width: 200, height: 50, fonts: fontsRegularOnly }
			);

			const svgLarge = await satori(
				<div style={{ display: 'flex', fontSize: 48, fontWeight: 700 }}>
					Text
				</div>,
				{ width: 200, height: 50, fonts: fontsRegularOnly }
			);

			const strokeWidthSmall = getStrokeWidth(svgSmall);
			const strokeWidthLarge = getStrokeWidth(svgLarge);

			expect(strokeWidthSmall).toBeGreaterThan(0);
			expect(strokeWidthLarge).toBeGreaterThan(strokeWidthSmall);
		});

		it('should use text color as stroke color', async () => {
			const svg = await satori(
				<div
					style={{
						color: '#ff0000',
						display: 'flex',
						fontSize: 24,
						fontWeight: 700
					}}
				>
					Red bold text
				</div>,
				{ width: 200, height: 50, fonts: fontsRegularOnly }
			);

			expect(svg).toContain('stroke-width');
			expect(svg).toContain('stroke="#ff0000"');
		});
	});

	describe('webkit-text-stroke priority', () => {
		it('should use webkit-text-stroke and suppress faux bold when both apply', async () => {
			const svg = await satori(
				<div
					style={{
						display: 'flex',
						fontSize: 24,
						fontWeight: 700,
						WebkitTextStroke: '2px red'
					}}
				>
					Stroked bold
				</div>,
				{ width: 200, height: 50, fonts: fontsRegularOnly }
			);

			expect(svg).toContain('stroke="red"');
			expect(svg).toContain('stroke-width="2px"');

			// Faux bold stroke width would be a decimal (e.g. 0.48), not "2px"
			const strokeWidth = getStrokeWidth(svg);
			expect(strokeWidth).toEqual(2);
		});
	});

	describe('embedFont: false', () => {
		it('should apply faux bold in non-embedded font mode', async () => {
			const svg = await satori(
				<div
					style={{
						display: 'flex',
						fontSize: 24,
						fontWeight: 700
					}}
				>
					Bold text
				</div>,
				{
					embedFont: false,
					fonts: fontsRegularOnly,
					height: 50,
					width: 200
				}
			);

			expect(svg).toContain('stroke-width');
			expect(svg).toContain('paint-order="stroke"');
		});
	});

	describe('visual', () => {
		it('should render faux bold visually', async () => {
			const svg = await satori(
				<div
					style={{
						background: '#fff',
						display: 'flex',
						flexDirection: 'column',
						fontSize: 24,
						height: 100,
						width: 300
					}}
				>
					<span>Normal weight text</span>
					<span style={{ fontWeight: 700 }}>Faux bold text</span>
				</div>,
				{ width: 300, height: 100, fonts: fontsRegularOnly }
			);

			expect(toImage(svg, 300)).toMatchImageSnapshot();
		});
	});
});
