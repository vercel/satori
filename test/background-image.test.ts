import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/handler/image', () => {
	return {
		resolveImageData: vi.fn()
	};
});

import { resolveImageData } from '../src/handler/image';
import backgroundImage, {
	computeBgPositionOffset,
	parsePositionValues
} from '../src/builder/background-image';

const extractAttr = (xml: string, tag: string, attr: string): string | null => {
	const tagRegex = new RegExp(`<${tag}\\s[^>]*?\\b${attr}="([^"]*)"`, 'i');
	const match = xml.match(tagRegex);
	return match ? match[1] : null;
};

describe('src/builder/background-image', () => {
	describe('parsepositionvalues', () => {
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

	describe('computebgpositionoffset', () => {
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

		it('should handle pixel values with px suffix', () => {
			expect(computeBgPositionOffset('10px', 200, 150)).toEqual(10);
			expect(computeBgPositionOffset('25px', 200, 150)).toEqual(25);
		});

		it('should return 0 for unparseable values', () => {
			expect(computeBgPositionOffset('invalid', 200, 150)).toEqual(0);
		});
	});

	describe('backgroundimage', () => {
		const defaultParams = {
			height: 100,
			id: 'test',
			left: 10,
			top: 20,
			width: 200
		};

		const mockSrc = 'data:image/png;base64,abc';
		const mockImage = 'url(https://example.com/img.png)';

		afterEach(() => {
			vi.restoreAllMocks();
		});

		describe('url() images', () => {
			describe('keyword sizing', () => {
				it('should scale image to cover container (portrait on landscape)', async () => {
					// container 200×100, img 100×200
					// scale = max(200/100, 100/200) = 2 → [200, 400]
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: 'center',
							repeat: 'no-repeat',
							size: 'cover'
						},
						{}
					);

					expect(extractAttr(result[1], 'image', 'height')).toEqual(
						'400'
					);
					expect(extractAttr(result[1], 'image', 'width')).toEqual(
						'200'
					);
				});

				it('should scale image to cover container (wide on tall)', async () => {
					// container 100×200, img 200×100
					// scale = max(100/200, 200/100) = 2 → [400, 200]
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						200,
						100
					]);

					const result = await backgroundImage(
						{
							height: 200,
							id: 'test',
							left: 0,
							top: 0,
							width: 100
						},
						{
							clip: 'border-box',
							image: mockImage,
							position: '',
							repeat: 'no-repeat',
							size: 'cover'
						},
						{}
					);

					expect(extractAttr(result[1], 'image', 'height')).toEqual(
						'200'
					);
					expect(extractAttr(result[1], 'image', 'width')).toEqual(
						'400'
					);
				});

				it('should scale image to contain within container', async () => {
					// container 200×100, img 100×200
					// scale = min(200/100, 100/200) = 0.5 → [50, 100]
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: 'center',
							repeat: 'no-repeat',
							size: 'contain'
						},
						{}
					);

					expect(extractAttr(result[1], 'image', 'height')).toEqual(
						'100'
					);
					expect(extractAttr(result[1], 'image', 'width')).toEqual(
						'50'
					);
				});

				it('should use intrinsic dimensions for auto', async () => {
					// size='' normalizes to 'auto' → uses intrinsic [300, 150]
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						300,
						150
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '',
							repeat: 'no-repeat',
							size: ''
						},
						{}
					);

					expect(extractAttr(result[1], 'image', 'height')).toEqual(
						'150'
					);
					expect(extractAttr(result[1], 'image', 'width')).toEqual(
						'300'
					);
				});

				it('should compute width from aspect ratio when auto width + specified height', async () => {
					// size='auto 50%', container 200×100, img 100×200
					// parsedHeight = 50% of 100 = 50
					// finalWidth = (100/200) * 50 = 25
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '',
							repeat: 'no-repeat',
							size: 'auto 50%'
						},
						{}
					);

					expect(extractAttr(result[1], 'image', 'height')).toEqual(
						'50'
					);
					expect(extractAttr(result[1], 'image', 'width')).toEqual(
						'25'
					);
				});

				it('should compute height from aspect ratio when specified width + auto height', async () => {
					// size='50% auto', container 200×100, img 100×200
					// parsedWidth = 50% of 200 = 100
					// finalHeight = (200/100) * 100 = 200
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '',
							repeat: 'no-repeat',
							size: '50% auto'
						},
						{}
					);

					expect(extractAttr(result[1], 'image', 'height')).toEqual(
						'200'
					);
					expect(extractAttr(result[1], 'image', 'width')).toEqual(
						'100'
					);
				});

				it('should fall back to container dimensions when image has zero intrinsic size', async () => {
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						0,
						0
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '',
							repeat: 'no-repeat',
							size: 'cover'
						},
						{}
					);

					expect(extractAttr(result[1], 'image', 'height')).toEqual(
						'100'
					);
					expect(extractAttr(result[1], 'image', 'width')).toEqual(
						'200'
					);
				});
			});

			describe('explicit sizing', () => {
				it('should use explicit pixel dimensions', async () => {
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '',
							repeat: 'no-repeat',
							size: '150px 75px'
						},
						{}
					);

					expect(extractAttr(result[1], 'image', 'height')).toEqual(
						'75'
					);
					expect(extractAttr(result[1], 'image', 'width')).toEqual(
						'150'
					);
				});

				it('should resolve percentage dimensions relative to container', async () => {
					// 50% of 200 = 100, 25% of 100 = 25
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '',
							repeat: 'no-repeat',
							size: '50% 25%'
						},
						{}
					);

					expect(extractAttr(result[1], 'image', 'height')).toEqual(
						'25'
					);
					expect(extractAttr(result[1], 'image', 'width')).toEqual(
						'100'
					);
				});

				it('should normalize single-value size to value + auto', async () => {
					// size='150px' → '150px auto'
					// img 100×200, parsedWidth = 150
					// finalHeight = (200/100) * 150 = 300
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '',
							repeat: 'no-repeat',
							size: '150px'
						},
						{}
					);

					expect(extractAttr(result[1], 'image', 'width')).toEqual(
						'150'
					);
					expect(extractAttr(result[1], 'image', 'height')).toEqual(
						'300'
					);
				});
			});

			describe('position offsets', () => {
				it('should center cover image vertically when portrait on landscape', async () => {
					// cover → [200, 400], center → offset Y = (100-400)*0.5 = -150
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: 'center',
							repeat: 'no-repeat',
							size: 'cover'
						},
						{}
					);

					// no-repeat: offset goes into image, pattern at left,top
					expect(extractAttr(result[1], 'image', 'x')).toEqual('0');
					expect(extractAttr(result[1], 'image', 'y')).toEqual(
						'-150'
					);
					expect(extractAttr(result[1], 'pattern', 'x')).toEqual(
						'10'
					);
					expect(extractAttr(result[1], 'pattern', 'y')).toEqual(
						'20'
					);
				});

				it('should position at origin for left top', async () => {
					// contain → [50, 100], left top → offsets = 0,0
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: 'left top',
							repeat: 'no-repeat',
							size: 'contain'
						},
						{}
					);

					expect(extractAttr(result[1], 'image', 'x')).toEqual('0');
					expect(extractAttr(result[1], 'image', 'y')).toEqual('0');
				});

				it('should position at far edge for right bottom', async () => {
					// contain → [50, 100]
					// right bottom → 100% → offset X = (200-50)*1 = 150, Y = (100-100)*1 = 0
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: 'right bottom',
							repeat: 'no-repeat',
							size: 'contain'
						},
						{}
					);

					expect(extractAttr(result[1], 'image', 'x')).toEqual('150');
					expect(extractAttr(result[1], 'image', 'y')).toEqual('0');
				});

				it('should apply pixel position offsets with explicit size', async () => {
					// size='150px 75px', position='10px 20px'
					// offsets: computeBgPositionOffset('10px', ...) = 10, ('20px', ...) = 20
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '10px 20px',
							repeat: 'no-repeat',
							size: '150px 75px'
						},
						{}
					);

					// no-repeat: offset in image, pattern at left,top
					expect(extractAttr(result[1], 'image', 'x')).toEqual('10');
					expect(extractAttr(result[1], 'image', 'y')).toEqual('20');
					expect(extractAttr(result[1], 'pattern', 'x')).toEqual(
						'10'
					);
					expect(extractAttr(result[1], 'pattern', 'y')).toEqual(
						'20'
					);
				});

				it('should apply percentage position with explicit size', async () => {
					// size='100px 50px', position='50% 50%'
					// offset X = (200-100)*0.5 = 50, Y = (100-50)*0.5 = 25
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '50% 50%',
							repeat: 'no-repeat',
							size: '100px 50px'
						},
						{}
					);

					expect(extractAttr(result[1], 'image', 'x')).toEqual('50');
					expect(extractAttr(result[1], 'image', 'y')).toEqual('25');
				});
			});

			describe('repeat modes', () => {
				it('should tile pattern when repeat', async () => {
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '',
							repeat: 'repeat',
							size: '150px 75px'
						},
						{}
					);

					expect(extractAttr(result[1], 'pattern', 'height')).toEqual(
						'75'
					);
					expect(extractAttr(result[1], 'pattern', 'width')).toEqual(
						'150'
					);
				});

				it('should use 100% pattern dimensions when no-repeat', async () => {
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '',
							repeat: 'no-repeat',
							size: '150px 75px'
						},
						{}
					);

					expect(extractAttr(result[1], 'pattern', 'height')).toEqual(
						'100%'
					);
					expect(extractAttr(result[1], 'pattern', 'width')).toEqual(
						'100%'
					);
				});

				it('should tile only horizontally for repeat-x', async () => {
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '',
							repeat: 'repeat-x',
							size: '150px 75px'
						},
						{}
					);

					expect(extractAttr(result[1], 'pattern', 'height')).toEqual(
						'100%'
					);
					expect(extractAttr(result[1], 'pattern', 'width')).toEqual(
						'150'
					);
				});

				it('should tile only vertically for repeat-y', async () => {
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '',
							repeat: 'repeat-y',
							size: '150px 75px'
						},
						{}
					);

					expect(extractAttr(result[1], 'pattern', 'height')).toEqual(
						'75'
					);
					expect(extractAttr(result[1], 'pattern', 'width')).toEqual(
						'100%'
					);
				});

				it('should put offset in pattern when repeating with keyword size', async () => {
					// cover → [200, 400], center → offsetY = -150
					// repeat: offset goes into pattern, image at 0,0
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: 'center',
							repeat: 'repeat',
							size: 'cover'
						},
						{}
					);

					// pattern y = (-150) + 20 = -130
					expect(extractAttr(result[1], 'pattern', 'y')).toEqual(
						'-130'
					);
					// image at origin within pattern tile
					expect(extractAttr(result[1], 'image', 'x')).toEqual('0');
					expect(extractAttr(result[1], 'image', 'y')).toEqual('0');
				});

				it('should put offset in image when not repeating with keyword size', async () => {
					// cover → [200, 400], center → offsetY = -150
					// no-repeat: offset in image, pattern at 0+left, 0+top
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: 'center',
							repeat: 'no-repeat',
							size: 'cover'
						},
						{}
					);

					expect(extractAttr(result[1], 'pattern', 'x')).toEqual(
						'10'
					);
					expect(extractAttr(result[1], 'pattern', 'y')).toEqual(
						'20'
					);
					expect(extractAttr(result[1], 'image', 'y')).toEqual(
						'-150'
					);
				});

				it('should combine repeat with position offset for explicit-size images', async () => {
					// size='150px 75px', position='10px 20px', repeat='repeat'
					// repeat: offsets go into pattern, image at 0,0
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '10px 20px',
							repeat: 'repeat',
							size: '150px 75px'
						},
						{}
					);

					// repeat: offset goes into pattern position
					expect(extractAttr(result[1], 'pattern', 'x')).toEqual(
						'20'
					);
					expect(extractAttr(result[1], 'pattern', 'y')).toEqual(
						'40'
					);
					// image at origin within pattern tile
					expect(extractAttr(result[1], 'image', 'x')).toEqual('0');
					expect(extractAttr(result[1], 'image', 'y')).toEqual('0');
					// pattern dimensions match explicit size
					expect(extractAttr(result[1], 'pattern', 'width')).toEqual(
						'150'
					);
					expect(extractAttr(result[1], 'pattern', 'height')).toEqual(
						'75'
					);
				});
			});

			describe('mask mode', () => {
				it('should prioritize intrinsic dimensions over explicit when from=mask', async () => {
					// from='mask': imageWidth || explicit → intrinsic wins
					vi.mocked(resolveImageData).mockResolvedValue([
						mockSrc,
						100,
						200
					]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '',
							repeat: 'no-repeat',
							size: '150px 75px'
						},
						{},
						'mask'
					);

					expect(extractAttr(result[1], 'image', 'height')).toEqual(
						'200'
					);
					expect(extractAttr(result[1], 'image', 'width')).toEqual(
						'100'
					);
				});

				it('should fall back to explicit dimensions when image has no intrinsic size in mask mode', async () => {
					vi.mocked(resolveImageData).mockResolvedValue([mockSrc]);

					const result = await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: mockImage,
							position: '',
							repeat: 'no-repeat',
							size: '150px 75px'
						},
						{},
						'mask'
					);

					expect(extractAttr(result[1], 'image', 'height')).toEqual(
						'75'
					);
					expect(extractAttr(result[1], 'image', 'width')).toEqual(
						'150'
					);
				});
			});

			it('should return correct pattern id', async () => {
				vi.mocked(resolveImageData).mockResolvedValue([
					mockSrc,
					100,
					100
				]);

				const result = await backgroundImage(
					defaultParams,
					{
						clip: 'border-box',
						image: mockImage,
						position: '',
						repeat: 'no-repeat',
						size: ''
					},
					{}
				);

				expect(result[0]).toEqual('satori_bitest');
			});

			it('should pass resolved src as image href', async () => {
				vi.mocked(resolveImageData).mockResolvedValue([
					mockSrc,
					100,
					100
				]);

				const result = await backgroundImage(
					defaultParams,
					{
						clip: 'border-box',
						image: mockImage,
						position: '',
						repeat: 'no-repeat',
						size: ''
					},
					{}
				);

				expect(extractAttr(result[1], 'image', 'href')).toEqual(
					mockSrc
				);
			});
		});

		describe('color backgrounds', () => {
			it('should produce correct rgba fill for named color', async () => {
				const result = await backgroundImage(
					defaultParams,
					{
						clip: 'border-box',
						image: 'red',
						position: '',
						repeat: 'repeat',
						size: ''
					},
					{}
				);

				expect(extractAttr(result[1], 'rect', 'fill')).toEqual(
					'rgba(255,0,0,1)'
				);
			});

			it('should produce correct rgba fill for hex color', async () => {
				const result = await backgroundImage(
					defaultParams,
					{
						clip: 'border-box',
						image: '#00ff00',
						position: '',
						repeat: 'repeat',
						size: ''
					},
					{}
				);

				expect(extractAttr(result[1], 'rect', 'fill')).toEqual(
					'rgba(0,255,0,1)'
				);
			});

			it('should use container dimensions and offsets for pattern', async () => {
				const result = await backgroundImage(
					defaultParams,
					{
						clip: 'border-box',
						image: 'blue',
						position: '',
						repeat: 'repeat',
						size: ''
					},
					{}
				);

				expect(extractAttr(result[1], 'pattern', 'height')).toEqual(
					'100'
				);
				expect(extractAttr(result[1], 'pattern', 'width')).toEqual(
					'200'
				);
				expect(extractAttr(result[1], 'pattern', 'x')).toEqual('10');
				expect(extractAttr(result[1], 'pattern', 'y')).toEqual('20');
				expect(extractAttr(result[1], 'rect', 'height')).toEqual('100');
				expect(extractAttr(result[1], 'rect', 'width')).toEqual('200');
			});

			it('should return correct pattern id for color', async () => {
				const result = await backgroundImage(
					defaultParams,
					{
						clip: 'border-box',
						image: 'red',
						position: '',
						repeat: 'repeat',
						size: ''
					},
					{}
				);

				expect(result[0]).toEqual('satori_bitest');
			});
		});

		describe('linear gradients', () => {
			const gradient = 'linear-gradient(to right, red, blue)';

			it('should return gradient pattern id and contain gradient elements', async () => {
				const result = await backgroundImage(
					defaultParams,
					{
						clip: 'border-box',
						image: gradient,
						position: '',
						repeat: 'no-repeat',
						size: ''
					},
					{}
				);

				expect(result[0]).toEqual('satori_pattern_test');
				expect(result[1]).toContain('<linearGradient');
				expect(result[1]).toContain('<stop');
				expect(result[1]).toContain('<rect');
			});

			it('should resolve keyword size to container dimensions for gradients', async () => {
				// cover with gradient → dimensions = [containerW, containerH]
				const result = await backgroundImage(
					defaultParams,
					{
						clip: 'border-box',
						image: gradient,
						position: '',
						repeat: 'no-repeat',
						size: 'cover'
					},
					{}
				);

				expect(extractAttr(result[1], 'rect', 'height')).toEqual('100');
				expect(extractAttr(result[1], 'rect', 'width')).toEqual('200');
			});

			it('should compute correct position offset for gradient with non-container size', async () => {
				// size='50% 50%' → dimensions [100, 50]
				// center → computeBgPositionOffset('50%', 200, 100) = 50
				// pattern x = 50/200 = 0.25
				const result = await backgroundImage(
					defaultParams,
					{
						clip: 'border-box',
						image: gradient,
						position: 'center',
						repeat: 'no-repeat',
						size: '50% 50%'
					},
					{}
				);

				expect(extractAttr(result[1], 'pattern', 'x')).toEqual('0.25');
				expect(extractAttr(result[1], 'pattern', 'y')).toEqual('0.25');
			});

			it('should compute zero offset for full-size gradient with center position', async () => {
				// size='' → 'auto' (keyword) → [200, 100] for gradient
				// center → (200-200)*0.5=0, (100-100)*0.5=0
				const result = await backgroundImage(
					defaultParams,
					{
						clip: 'border-box',
						image: gradient,
						position: 'center',
						repeat: 'no-repeat',
						size: ''
					},
					{}
				);

				expect(extractAttr(result[1], 'pattern', 'x')).toEqual('0');
				expect(extractAttr(result[1], 'pattern', 'y')).toEqual('0');
			});
		});

		describe('radial gradients', () => {
			it('should dispatch to radial gradient builder', async () => {
				const result = await backgroundImage(
					defaultParams,
					{
						clip: 'border-box',
						image: 'radial-gradient(circle, red, blue)',
						position: '',
						repeat: 'no-repeat',
						size: ''
					},
					{}
				);

				expect(result[0]).toEqual('satori_pattern_test');
				expect(result[1]).toContain('<radialGradient');
				expect(result[1]).toContain('<stop');
				expect(result[1]).toContain('<rect');
			});

			it('should resolve keyword size to container dimensions for radial gradient', async () => {
				const result = await backgroundImage(
					defaultParams,
					{
						clip: 'border-box',
						image: 'radial-gradient(circle, red, blue)',
						position: '',
						repeat: 'no-repeat',
						size: 'cover'
					},
					{}
				);

				expect(extractAttr(result[1], 'rect', 'height')).toEqual('100');
				expect(extractAttr(result[1], 'rect', 'width')).toEqual('200');
			});
		});

		describe('repeating gradients', () => {
			it('should dispatch repeating-linear-gradient', async () => {
				const result = await backgroundImage(
					defaultParams,
					{
						clip: 'border-box',
						image: 'repeating-linear-gradient(to right, red 0px, blue 50px)',
						position: '',
						repeat: 'no-repeat',
						size: ''
					},
					{}
				);

				expect(result[0]).toEqual('satori_pattern_test');
				expect(result[1]).toContain('<linearGradient');
				expect(result[1]).toContain('<stop');
			});

			it('should dispatch repeating-radial-gradient', async () => {
				const result = await backgroundImage(
					defaultParams,
					{
						clip: 'border-box',
						image: 'repeating-radial-gradient(circle, red 0px, blue 50px)',
						position: '',
						repeat: 'no-repeat',
						size: ''
					},
					{}
				);

				expect(result[0]).toEqual('satori_pattern_test');
				expect(result[1]).toContain('<radialGradient');
				expect(result[1]).toContain('<stop');
			});
		});

		describe('error handling', () => {
			it('should throw for invalid image value', async () => {
				try {
					await backgroundImage(
						defaultParams,
						{
							clip: 'border-box',
							image: 'not-a-valid-anything',
							position: '',
							repeat: 'no-repeat',
							size: ''
						},
						{}
					);

					throw new Error('expected to throw');
				} catch (err) {
					expect((err as Error).message).toEqual(
						'Invalid background image: "not-a-valid-anything"'
					);
				}
			});
		});
	});
});
