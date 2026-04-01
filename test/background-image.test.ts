import { it, describe, expect } from 'vitest';

import backgroundImage, {
	computeBgPositionOffset,
	parsePositionValues
} from '../src/builder/background-image.js';

describe('background-image', () => {
	describe('parsePositionValues', () => {
		it('should default to 0% 0% for empty string', () => {
			expect(parsePositionValues('')).toEqual({ x: '0%', y: '0%' });
		});

		it('should handle center keyword', () => {
			expect(parsePositionValues('center')).toEqual({
				x: '50%',
				y: '50%'
			});
		});

		it('should handle left keyword', () => {
			expect(parsePositionValues('left')).toEqual({ x: '0%', y: '50%' });
		});

		it('should handle right keyword', () => {
			expect(parsePositionValues('right')).toEqual({
				x: '100%',
				y: '50%'
			});
		});

		it('should handle top keyword', () => {
			expect(parsePositionValues('top')).toEqual({ x: '50%', y: '0%' });
		});

		it('should handle bottom keyword', () => {
			expect(parsePositionValues('bottom')).toEqual({
				x: '50%',
				y: '100%'
			});
		});

		it('should handle two keywords', () => {
			expect(parsePositionValues('left top')).toEqual({
				x: '0%',
				y: '0%'
			});
			expect(parsePositionValues('right bottom')).toEqual({
				x: '100%',
				y: '100%'
			});
			expect(parsePositionValues('center center')).toEqual({
				x: '50%',
				y: '50%'
			});
		});

		it('should handle percentage values', () => {
			expect(parsePositionValues('50% 50%')).toEqual({
				x: '50%',
				y: '50%'
			});
			expect(parsePositionValues('0% 100%')).toEqual({
				x: '0%',
				y: '100%'
			});
			expect(parsePositionValues('25% 75%')).toEqual({
				x: '25%',
				y: '75%'
			});
		});

		it('should handle single percentage value', () => {
			expect(parsePositionValues('50%')).toEqual({ x: '50%', y: '50%' });
			expect(parsePositionValues('0%')).toEqual({ x: '0%', y: '50%' });
		});

		it('should handle pixel values', () => {
			expect(parsePositionValues('10px 20px')).toEqual({
				x: '10px',
				y: '20px'
			});
		});

		it('should handle single pixel value', () => {
			expect(parsePositionValues('10px')).toEqual({
				x: '10px',
				y: '50%'
			});
		});

		it('should handle mixed keyword and percentage', () => {
			expect(parsePositionValues('center 25%')).toEqual({
				x: '50%',
				y: '25%'
			});
			expect(parsePositionValues('10px center')).toEqual({
				x: '10px',
				y: '50%'
			});
		});
	});

	describe('computeBgPositionOffset', () => {
		it('should compute offset for 50% (center) with cover', () => {
			// Container: 200x100, Image scaled: 200x150 (cover)
			// Y: (100 - 150) * 0.5 = -25
			expect(computeBgPositionOffset('50%', 100, 150)).toEqual(-25);
		});

		it('should compute offset for 0% (top-left)', () => {
			// (100 - 150) * 0 = -0
			expect(computeBgPositionOffset('0%', 100, 150)).toEqual(-0);
		});

		it('should compute offset for 100% (bottom-right)', () => {
			// (100 - 150) * 1 = -50
			expect(computeBgPositionOffset('100%', 100, 150)).toEqual(-50);
		});

		it('should compute offset for 50% with contain', () => {
			// Container: 200x100, Image scaled: 133x100 (contain)
			// X: (200 - 133) * 0.5 = 33.5
			expect(computeBgPositionOffset('50%', 200, 133)).toEqual(33.5);
		});

		it('should compute offset for 0% when image equals container', () => {
			// (200 - 200) * 0 = 0
			expect(computeBgPositionOffset('0%', 200, 200)).toEqual(0);
		});

		it('should compute offset for 50% when image equals container', () => {
			// (200 - 200) * 0.5 = 0
			expect(computeBgPositionOffset('50%', 200, 200)).toEqual(0);
		});

		it('should return pixel value directly', () => {
			expect(computeBgPositionOffset('10', 200, 150)).toEqual(10);
			expect(computeBgPositionOffset('25', 200, 150)).toEqual(25);
		});

		it('should return 0 for unparseable values', () => {
			expect(computeBgPositionOffset('invalid', 200, 150)).toEqual(0);
		});
	});

	describe('backgroundImage', () => {
		const defaultParams = {
			id: 'test',
			height: 100,
			left: 10,
			top: 20,
			width: 200
		};

		const gradient = 'linear-gradient(to right, red, blue)';

		it('should not produce NaN with one keyword position and non-keyword size', async () => {
			const result = await backgroundImage(
				defaultParams,
				{
					clip: 'border-box',
					image: gradient,
					position: 'center',
					repeat: 'no-repeat',
					size: '50%'
				},
				{}
			);

			expect(result.join('')).not.toContain('NaN');
		});

		it('should not produce NaN with two keyword position and non-keyword size', async () => {
			const result = await backgroundImage(
				defaultParams,
				{
					clip: 'border-box',
					image: gradient,
					position: 'left top',
					repeat: 'no-repeat',
					size: '100px 50px'
				},
				{}
			);

			expect(result.join('')).not.toContain('NaN');
		});

		it('should not produce NaN with right bottom position and non-keyword size', async () => {
			const result = await backgroundImage(
				defaultParams,
				{
					clip: 'border-box',
					image: gradient,
					position: 'right bottom',
					repeat: 'no-repeat',
					size: '50% 50%'
				},
				{}
			);

			expect(result.join('')).not.toContain('NaN');
		});

		it('should not produce NaN with empty position', async () => {
			const result = await backgroundImage(
				defaultParams,
				{
					clip: 'border-box',
					image: gradient,
					position: '',
					repeat: 'repeat',
					size: '50px 50px'
				},
				{}
			);

			expect(result.join('')).not.toContain('NaN');
		});

		it('should not produce NaN with single-value size', async () => {
			const result = await backgroundImage(
				defaultParams,
				{
					clip: 'border-box',
					image: gradient,
					position: 'center',
					repeat: 'no-repeat',
					size: '50px'
				},
				{}
			);

			expect(result.join('')).not.toContain('NaN');
		});

		it('should not produce NaN with percentage position and pixel size', async () => {
			const result = await backgroundImage(
				defaultParams,
				{
					clip: 'border-box',
					image: gradient,
					position: '50% 50%',
					repeat: 'no-repeat',
					size: '100px 50px'
				},
				{}
			);

			expect(result.join('')).not.toContain('NaN');
		});

		it('should not produce NaN with pixel position and pixel size', async () => {
			const result = await backgroundImage(
				defaultParams,
				{
					clip: 'border-box',
					image: gradient,
					position: '10px 20px',
					repeat: 'no-repeat',
					size: '100px 50px'
				},
				{}
			);

			expect(result.join('')).not.toContain('NaN');
		});

		it('should handle color background image', async () => {
			const result = await backgroundImage(
				defaultParams,
				{
					clip: 'border-box',
					image: 'red',
					position: 'center',
					repeat: 'repeat',
					size: ''
				},
				{}
			);

			expect(result.join('')).not.toContain('NaN');
		});
	});
});
