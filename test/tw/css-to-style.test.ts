import { describe, expect, it } from 'vitest';

import {
	coerceUnitlessValue,
	convertColorMix,
	convertModernRgb,
	convertOpacityPercentage,
	cssPropertyToCamelCase,
	cssToStyle,
	expandLogicalProperties,
	extractCustomProperties,
	extractPropertyDefaults,
	extractTopLevelContent,
	extractUtilitiesBlock,
	parseClassBlocks,
	resolveCalc,
	resolveValue,
	resolveVars,
	unescapeClassName
} from '../../src/tw/css-to-style.js';

describe('@/libs/tw/css-to-style', () => {
	describe('coerceUnitlessValue', () => {
		it('should convert fontWeight numeric string to number', () => {
			expect(coerceUnitlessValue('fontWeight', '700')).toEqual(700);
		});

		it('should convert flexGrow numeric string to number', () => {
			expect(coerceUnitlessValue('flexGrow', '1')).toEqual(1);
		});

		it('should convert lineHeight decimal string to number', () => {
			expect(coerceUnitlessValue('lineHeight', '1.5')).toEqual(1.5);
		});

		it('should keep non-unitless property value as string', () => {
			expect(coerceUnitlessValue('fontSize', '16px')).toEqual('16px');
		});

		it('should keep non-numeric value as string', () => {
			expect(coerceUnitlessValue('fontWeight', 'bold')).toEqual('bold');
		});
	});

	describe('convertColorMix', () => {
		it('should convert color-mix to hex with alpha', () => {
			const result = convertColorMix(
				'color-mix(in srgb, #ffff00 50%, transparent)'
			);
			expect(result).toEqual('#ffff0080');
		});

		it('should handle 0% percentage', () => {
			const result = convertColorMix(
				'color-mix(in srgb, #ffff00 0%, transparent)'
			);
			expect(result).toEqual('#ffff0000');
		});

		it('should handle 100% percentage', () => {
			const result = convertColorMix(
				'color-mix(in srgb, #ffff00 100%, transparent)'
			);
			expect(result).toEqual('#ffff00ff');
		});

		it('should handle 8-char hex input (strips existing alpha)', () => {
			const result = convertColorMix(
				'color-mix(in srgb, #ffff00ff 50%, transparent)'
			);
			expect(result).toEqual('#ffff0080');
		});

		it('should handle 3-char hex shorthand', () => {
			const result = convertColorMix(
				'color-mix(in srgb, #fff 80%, transparent)'
			);
			expect(result).toEqual('#ffffffcc');
		});

		it('should handle 4-char hex shorthand (strips existing alpha)', () => {
			const result = convertColorMix(
				'color-mix(in srgb, #fffa 50%, transparent)'
			);
			expect(result).toEqual('#ffffff80');
		});

		it('should return value unchanged when no color-mix', () => {
			expect(convertColorMix('#ffff00')).toEqual('#ffff00');
		});
	});

	describe('convertModernRgb', () => {
		it('should convert percentage alpha to decimal', () => {
			expect(convertModernRgb('rgb(255 0 0 / 50%)')).toEqual(
				'rgba(255, 0, 0, 0.5)'
			);
		});

		it('should convert rgb(r g b / a) to rgba(r, g, b, a)', () => {
			expect(convertModernRgb('rgb(255 0 0 / 0.5)')).toEqual(
				'rgba(255, 0, 0, 0.5)'
			);
		});

		it('should handle decimal alpha', () => {
			expect(convertModernRgb('rgb(0 128 255 / 0.75)')).toEqual(
				'rgba(0, 128, 255, 0.75)'
			);
		});

		it('should handle multiple rgb() in same value', () => {
			const input = 'rgb(255 0 0 / 0.5) rgb(0 255 0 / 1)';
			const result = convertModernRgb(input);
			expect(result).toEqual('rgba(255, 0, 0, 0.5) rgba(0, 255, 0, 1)');
		});

		it('should return value unchanged when no modern rgb syntax', () => {
			expect(convertModernRgb('#ffff00')).toEqual('#ffff00');
			expect(convertModernRgb('rgba(255, 0, 0, 0.5)')).toEqual(
				'rgba(255, 0, 0, 0.5)'
			);
		});
	});

	describe('convertOpacityPercentage', () => {
		it('should convert 50% to 0.5', () => {
			expect(convertOpacityPercentage('50%')).toEqual('0.5');
		});

		it('should convert 0% to 0', () => {
			expect(convertOpacityPercentage('0%')).toEqual('0');
		});

		it('should convert 100% to 1', () => {
			expect(convertOpacityPercentage('100%')).toEqual('1');
		});

		it('should pass through non-percentage value', () => {
			expect(convertOpacityPercentage('0.5')).toEqual('0.5');
		});

		it('should pass through non-numeric value', () => {
			expect(convertOpacityPercentage('inherit')).toEqual('inherit');
		});
	});

	describe('cssPropertyToCamelCase', () => {
		it('should convert -moz- prefix', () => {
			expect(cssPropertyToCamelCase('-moz-appearance')).toEqual(
				'MozAppearance'
			);
		});

		it('should convert -moz-osx-font-smoothing', () => {
			expect(cssPropertyToCamelCase('-moz-osx-font-smoothing')).toEqual(
				'MozOsxFontSmoothing'
			);
		});

		it('should convert -webkit- prefix', () => {
			expect(cssPropertyToCamelCase('-webkit-transform')).toEqual(
				'WebkitTransform'
			);
		});

		it('should convert -webkit- with multi-hyphen', () => {
			expect(cssPropertyToCamelCase('-webkit-background-clip')).toEqual(
				'WebkitBackgroundClip'
			);
		});

		it('should convert -webkit-font-smoothing', () => {
			expect(cssPropertyToCamelCase('-webkit-font-smoothing')).toEqual(
				'WebkitFontSmoothing'
			);
		});

		it('should convert hyphenated property', () => {
			expect(cssPropertyToCamelCase('font-size')).toEqual('fontSize');
		});

		it('should convert multi-hyphen property', () => {
			expect(cssPropertyToCamelCase('border-top-left-radius')).toEqual(
				'borderTopLeftRadius'
			);
		});

		it('should return single-word property unchanged', () => {
			expect(cssPropertyToCamelCase('display')).toEqual('display');
			expect(cssPropertyToCamelCase('color')).toEqual('color');
		});
	});

	describe('cssToStyle', () => {
		it('should return empty object for empty CSS', () => {
			const result = cssToStyle('', {}, []);
			expect(result).toEqual({});
		});

		it('should return empty object when no utilities block', () => {
			const css = '@layer base { .body { margin: 0; } }';
			const result = cssToStyle(css, {}, ['body']);
			expect(result).toEqual({});
		});

		it('should filter to only requested classes', () => {
			const css =
				'@layer utilities { .flex { display: flex; } .p-4 { padding: 1rem; } }';
			const result = cssToStyle(css, {}, ['flex']);
			expect(result).toEqual({ display: 'flex' });
		});

		it('should handle multiple classes producing combined style', () => {
			const css =
				'@layer utilities { .flex { display: flex; } .p-4 { padding: 1rem; } }';
			const result = cssToStyle(css, {}, ['flex', 'p-4']);
			expect(result).toEqual({ display: 'flex', padding: '1rem' });
		});

		it('should resolve @property defaults as fallback', () => {
			const css = `
        @property --tw-opacity {
          syntax: "<number>";
          inherits: false;
          initial-value: 1;
        }
        @layer utilities { .test { opacity: var(--tw-opacity); } }
      `;
			const result = cssToStyle(css, {}, ['test']);
			expect(result).toEqual({ opacity: 1 });
		});

		it('should resolve custom properties from theme', () => {
			const css =
				'@layer utilities { .text-custom { color: var(--custom-color); } }';
			const theme = { '--custom-color': '#ffff00' };
			const result = cssToStyle(css, theme, ['text-custom']);
			expect(result).toEqual({ color: '#ffff00' });
		});

		it('should resolve element-level custom properties', () => {
			const css =
				'@layer utilities { .test { --my-var: blue; color: var(--my-var); } }';
			const result = cssToStyle(css, {}, ['test']);
			expect(result).toEqual({ color: 'blue' });
		});

		it('should use lookup priority: element props > theme props > @property defaults', () => {
			const css = `
        @property --color {
          syntax: "<color>";
          inherits: false;
          initial-value: green;
        }
        @layer utilities { .test { --color: red; color: var(--color); } }
      `;
			const theme = { '--color': 'blue' };
			// Element custom prop (red) should win over theme (blue) and @property default (green)
			const result = cssToStyle(css, theme, ['test']);
			expect(result).toEqual({ color: 'red' });
		});

		it('should convert simple CSS to CSSProperties', () => {
			const css = '@layer utilities { .flex { display: flex; } }';
			const result = cssToStyle(css, {}, ['flex']);
			expect(result).toEqual({ display: 'flex' });
		});

		it('should convert CSS properties to camelCase', () => {
			const css =
				'@layer utilities { .test { font-size: 16px; border-radius: 4px; } }';
			const result = cssToStyle(css, {}, ['test']);
			expect(result).toEqual({ borderRadius: '4px', fontSize: '16px' });
		});

		it('should convert opacity percentage to decimal number', () => {
			const css = '@layer utilities { .opacity-50 { opacity: 50%; } }';
			const result = cssToStyle(css, {}, ['opacity-50']);
			expect(result).toEqual({ opacity: 0.5 });
		});

		it('should expand inset shorthand', () => {
			const css = '@layer utilities { .inset-0 { inset: 0px; } }';
			const result = cssToStyle(css, {}, ['inset-0']);
			expect(result).toEqual({
				bottom: '0px',
				left: '0px',
				right: '0px',
				top: '0px'
			});
		});

		it('should expand inset-inline shorthand', () => {
			const css =
				'@layer utilities { .inset-x-0 { inset-inline: 0px; } }';
			const result = cssToStyle(css, {}, ['inset-x-0']);
			expect(result).toEqual({
				left: '0px',
				right: '0px'
			});
		});

		it('should expand inset-block shorthand', () => {
			const css = '@layer utilities { .inset-y-0 { inset-block: 0px; } }';
			const result = cssToStyle(css, {}, ['inset-y-0']);
			expect(result).toEqual({
				bottom: '0px',
				top: '0px'
			});
		});

		it('should expand margin-block shorthand', () => {
			const css = '@layer utilities { .my-4 { margin-block: 1rem; } }';
			const result = cssToStyle(css, {}, ['my-4']);
			expect(result).toEqual({
				marginBottom: '1rem',
				marginTop: '1rem'
			});
		});

		it('should expand margin-inline shorthand', () => {
			const css = '@layer utilities { .mx-4 { margin-inline: 1rem; } }';
			const result = cssToStyle(css, {}, ['mx-4']);
			expect(result).toEqual({
				marginLeft: '1rem',
				marginRight: '1rem'
			});
		});

		it('should expand padding-block shorthand', () => {
			const css = '@layer utilities { .py-4 { padding-block: 1rem; } }';
			const result = cssToStyle(css, {}, ['py-4']);
			expect(result).toEqual({
				paddingBottom: '1rem',
				paddingTop: '1rem'
			});
		});

		it('should expand padding-inline shorthand', () => {
			const css = '@layer utilities { .px-4 { padding-inline: 1rem; } }';
			const result = cssToStyle(css, {}, ['px-4']);
			expect(result).toEqual({
				paddingLeft: '1rem',
				paddingRight: '1rem'
			});
		});

		it('should convert font-weight to a number', () => {
			const css = '@layer utilities { .font-bold { font-weight: 700; } }';
			const result = cssToStyle(css, {}, ['font-bold']);
			expect(result).toEqual({ fontWeight: 700 });
		});

		it('should convert flex-grow to a number', () => {
			const css = '@layer utilities { .grow { flex-grow: 1; } }';
			const result = cssToStyle(css, {}, ['grow']);
			expect(result).toEqual({ flexGrow: 1 });
		});

		it('should convert line-height to a number', () => {
			const css =
				'@layer utilities { .leading-normal { line-height: 1.5; } }';
			const result = cssToStyle(css, {}, ['leading-normal']);
			expect(result).toEqual({ lineHeight: 1.5 });
		});
	});

	describe('expandLogicalProperties', () => {
		it('should expand inset to individual properties', () => {
			expect(expandLogicalProperties('inset', '0px')).toEqual({
				bottom: '0px',
				left: '0px',
				right: '0px',
				top: '0px'
			});
		});

		it('should expand inset-inline to left and right', () => {
			expect(expandLogicalProperties('inset-inline', '4px')).toEqual({
				left: '4px',
				right: '4px'
			});
		});

		it('should expand inset-inline-start to left', () => {
			expect(
				expandLogicalProperties('inset-inline-start', '4px')
			).toEqual({ left: '4px' });
		});

		it('should expand inset-inline-end to right', () => {
			expect(expandLogicalProperties('inset-inline-end', '4px')).toEqual({
				right: '4px'
			});
		});

		it('should expand inset-block to top and bottom', () => {
			expect(expandLogicalProperties('inset-block', '4px')).toEqual({
				bottom: '4px',
				top: '4px'
			});
		});

		it('should expand margin-block to marginTop and marginBottom', () => {
			expect(expandLogicalProperties('margin-block', '1rem')).toEqual({
				marginBottom: '1rem',
				marginTop: '1rem'
			});
		});

		it('should expand margin-inline to marginLeft and marginRight', () => {
			expect(expandLogicalProperties('margin-inline', '1rem')).toEqual({
				marginLeft: '1rem',
				marginRight: '1rem'
			});
		});

		it('should expand margin-inline-start to marginLeft', () => {
			expect(
				expandLogicalProperties('margin-inline-start', '1rem')
			).toEqual({ marginLeft: '1rem' });
		});

		it('should expand margin-inline-end to marginRight', () => {
			expect(
				expandLogicalProperties('margin-inline-end', '1rem')
			).toEqual({ marginRight: '1rem' });
		});

		it('should expand padding-block to paddingTop and paddingBottom', () => {
			expect(expandLogicalProperties('padding-block', '1rem')).toEqual({
				paddingBottom: '1rem',
				paddingTop: '1rem'
			});
		});

		it('should expand padding-inline to paddingLeft and paddingRight', () => {
			expect(expandLogicalProperties('padding-inline', '1rem')).toEqual({
				paddingLeft: '1rem',
				paddingRight: '1rem'
			});
		});

		it('should expand padding-inline-start to paddingLeft', () => {
			expect(
				expandLogicalProperties('padding-inline-start', '1rem')
			).toEqual({ paddingLeft: '1rem' });
		});

		it('should expand padding-inline-end to paddingRight', () => {
			expect(
				expandLogicalProperties('padding-inline-end', '1rem')
			).toEqual({ paddingRight: '1rem' });
		});

		it('should expand border-inline-style to borderLeftStyle and borderRightStyle', () => {
			expect(
				expandLogicalProperties('border-inline-style', 'solid')
			).toEqual({ borderLeftStyle: 'solid', borderRightStyle: 'solid' });
		});

		it('should expand border-inline-width to borderLeftWidth and borderRightWidth', () => {
			expect(
				expandLogicalProperties('border-inline-width', '2px')
			).toEqual({ borderLeftWidth: '2px', borderRightWidth: '2px' });
		});

		it('should expand border-block-style to borderTopStyle and borderBottomStyle', () => {
			expect(
				expandLogicalProperties('border-block-style', 'solid')
			).toEqual({
				borderBottomStyle: 'solid',
				borderTopStyle: 'solid'
			});
		});

		it('should expand border-inline-start-width to borderLeftWidth', () => {
			expect(
				expandLogicalProperties('border-inline-start-width', '2px')
			).toEqual({ borderLeftWidth: '2px' });
		});

		it('should expand border-inline-end-width to borderRightWidth', () => {
			expect(
				expandLogicalProperties('border-inline-end-width', '2px')
			).toEqual({ borderRightWidth: '2px' });
		});

		it('should expand border-start-start-radius to borderTopLeftRadius', () => {
			expect(
				expandLogicalProperties('border-start-start-radius', '8px')
			).toEqual({ borderTopLeftRadius: '8px' });
		});

		it('should expand border-end-end-radius to borderBottomRightRadius', () => {
			expect(
				expandLogicalProperties('border-end-end-radius', '8px')
			).toEqual({ borderBottomRightRadius: '8px' });
		});

		it('should expand scroll-margin-inline to scrollMarginLeft and scrollMarginRight', () => {
			expect(
				expandLogicalProperties('scroll-margin-inline', '1rem')
			).toEqual({
				scrollMarginLeft: '1rem',
				scrollMarginRight: '1rem'
			});
		});

		it('should expand scroll-padding-block to scrollPaddingTop and scrollPaddingBottom', () => {
			expect(
				expandLogicalProperties('scroll-padding-block', '1rem')
			).toEqual({
				scrollPaddingBottom: '1rem',
				scrollPaddingTop: '1rem'
			});
		});

		it('should expand border-block-color to top and bottom', () => {
			expect(
				expandLogicalProperties('border-block-color', '#ff0000')
			).toEqual({
				borderBottomColor: '#ff0000',
				borderTopColor: '#ff0000'
			});
		});

		it('should expand border-block-end-color to bottom', () => {
			expect(
				expandLogicalProperties('border-block-end-color', '#ff0000')
			).toEqual({
				borderBottomColor: '#ff0000'
			});
		});

		it('should expand border-block-start-color to top', () => {
			expect(
				expandLogicalProperties('border-block-start-color', '#ff0000')
			).toEqual({
				borderTopColor: '#ff0000'
			});
		});

		it('should expand border-inline-color to left and right', () => {
			expect(
				expandLogicalProperties('border-inline-color', '#ff0000')
			).toEqual({
				borderLeftColor: '#ff0000',
				borderRightColor: '#ff0000'
			});
		});

		it('should expand border-inline-end-color to right', () => {
			expect(
				expandLogicalProperties('border-inline-end-color', '#ff0000')
			).toEqual({
				borderRightColor: '#ff0000'
			});
		});

		it('should expand border-inline-start-color to left', () => {
			expect(
				expandLogicalProperties('border-inline-start-color', '#ff0000')
			).toEqual({
				borderLeftColor: '#ff0000'
			});
		});

		it('should return null for non-logical property', () => {
			expect(expandLogicalProperties('display', 'flex')).toEqual(null);
		});
	});

	describe('extractCustomProperties', () => {
		it('should extract a single custom property', () => {
			const css = '  --color-yellow: #ffff00;';
			expect(extractCustomProperties(css)).toEqual({
				'--color-yellow': '#ffff00'
			});
		});

		it('should extract multiple custom properties', () => {
			const css = `
        --color-yellow: #ffff00;
        --color-blue: #0000ff;
        --spacing-4: 1rem;
      `;
			expect(extractCustomProperties(css)).toEqual({
				'--color-blue': '#0000ff',
				'--color-yellow': '#ffff00',
				'--spacing-4': '1rem'
			});
		});

		it('should handle multi-line CSS with indentation', () => {
			const css = `
        @theme {
          --color-primary: oklch(0.5 0.1 180);
          --font-size-base: 1rem;
        }
      `;
			expect(extractCustomProperties(css)).toEqual({
				'--color-primary': 'oklch(0.5 0.1 180)',
				'--font-size-base': '1rem'
			});
		});

		it('should ignore non-custom properties', () => {
			const css = `
        color: red;
        --custom: blue;
        font-size: 16px;
      `;
			expect(extractCustomProperties(css)).toEqual({
				'--custom': 'blue'
			});
		});

		it('should return empty object for CSS with no custom properties', () => {
			const css = 'color: red; font-size: 16px;';
			expect(extractCustomProperties(css)).toEqual({});
		});

		it('should trim whitespace from values', () => {
			const css = '  --spacing:   1rem  ;';
			expect(extractCustomProperties(css)).toEqual({
				'--spacing': '1rem'
			});
		});
	});

	describe('extractPropertyDefaults', () => {
		it('should extract initial-value from @property block', () => {
			const css = `
        @property --tw-opacity {
          syntax: "<number>";
          inherits: false;
          initial-value: 1;
        }
      `;
			expect(extractPropertyDefaults(css)).toEqual({
				'--tw-opacity': '1'
			});
		});

		it('should extract multiple @property blocks', () => {
			const css = `
        @property --tw-opacity {
          syntax: "<number>";
          inherits: false;
          initial-value: 1;
        }
        @property --tw-scale {
          syntax: "<number>";
          inherits: false;
          initial-value: 1;
        }
      `;
			expect(extractPropertyDefaults(css)).toEqual({
				'--tw-opacity': '1',
				'--tw-scale': '1'
			});
		});

		it('should handle whitespace variations', () => {
			const css = `@property   --tw-blur  {
        syntax:"<length>";
        inherits:false;
        initial-value:  0px ;
      }`;
			expect(extractPropertyDefaults(css)).toEqual({
				'--tw-blur': '0px'
			});
		});

		it('should return empty object when no @property rules', () => {
			const css = '.flex { display: flex; }';
			expect(extractPropertyDefaults(css)).toEqual({});
		});
	});

	describe('extractTopLevelContent', () => {
		it('should handle deeply nested blocks', () => {
			const body = ' color: red; { a { b { c } } } color: blue; ';
			const result = extractTopLevelContent(body);
			expect(result).toContain('color: red;');
			expect(result).toContain('color: blue;');
			expect(result).not.toContain('a');
		});

		it('should strip @supports condition text and body', () => {
			const body = `
				--tw-drop-shadow-color: oklch(63.7% 0.237 25.331);
				@supports (color: color-mix(in lab, red, red)) {
					--tw-drop-shadow-color: color-mix(in oklab, red 100%, transparent);
				}
				--tw-drop-shadow: var(--tw-drop-shadow-size);
			`;
			const result = extractTopLevelContent(body);
			expect(result).toContain(
				'--tw-drop-shadow-color: oklch(63.7% 0.237 25.331);'
			);
			expect(result).toContain(
				'--tw-drop-shadow: var(--tw-drop-shadow-size);'
			);
			expect(result).not.toContain('@supports');
			expect(result).not.toContain('color-mix');
		});

		it('should return body text unchanged when no nesting', () => {
			const body = ' display: flex; padding: 1rem; ';
			expect(extractTopLevelContent(body)).toEqual(
				' display: flex; padding: 1rem; '
			);
		});

		it('should return empty string for empty input', () => {
			expect(extractTopLevelContent('')).toEqual('');
		});

		it('should strip nested blocks', () => {
			const body =
				' display: flex; @supports (grid) { display: grid; } padding: 1rem; ';
			const result = extractTopLevelContent(body);
			expect(result).toContain('display: flex;');
			expect(result).toContain('padding: 1rem;');
			expect(result).not.toContain('display: grid');
		});
	});

	describe('extractUtilitiesBlock', () => {
		it('should extract content of @layer utilities', () => {
			const css = '@layer utilities { .flex { display: flex; } }';
			expect(extractUtilitiesBlock(css)).toEqual(
				' .flex { display: flex; } '
			);
		});

		it('should handle @layer utilities at different positions', () => {
			const css =
				'@layer base { } @layer utilities { .p-4 { padding: 1rem; } } @layer components { }';
			expect(extractUtilitiesBlock(css)).toContain('.p-4');
		});

		it('should handle nested braces', () => {
			const css =
				'@layer utilities { .test { @supports (display: grid) { display: grid; } } }';
			const result = extractUtilitiesBlock(css);
			expect(result).toContain('.test');
			expect(result).toContain('@supports');
		});

		it('should return empty string when @layer utilities has no opening brace', () => {
			const css = '@layer utilities';
			expect(extractUtilitiesBlock(css)).toEqual('');
		});

		it('should return empty string when no @layer utilities', () => {
			const css = '@layer base { .body { margin: 0; } }';
			expect(extractUtilitiesBlock(css)).toEqual('');
		});
	});

	describe('parseClassBlocks', () => {
		it('should handle nested blocks inside class', () => {
			const input =
				'.test { color: red; @supports (grid) { display: grid; } }';
			const result = parseClassBlocks(input);
			expect(result).toHaveLength(1);
			expect(result[0].body).toContain('color: red;');
			expect(result[0].body).toContain('@supports');
		});

		it('should parse multiple class blocks', () => {
			const input = '.flex { display: flex; } .p-4 { padding: 1rem; }';
			const result = parseClassBlocks(input);
			expect(result).toHaveLength(2);
			expect(result[0].className).toEqual('flex');
			expect(result[1].className).toEqual('p-4');
		});

		it('should parse single class block', () => {
			const input = '.flex { display: flex; }';
			const result = parseClassBlocks(input);
			expect(result).toEqual([
				{ body: ' display: flex; ', className: 'flex' }
			]);
		});

		it('should return empty array for empty input', () => {
			expect(parseClassBlocks('')).toEqual([]);
		});

		it('should unescape class names', () => {
			const input = '.w-\\[200px\\] { width: 200px; }';
			const result = parseClassBlocks(input);
			expect(result[0].className).toEqual('w-[200px]');
		});
	});

	describe('resolveCalc', () => {
		it('should evaluate addition', () => {
			expect(resolveCalc('calc(10px + 5px)')).toEqual('15px');
		});

		it('should evaluate division', () => {
			expect(resolveCalc('calc(10px / 2)')).toEqual('5px');
		});

		it('should evaluate multiplication', () => {
			expect(resolveCalc('calc(2 * 8px)')).toEqual('16px');
		});

		it('should evaluate subtraction', () => {
			expect(resolveCalc('calc(10px - 3px)')).toEqual('7px');
		});

		it('should handle division by zero', () => {
			expect(resolveCalc('calc(10px / 0)')).toEqual('0px');
		});

		it('should handle nested calc()', () => {
			expect(resolveCalc('calc(calc(5px + 5px) + 10px)')).toEqual('20px');
		});

		it('should preserve units from left operand', () => {
			expect(resolveCalc('calc(10rem + 5rem)')).toEqual('15rem');
		});

		it('should return expression unchanged if no valid operator', () => {
			expect(resolveCalc('calc(10px)')).toEqual('10px');
		});

		it('should return value unchanged when no calc()', () => {
			expect(resolveCalc('10px')).toEqual('10px');
		});

		it('should round to 4 decimal places', () => {
			expect(resolveCalc('calc(10px / 3)')).toEqual('3.3333px');
		});

		it('should use right operand unit when left has none', () => {
			expect(resolveCalc('calc(2 * 8px)')).toEqual('16px');
		});

		it('should resolve calc(infinity * 1px) to 9999px', () => {
			expect(resolveCalc('calc(infinity * 1px)')).toEqual('9999px');
		});

		it('should resolve calc(-infinity * 1px) to -9999px', () => {
			expect(resolveCalc('calc(-infinity * 1px)')).toEqual('-9999px');
		});

		it('should resolve multi-operation calc(1 / 2 * 100%)', () => {
			expect(resolveCalc('calc(1 / 2 * 100%)')).toEqual('50%');
		});

		it('should resolve multi-operation calc(1 / 3 * 100%)', () => {
			expect(resolveCalc('calc(1 / 3 * 100%)')).toEqual('33.33%');
		});

		it('should resolve multi-operation calc(2 / 3 * 100%)', () => {
			expect(resolveCalc('calc(2 / 3 * 100%)')).toEqual('66.67%');
		});
	});

	describe('resolveValue', () => {
		it('should handle value with no transformations needed', () => {
			const lookup = () => {
				return null;
			};
			expect(resolveValue('1rem', lookup)).toEqual('1rem');
		});

		it('should resolve color-mix', () => {
			const lookup = () => {
				return null;
			};
			const result = resolveValue(
				'color-mix(in srgb, #ffff00 50%, transparent)',
				lookup
			);
			expect(result).toEqual('#ffff0080');
		});

		it('should resolve modern rgb', () => {
			const lookup = () => {
				return null;
			};
			const result = resolveValue('rgb(255 0 0 / 0.5)', lookup);
			expect(result).toEqual('rgba(255, 0, 0, 0.5)');
		});

		it('should resolve oklch colors', () => {
			const lookup = () => {
				return null;
			};
			const result = resolveValue('oklch(0 0 0)', lookup);
			expect(result).toEqual('#000000');
		});

		it('should resolve vars then calc then oklch then color-mix then modern rgb', () => {
			const lookup = (name: string) => {
				if (name === '--size') {
					return '10px';
				}
				return null;
			};
			const result = resolveValue('calc(var(--size) + 5px)', lookup);
			expect(result).toEqual('15px');
		});

		it('should resolve var to percentage for opacity conversion', () => {
			const lookup = (name: string) => {
				if (name === '--tw-opacity') {
					return '50%';
				}
				return null;
			};
			const resolved = resolveValue('var(--tw-opacity)', lookup);
			expect(convertOpacityPercentage(resolved)).toEqual('0.5');
		});

		it('should resolve calc to unitless value for coercion', () => {
			const lookup = () => {
				return null;
			};
			const resolved = resolveValue('calc(400 + 300)', lookup);
			expect(coerceUnitlessValue('fontWeight', resolved)).toEqual(700);
		});

		it('should resolve var for inset expansion', () => {
			const lookup = (name: string) => {
				if (name === '--spacing') {
					return '8px';
				}
				return null;
			};
			const resolved = resolveValue('var(--spacing)', lookup);
			expect(expandLogicalProperties('inset', resolved)).toEqual({
				bottom: '8px',
				left: '8px',
				right: '8px',
				top: '8px'
			});
		});

		it('should resolve var for padding-inline expansion', () => {
			const lookup = (name: string) => {
				if (name === '--spacing') {
					return '8px';
				}
				return null;
			};
			const resolved = resolveValue('var(--spacing)', lookup);
			expect(expandLogicalProperties('padding-inline', resolved)).toEqual(
				{
					paddingLeft: '8px',
					paddingRight: '8px'
				}
			);
		});
	});

	describe('resolveVars', () => {
		it('should handle multiple var() in same value', () => {
			const lookup = (name: string) => {
				if (name === '--x') {
					return '10px';
				}
				if (name === '--y') {
					return '20px';
				}
				return null;
			};
			expect(resolveVars('var(--x) var(--y)', lookup)).toEqual(
				'10px 20px'
			);
		});

		it('should resolve nested vars (innermost first)', () => {
			const lookup = (name: string) => {
				if (name === '--inner') {
					return '10px';
				}
				if (name === '--outer') {
					return 'calc(var(--inner) + 5px)';
				}
				return null;
			};
			const result = resolveVars('var(--outer)', lookup);
			expect(result).toEqual('calc(10px + 5px)');
		});

		it('should resolve simple var(--name) reference', () => {
			const lookup = (name: string) => {
				if (name === '--color') {
					return '#ffff00';
				}
				return null;
			};
			expect(resolveVars('var(--color)', lookup)).toEqual('#ffff00');
		});

		it('should resolve var with fallback', () => {
			const lookup = () => {
				return null;
			};
			expect(resolveVars('var(--missing, blue)', lookup)).toEqual('blue');
		});

		it('should return original value when no var() present', () => {
			const lookup = () => {
				return null;
			};
			expect(resolveVars('#ffff00', lookup)).toEqual('#ffff00');
		});

		it('should stop after 20 iterations for infinite loops', () => {
			const lookup = (name: string) => {
				if (name === '--a') {
					return 'var(--b)';
				}
				if (name === '--b') {
					return 'var(--a)';
				}
				return null;
			};
			// Should not hang, returns whatever state after 20 iterations
			const result = resolveVars('var(--a)', lookup);
			expect(typeof result === 'string').toEqual(true);
		});

		it('should use empty string as fallback when no fallback specified and lookup returns undefined', () => {
			const lookup = () => {
				return null;
			};
			expect(resolveVars('var(--missing)', lookup)).toEqual('');
		});

		it('should use lookup value over fallback', () => {
			const lookup = (name: string) => {
				if (name === '--color') {
					return 'red';
				}
				return null;
			};
			expect(resolveVars('var(--color, blue)', lookup)).toEqual('red');
		});
	});

	describe('unescapeClassName', () => {
		it('should handle multiple backslashes', () => {
			expect(unescapeClassName('p-\\[10px\\]\\.5')).toEqual('p-[10px].5');
		});

		it('should remove backslashes from escaped brackets', () => {
			expect(unescapeClassName('w-\\[200px\\]')).toEqual('w-[200px]');
		});

		it('should return value unchanged when no backslashes', () => {
			expect(unescapeClassName('flex')).toEqual('flex');
		});
	});
});
