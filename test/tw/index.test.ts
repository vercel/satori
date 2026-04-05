import { beforeAll, describe, expect, it } from 'vitest';

import { initTw, tw } from '../../src/tw/index.js';

describe('tw/index', () => {
	beforeAll(async () => {
		await initTw();
	});

	describe('tw', () => {
		describe('arbitrary values', () => {
			it('should convert bg-[#ff0000]', () => {
				expect(tw('bg-[#ff0000]').backgroundColor).toEqual('#ff0000');
			});

			it('should convert border-[3px]', () => {
				expect(tw('border-[3px]').borderWidth).toEqual('3px');
			});

			it('should convert gap-[1.5rem]', () => {
				expect(tw('gap-[1.5rem]').gap).toEqual('1.5rem');
			});

			it('should convert h-[50vh]', () => {
				expect(tw('h-[50vh]').height).toEqual('50vh');
			});

			it('should convert m-[20px]', () => {
				expect(tw('m-[20px]').margin).toEqual('20px');
			});

			it('should convert max-w-[600px]', () => {
				expect(tw('max-w-[600px]').maxWidth).toEqual('600px');
			});

			it('should convert min-h-[100px]', () => {
				expect(tw('min-h-[100px]').minHeight).toEqual('100px');
			});

			it('should convert opacity-[.33]', () => {
				expect(tw('opacity-[.33]').opacity).toEqual(0.33);
			});

			it('should convert p-[10px]', () => {
				expect(tw('p-[10px]').padding).toEqual('10px');
			});

			it('should convert rounded-[12px]', () => {
				expect(tw('rounded-[12px]').borderRadius).toEqual('12px');
			});

			it('should convert text-[14px]', () => {
				expect(tw('text-[14px]').fontSize).toEqual('14px');
			});

			it('should convert top-[10px]', () => {
				expect(tw('top-[10px]').top).toEqual('10px');
			});

			it('should convert w-[200px]', () => {
				expect(tw('w-[200px]').width).toEqual('200px');
			});

			it('should convert z-[999]', () => {
				expect(tw('z-[999]').zIndex).toEqual(999);
			});
		});

		describe('aspect ratio', () => {
			it('should convert aspect-auto', () => {
				expect(tw('aspect-auto').aspectRatio).toEqual('auto');
			});

			it('should convert aspect-square', () => {
				expect(tw('aspect-square').aspectRatio).toEqual('1 / 1');
			});

			it('should convert aspect-video', () => {
				expect(tw('aspect-video').aspectRatio).toEqual('16 / 9');
			});
		});

		describe('backdrop filters', () => {
			it('should convert backdrop-blur to backdropFilter', () => {
				const result = tw('backdrop-blur');
				expect(result.backdropFilter).toContain('blur(');
			});

			it('should convert backdrop-blur-md to backdropFilter', () => {
				const result = tw('backdrop-blur-md');
				expect(result.backdropFilter).toContain('blur(');
			});

			it('should convert backdrop-blur-none to empty object', () => {
				expect(tw('backdrop-blur-none')).toEqual({});
			});

			it('should convert backdrop-brightness-50', () => {
				const result = tw('backdrop-brightness-50');
				expect(result.backdropFilter).toContain('brightness(');
			});

			it('should convert backdrop-contrast-50', () => {
				const result = tw('backdrop-contrast-50');
				expect(result.backdropFilter).toContain('contrast(');
			});

			it('should convert backdrop-grayscale', () => {
				const result = tw('backdrop-grayscale');
				expect(result.backdropFilter).toContain('grayscale(');
			});

			it('should convert backdrop-hue-rotate-90', () => {
				const result = tw('backdrop-hue-rotate-90');
				expect(result.backdropFilter).toContain('hue-rotate(');
			});

			it('should convert backdrop-invert', () => {
				const result = tw('backdrop-invert');
				expect(result.backdropFilter).toContain('invert(');
			});

			it('should convert backdrop-opacity-50', () => {
				const result = tw('backdrop-opacity-50');
				expect(result.backdropFilter).toContain('opacity(');
			});

			it('should convert backdrop-saturate-50', () => {
				const result = tw('backdrop-saturate-50');
				expect(result.backdropFilter).toContain('saturate(');
			});

			it('should convert backdrop-sepia', () => {
				const result = tw('backdrop-sepia');
				expect(result.backdropFilter).toContain('sepia(');
			});

			it('should set WebkitBackdropFilter alongside backdropFilter', () => {
				const result = tw('backdrop-blur-sm');
				expect(result.WebkitBackdropFilter).toEqual(
					result.backdropFilter
				);
			});
		});

		describe('background', () => {
			it('should convert bg-auto', () => {
				expect(tw('bg-auto').backgroundSize).toEqual('auto');
			});

			it('should convert bg-black', () => {
				expect(tw('bg-black').backgroundColor).toEqual('#000');
			});

			it('should convert bg-bottom', () => {
				expect(tw('bg-bottom').backgroundPosition).toEqual('bottom');
			});

			it('should convert bg-center', () => {
				expect(tw('bg-center').backgroundPosition).toEqual('center');
			});

			it('should convert bg-clip-border', () => {
				expect(tw('bg-clip-border').backgroundClip).toEqual(
					'border-box'
				);
			});

			it('should convert bg-clip-content', () => {
				expect(tw('bg-clip-content').backgroundClip).toEqual(
					'content-box'
				);
			});

			it('should convert bg-clip-padding', () => {
				expect(tw('bg-clip-padding').backgroundClip).toEqual(
					'padding-box'
				);
			});

			it('should convert bg-clip-text', () => {
				expect(tw('bg-clip-text').backgroundClip).toEqual('text');
			});

			it('should convert bg-contain', () => {
				expect(tw('bg-contain').backgroundSize).toEqual('contain');
			});

			it('should convert bg-cover', () => {
				expect(tw('bg-cover').backgroundSize).toEqual('cover');
			});

			it('should convert bg-current', () => {
				expect(tw('bg-current').backgroundColor).toEqual(
					'currentcolor'
				);
			});

			it('should convert bg-fixed', () => {
				expect(tw('bg-fixed').backgroundAttachment).toEqual('fixed');
			});

			it('should convert bg-gradient-to-r to a backgroundImage', () => {
				expect(tw('bg-gradient-to-r').backgroundImage).toBeTruthy();
			});

			it('should convert bg-inherit', () => {
				expect(tw('bg-inherit').backgroundColor).toEqual('inherit');
			});

			it('should convert bg-left', () => {
				expect(tw('bg-left').backgroundPosition).toEqual('left');
			});

			it('should convert bg-linear-to-b', () => {
				expect(tw('bg-linear-to-b').backgroundImage).toBeTruthy();
			});

			it('should convert bg-linear-to-t', () => {
				expect(tw('bg-linear-to-t').backgroundImage).toBeTruthy();
			});

			it('should convert bg-local', () => {
				expect(tw('bg-local').backgroundAttachment).toEqual('local');
			});

			it('should convert bg-no-repeat', () => {
				expect(tw('bg-no-repeat').backgroundRepeat).toEqual(
					'no-repeat'
				);
			});

			it('should convert bg-none', () => {
				expect(tw('bg-none').backgroundImage).toEqual('none');
			});

			it('should convert bg-origin-border', () => {
				expect(tw('bg-origin-border').backgroundOrigin).toEqual(
					'border-box'
				);
			});

			it('should convert bg-origin-content', () => {
				expect(tw('bg-origin-content').backgroundOrigin).toEqual(
					'content-box'
				);
			});

			it('should convert bg-origin-padding', () => {
				expect(tw('bg-origin-padding').backgroundOrigin).toEqual(
					'padding-box'
				);
			});

			it('should convert bg-red-500', () => {
				expect(tw('bg-red-500').backgroundColor).toEqual('#fb2c36');
			});

			it('should convert bg-repeat', () => {
				expect(tw('bg-repeat').backgroundRepeat).toEqual('repeat');
			});

			it('should convert bg-repeat-x', () => {
				expect(tw('bg-repeat-x').backgroundRepeat).toEqual('repeat-x');
			});

			it('should convert bg-repeat-y', () => {
				expect(tw('bg-repeat-y').backgroundRepeat).toEqual('repeat-y');
			});

			it('should convert bg-right', () => {
				expect(tw('bg-right').backgroundPosition).toEqual('right');
			});

			it('should convert bg-scroll', () => {
				expect(tw('bg-scroll').backgroundAttachment).toEqual('scroll');
			});

			it('should convert bg-top', () => {
				expect(tw('bg-top').backgroundPosition).toEqual('top');
			});

			it('should convert bg-transparent', () => {
				expect(tw('bg-transparent').backgroundColor).toEqual(
					'transparent'
				);
			});

			it('should convert bg-white', () => {
				expect(tw('bg-white').backgroundColor).toEqual('#fff');
			});
		});

		describe('blend modes', () => {
			it('should convert bg-blend-darken', () => {
				expect(tw('bg-blend-darken').backgroundBlendMode).toEqual(
					'darken'
				);
			});

			it('should convert bg-blend-lighten', () => {
				expect(tw('bg-blend-lighten').backgroundBlendMode).toEqual(
					'lighten'
				);
			});

			it('should convert bg-blend-multiply', () => {
				expect(tw('bg-blend-multiply').backgroundBlendMode).toEqual(
					'multiply'
				);
			});

			it('should convert bg-blend-normal', () => {
				expect(tw('bg-blend-normal').backgroundBlendMode).toEqual(
					'normal'
				);
			});

			it('should convert bg-blend-overlay', () => {
				expect(tw('bg-blend-overlay').backgroundBlendMode).toEqual(
					'overlay'
				);
			});

			it('should convert bg-blend-screen', () => {
				expect(tw('bg-blend-screen').backgroundBlendMode).toEqual(
					'screen'
				);
			});

			it('should convert mix-blend-color-burn', () => {
				expect(tw('mix-blend-color-burn').mixBlendMode).toEqual(
					'color-burn'
				);
			});

			it('should convert mix-blend-color-dodge', () => {
				expect(tw('mix-blend-color-dodge').mixBlendMode).toEqual(
					'color-dodge'
				);
			});

			it('should convert mix-blend-darken', () => {
				expect(tw('mix-blend-darken').mixBlendMode).toEqual('darken');
			});

			it('should convert mix-blend-difference', () => {
				expect(tw('mix-blend-difference').mixBlendMode).toEqual(
					'difference'
				);
			});

			it('should convert mix-blend-exclusion', () => {
				expect(tw('mix-blend-exclusion').mixBlendMode).toEqual(
					'exclusion'
				);
			});

			it('should convert mix-blend-hard-light', () => {
				expect(tw('mix-blend-hard-light').mixBlendMode).toEqual(
					'hard-light'
				);
			});

			it('should convert mix-blend-lighten', () => {
				expect(tw('mix-blend-lighten').mixBlendMode).toEqual('lighten');
			});

			it('should convert mix-blend-multiply', () => {
				expect(tw('mix-blend-multiply').mixBlendMode).toEqual(
					'multiply'
				);
			});

			it('should convert mix-blend-normal', () => {
				expect(tw('mix-blend-normal').mixBlendMode).toEqual('normal');
			});

			it('should convert mix-blend-overlay', () => {
				expect(tw('mix-blend-overlay').mixBlendMode).toEqual('overlay');
			});

			it('should convert mix-blend-screen', () => {
				expect(tw('mix-blend-screen').mixBlendMode).toEqual('screen');
			});

			it('should convert mix-blend-soft-light', () => {
				expect(tw('mix-blend-soft-light').mixBlendMode).toEqual(
					'soft-light'
				);
			});
		});

		describe('border colors', () => {
			it('should convert border-black', () => {
				expect(tw('border-black').borderColor).toEqual('#000');
			});

			it('should convert border-red-500', () => {
				expect(tw('border-red-500').borderColor).toEqual('#fb2c36');
			});

			it('should convert border-t-red-500', () => {
				expect(tw('border-t-red-500').borderTopColor).toEqual(
					'#fb2c36'
				);
			});

			it('should convert border-transparent', () => {
				expect(tw('border-transparent').borderColor).toEqual(
					'transparent'
				);
			});

			it('should convert border-white', () => {
				expect(tw('border-white').borderColor).toEqual('#fff');
			});

			it('should convert border-x-blue-500 to left and right', () => {
				const result = tw('border-x-blue-500');
				expect(result.borderLeftColor).toEqual('#2b7fff');
				expect(result.borderRightColor).toEqual('#2b7fff');
			});
		});

		describe('border radius', () => {
			it('should convert rounded', () => {
				expect(tw('rounded').borderRadius).toEqual('0.25rem');
			});

			it('should convert rounded-2xl', () => {
				expect(tw('rounded-2xl').borderRadius).toEqual('1rem');
			});

			it('should convert rounded-3xl', () => {
				expect(tw('rounded-3xl').borderRadius).toEqual('1.5rem');
			});

			it('should convert rounded-4xl', () => {
				expect(tw('rounded-4xl').borderRadius).toEqual('2rem');
			});

			it('should convert rounded-b-lg to bottom corners', () => {
				const result = tw('rounded-b-lg');
				expect(result.borderBottomLeftRadius).toEqual('0.5rem');
				expect(result.borderBottomRightRadius).toEqual('0.5rem');
			});

			it('should convert rounded-bl-lg', () => {
				expect(tw('rounded-bl-lg').borderBottomLeftRadius).toEqual(
					'0.5rem'
				);
			});

			it('should convert rounded-br-lg', () => {
				expect(tw('rounded-br-lg').borderBottomRightRadius).toEqual(
					'0.5rem'
				);
			});

			it('should convert rounded-e-lg to end corners', () => {
				const result = tw('rounded-e-lg');
				expect(result.borderTopRightRadius).toEqual('0.5rem');
				expect(result.borderBottomRightRadius).toEqual('0.5rem');
			});

			it('should convert rounded-ee-lg to bottom-right', () => {
				expect(tw('rounded-ee-lg').borderBottomRightRadius).toEqual(
					'0.5rem'
				);
			});

			it('should convert rounded-es-lg to bottom-left', () => {
				expect(tw('rounded-es-lg').borderBottomLeftRadius).toEqual(
					'0.5rem'
				);
			});

			it('should convert rounded-full', () => {
				expect(tw('rounded-full').borderRadius).toEqual('9999px');
			});

			it('should convert rounded-l-lg to left corners', () => {
				const result = tw('rounded-l-lg');
				expect(result.borderTopLeftRadius).toEqual('0.5rem');
				expect(result.borderBottomLeftRadius).toEqual('0.5rem');
			});

			it('should convert rounded-lg', () => {
				expect(tw('rounded-lg').borderRadius).toEqual('0.5rem');
			});

			it('should convert rounded-md', () => {
				expect(tw('rounded-md').borderRadius).toEqual('0.375rem');
			});

			it('should convert rounded-none', () => {
				expect(tw('rounded-none').borderRadius).toEqual('0');
			});

			it('should convert rounded-r-lg to right corners', () => {
				const result = tw('rounded-r-lg');
				expect(result.borderTopRightRadius).toEqual('0.5rem');
				expect(result.borderBottomRightRadius).toEqual('0.5rem');
			});

			it('should convert rounded-s-lg to start corners', () => {
				const result = tw('rounded-s-lg');
				expect(result.borderTopLeftRadius).toEqual('0.5rem');
				expect(result.borderBottomLeftRadius).toEqual('0.5rem');
			});

			it('should convert rounded-se-lg to top-right', () => {
				expect(tw('rounded-se-lg').borderTopRightRadius).toEqual(
					'0.5rem'
				);
			});

			it('should convert rounded-sm', () => {
				expect(tw('rounded-sm').borderRadius).toEqual('0.25rem');
			});

			it('should convert rounded-ss-lg to top-left', () => {
				expect(tw('rounded-ss-lg').borderTopLeftRadius).toEqual(
					'0.5rem'
				);
			});

			it('should convert rounded-t-lg to top corners', () => {
				const result = tw('rounded-t-lg');
				expect(result.borderTopLeftRadius).toEqual('0.5rem');
				expect(result.borderTopRightRadius).toEqual('0.5rem');
			});

			it('should convert rounded-tl-lg', () => {
				expect(tw('rounded-tl-lg').borderTopLeftRadius).toEqual(
					'0.5rem'
				);
			});

			it('should convert rounded-tr-lg', () => {
				expect(tw('rounded-tr-lg').borderTopRightRadius).toEqual(
					'0.5rem'
				);
			});

			it('should convert rounded-xl', () => {
				expect(tw('rounded-xl').borderRadius).toEqual('0.75rem');
			});

			it('should convert rounded-xs', () => {
				expect(tw('rounded-xs').borderRadius).toEqual('0.125rem');
			});
		});

		describe('borders', () => {
			it('should convert border to borderStyle and borderWidth', () => {
				const result = tw('border');
				expect(result.borderStyle).toEqual('solid');
				expect(result.borderWidth).toEqual('1px');
			});

			it('should convert border-0', () => {
				expect(tw('border-0').borderWidth).toEqual('0px');
			});

			it('should convert border-2', () => {
				expect(tw('border-2').borderWidth).toEqual('2px');
			});

			it('should convert border-4', () => {
				expect(tw('border-4').borderWidth).toEqual('4px');
			});

			it('should convert border-8', () => {
				expect(tw('border-8').borderWidth).toEqual('8px');
			});

			it('should convert border-b', () => {
				expect(tw('border-b').borderBottomWidth).toEqual('1px');
			});

			it('should convert border-dashed', () => {
				expect(tw('border-dashed').borderStyle).toEqual('dashed');
			});

			it('should convert border-dotted', () => {
				expect(tw('border-dotted').borderStyle).toEqual('dotted');
			});

			it('should convert border-double', () => {
				expect(tw('border-double').borderStyle).toEqual('double');
			});

			it('should convert border-e-2 to borderRightWidth', () => {
				expect(tw('border-e-2').borderRightWidth).toEqual('2px');
			});

			it('should convert border-hidden', () => {
				expect(tw('border-hidden').borderStyle).toEqual('hidden');
			});

			it('should convert border-l', () => {
				expect(tw('border-l').borderLeftWidth).toEqual('1px');
			});

			it('should convert border-none', () => {
				expect(tw('border-none').borderStyle).toEqual('none');
			});

			it('should convert border-r', () => {
				expect(tw('border-r').borderRightWidth).toEqual('1px');
			});

			it('should convert border-s-2 to borderLeftWidth', () => {
				expect(tw('border-s-2').borderLeftWidth).toEqual('2px');
			});

			it('should convert border-solid', () => {
				expect(tw('border-solid').borderStyle).toEqual('solid');
			});

			it('should convert border-t', () => {
				expect(tw('border-t').borderTopWidth).toEqual('1px');
			});

			it('should convert border-t-2', () => {
				expect(tw('border-t-2').borderTopWidth).toEqual('2px');
			});

			it('should convert border-x to left and right', () => {
				const result = tw('border-x');
				expect(result.borderLeftWidth).toEqual('1px');
				expect(result.borderRightWidth).toEqual('1px');
			});

			it('should convert border-x-2 to left and right', () => {
				const result = tw('border-x-2');
				expect(result.borderLeftWidth).toEqual('2px');
				expect(result.borderRightWidth).toEqual('2px');
			});

			it('should convert border-y to top and bottom', () => {
				const result = tw('border-y');
				expect(result.borderTopWidth).toEqual('1px');
				expect(result.borderBottomWidth).toEqual('1px');
			});
		});

		describe('box sizing', () => {
			it('should convert box-border', () => {
				expect(tw('box-border').boxSizing).toEqual('border-box');
			});

			it('should convert box-content', () => {
				expect(tw('box-content').boxSizing).toEqual('content-box');
			});
		});

		describe('box-decoration-break', () => {
			it('should convert box-decoration-clone', () => {
				const result = tw('box-decoration-clone');
				expect(result.boxDecorationBreak).toEqual('clone');
				expect(result.WebkitBoxDecorationBreak).toEqual('clone');
			});

			it('should convert box-decoration-slice', () => {
				const result = tw('box-decoration-slice');
				expect(result.boxDecorationBreak).toEqual('slice');
				expect(result.WebkitBoxDecorationBreak).toEqual('slice');
			});
		});

		describe('break', () => {
			it('should convert break-after-auto', () => {
				expect(tw('break-after-auto').breakAfter).toEqual('auto');
			});

			it('should convert break-after-avoid', () => {
				expect(tw('break-after-avoid').breakAfter).toEqual('avoid');
			});

			it('should convert break-after-column', () => {
				expect(tw('break-after-column').breakAfter).toEqual('column');
			});

			it('should convert break-before-auto', () => {
				expect(tw('break-before-auto').breakBefore).toEqual('auto');
			});

			it('should convert break-before-column', () => {
				expect(tw('break-before-column').breakBefore).toEqual('column');
			});

			it('should convert break-inside-auto', () => {
				expect(tw('break-inside-auto').breakInside).toEqual('auto');
			});

			it('should convert break-inside-avoid', () => {
				expect(tw('break-inside-avoid').breakInside).toEqual('avoid');
			});

			it('should convert break-inside-avoid-column', () => {
				expect(tw('break-inside-avoid-column').breakInside).toEqual(
					'avoid-column'
				);
			});
		});

		describe('caching', () => {
			it('should cache results (same input returns same reference)', () => {
				const result1 = tw('flex');
				const result2 = tw('flex');
				expect(result1).toBe(result2);
			});

			it('should return new empty object each call for empty input', () => {
				const result1 = tw('');
				const result2 = tw('');
				expect(result1).toEqual({});
				expect(result2).toEqual({});
				expect(result1).not.toBe(result2);
			});

			it('should return same cached reference regardless of whitespace', () => {
				const result1 = tw('flex');
				const result2 = tw('flex ');
				const result3 = tw(' flex');
				expect(result1).toBe(result2);
				expect(result2).toBe(result3);
			});
		});

		describe('content', () => {
			it('should convert content-none', () => {
				expect(tw('content-none').content).toEqual('none');
			});
		});

		describe('cursor', () => {
			it('should convert cursor-default', () => {
				expect(tw('cursor-default').cursor).toEqual('default');
			});

			it('should convert cursor-not-allowed', () => {
				expect(tw('cursor-not-allowed').cursor).toEqual('not-allowed');
			});

			it('should convert cursor-pointer', () => {
				expect(tw('cursor-pointer').cursor).toEqual('pointer');
			});
		});

		describe('display', () => {
			it('should convert block', () => {
				expect(tw('block').display).toEqual('block');
			});

			it('should convert contents', () => {
				expect(tw('contents').display).toEqual('contents');
			});

			it('should convert flex', () => {
				expect(tw('flex').display).toEqual('flex');
			});

			it('should convert flow-root', () => {
				expect(tw('flow-root').display).toEqual('flow-root');
			});

			it('should convert grid', () => {
				expect(tw('grid').display).toEqual('grid');
			});

			it('should convert hidden', () => {
				expect(tw('hidden').display).toEqual('none');
			});

			it('should convert inline', () => {
				expect(tw('inline').display).toEqual('inline');
			});

			it('should convert inline-block', () => {
				expect(tw('inline-block').display).toEqual('inline-block');
			});

			it('should convert inline-flex', () => {
				expect(tw('inline-flex').display).toEqual('inline-flex');
			});

			it('should convert inline-grid', () => {
				expect(tw('inline-grid').display).toEqual('inline-grid');
			});

			it('should convert list-item', () => {
				expect(tw('list-item').display).toEqual('list-item');
			});

			it('should convert not-sr-only', () => {
				const result = tw('not-sr-only');
				expect(result.position).toEqual('static');
				expect(result.width).toEqual('auto');
				expect(result.height).toEqual('auto');
				expect(result.overflow).toEqual('visible');
			});

			it('should convert sr-only', () => {
				const result = tw('sr-only');
				expect(result.position).toEqual('absolute');
				expect(result.width).toEqual('1px');
				expect(result.height).toEqual('1px');
				expect(result.overflow).toEqual('hidden');
			});

			it('should convert table', () => {
				expect(tw('table').display).toEqual('table');
			});

			it('should convert table-caption', () => {
				expect(tw('table-caption').display).toEqual('table-caption');
			});

			it('should convert table-cell', () => {
				expect(tw('table-cell').display).toEqual('table-cell');
			});

			it('should convert table-column', () => {
				expect(tw('table-column').display).toEqual('table-column');
			});

			it('should convert table-footer-group', () => {
				expect(tw('table-footer-group').display).toEqual(
					'table-footer-group'
				);
			});

			it('should convert table-header-group', () => {
				expect(tw('table-header-group').display).toEqual(
					'table-header-group'
				);
			});

			it('should convert table-row', () => {
				expect(tw('table-row').display).toEqual('table-row');
			});

			it('should convert table-row-group', () => {
				expect(tw('table-row-group').display).toEqual(
					'table-row-group'
				);
			});
		});

		describe('drop-shadows', () => {
			it('should convert drop-shadow to a filter value', () => {
				const result = tw('drop-shadow');
				expect(result.filter).toContain('drop-shadow(');
			});

			it('should convert drop-shadow-2xl', () => {
				expect(tw('drop-shadow-2xl').filter).toContain('drop-shadow(');
			});

			it('should convert drop-shadow-lg', () => {
				const result = tw('drop-shadow-lg');
				expect(result.filter).toContain('drop-shadow(');
			});

			it('should convert drop-shadow-md', () => {
				expect(tw('drop-shadow-md').filter).toContain('drop-shadow(');
			});

			it('should convert drop-shadow-none to empty object', () => {
				expect(tw('drop-shadow-none')).toEqual({});
			});

			it('should convert drop-shadow-sm', () => {
				expect(tw('drop-shadow-sm').filter).toContain('drop-shadow(');
			});

			it('should convert drop-shadow-xl', () => {
				const result = tw('drop-shadow-xl');
				expect(result.filter).toContain('drop-shadow(');
			});

			it('should convert drop-shadow-xl drop-shadow-red-500 to filter with red', () => {
				const result = tw('drop-shadow-xl drop-shadow-red-500');
				expect(result.filter).toContain('#fb2c36');
				expect(result).not.toHaveProperty('color');
			});

			it('should convert drop-shadow-xs', () => {
				expect(tw('drop-shadow-xs').filter).toContain('drop-shadow(');
			});
		});

		describe('empty and whitespace inputs', () => {
			it('should return empty object for empty string', () => {
				expect(tw('')).toEqual({});
			});

			it('should return empty object for tab/newline whitespace', () => {
				expect(tw('\t\n  ')).toEqual({});
			});

			it('should return empty object for whitespace-only string', () => {
				expect(tw('   ')).toEqual({});
			});
		});

		describe('filters', () => {
			it('should combine multiple filters', () => {
				const result = tw('blur-md brightness-75');
				expect(result.filter).toContain('blur(12px)');
				expect(result.filter).toContain('brightness(75%)');
			});

			it('should convert blur to filter', () => {
				expect(tw('blur').filter).toContain('blur(');
			});

			it('should convert blur-2xl', () => {
				expect(tw('blur-2xl').filter).toContain('blur(40px)');
			});

			it('should convert blur-3xl', () => {
				expect(tw('blur-3xl').filter).toContain('blur(64px)');
			});

			it('should convert blur-lg', () => {
				expect(tw('blur-lg').filter).toContain('blur(16px)');
			});

			it('should convert blur-md', () => {
				expect(tw('blur-md').filter).toContain('blur(12px)');
			});

			it('should convert blur-none to empty object', () => {
				expect(tw('blur-none')).toEqual({});
			});

			it('should convert blur-sm', () => {
				expect(tw('blur-sm').filter).toContain('blur(8px)');
			});

			it('should convert blur-xl', () => {
				expect(tw('blur-xl').filter).toContain('blur(24px)');
			});

			it('should convert blur-xs', () => {
				expect(tw('blur-xs').filter).toContain('blur(4px)');
			});

			it('should convert brightness-150', () => {
				expect(tw('brightness-150').filter).toContain(
					'brightness(150%)'
				);
			});

			it('should convert brightness-50', () => {
				expect(tw('brightness-50').filter).toContain('brightness(50%)');
			});

			it('should convert contrast-50', () => {
				expect(tw('contrast-50').filter).toContain('contrast(50%)');
			});

			it('should convert grayscale', () => {
				expect(tw('grayscale').filter).toContain('grayscale(100%)');
			});

			it('should convert hue-rotate-90', () => {
				expect(tw('hue-rotate-90').filter).toContain(
					'hue-rotate(90deg)'
				);
			});

			it('should convert invert', () => {
				expect(tw('invert').filter).toContain('invert(100%)');
			});

			it('should convert saturate-50', () => {
				expect(tw('saturate-50').filter).toContain('saturate(50%)');
			});

			it('should convert sepia', () => {
				expect(tw('sepia').filter).toContain('sepia(100%)');
			});
		});

		describe('flexbox', () => {
			it('should convert basis-0', () => {
				expect(tw('basis-0').flexBasis).toEqual('0rem');
			});

			it('should convert basis-1/2', () => {
				expect(tw('basis-1/2').flexBasis).toEqual('50%');
			});

			it('should convert basis-auto', () => {
				expect(tw('basis-auto').flexBasis).toEqual('auto');
			});

			it('should convert basis-full', () => {
				expect(tw('basis-full').flexBasis).toEqual('100%');
			});

			it('should convert flex-1', () => {
				expect(tw('flex-1').flex).toEqual(1);
			});

			it('should convert flex-auto', () => {
				expect(tw('flex-auto').flex).toEqual('auto');
			});

			it('should convert flex-col', () => {
				expect(tw('flex-col').flexDirection).toEqual('column');
			});

			it('should convert flex-col-reverse', () => {
				expect(tw('flex-col-reverse').flexDirection).toEqual(
					'column-reverse'
				);
			});

			it('should convert flex-initial', () => {
				expect(tw('flex-initial').flex).toEqual('0 auto');
			});

			it('should convert flex-none', () => {
				expect(tw('flex-none').flex).toEqual('none');
			});

			it('should convert flex-nowrap', () => {
				expect(tw('flex-nowrap').flexWrap).toEqual('nowrap');
			});

			it('should convert flex-row', () => {
				expect(tw('flex-row').flexDirection).toEqual('row');
			});

			it('should convert flex-row-reverse', () => {
				expect(tw('flex-row-reverse').flexDirection).toEqual(
					'row-reverse'
				);
			});

			it('should convert flex-wrap', () => {
				expect(tw('flex-wrap').flexWrap).toEqual('wrap');
			});

			it('should convert flex-wrap-reverse', () => {
				expect(tw('flex-wrap-reverse').flexWrap).toEqual(
					'wrap-reverse'
				);
			});

			it('should convert grow', () => {
				expect(tw('grow').flexGrow).toEqual(1);
			});

			it('should convert grow-0', () => {
				expect(tw('grow-0').flexGrow).toEqual(0);
			});

			it('should convert shrink', () => {
				expect(tw('shrink').flexShrink).toEqual(1);
			});

			it('should convert shrink-0', () => {
				expect(tw('shrink-0').flexShrink).toEqual(0);
			});
		});

		describe('font-variant-numeric', () => {
			it('should convert diagonal-fractions', () => {
				expect(tw('diagonal-fractions').fontVariantNumeric).toEqual(
					'diagonal-fractions'
				);
			});

			it('should convert lining-nums', () => {
				expect(tw('lining-nums').fontVariantNumeric).toEqual(
					'lining-nums'
				);
			});

			it('should convert normal-nums', () => {
				expect(tw('normal-nums').fontVariantNumeric).toEqual('normal');
			});

			it('should convert ordinal', () => {
				expect(tw('ordinal').fontVariantNumeric).toEqual('ordinal');
			});

			it('should convert slashed-zero', () => {
				expect(tw('slashed-zero').fontVariantNumeric).toEqual(
					'slashed-zero'
				);
			});

			it('should convert tabular-nums', () => {
				expect(tw('tabular-nums').fontVariantNumeric).toEqual(
					'tabular-nums'
				);
			});
		});

		describe('gap', () => {
			it('should convert gap-0', () => {
				expect(tw('gap-0').gap).toEqual('0rem');
			});

			it('should convert gap-1', () => {
				expect(tw('gap-1').gap).toEqual('0.25rem');
			});

			it('should convert gap-4', () => {
				expect(tw('gap-4').gap).toEqual('1rem');
			});

			it('should convert gap-px', () => {
				expect(tw('gap-px').gap).toEqual('1px');
			});

			it('should convert gap-x-4', () => {
				expect(tw('gap-x-4').columnGap).toEqual('1rem');
			});

			it('should convert gap-y-4', () => {
				expect(tw('gap-y-4').rowGap).toEqual('1rem');
			});
		});

		describe('gradient color stops', () => {
			it('should convert bg-linear-to-r from-red-500 to-blue-500', () => {
				const result = tw('bg-linear-to-r from-red-500 to-blue-500');
				expect(result.backgroundImage).toContain(
					'linear-gradient(to right'
				);
				expect(result.backgroundImage).toContain('#fb2c36');
				expect(result.backgroundImage).toContain('#2b7fff');
			});

			it('should convert bg-linear-to-r from-red-500 via-green-500 to-blue-500', () => {
				const result = tw(
					'bg-linear-to-r from-red-500 via-green-500 to-blue-500'
				);
				expect(result.backgroundImage).toContain(
					'linear-gradient(to right'
				);
				expect(result.backgroundImage).toContain('#fb2c36');
				expect(result.backgroundImage).toContain('#00c950');
				expect(result.backgroundImage).toContain('#2b7fff');
			});
		});

		describe('grid', () => {
			it('should convert auto-cols-auto', () => {
				expect(tw('auto-cols-auto').gridAutoColumns).toEqual('auto');
			});

			it('should convert auto-cols-fr', () => {
				expect(tw('auto-cols-fr').gridAutoColumns).toEqual(
					'minmax(0, 1fr)'
				);
			});

			it('should convert auto-cols-max', () => {
				expect(tw('auto-cols-max').gridAutoColumns).toEqual(
					'max-content'
				);
			});

			it('should convert auto-cols-min', () => {
				expect(tw('auto-cols-min').gridAutoColumns).toEqual(
					'min-content'
				);
			});

			it('should convert auto-rows-auto', () => {
				expect(tw('auto-rows-auto').gridAutoRows).toEqual('auto');
			});

			it('should convert auto-rows-fr', () => {
				expect(tw('auto-rows-fr').gridAutoRows).toEqual(
					'minmax(0, 1fr)'
				);
			});

			it('should convert auto-rows-max', () => {
				expect(tw('auto-rows-max').gridAutoRows).toEqual('max-content');
			});

			it('should convert auto-rows-min', () => {
				expect(tw('auto-rows-min').gridAutoRows).toEqual('min-content');
			});

			it('should convert col-end-1', () => {
				expect(tw('col-end-1').gridColumnEnd).toEqual(1);
			});

			it('should convert col-end-auto', () => {
				expect(tw('col-end-auto').gridColumnEnd).toEqual('auto');
			});

			it('should convert col-span-2', () => {
				expect(tw('col-span-2').gridColumn).toEqual('span 2 / span 2');
			});

			it('should convert col-span-full', () => {
				expect(tw('col-span-full').gridColumn).toEqual('1 / -1');
			});

			it('should convert col-start-1', () => {
				expect(tw('col-start-1').gridColumnStart).toEqual(1);
			});

			it('should convert col-start-auto', () => {
				expect(tw('col-start-auto').gridColumnStart).toEqual('auto');
			});

			it('should convert grid-cols-1', () => {
				expect(tw('grid-cols-1').gridTemplateColumns).toEqual(
					'repeat(1, minmax(0, 1fr))'
				);
			});

			it('should convert grid-cols-12', () => {
				expect(tw('grid-cols-12').gridTemplateColumns).toEqual(
					'repeat(12, minmax(0, 1fr))'
				);
			});

			it('should convert grid-cols-none', () => {
				expect(tw('grid-cols-none').gridTemplateColumns).toEqual(
					'none'
				);
			});

			it('should convert grid-cols-subgrid', () => {
				expect(tw('grid-cols-subgrid').gridTemplateColumns).toEqual(
					'subgrid'
				);
			});

			it('should convert grid-flow-col', () => {
				expect(tw('grid-flow-col').gridAutoFlow).toEqual('column');
			});

			it('should convert grid-flow-col-dense', () => {
				expect(tw('grid-flow-col-dense').gridAutoFlow).toEqual(
					'column dense'
				);
			});

			it('should convert grid-flow-dense', () => {
				expect(tw('grid-flow-dense').gridAutoFlow).toEqual('dense');
			});

			it('should convert grid-flow-row', () => {
				expect(tw('grid-flow-row').gridAutoFlow).toEqual('row');
			});

			it('should convert grid-flow-row-dense', () => {
				expect(tw('grid-flow-row-dense').gridAutoFlow).toEqual(
					'row dense'
				);
			});

			it('should convert grid-rows-2', () => {
				expect(tw('grid-rows-2').gridTemplateRows).toEqual(
					'repeat(2, minmax(0, 1fr))'
				);
			});

			it('should convert grid-rows-none', () => {
				expect(tw('grid-rows-none').gridTemplateRows).toEqual('none');
			});

			it('should convert grid-rows-subgrid', () => {
				expect(tw('grid-rows-subgrid').gridTemplateRows).toEqual(
					'subgrid'
				);
			});

			it('should convert row-end-1', () => {
				expect(tw('row-end-1').gridRowEnd).toEqual(1);
			});

			it('should convert row-end-auto', () => {
				expect(tw('row-end-auto').gridRowEnd).toEqual('auto');
			});

			it('should convert row-span-2', () => {
				expect(tw('row-span-2').gridRow).toEqual('span 2 / span 2');
			});

			it('should convert row-span-full', () => {
				expect(tw('row-span-full').gridRow).toEqual('1 / -1');
			});

			it('should convert row-start-1', () => {
				expect(tw('row-start-1').gridRowStart).toEqual(1);
			});

			it('should convert row-start-auto', () => {
				expect(tw('row-start-auto').gridRowStart).toEqual('auto');
			});
		});

		describe('height', () => {
			it('should convert h-0', () => {
				expect(tw('h-0').height).toEqual('0rem');
			});

			it('should convert h-1/2', () => {
				expect(tw('h-1/2').height).toEqual('50%');
			});

			it('should convert h-4', () => {
				expect(tw('h-4').height).toEqual('1rem');
			});

			it('should convert h-auto', () => {
				expect(tw('h-auto').height).toEqual('auto');
			});

			it('should convert h-fit', () => {
				expect(tw('h-fit').height).toEqual('fit-content');
			});

			it('should convert h-full', () => {
				expect(tw('h-full').height).toEqual('100%');
			});

			it('should convert h-max', () => {
				expect(tw('h-max').height).toEqual('max-content');
			});

			it('should convert h-min', () => {
				expect(tw('h-min').height).toEqual('min-content');
			});

			it('should convert h-px', () => {
				expect(tw('h-px').height).toEqual('1px');
			});

			it('should convert h-screen', () => {
				expect(tw('h-screen').height).toEqual('100vh');
			});
		});

		describe('interactivity', () => {
			it('should convert appearance-none', () => {
				expect(tw('appearance-none').appearance).toEqual('none');
			});

			it('should convert pointer-events-none', () => {
				expect(tw('pointer-events-none').pointerEvents).toEqual('none');
			});

			it('should convert resize-none', () => {
				expect(tw('resize-none').resize).toEqual('none');
			});

			it('should convert scroll-smooth', () => {
				expect(tw('scroll-smooth').scrollBehavior).toEqual('smooth');
			});

			it('should convert select-none', () => {
				expect(tw('select-none').userSelect).toEqual('none');
			});

			it('should convert touch-none', () => {
				expect(tw('touch-none').touchAction).toEqual('none');
			});

			it('should convert will-change-transform', () => {
				expect(tw('will-change-transform').willChange).toEqual(
					'transform'
				);
			});
		});

		describe('justify and align', () => {
			it('should convert content-around', () => {
				expect(tw('content-around').alignContent).toEqual(
					'space-around'
				);
			});

			it('should convert content-between', () => {
				expect(tw('content-between').alignContent).toEqual(
					'space-between'
				);
			});

			it('should convert content-center', () => {
				expect(tw('content-center').alignContent).toEqual('center');
			});

			it('should convert content-end', () => {
				expect(tw('content-end').alignContent).toEqual('flex-end');
			});

			it('should convert content-evenly', () => {
				expect(tw('content-evenly').alignContent).toEqual(
					'space-evenly'
				);
			});

			it('should convert content-start', () => {
				expect(tw('content-start').alignContent).toEqual('flex-start');
			});

			it('should convert content-stretch', () => {
				expect(tw('content-stretch').alignContent).toEqual('stretch');
			});

			it('should convert items-baseline', () => {
				expect(tw('items-baseline').alignItems).toEqual('baseline');
			});

			it('should convert items-center', () => {
				expect(tw('items-center').alignItems).toEqual('center');
			});

			it('should convert items-end', () => {
				expect(tw('items-end').alignItems).toEqual('flex-end');
			});

			it('should convert items-start', () => {
				expect(tw('items-start').alignItems).toEqual('flex-start');
			});

			it('should convert items-stretch', () => {
				expect(tw('items-stretch').alignItems).toEqual('stretch');
			});

			it('should convert justify-around', () => {
				expect(tw('justify-around').justifyContent).toEqual(
					'space-around'
				);
			});

			it('should convert justify-between', () => {
				expect(tw('justify-between').justifyContent).toEqual(
					'space-between'
				);
			});

			it('should convert justify-center', () => {
				expect(tw('justify-center').justifyContent).toEqual('center');
			});

			it('should convert justify-end', () => {
				expect(tw('justify-end').justifyContent).toEqual('flex-end');
			});

			it('should convert justify-evenly', () => {
				expect(tw('justify-evenly').justifyContent).toEqual(
					'space-evenly'
				);
			});

			it('should convert justify-normal', () => {
				expect(tw('justify-normal').justifyContent).toEqual('normal');
			});

			it('should convert justify-start', () => {
				expect(tw('justify-start').justifyContent).toEqual(
					'flex-start'
				);
			});

			it('should convert place-content-between', () => {
				expect(tw('place-content-between').placeContent).toEqual(
					'space-between'
				);
			});

			it('should convert place-content-center', () => {
				expect(tw('place-content-center').placeContent).toEqual(
					'center'
				);
			});

			it('should convert place-content-end', () => {
				expect(tw('place-content-end').placeContent).toEqual('end');
			});

			it('should convert place-content-start', () => {
				expect(tw('place-content-start').placeContent).toEqual('start');
			});

			it('should convert place-content-stretch', () => {
				expect(tw('place-content-stretch').placeContent).toEqual(
					'stretch'
				);
			});

			it('should convert place-items-center', () => {
				expect(tw('place-items-center').placeItems).toEqual('center');
			});

			it('should convert place-items-end', () => {
				expect(tw('place-items-end').placeItems).toEqual('end');
			});

			it('should convert place-items-start', () => {
				expect(tw('place-items-start').placeItems).toEqual('start');
			});

			it('should convert place-items-stretch', () => {
				expect(tw('place-items-stretch').placeItems).toEqual('stretch');
			});

			it('should convert self-auto', () => {
				expect(tw('self-auto').alignSelf).toEqual('auto');
			});

			it('should convert self-baseline', () => {
				expect(tw('self-baseline').alignSelf).toEqual('baseline');
			});

			it('should convert self-center', () => {
				expect(tw('self-center').alignSelf).toEqual('center');
			});

			it('should convert self-end', () => {
				expect(tw('self-end').alignSelf).toEqual('flex-end');
			});

			it('should convert self-start', () => {
				expect(tw('self-start').alignSelf).toEqual('flex-start');
			});

			it('should convert self-stretch', () => {
				expect(tw('self-stretch').alignSelf).toEqual('stretch');
			});
		});

		describe('justify-items', () => {
			it('should convert justify-items-center', () => {
				expect(tw('justify-items-center').justifyItems).toEqual(
					'center'
				);
			});

			it('should convert justify-items-end', () => {
				expect(tw('justify-items-end').justifyItems).toEqual('end');
			});

			it('should convert justify-items-normal', () => {
				expect(tw('justify-items-normal').justifyItems).toEqual(
					'normal'
				);
			});

			it('should convert justify-items-start', () => {
				expect(tw('justify-items-start').justifyItems).toEqual('start');
			});

			it('should convert justify-items-stretch', () => {
				expect(tw('justify-items-stretch').justifyItems).toEqual(
					'stretch'
				);
			});
		});

		describe('justify-self', () => {
			it('should convert justify-self-auto', () => {
				expect(tw('justify-self-auto').justifySelf).toEqual('auto');
			});

			it('should convert justify-self-center', () => {
				expect(tw('justify-self-center').justifySelf).toEqual('center');
			});

			it('should convert justify-self-end', () => {
				expect(tw('justify-self-end').justifySelf).toEqual('flex-end');
			});

			it('should convert justify-self-start', () => {
				expect(tw('justify-self-start').justifySelf).toEqual(
					'flex-start'
				);
			});

			it('should convert justify-self-stretch', () => {
				expect(tw('justify-self-stretch').justifySelf).toEqual(
					'stretch'
				);
			});
		});

		describe('layout', () => {
			it('should convert clear-both', () => {
				expect(tw('clear-both').clear).toEqual('both');
			});

			it('should convert clear-left', () => {
				expect(tw('clear-left').clear).toEqual('left');
			});

			it('should convert clear-none', () => {
				expect(tw('clear-none').clear).toEqual('none');
			});

			it('should convert clear-right', () => {
				expect(tw('clear-right').clear).toEqual('right');
			});

			it('should convert columns-1', () => {
				expect(tw('columns-1').columns).toEqual(1);
			});

			it('should convert columns-2', () => {
				expect(tw('columns-2').columns).toEqual(2);
			});

			it('should convert columns-3', () => {
				expect(tw('columns-3').columns).toEqual(3);
			});

			it('should convert columns-auto', () => {
				expect(tw('columns-auto').columns).toEqual('auto');
			});

			it('should convert float-left', () => {
				expect(tw('float-left').float).toEqual('left');
			});

			it('should convert float-none', () => {
				expect(tw('float-none').float).toEqual('none');
			});

			it('should convert float-right', () => {
				expect(tw('float-right').float).toEqual('right');
			});

			it('should convert isolate', () => {
				expect(tw('isolate').isolation).toEqual('isolate');
			});

			it('should convert isolation-auto', () => {
				expect(tw('isolation-auto').isolation).toEqual('auto');
			});

			it('should convert object-bottom', () => {
				expect(tw('object-bottom').objectPosition).toEqual('bottom');
			});

			it('should convert object-center', () => {
				expect(tw('object-center').objectPosition).toEqual('center');
			});

			it('should convert object-contain', () => {
				expect(tw('object-contain').objectFit).toEqual('contain');
			});

			it('should convert object-cover', () => {
				expect(tw('object-cover').objectFit).toEqual('cover');
			});

			it('should convert object-fill', () => {
				expect(tw('object-fill').objectFit).toEqual('fill');
			});

			it('should convert object-left', () => {
				expect(tw('object-left').objectPosition).toEqual('left');
			});

			it('should convert object-none', () => {
				expect(tw('object-none').objectFit).toEqual('none');
			});

			it('should convert object-right', () => {
				expect(tw('object-right').objectPosition).toEqual('right');
			});

			it('should convert object-scale-down', () => {
				expect(tw('object-scale-down').objectFit).toEqual('scale-down');
			});

			it('should convert object-top', () => {
				expect(tw('object-top').objectPosition).toEqual('top');
			});
		});

		describe('line-clamp', () => {
			it('should convert line-clamp-1', () => {
				const result = tw('line-clamp-1');
				expect(result.overflow).toEqual('hidden');
				expect(result.display).toEqual('-webkit-box');
				expect(result.WebkitBoxOrient).toEqual('vertical');
				expect(result.WebkitLineClamp).toEqual(1);
			});

			it('should convert line-clamp-3', () => {
				const result = tw('line-clamp-3');
				expect(result.overflow).toEqual('hidden');
				expect(result.WebkitLineClamp).toEqual(3);
			});

			it('should convert line-clamp-none', () => {
				const result = tw('line-clamp-none');
				expect(result.overflow).toEqual('visible');
				expect(result.display).toEqual('block');
				expect(result.WebkitLineClamp).toEqual('unset');
			});
		});

		describe('margin', () => {
			it('should convert -m-4', () => {
				expect(tw('-m-4').margin).toEqual('-1rem');
			});

			it('should convert -mt-4', () => {
				expect(tw('-mt-4').marginTop).toEqual('-1rem');
			});

			it('should convert m-0', () => {
				expect(tw('m-0').margin).toEqual('0rem');
			});

			it('should convert m-4', () => {
				expect(tw('m-4').margin).toEqual('1rem');
			});

			it('should convert m-auto', () => {
				expect(tw('m-auto').margin).toEqual('auto');
			});

			it('should convert m-px', () => {
				expect(tw('m-px').margin).toEqual('1px');
			});

			it('should convert mb-4', () => {
				expect(tw('mb-4').marginBottom).toEqual('1rem');
			});

			it('should convert me-4 to marginRight', () => {
				expect(tw('me-4').marginRight).toEqual('1rem');
			});

			it('should convert ml-4', () => {
				expect(tw('ml-4').marginLeft).toEqual('1rem');
			});

			it('should convert mr-4', () => {
				expect(tw('mr-4').marginRight).toEqual('1rem');
			});

			it('should convert ms-4 to marginLeft', () => {
				expect(tw('ms-4').marginLeft).toEqual('1rem');
			});

			it('should convert mt-4', () => {
				expect(tw('mt-4').marginTop).toEqual('1rem');
			});

			it('should convert mx-4', () => {
				const result = tw('mx-4');
				expect(result.marginLeft).toEqual('1rem');
				expect(result.marginRight).toEqual('1rem');
			});

			it('should convert mx-auto', () => {
				const result = tw('mx-auto');
				expect(result.marginLeft).toEqual('auto');
				expect(result.marginRight).toEqual('auto');
			});

			it('should convert my-4', () => {
				const result = tw('my-4');
				expect(result.marginTop).toEqual('1rem');
				expect(result.marginBottom).toEqual('1rem');
			});
		});

		describe('max sizing', () => {
			it('should convert max-h-full', () => {
				expect(tw('max-h-full').maxHeight).toEqual('100%');
			});

			it('should convert max-h-none', () => {
				expect(tw('max-h-none').maxHeight).toEqual('none');
			});

			it('should convert max-h-screen', () => {
				expect(tw('max-h-screen').maxHeight).toEqual('100vh');
			});

			it('should convert max-w-full', () => {
				expect(tw('max-w-full').maxWidth).toEqual('100%');
			});

			it('should convert max-w-lg', () => {
				expect(tw('max-w-lg').maxWidth).toEqual('32rem');
			});

			it('should convert max-w-none', () => {
				expect(tw('max-w-none').maxWidth).toEqual('none');
			});

			it('should convert max-w-prose', () => {
				expect(tw('max-w-prose').maxWidth).toEqual('65ch');
			});

			it('should convert max-w-screen', () => {
				expect(tw('max-w-screen').maxWidth).toEqual('100vw');
			});

			it('should convert max-w-sm', () => {
				expect(tw('max-w-sm').maxWidth).toEqual('24rem');
			});
		});

		describe('min sizing', () => {
			it('should convert min-h-0', () => {
				expect(tw('min-h-0').minHeight).toEqual('0rem');
			});

			it('should convert min-h-full', () => {
				expect(tw('min-h-full').minHeight).toEqual('100%');
			});

			it('should convert min-h-screen', () => {
				expect(tw('min-h-screen').minHeight).toEqual('100vh');
			});

			it('should convert min-w-0', () => {
				expect(tw('min-w-0').minWidth).toEqual('0rem');
			});

			it('should convert min-w-full', () => {
				expect(tw('min-w-full').minWidth).toEqual('100%');
			});
		});

		describe('multiple classes', () => {
			it('should convert multiple basic classes', () => {
				const result = tw('flex p-4 items-center');
				expect(result.display).toEqual('flex');
				expect(result.padding).toEqual('1rem');
				expect(result.alignItems).toEqual('center');
			});

			it('should handle a realistic button class combination', () => {
				const result = tw(
					'flex items-center justify-center px-4 py-2 rounded-lg font-semibold'
				);
				expect(result.display).toEqual('flex');
				expect(result.alignItems).toEqual('center');
				expect(result.justifyContent).toEqual('center');
				expect(result.paddingLeft).toEqual('1rem');
				expect(result.paddingRight).toEqual('1rem');
				expect(result.paddingTop).toEqual('0.5rem');
				expect(result.paddingBottom).toEqual('0.5rem');
				expect(result.borderRadius).toEqual('0.5rem');
				expect(result.fontWeight).toEqual(600);
			});

			it('should handle a realistic card class combination', () => {
				const result = tw('w-full p-6 bg-white rounded-xl shadow-lg');
				expect(result.width).toEqual('100%');
				expect(result.padding).toEqual('1.5rem');
				expect(result.backgroundColor).toEqual('#fff');
				expect(result.borderRadius).toEqual('0.75rem');
				expect(result.boxShadow).toBeTruthy();
			});

			it('should still resolve valid classes mixed with invalid ones', () => {
				const result = tw('flex not-a-class p-4');
				expect(result.display).toEqual('flex');
				expect(result.padding).toEqual('1rem');
			});
		});

		describe('opacity', () => {
			it('should convert opacity-0', () => {
				expect(tw('opacity-0').opacity).toEqual(0);
			});

			it('should convert opacity-100', () => {
				expect(tw('opacity-100').opacity).toEqual(1);
			});

			it('should convert opacity-50', () => {
				expect(tw('opacity-50').opacity).toEqual(0.5);
			});
		});

		describe('order', () => {
			it('should convert order-1', () => {
				expect(tw('order-1').order).toEqual(1);
			});

			it('should convert order-first', () => {
				expect(tw('order-first').order).toEqual(-9999);
			});

			it('should convert order-last', () => {
				expect(tw('order-last').order).toEqual(9999);
			});

			it('should convert order-none', () => {
				expect(tw('order-none').order).toEqual(0);
			});
		});

		describe('outline', () => {
			it('should convert outline', () => {
				const result = tw('outline');
				expect(result.outlineStyle).toEqual('solid');
				expect(result.outlineWidth).toEqual('1px');
			});

			it('should convert outline-2', () => {
				expect(tw('outline-2').outlineWidth).toEqual('2px');
			});

			it('should convert outline-dashed', () => {
				expect(tw('outline-dashed').outlineStyle).toEqual('dashed');
			});

			it('should convert outline-dotted', () => {
				expect(tw('outline-dotted').outlineStyle).toEqual('dotted');
			});

			it('should convert outline-double', () => {
				expect(tw('outline-double').outlineStyle).toEqual('double');
			});

			it('should convert outline-none', () => {
				expect(tw('outline-none').outlineStyle).toEqual('none');
			});

			it('should convert outline-offset-2', () => {
				expect(tw('outline-offset-2').outlineOffset).toEqual('2px');
			});

			it('should convert outline-red-500', () => {
				expect(tw('outline-red-500').outlineColor).toEqual('#fb2c36');
			});

			it('should convert outline-solid', () => {
				expect(tw('outline-solid').outlineStyle).toEqual('solid');
			});
		});

		describe('overflow', () => {
			it('should convert overflow-auto', () => {
				expect(tw('overflow-auto').overflow).toEqual('auto');
			});

			it('should convert overflow-clip', () => {
				expect(tw('overflow-clip').overflow).toEqual('clip');
			});

			it('should convert overflow-hidden', () => {
				expect(tw('overflow-hidden').overflow).toEqual('hidden');
			});

			it('should convert overflow-scroll', () => {
				expect(tw('overflow-scroll').overflow).toEqual('scroll');
			});

			it('should convert overflow-visible', () => {
				expect(tw('overflow-visible').overflow).toEqual('visible');
			});

			it('should convert overflow-x-auto', () => {
				expect(tw('overflow-x-auto').overflowX).toEqual('auto');
			});

			it('should convert overflow-x-hidden', () => {
				expect(tw('overflow-x-hidden').overflowX).toEqual('hidden');
			});

			it('should convert overflow-x-scroll', () => {
				expect(tw('overflow-x-scroll').overflowX).toEqual('scroll');
			});

			it('should convert overflow-y-auto', () => {
				expect(tw('overflow-y-auto').overflowY).toEqual('auto');
			});

			it('should convert overflow-y-hidden', () => {
				expect(tw('overflow-y-hidden').overflowY).toEqual('hidden');
			});

			it('should convert overflow-y-scroll', () => {
				expect(tw('overflow-y-scroll').overflowY).toEqual('scroll');
			});
		});

		describe('overflow-wrap', () => {
			it('should convert wrap-anywhere', () => {
				expect(tw('wrap-anywhere').overflowWrap).toEqual('anywhere');
			});

			it('should convert wrap-break-word', () => {
				expect(tw('wrap-break-word').overflowWrap).toEqual(
					'break-word'
				);
			});

			it('should convert wrap-normal', () => {
				expect(tw('wrap-normal').overflowWrap).toEqual('normal');
			});
		});

		describe('padding', () => {
			it('should convert p-0', () => {
				expect(tw('p-0').padding).toEqual('0rem');
			});

			it('should convert p-1', () => {
				expect(tw('p-1').padding).toEqual('0.25rem');
			});

			it('should convert p-4', () => {
				expect(tw('p-4').padding).toEqual('1rem');
			});

			it('should convert p-px', () => {
				expect(tw('p-px').padding).toEqual('1px');
			});

			it('should convert pb-4', () => {
				expect(tw('pb-4').paddingBottom).toEqual('1rem');
			});

			it('should convert pe-4 to paddingRight', () => {
				expect(tw('pe-4').paddingRight).toEqual('1rem');
			});

			it('should convert pl-4', () => {
				expect(tw('pl-4').paddingLeft).toEqual('1rem');
			});

			it('should convert pr-4', () => {
				expect(tw('pr-4').paddingRight).toEqual('1rem');
			});

			it('should convert ps-4 to paddingLeft', () => {
				expect(tw('ps-4').paddingLeft).toEqual('1rem');
			});

			it('should convert pt-4', () => {
				expect(tw('pt-4').paddingTop).toEqual('1rem');
			});

			it('should convert px-4', () => {
				const result = tw('px-4');
				expect(result.paddingLeft).toEqual('1rem');
				expect(result.paddingRight).toEqual('1rem');
			});

			it('should convert py-4', () => {
				const result = tw('py-4');
				expect(result.paddingTop).toEqual('1rem');
				expect(result.paddingBottom).toEqual('1rem');
			});
		});

		describe('place-self', () => {
			it('should convert place-self-auto', () => {
				expect(tw('place-self-auto').placeSelf).toEqual('auto');
			});

			it('should convert place-self-center', () => {
				expect(tw('place-self-center').placeSelf).toEqual('center');
			});

			it('should convert place-self-end', () => {
				expect(tw('place-self-end').placeSelf).toEqual('end');
			});

			it('should convert place-self-start', () => {
				expect(tw('place-self-start').placeSelf).toEqual('start');
			});

			it('should convert place-self-stretch', () => {
				expect(tw('place-self-stretch').placeSelf).toEqual('stretch');
			});
		});

		describe('position', () => {
			it('should convert -top-4', () => {
				expect(tw('-top-4').top).toEqual('-1rem');
			});

			it('should convert absolute', () => {
				expect(tw('absolute').position).toEqual('absolute');
			});

			it('should convert end-0 to right', () => {
				expect(tw('end-0').right).toEqual('0rem');
			});

			it('should convert fixed', () => {
				expect(tw('fixed').position).toEqual('fixed');
			});

			it('should convert inset-0', () => {
				const result = tw('inset-0');
				expect(result.top).toEqual('0rem');
				expect(result.right).toEqual('0rem');
				expect(result.bottom).toEqual('0rem');
				expect(result.left).toEqual('0rem');
			});

			it('should convert inset-x-0', () => {
				const result = tw('inset-x-0');
				expect(result.left).toEqual('0rem');
				expect(result.right).toEqual('0rem');
			});

			it('should convert inset-y-0', () => {
				const result = tw('inset-y-0');
				expect(result.top).toEqual('0rem');
				expect(result.bottom).toEqual('0rem');
			});

			it('should convert relative', () => {
				expect(tw('relative').position).toEqual('relative');
			});

			it('should convert start-0 to left', () => {
				expect(tw('start-0').left).toEqual('0rem');
			});

			it('should convert static', () => {
				expect(tw('static').position).toEqual('static');
			});

			it('should convert sticky', () => {
				expect(tw('sticky').position).toEqual('sticky');
			});

			it('should convert top-0', () => {
				expect(tw('top-0').top).toEqual('0rem');
			});

			it('should convert top-4', () => {
				expect(tw('top-4').top).toEqual('1rem');
			});
		});

		describe('scroll', () => {
			it('should convert scroll-m-4', () => {
				expect(tw('scroll-m-4').scrollMargin).toEqual('1rem');
			});

			it('should convert scroll-mx-4 to scrollMarginLeft and scrollMarginRight', () => {
				const result = tw('scroll-mx-4');
				expect(result.scrollMarginLeft).toEqual('1rem');
				expect(result.scrollMarginRight).toEqual('1rem');
			});

			it('should convert scroll-my-4 to scrollMarginTop and scrollMarginBottom', () => {
				const result = tw('scroll-my-4');
				expect(result.scrollMarginTop).toEqual('1rem');
				expect(result.scrollMarginBottom).toEqual('1rem');
			});

			it('should convert scroll-p-4', () => {
				expect(tw('scroll-p-4').scrollPadding).toEqual('1rem');
			});

			it('should convert scroll-px-4 to scrollPaddingLeft and scrollPaddingRight', () => {
				const result = tw('scroll-px-4');
				expect(result.scrollPaddingLeft).toEqual('1rem');
				expect(result.scrollPaddingRight).toEqual('1rem');
			});

			it('should convert snap-center', () => {
				expect(tw('snap-center').scrollSnapAlign).toEqual('center');
			});

			it('should convert snap-x', () => {
				expect(tw('snap-x').scrollSnapType).toContain('x');
			});
		});

		describe('shadows', () => {
			it('should convert inset-ring', () => {
				expect(tw('inset-ring').boxShadow).toBeTruthy();
			});

			it('should convert inset-ring-2', () => {
				expect(tw('inset-ring-2').boxShadow).toBeTruthy();
			});

			it('should convert inset-shadow-2xs', () => {
				expect(tw('inset-shadow-2xs').boxShadow).toBeTruthy();
			});

			it('should convert inset-shadow-none', () => {
				expect(tw('inset-shadow-none').boxShadow).toBeTruthy();
			});

			it('should convert inset-shadow-sm inset-shadow-red-500 with red', () => {
				const result = tw('inset-shadow-sm inset-shadow-red-500');
				expect(result.boxShadow).toContain('#fb2c36');
				expect(result).not.toHaveProperty('color');
			});

			it('should convert inset-shadow-sm to a boxShadow value', () => {
				expect(tw('inset-shadow-sm').boxShadow).toBeTruthy();
			});

			it('should convert inset-shadow-xs', () => {
				expect(tw('inset-shadow-xs').boxShadow).toBeTruthy();
			});

			it('should convert ring', () => {
				expect(tw('ring').boxShadow).toBeTruthy();
			});

			it('should convert ring-0', () => {
				expect(tw('ring-0').boxShadow).toBeTruthy();
			});

			it('should convert ring-1', () => {
				expect(tw('ring-1').boxShadow).toBeTruthy();
			});

			it('should convert ring-2 ring-black to boxShadow with black', () => {
				const result = tw('ring-2 ring-black');
				expect(result.boxShadow).toContain('#000');
			});

			it('should convert ring-2 ring-red-500 to boxShadow with red', () => {
				const result = tw('ring-2 ring-red-500');
				expect(result.boxShadow).toContain('#fb2c36');
			});

			it('should convert ring-2 ring-transparent to boxShadow with transparent', () => {
				const result = tw('ring-2 ring-transparent');
				expect(result.boxShadow).toContain('transparent');
			});

			it('should convert ring-4', () => {
				expect(tw('ring-4').boxShadow).toBeTruthy();
			});

			it('should convert shadow to a boxShadow value', () => {
				expect(tw('shadow').boxShadow).toBeTruthy();
			});

			it('should convert shadow-2xl', () => {
				expect(tw('shadow-2xl').boxShadow).toBeTruthy();
			});

			it('should convert shadow-2xs', () => {
				expect(tw('shadow-2xs').boxShadow).toBeTruthy();
			});

			it('should convert shadow-lg shadow-red-500 to boxShadow with red', () => {
				const result = tw('shadow-lg shadow-red-500');
				expect(result.boxShadow).toContain('#fb2c36');
				expect(result).not.toHaveProperty('color');
			});

			it('should convert shadow-lg to a boxShadow value', () => {
				expect(tw('shadow-lg').boxShadow).toBeTruthy();
			});

			it('should convert shadow-md', () => {
				expect(tw('shadow-md').boxShadow).toBeTruthy();
			});

			it('should convert shadow-none to a boxShadow value', () => {
				expect(tw('shadow-none').boxShadow).toBeTruthy();
			});

			it('should convert shadow-sm to a boxShadow value', () => {
				expect(tw('shadow-sm').boxShadow).toBeTruthy();
			});

			it('should convert shadow-xl', () => {
				expect(tw('shadow-xl').boxShadow).toBeTruthy();
			});

			it('should convert shadow-xs', () => {
				expect(tw('shadow-xs').boxShadow).toBeTruthy();
			});

			it('should not have double spaces in ring boxShadow', () => {
				const result = tw('ring-2');
				expect(result.boxShadow).not.toContain('  ');
			});
		});

		describe('size', () => {
			it('should convert size-0', () => {
				const result = tw('size-0');
				expect(result.width).toEqual('0rem');
				expect(result.height).toEqual('0rem');
			});

			it('should convert size-4', () => {
				const result = tw('size-4');
				expect(result.width).toEqual('1rem');
				expect(result.height).toEqual('1rem');
			});

			it('should convert size-full', () => {
				const result = tw('size-full');
				expect(result.width).toEqual('100%');
				expect(result.height).toEqual('100%');
			});
		});

		describe('SVG', () => {
			it('should convert fill-black', () => {
				expect(tw('fill-black').fill).toEqual('#000');
			});

			it('should convert fill-current', () => {
				expect(tw('fill-current').fill).toEqual('currentcolor');
			});

			it('should convert fill-inherit', () => {
				expect(tw('fill-inherit').fill).toEqual('inherit');
			});

			it('should convert fill-none', () => {
				expect(tw('fill-none').fill).toEqual('none');
			});

			it('should convert fill-red-500', () => {
				expect(tw('fill-red-500').fill).toEqual('#fb2c36');
			});

			it('should convert fill-transparent', () => {
				expect(tw('fill-transparent').fill).toEqual('transparent');
			});

			it('should convert fill-white', () => {
				expect(tw('fill-white').fill).toEqual('#fff');
			});

			it('should convert stroke-1', () => {
				expect(tw('stroke-1').strokeWidth).toEqual(1);
			});

			it('should convert stroke-2', () => {
				expect(tw('stroke-2').strokeWidth).toEqual(2);
			});

			it('should convert stroke-current', () => {
				expect(tw('stroke-current').stroke).toEqual('currentcolor');
			});

			it('should convert stroke-none', () => {
				expect(tw('stroke-none').stroke).toEqual('none');
			});

			it('should convert stroke-transparent', () => {
				expect(tw('stroke-transparent').stroke).toEqual('transparent');
			});
		});

		describe('tables', () => {
			it('should convert border-collapse', () => {
				expect(tw('border-collapse').borderCollapse).toEqual(
					'collapse'
				);
			});

			it('should convert border-separate', () => {
				expect(tw('border-separate').borderCollapse).toEqual(
					'separate'
				);
			});

			it('should convert caption-top', () => {
				expect(tw('caption-top').captionSide).toEqual('top');
			});

			it('should convert table-auto', () => {
				expect(tw('table-auto').tableLayout).toEqual('auto');
			});

			it('should convert table-fixed', () => {
				expect(tw('table-fixed').tableLayout).toEqual('fixed');
			});
		});

		describe('text color', () => {
			it('should convert text-black', () => {
				expect(tw('text-black').color).toEqual('#000');
			});

			it('should convert text-current', () => {
				expect(tw('text-current').color).toEqual('currentcolor');
			});

			it('should convert text-red-500', () => {
				expect(tw('text-red-500').color).toEqual('#fb2c36');
			});

			it('should convert text-transparent', () => {
				expect(tw('text-transparent').color).toEqual('transparent');
			});

			it('should convert text-white', () => {
				expect(tw('text-white').color).toEqual('#fff');
			});
		});

		describe('text decoration', () => {
			it('should convert decoration-0', () => {
				expect(tw('decoration-0').textDecorationThickness).toEqual(
					'0px'
				);
			});

			it('should convert decoration-1', () => {
				expect(tw('decoration-1').textDecorationThickness).toEqual(
					'1px'
				);
			});

			it('should convert decoration-2', () => {
				expect(tw('decoration-2').textDecorationThickness).toEqual(
					'2px'
				);
			});

			it('should convert decoration-4', () => {
				expect(tw('decoration-4').textDecorationThickness).toEqual(
					'4px'
				);
			});

			it('should convert decoration-auto', () => {
				expect(tw('decoration-auto').textDecorationThickness).toEqual(
					'auto'
				);
			});

			it('should convert decoration-dashed', () => {
				expect(tw('decoration-dashed').textDecorationStyle).toEqual(
					'dashed'
				);
			});

			it('should convert decoration-dotted', () => {
				expect(tw('decoration-dotted').textDecorationStyle).toEqual(
					'dotted'
				);
			});

			it('should convert decoration-double', () => {
				expect(tw('decoration-double').textDecorationStyle).toEqual(
					'double'
				);
			});

			it('should convert decoration-from-font', () => {
				expect(
					tw('decoration-from-font').textDecorationThickness
				).toEqual('from-font');
			});

			it('should convert decoration-red-500', () => {
				expect(tw('decoration-red-500').textDecorationColor).toEqual(
					'#fb2c36'
				);
			});

			it('should convert decoration-solid', () => {
				expect(tw('decoration-solid').textDecorationStyle).toEqual(
					'solid'
				);
			});

			it('should convert decoration-wavy', () => {
				expect(tw('decoration-wavy').textDecorationStyle).toEqual(
					'wavy'
				);
			});

			it('should convert line-through', () => {
				expect(tw('line-through').textDecorationLine).toEqual(
					'line-through'
				);
			});

			it('should convert no-underline', () => {
				expect(tw('no-underline').textDecorationLine).toEqual('none');
			});

			it('should convert overline', () => {
				expect(tw('overline').textDecorationLine).toEqual('overline');
			});

			it('should convert underline', () => {
				expect(tw('underline').textDecorationLine).toEqual('underline');
			});

			it('should convert underline-offset-1', () => {
				expect(tw('underline-offset-1').textUnderlineOffset).toEqual(
					'1px'
				);
			});

			it('should convert underline-offset-2', () => {
				expect(tw('underline-offset-2').textUnderlineOffset).toEqual(
					'2px'
				);
			});

			it('should convert underline-offset-4', () => {
				expect(tw('underline-offset-4').textUnderlineOffset).toEqual(
					'4px'
				);
			});

			it('should convert underline-offset-auto', () => {
				expect(tw('underline-offset-auto').textUnderlineOffset).toEqual(
					'auto'
				);
			});
		});

		describe('transforms', () => {
			it('should convert -rotate-45', () => {
				expect(tw('-rotate-45').rotate).toEqual('-45deg');
			});

			it('should convert -rotate-90', () => {
				expect(tw('-rotate-90').rotate).toEqual('-90deg');
			});

			it('should convert -skew-x-6', () => {
				expect(tw('-skew-x-6').transform).toEqual('skewX(-6deg)');
			});

			it('should convert -skew-y-6', () => {
				expect(tw('-skew-y-6').transform).toEqual('skewY(-6deg)');
			});

			it('should convert -translate-x-1/2', () => {
				expect(tw('-translate-x-1/2').translate).toEqual('-50% 0');
			});

			it('should convert -translate-x-4', () => {
				expect(tw('-translate-x-4').translate).toEqual('-1rem 0');
			});

			it('should convert origin-bottom', () => {
				expect(tw('origin-bottom').transformOrigin).toEqual('bottom');
			});

			it('should convert origin-bottom-left', () => {
				expect(tw('origin-bottom-left').transformOrigin).toEqual(
					'0 100%'
				);
			});

			it('should convert origin-bottom-right', () => {
				expect(tw('origin-bottom-right').transformOrigin).toEqual(
					'100% 100%'
				);
			});

			it('should convert origin-center', () => {
				expect(tw('origin-center').transformOrigin).toEqual('center');
			});

			it('should convert origin-left', () => {
				expect(tw('origin-left').transformOrigin).toEqual('0');
			});

			it('should convert origin-right', () => {
				expect(tw('origin-right').transformOrigin).toEqual('100%');
			});

			it('should convert origin-top', () => {
				expect(tw('origin-top').transformOrigin).toEqual('top');
			});

			it('should convert origin-top-left', () => {
				expect(tw('origin-top-left').transformOrigin).toEqual('0 0');
			});

			it('should convert origin-top-right', () => {
				expect(tw('origin-top-right').transformOrigin).toEqual(
					'100% 0'
				);
			});

			it('should convert rotate-0', () => {
				expect(tw('rotate-0').rotate).toEqual('0deg');
			});

			it('should convert rotate-180', () => {
				expect(tw('rotate-180').rotate).toEqual('180deg');
			});

			it('should convert rotate-45', () => {
				expect(tw('rotate-45').rotate).toEqual('45deg');
			});

			it('should convert rotate-90', () => {
				expect(tw('rotate-90').rotate).toEqual('90deg');
			});

			it('should convert scale-0', () => {
				expect(tw('scale-0').scale).toEqual('0% 0%');
			});

			it('should convert scale-100', () => {
				expect(tw('scale-100').scale).toEqual('100% 100%');
			});

			it('should convert scale-150', () => {
				expect(tw('scale-150').scale).toEqual('150% 150%');
			});

			it('should convert scale-50', () => {
				expect(tw('scale-50').scale).toEqual('50% 50%');
			});

			it('should convert scale-none', () => {
				expect(tw('scale-none').scale).toEqual('none');
			});

			it('should convert scale-x-50', () => {
				expect(tw('scale-x-50').scale).toEqual('50% 1');
			});

			it('should convert scale-y-50', () => {
				expect(tw('scale-y-50').scale).toEqual('1 50%');
			});

			it('should convert skew-x-6', () => {
				expect(tw('skew-x-6').transform).toEqual('skewX(6deg)');
			});

			it('should convert skew-y-6', () => {
				expect(tw('skew-y-6').transform).toEqual('skewY(6deg)');
			});

			it('should convert translate-none', () => {
				expect(tw('translate-none').translate).toEqual('none');
			});

			it('should convert translate-x-1/2', () => {
				expect(tw('translate-x-1/2').translate).toEqual('50% 0');
			});

			it('should convert translate-x-4', () => {
				expect(tw('translate-x-4').translate).toEqual('1rem 0');
			});

			it('should convert translate-x-full', () => {
				expect(tw('translate-x-full').translate).toEqual('100% 0');
			});

			it('should convert translate-y-4', () => {
				expect(tw('translate-y-4').translate).toEqual('0 1rem');
			});
		});

		describe('transitions', () => {
			it('should convert delay-200', () => {
				expect(tw('delay-200').transitionDelay).toEqual('200ms');
			});

			it('should convert duration-200', () => {
				expect(tw('duration-200').transitionDuration).toEqual('200ms');
			});

			it('should convert duration-300', () => {
				expect(tw('duration-300').transitionDuration).toEqual('300ms');
			});

			it('should convert ease-in', () => {
				expect(tw('ease-in').transitionTimingFunction).toBeTruthy();
			});

			it('should convert ease-in-out', () => {
				expect(tw('ease-in-out').transitionTimingFunction).toBeTruthy();
			});

			it('should convert ease-linear', () => {
				expect(tw('ease-linear').transitionTimingFunction).toEqual(
					'linear'
				);
			});

			it('should convert ease-out', () => {
				expect(tw('ease-out').transitionTimingFunction).toBeTruthy();
			});

			it('should convert transition', () => {
				const result = tw('transition');
				expect(result.transitionProperty).toBeTruthy();
				expect(result.transitionDuration).toEqual('150ms');
			});

			it('should convert transition-all', () => {
				const result = tw('transition-all');
				expect(result.transitionProperty).toEqual('all');
				expect(result.transitionDuration).toEqual('150ms');
			});

			it('should convert transition-colors', () => {
				const result = tw('transition-colors');
				expect(result.transitionProperty).toContain('color');
				expect(result.transitionDuration).toEqual('150ms');
			});

			it('should convert transition-none', () => {
				expect(tw('transition-none').transitionProperty).toEqual(
					'none'
				);
			});

			it('should convert transition-opacity', () => {
				const result = tw('transition-opacity');
				expect(result.transitionProperty).toEqual('opacity');
				expect(result.transitionDuration).toEqual('150ms');
			});

			it('should convert transition-shadow', () => {
				const result = tw('transition-shadow');
				expect(result.transitionProperty).toEqual('box-shadow');
				expect(result.transitionDuration).toEqual('150ms');
			});

			it('should convert transition-transform', () => {
				const result = tw('transition-transform');
				expect(result.transitionProperty).toContain('transform');
				expect(result.transitionDuration).toEqual('150ms');
			});
		});

		describe('truncate', () => {
			it('should convert truncate to overflow, textOverflow, whiteSpace', () => {
				const result = tw('truncate');
				expect(result.overflow).toEqual('hidden');
				expect(result.textOverflow).toEqual('ellipsis');
				expect(result.whiteSpace).toEqual('nowrap');
			});
		});

		describe('typography', () => {
			it('should convert align-baseline', () => {
				expect(tw('align-baseline').verticalAlign).toEqual('baseline');
			});

			it('should convert align-bottom', () => {
				expect(tw('align-bottom').verticalAlign).toEqual('bottom');
			});

			it('should convert align-middle', () => {
				expect(tw('align-middle').verticalAlign).toEqual('middle');
			});

			it('should convert align-sub', () => {
				expect(tw('align-sub').verticalAlign).toEqual('sub');
			});

			it('should convert align-super', () => {
				expect(tw('align-super').verticalAlign).toEqual('super');
			});

			it('should convert align-text-bottom', () => {
				expect(tw('align-text-bottom').verticalAlign).toEqual(
					'text-bottom'
				);
			});

			it('should convert align-text-top', () => {
				expect(tw('align-text-top').verticalAlign).toEqual('text-top');
			});

			it('should convert align-top', () => {
				expect(tw('align-top').verticalAlign).toEqual('top');
			});

			it('should convert break-all', () => {
				expect(tw('break-all').wordBreak).toEqual('break-all');
			});

			it('should convert break-keep', () => {
				expect(tw('break-keep').wordBreak).toEqual('keep-all');
			});

			it('should convert break-normal', () => {
				const result = tw('break-normal');
				expect(result.overflowWrap).toEqual('normal');
				expect(result.wordBreak).toEqual('normal');
			});

			it('should convert capitalize', () => {
				expect(tw('capitalize').textTransform).toEqual('capitalize');
			});

			it('should convert font-black', () => {
				expect(tw('font-black').fontWeight).toEqual(900);
			});

			it('should convert font-bold', () => {
				expect(tw('font-bold').fontWeight).toEqual(700);
			});

			it('should convert font-extrabold', () => {
				expect(tw('font-extrabold').fontWeight).toEqual(800);
			});

			it('should convert font-extralight', () => {
				expect(tw('font-extralight').fontWeight).toEqual(200);
			});

			it('should convert font-light', () => {
				expect(tw('font-light').fontWeight).toEqual(300);
			});

			it('should convert font-medium', () => {
				expect(tw('font-medium').fontWeight).toEqual(500);
			});

			it('should convert font-mono to a font family string', () => {
				const result = tw('font-mono');
				expect(result.fontFamily).toContain('monospace');
				expect(result.fontFamily).not.toContain('\n');
			});

			it('should convert font-normal', () => {
				expect(tw('font-normal').fontWeight).toEqual(400);
			});

			it('should convert font-sans to a font family string', () => {
				const result = tw('font-sans');
				expect(result.fontFamily).toContain('sans-serif');
				expect(result.fontFamily).not.toContain('\n');
			});

			it('should convert font-semibold', () => {
				expect(tw('font-semibold').fontWeight).toEqual(600);
			});

			it('should convert font-serif to a font family string', () => {
				const result = tw('font-serif');
				expect(result.fontFamily).toContain('serif');
			});

			it('should convert font-thin', () => {
				expect(tw('font-thin').fontWeight).toEqual(100);
			});

			it('should convert hyphens-auto', () => {
				expect(tw('hyphens-auto').hyphens).toEqual('auto');
			});

			it('should convert hyphens-manual', () => {
				expect(tw('hyphens-manual').hyphens).toEqual('manual');
			});

			it('should convert hyphens-none', () => {
				expect(tw('hyphens-none').hyphens).toEqual('none');
			});

			it('should convert indent-4', () => {
				expect(tw('indent-4').textIndent).toEqual('1rem');
			});

			it('should convert italic', () => {
				expect(tw('italic').fontStyle).toEqual('italic');
			});

			it('should convert leading-loose', () => {
				expect(tw('leading-loose').lineHeight).toEqual(2);
			});

			it('should convert leading-none', () => {
				expect(tw('leading-none').lineHeight).toEqual(1);
			});

			it('should convert leading-normal', () => {
				expect(tw('leading-normal').lineHeight).toEqual(1.5);
			});

			it('should convert leading-relaxed', () => {
				expect(tw('leading-relaxed').lineHeight).toEqual(1.625);
			});

			it('should convert leading-snug', () => {
				expect(tw('leading-snug').lineHeight).toEqual(1.375);
			});

			it('should convert leading-tight', () => {
				expect(tw('leading-tight').lineHeight).toEqual(1.25);
			});

			it('should convert list-decimal', () => {
				expect(tw('list-decimal').listStyleType).toEqual('decimal');
			});

			it('should convert list-disc', () => {
				expect(tw('list-disc').listStyleType).toEqual('disc');
			});

			it('should convert list-image-none', () => {
				expect(tw('list-image-none').listStyleImage).toEqual('none');
			});

			it('should convert list-inside', () => {
				expect(tw('list-inside').listStylePosition).toEqual('inside');
			});

			it('should convert list-none', () => {
				expect(tw('list-none').listStyleType).toEqual('none');
			});

			it('should convert list-outside', () => {
				expect(tw('list-outside').listStylePosition).toEqual('outside');
			});

			it('should convert lowercase', () => {
				expect(tw('lowercase').textTransform).toEqual('lowercase');
			});

			it('should convert normal-case', () => {
				expect(tw('normal-case').textTransform).toEqual('none');
			});

			it('should convert not-italic', () => {
				expect(tw('not-italic').fontStyle).toEqual('normal');
			});

			it('should convert text-2xl', () => {
				expect(tw('text-2xl').fontSize).toEqual('1.5rem');
			});

			it('should convert text-3xl', () => {
				expect(tw('text-3xl').fontSize).toEqual('1.875rem');
			});

			it('should convert text-4xl', () => {
				expect(tw('text-4xl').fontSize).toEqual('2.25rem');
			});

			it('should convert text-balance', () => {
				expect(tw('text-balance').textWrap).toEqual('balance');
			});

			it('should convert text-base', () => {
				const result = tw('text-base');
				expect(result.fontSize).toEqual('1rem');
				expect(result.lineHeight).toEqual(1.5);
			});

			it('should convert text-center', () => {
				expect(tw('text-center').textAlign).toEqual('center');
			});

			it('should convert text-clip', () => {
				expect(tw('text-clip').textOverflow).toEqual('clip');
			});

			it('should convert text-ellipsis', () => {
				expect(tw('text-ellipsis').textOverflow).toEqual('ellipsis');
			});

			it('should convert text-end', () => {
				expect(tw('text-end').textAlign).toEqual('end');
			});

			it('should convert text-justify', () => {
				expect(tw('text-justify').textAlign).toEqual('justify');
			});

			it('should convert text-left', () => {
				expect(tw('text-left').textAlign).toEqual('left');
			});

			it('should convert text-lg', () => {
				expect(tw('text-lg').fontSize).toEqual('1.125rem');
			});

			it('should convert text-nowrap', () => {
				expect(tw('text-nowrap').textWrap).toEqual('nowrap');
			});

			it('should convert text-pretty', () => {
				expect(tw('text-pretty').textWrap).toEqual('pretty');
			});

			it('should convert text-right', () => {
				expect(tw('text-right').textAlign).toEqual('right');
			});

			it('should convert text-sm', () => {
				expect(tw('text-sm').fontSize).toEqual('0.875rem');
			});

			it('should convert text-start', () => {
				expect(tw('text-start').textAlign).toEqual('start');
			});

			it('should convert text-wrap', () => {
				expect(tw('text-wrap').textWrap).toEqual('wrap');
			});

			it('should convert text-xl', () => {
				const result = tw('text-xl');
				expect(result.fontSize).toEqual('1.25rem');
				expect(result.lineHeight).toEqual(1.4);
			});

			it('should convert text-xs', () => {
				const result = tw('text-xs');
				expect(result.fontSize).toEqual('0.75rem');
				expect(result.lineHeight).toEqual(1.3333);
			});

			it('should convert tracking-normal', () => {
				expect(tw('tracking-normal').letterSpacing).toEqual('0em');
			});

			it('should convert tracking-tight', () => {
				expect(tw('tracking-tight').letterSpacing).toEqual('-0.025em');
			});

			it('should convert tracking-tighter', () => {
				expect(tw('tracking-tighter').letterSpacing).toEqual('-0.05em');
			});

			it('should convert tracking-wide', () => {
				expect(tw('tracking-wide').letterSpacing).toEqual('0.025em');
			});

			it('should convert tracking-wider', () => {
				expect(tw('tracking-wider').letterSpacing).toEqual('0.05em');
			});

			it('should convert tracking-widest', () => {
				expect(tw('tracking-widest').letterSpacing).toEqual('0.1em');
			});

			it('should convert uppercase', () => {
				expect(tw('uppercase').textTransform).toEqual('uppercase');
			});

			it('should convert whitespace-normal', () => {
				expect(tw('whitespace-normal').whiteSpace).toEqual('normal');
			});

			it('should convert whitespace-nowrap', () => {
				expect(tw('whitespace-nowrap').whiteSpace).toEqual('nowrap');
			});

			it('should convert whitespace-pre', () => {
				expect(tw('whitespace-pre').whiteSpace).toEqual('pre');
			});

			it('should convert whitespace-pre-line', () => {
				expect(tw('whitespace-pre-line').whiteSpace).toEqual(
					'pre-line'
				);
			});

			it('should convert whitespace-pre-wrap', () => {
				expect(tw('whitespace-pre-wrap').whiteSpace).toEqual(
					'pre-wrap'
				);
			});
		});

		describe('unsupported and invalid classes', () => {
			it('should not throw for nonsense input', () => {
				expect(() => {
					return tw('$$$###@@@');
				}).not.toThrow();
			});

			it('should return empty object for dark mode modifier', () => {
				expect(tw('dark:text-white')).toEqual({});
			});

			it('should return empty object for hover state modifier', () => {
				expect(tw('hover:bg-red-500')).toEqual({});
			});

			it('should return empty object for responsive modifier', () => {
				expect(tw('sm:flex')).toEqual({});
			});

			it('should return empty object for unknown class', () => {
				expect(tw('not-a-real-class')).toEqual({});
			});
		});

		describe('visibility', () => {
			it('should convert collapse', () => {
				expect(tw('collapse').visibility).toEqual('collapse');
			});

			it('should convert invisible', () => {
				expect(tw('invisible').visibility).toEqual('hidden');
			});

			it('should convert visible', () => {
				expect(tw('visible').visibility).toEqual('visible');
			});
		});

		describe('width', () => {
			it('should convert w-0', () => {
				expect(tw('w-0').width).toEqual('0rem');
			});

			it('should convert w-1/2', () => {
				expect(tw('w-1/2').width).toEqual('50%');
			});

			it('should convert w-1/3', () => {
				expect(tw('w-1/3').width).toEqual('33.33%');
			});

			it('should convert w-2/3', () => {
				expect(tw('w-2/3').width).toEqual('66.67%');
			});

			it('should convert w-4', () => {
				expect(tw('w-4').width).toEqual('1rem');
			});

			it('should convert w-auto', () => {
				expect(tw('w-auto').width).toEqual('auto');
			});

			it('should convert w-fit', () => {
				expect(tw('w-fit').width).toEqual('fit-content');
			});

			it('should convert w-full', () => {
				expect(tw('w-full').width).toEqual('100%');
			});

			it('should convert w-max', () => {
				expect(tw('w-max').width).toEqual('max-content');
			});

			it('should convert w-min', () => {
				expect(tw('w-min').width).toEqual('min-content');
			});

			it('should convert w-px', () => {
				expect(tw('w-px').width).toEqual('1px');
			});

			it('should convert w-screen', () => {
				expect(tw('w-screen').width).toEqual('100vw');
			});
		});

		describe('z-index', () => {
			it('should convert z-0', () => {
				expect(tw('z-0').zIndex).toEqual(0);
			});

			it('should convert z-10', () => {
				expect(tw('z-10').zIndex).toEqual(10);
			});

			it('should convert z-20', () => {
				expect(tw('z-20').zIndex).toEqual(20);
			});

			it('should convert z-30', () => {
				expect(tw('z-30').zIndex).toEqual(30);
			});

			it('should convert z-40', () => {
				expect(tw('z-40').zIndex).toEqual(40);
			});

			it('should convert z-50', () => {
				expect(tw('z-50').zIndex).toEqual(50);
			});

			it('should convert z-auto', () => {
				expect(tw('z-auto').zIndex).toEqual('auto');
			});
		});
	});
});
