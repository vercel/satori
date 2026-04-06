import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { detectFonts } from '../../src/fonts/detection';

describe('fonts/detection', () => {
	describe('detectfonts', () => {
		it('should return detected font with specified family and weight', () => {
			const element = createElement('div', {
				style: { fontFamily: 'Roboto', fontWeight: 700 }
			});

			expect(detectFonts(element, { resolveFontWeight: true })).toEqual([
				{ family: 'Roboto', key: 'roboto', weight: 700 }
			]);
		});

		it('should default weight to 400 when fontweight not specified', () => {
			const element = createElement('div', {
				style: { fontFamily: 'Roboto' }
			});

			expect(detectFonts(element)).toEqual([
				{ family: 'Roboto', key: 'roboto', weight: 400 }
			]);
		});

		it('should return defaultfont when no fonts detected', () => {
			const element = createElement('div', {});

			expect(
				detectFonts(element, {
					defaultFont: { family: 'Inter', key: 'inter', weight: 400 }
				})
			).toEqual([{ family: 'Inter', key: 'inter', weight: 400 }]);
		});

		it('should return empty array when no fonts detected and no defaultfont', () => {
			const element = createElement('div', {});

			expect(detectFonts(element)).toEqual([]);
		});

		it('should inherit fontfamily from parent to child', () => {
			const child = createElement('span', {
				style: { fontWeight: 600 }
			});
			const parent = createElement(
				'div',
				{ style: { fontFamily: 'Roboto' } },
				child
			);

			expect(detectFonts(parent, { resolveFontWeight: true })).toEqual([
				{ family: 'Roboto', key: 'roboto', weight: 400 },
				{ family: 'Roboto', key: 'roboto', weight: 600 }
			]);
		});

		it('should collect multiple different fonts', () => {
			const child = createElement('span', {
				style: { fontFamily: 'Open Sans' }
			});
			const parent = createElement(
				'div',
				{ style: { fontFamily: 'Roboto' } },
				child
			);

			expect(detectFonts(parent)).toEqual([
				{ family: 'Roboto', key: 'roboto', weight: 400 },
				{ family: 'Open Sans', key: 'open-sans', weight: 400 }
			]);
		});

		it('should take first font from comma-separated fontfamily', () => {
			const element = createElement('div', {
				style: { fontFamily: 'Roboto, Arial, sans-serif' }
			});

			expect(detectFonts(element)).toEqual([
				{ family: 'Roboto', key: 'roboto', weight: 400 }
			]);
		});

		it('should strip quotes from font names', () => {
			const element = createElement('div', {
				style: { fontFamily: "'Open Sans', Arial" }
			});

			expect(detectFonts(element)).toEqual([
				{ family: 'Open Sans', key: 'open-sans', weight: 400 }
			]);
		});

		it('should deduplicate same family:weight combinations', () => {
			const child1 = createElement('span', { key: '1' });
			const child2 = createElement('span', { key: '2' });
			const parent = createElement(
				'div',
				{ style: { fontFamily: 'Roboto' } },
				[child1, child2]
			);

			expect(detectFonts(parent)).toEqual([
				{ family: 'Roboto', key: 'roboto', weight: 400 }
			]);
		});

		it('should process array children', () => {
			const child1 = createElement('span', {
				key: '1',
				style: { fontWeight: 700 }
			});
			const child2 = createElement('span', {
				key: '2',
				style: { fontWeight: 300 }
			});
			const parent = createElement(
				'div',
				{ style: { fontFamily: 'Roboto' } },
				[child1, child2]
			);

			expect(detectFonts(parent, { resolveFontWeight: true })).toEqual([
				{ family: 'Roboto', key: 'roboto', weight: 400 },
				{ family: 'Roboto', key: 'roboto', weight: 700 },
				{ family: 'Roboto', key: 'roboto', weight: 300 }
			]);
		});

		it('should skip non-element children', () => {
			const element = createElement(
				'div',
				{ style: { fontFamily: 'Roboto' } },
				'text'
			);

			expect(detectFonts(element)).toEqual([
				{ family: 'Roboto', key: 'roboto', weight: 400 }
			]);
		});

		describe('aliases', () => {
			const aliases = {
				'ui-monospace': 'jetbrains-mono',
				'ui-sans-serif': 'inter',
				'ui-serif': 'noto-serif',
				impact: {
					key: 'impact',
					url: 'https://fonts.cdnfonts.com/s/87898/impact.ttf'
				}
			};

			it('should resolve ui-sans-serif to inter', () => {
				const element = createElement('div', {
					style: {
						fontFamily: 'ui-sans-serif, system-ui, sans-serif'
					}
				});

				expect(detectFonts(element, { aliases })).toEqual([
					{ family: 'ui-sans-serif', key: 'inter', weight: 400 }
				]);
			});

			it('should resolve ui-serif to noto-serif', () => {
				const element = createElement('div', {
					style: { fontFamily: 'ui-serif, Georgia, serif' }
				});

				expect(detectFonts(element, { aliases })).toEqual([
					{ family: 'ui-serif', key: 'noto-serif', weight: 400 }
				]);
			});

			it('should resolve ui-monospace to jetbrains-mono', () => {
				const element = createElement('div', {
					style: { fontFamily: 'ui-monospace, monospace' }
				});

				expect(detectFonts(element, { aliases })).toEqual([
					{
						family: 'ui-monospace',
						key: 'jetbrains-mono',
						weight: 400
					}
				]);
			});

			it('should resolve impact to custom url alias', () => {
				const element = createElement('div', {
					style: { fontFamily: 'Impact' }
				});

				expect(detectFonts(element, { aliases })).toEqual([
					{
						family: 'Impact',
						key: 'impact',
						url: 'https://fonts.cdnfonts.com/s/87898/impact.ttf',
						weight: 400
					}
				]);
			});

			it('should resolve aliased font with specified fontweight', () => {
				const element = createElement('div', {
					style: {
						fontFamily: 'ui-sans-serif, sans-serif',
						fontWeight: 700
					}
				});

				expect(
					detectFonts(element, { aliases, resolveFontWeight: true })
				).toEqual([
					{ family: 'ui-sans-serif', key: 'inter', weight: 700 }
				]);
			});

			it('should not alias unknown fonts', () => {
				const element = createElement('div', {
					style: { fontFamily: 'Lobster' }
				});

				expect(detectFonts(element, { aliases })).toEqual([
					{ family: 'Lobster', key: 'lobster', weight: 400 }
				]);
			});
		});

		describe('resolvefontweight: false', () => {
			it('should ignore fontweight and return weight 400', () => {
				const element = createElement('div', {
					style: { fontFamily: 'Roboto', fontWeight: 700 }
				});

				expect(
					detectFonts(element, { resolveFontWeight: false })
				).toEqual([{ family: 'Roboto', key: 'roboto', weight: 400 }]);
			});

			it('should deduplicate children with different fontweights to single weight 400', () => {
				const child1 = createElement('span', {
					key: '1',
					style: { fontWeight: 700 }
				});
				const child2 = createElement('span', {
					key: '2',
					style: { fontWeight: 300 }
				});
				const parent = createElement(
					'div',
					{ style: { fontFamily: 'Roboto' } },
					[child1, child2]
				);

				expect(
					detectFonts(parent, { resolveFontWeight: false })
				).toEqual([{ family: 'Roboto', key: 'roboto', weight: 400 }]);
			});

			it('should resolve aliased font to weight 400 regardless of fontweight', () => {
				const element = createElement('div', {
					style: {
						fontFamily: 'ui-sans-serif, sans-serif',
						fontWeight: 700
					}
				});

				expect(
					detectFonts(element, {
						aliases: { 'ui-sans-serif': 'inter' },
						resolveFontWeight: false
					})
				).toEqual([
					{ family: 'ui-sans-serif', key: 'inter', weight: 400 }
				]);
			});
		});
	});
});
