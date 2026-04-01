import { it, describe, expect } from 'vitest';

import { initFonts, toImage } from './utils.js';
import satori from '../src/index.js';

describe('backdrop-filter', () => {
	let fonts;
	initFonts(f => (fonts = f));

	it('should apply backdrop-filter blur via SVG filter and <use>', async () => {
		const svg = await satori(
			<div
				style={{
					background: 'blue',
					display: 'flex',
					height: 100,
					position: 'relative',
					width: 100
				}}
			>
				<div
					style={{
						backdropFilter: 'blur(10px)',
						background: 'rgba(255,255,255,0.2)',
						bottom: 0,
						height: 40,
						left: 0,
						position: 'absolute',
						width: 100
					}}
				/>
			</div>,
			{ fonts, height: 100, width: 100 }
		);

		// Background group wrapping prior content.
		expect(svg).toContain('satori_bfbg-');
		// SVG filter with blur.
		expect(svg).toContain('feGaussianBlur');
		expect(svg).toContain('stdDeviation="10"');
		// <use> referencing the background group.
		expect(svg).toContain('<use');
		expect(svg).toContain('satori_bf-');
		// Clip path to element bounds.
		expect(svg).toContain('satori_bfc-');
	});

	it('should support backdrop-filter with border-radius clip', async () => {
		const svg = await satori(
			<div
				style={{
					background: 'red',
					display: 'flex',
					height: 200,
					position: 'relative',
					width: 200
				}}
			>
				<div
					style={{
						backdropFilter: 'blur(5px)',
						background: 'rgba(0,0,0,0.3)',
						borderRadius: 20,
						height: 80,
						left: 20,
						position: 'absolute',
						top: 60,
						width: 160
					}}
				/>
			</div>,
			{ fonts, height: 200, width: 200 }
		);

		// Clip path should use a path (rounded) instead of a simple rect.
		expect(svg).toContain('<clipPath id="satori_bfc-');
		expect(svg).toContain('<path');
		expect(svg).toContain('feGaussianBlur');
	});

	it('should support backdrop-filter with mask-image for blurred fades', async () => {
		const svg = await satori(
			<div
				style={{
					background: 'green',
					display: 'flex',
					height: 200,
					position: 'relative',
					width: 200
				}}
			>
				<div
					style={{
						backdropFilter: 'blur(8px)',
						background: 'rgba(0,0,0,0.2)',
						bottom: 0,
						height: 100,
						left: 0,
						maskImage:
							'linear-gradient(to bottom, transparent, black)',
						position: 'absolute',
						width: 200
					}}
				/>
			</div>,
			{ fonts, height: 200, width: 200 }
		);

		// The <use> should reference the child's mask for the faded blur.
		expect(svg).toContain('mask="url(#satori_mi-');
		expect(svg).toContain('feGaussianBlur');
	});

	it('should support saturate filter', async () => {
		const svg = await satori(
			<div
				style={{
					background: 'blue',
					display: 'flex',
					height: 100,
					position: 'relative',
					width: 100
				}}
			>
				<div
					style={{
						backdropFilter: 'saturate(0.5)',
						height: 50,
						position: 'absolute',
						top: 0,
						width: 100
					}}
				/>
			</div>,
			{ fonts, height: 100, width: 100 }
		);

		expect(svg).toContain('feColorMatrix');
		expect(svg).toContain('type="saturate"');
		expect(svg).toContain('values="0.5"');
	});

	it('should support brightness filter', async () => {
		const svg = await satori(
			<div
				style={{
					background: 'blue',
					display: 'flex',
					height: 100,
					position: 'relative',
					width: 100
				}}
			>
				<div
					style={{
						backdropFilter: 'brightness(1.5)',
						height: 50,
						position: 'absolute',
						top: 0,
						width: 100
					}}
				/>
			</div>,
			{ fonts, height: 100, width: 100 }
		);

		expect(svg).toContain('feComponentTransfer');
		expect(svg).toContain('slope="1.5"');
	});

	it('should support contrast filter', async () => {
		const svg = await satori(
			<div
				style={{
					background: 'blue',
					display: 'flex',
					height: 100,
					position: 'relative',
					width: 100
				}}
			>
				<div
					style={{
						backdropFilter: 'contrast(2)',
						height: 50,
						position: 'absolute',
						top: 0,
						width: 100
					}}
				/>
			</div>,
			{ fonts, height: 100, width: 100 }
		);

		expect(svg).toContain('feComponentTransfer');
		expect(svg).toContain('slope="2"');
		expect(svg).toContain('intercept="-0.5"');
	});

	it('should support grayscale filter', async () => {
		const svg = await satori(
			<div
				style={{
					background: 'blue',
					display: 'flex',
					height: 100,
					position: 'relative',
					width: 100
				}}
			>
				<div
					style={{
						backdropFilter: 'grayscale(1)',
						height: 50,
						position: 'absolute',
						top: 0,
						width: 100
					}}
				/>
			</div>,
			{ fonts, height: 100, width: 100 }
		);

		expect(svg).toContain('feColorMatrix');
		expect(svg).toContain('type="saturate"');
		expect(svg).toContain('values="0"');
	});

	it('should not add backdrop-filter markup when not specified', async () => {
		const svg = await satori(
			<div
				style={{
					background: 'blue',
					display: 'flex',
					height: 100,
					width: 100
				}}
			>
				<div
					style={{
						background: 'red',
						height: 50,
						width: 50
					}}
				/>
			</div>,
			{ fonts, height: 100, width: 100 }
		);

		expect(svg).not.toContain('satori_bfbg-');
		expect(svg).not.toContain('satori_bf-');
		expect(svg).not.toContain('feGaussianBlur');
	});

	it('should render correctly with resvg', async () => {
		const svg = await satori(
			<div
				style={{
					background: 'white',
					display: 'flex',
					height: 100,
					position: 'relative',
					width: 100
				}}
			>
				<div
					style={{
						background: 'red',
						height: 100,
						width: 100
					}}
				/>
				<div
					style={{
						backdropFilter: 'blur(4px)',
						background: 'rgba(0,0,0,0.3)',
						bottom: 0,
						height: 40,
						left: 0,
						position: 'absolute',
						width: 100
					}}
				/>
			</div>,
			{ fonts, height: 100, width: 100 }
		);

		// Should not throw when rendered through resvg.
		const png = toImage(svg);
		expect(png).toBeTruthy();
	});

	it('should handle multiple backdrop-filter children', async () => {
		const svg = await satori(
			<div
				style={{
					background: 'blue',
					display: 'flex',
					height: 200,
					position: 'relative',
					width: 200
				}}
			>
				<div
					style={{
						backdropFilter: 'blur(5px)',
						background: 'rgba(255,0,0,0.3)',
						height: 60,
						left: 0,
						position: 'absolute',
						top: 0,
						width: 200
					}}
				/>
				<div
					style={{
						backdropFilter: 'blur(8px)',
						background: 'rgba(0,255,0,0.3)',
						bottom: 0,
						height: 60,
						left: 0,
						position: 'absolute',
						width: 200
					}}
				/>
			</div>,
			{ fonts, height: 200, width: 200 }
		);

		// Two background groups (nested) and two <use> elements.
		const bgGroupCount = (svg.match(/satori_bfbg-/g) || []).length;
		expect(bgGroupCount).toBeGreaterThanOrEqual(2);

		const useCount = (svg.match(/<use /g) || []).length;
		expect(useCount).toEqual(2);
	});
});
