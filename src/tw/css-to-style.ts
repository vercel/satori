import { convertOklch } from './oklch';
import { UNITLESS_CSS_PROPERTIES } from './unitless-css-properties';

// Coerce numeric string to number for unitless CSS properties (fontWeight, lineHeight, etc.)
const coerceUnitlessValue = (prop: string, value: string): string | number => {
	const numericValue = Number(value);

	if (UNITLESS_CSS_PROPERTIES.has(prop) && !Number.isNaN(numericValue)) {
		return numericValue;
	}

	return value;
};

// Convert color-mix(in <space>, <color> <pct>%, transparent) → hex with alpha
const convertColorMix = (value: string): string => {
	return value.replace(
		/color-mix\(in\s+\w+,\s*(#[0-9a-f]{3,8})\s+(\d+(?:\.\d+)?)%,\s*transparent\)/gi,
		(_match: string, color: string, pct: string) => {
			const percentage = parseFloat(pct);
			const alpha = Math.round((percentage / 100) * 255);
			let hex = color;

			if (hex.length === 4) {
				hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
			} else if (hex.length === 5) {
				hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}${hex[4]}${hex[4]}`;
			}

			if (hex.length === 9) {
				hex = hex.slice(0, 7);
			}

			return `${hex}${alpha.toString(16).padStart(2, '0')}`;
		}
	);
};

// Convert modern rgb(r g b / a) to rgba(r, g, b, a)
const convertModernRgb = (value: string): string => {
	return value.replace(
		/rgb\((\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+%?)\)/g,
		(_match: string, r: string, g: string, b: string, a: string) => {
			const alpha = a.includes('%') ? parseFloat(a) / 100 : parseFloat(a);
			return `rgba(${r}, ${g}, ${b}, ${alpha})`;
		}
	);
};

// Convert opacity percentage (e.g. "50%") to decimal string (e.g. "0.5")
const convertOpacityPercentage = (value: string): string => {
	const percentageMatch = value.match(/^([\d.]+)%$/);

	if (percentageMatch) {
		return `${parseFloat(percentageMatch[1]) / 100}`;
	}

	return value;
};

// Convert CSS property name to camelCase
const cssPropertyToCamelCase = (prop: string): string => {
	if (prop.startsWith('-webkit-')) {
		const rest = prop.slice(8);
		const capitalized = rest.charAt(0).toUpperCase() + rest.slice(1);
		return (
			'Webkit' +
			capitalized.replace(/-([a-z])/g, (_match: string, c: string) => {
				return c.toUpperCase();
			})
		);
	}

	if (prop.startsWith('-moz-')) {
		const rest = prop.slice(5);
		const capitalized = rest.charAt(0).toUpperCase() + rest.slice(1);
		return (
			'Moz' +
			capitalized.replace(/-([a-z])/g, (_match: string, c: string) => {
				return c.toUpperCase();
			})
		);
	}

	return prop.replace(/-([a-z])/g, (_match: string, c: string) => {
		return c.toUpperCase();
	});
};

// Convert build CSS output to React.CSSProperties (only for requested classes)
const cssToStyle = (
	css: string,
	themeProps: Record<string, string>,
	requestedClasses: string[]
): Record<string, string | number> => {
	const propertyDefaults = extractPropertyDefaults(css);
	const utilitiesBlock = extractUtilitiesBlock(css);

	if (!utilitiesBlock) {
		return {};
	}

	const requestedSet = new Set(requestedClasses);
	const classBlocks = parseClassBlocks(utilitiesBlock);

	const elementCustomProps: Record<string, string> = {};
	const declarations: [string, string][] = [];

	const declRegex = /([\w-][\w-]*)\s*:\s*([^;]+);/g;

	for (const { body, className } of classBlocks) {
		if (!requestedSet.has(className)) {
			continue;
		}

		const topLevel = extractTopLevelContent(body);
		declRegex.lastIndex = 0;
		let declMatch;

		while ((declMatch = declRegex.exec(topLevel)) !== null) {
			const prop = declMatch[1].trim();
			const val = declMatch[2].trim();

			if (prop.startsWith('--')) {
				elementCustomProps[prop] = val;
			} else {
				declarations.push([prop, val]);
			}
		}
	}

	const lookup = (name: string): string | null => {
		if (name in elementCustomProps) {
			return elementCustomProps[name];
		}
		if (name in themeProps) {
			return themeProps[name];
		}
		if (name in propertyDefaults) {
			return propertyDefaults[name];
		}

		return null;
	};

	for (const key of Object.keys(elementCustomProps)) {
		elementCustomProps[key] = resolveValue(elementCustomProps[key], lookup);
	}

	let style: Record<string, string | number> = {};

	for (let [prop, rawValue] of declarations) {
		let value = resolveValue(rawValue, lookup).replace(/\s+/g, ' ').trim();

		if (!value) {
			continue;
		}

		if (prop === 'opacity') {
			value = convertOpacityPercentage(value);
		}

		const expanded = expandLogicalProperties(prop, value);

		if (expanded) {
			style = { ...style, ...expanded };
			continue;
		}

		prop = cssPropertyToCamelCase(prop);
		style[prop] = coerceUnitlessValue(prop, value);
	}

	return style;
};

// Map of CSS logical properties to physical properties (LTR)
const LOGICAL_PROPERTY_MAP: Record<string, Record<string, string>> = {
	'border-block-color': { borderBottomColor: '', borderTopColor: '' },
	'border-block-end-color': { borderBottomColor: '' },
	'border-block-start-color': { borderTopColor: '' },
	'border-block-style': { borderBottomStyle: '', borderTopStyle: '' },
	'border-block-width': { borderBottomWidth: '', borderTopWidth: '' },
	'border-end-end-radius': { borderBottomRightRadius: '' },
	'border-end-start-radius': { borderBottomLeftRadius: '' },
	'border-inline-color': { borderLeftColor: '', borderRightColor: '' },
	'border-inline-end-color': { borderRightColor: '' },
	'border-inline-end-style': { borderRightStyle: '' },
	'border-inline-end-width': { borderRightWidth: '' },
	'border-inline-start-color': { borderLeftColor: '' },
	'border-inline-start-style': { borderLeftStyle: '' },
	'border-inline-start-width': { borderLeftWidth: '' },
	'border-inline-style': { borderLeftStyle: '', borderRightStyle: '' },
	'border-inline-width': { borderLeftWidth: '', borderRightWidth: '' },
	'border-start-end-radius': { borderTopRightRadius: '' },
	'border-start-start-radius': { borderTopLeftRadius: '' },
	inset: { bottom: '', left: '', right: '', top: '' },
	'inset-block': { bottom: '', top: '' },
	'inset-block-end': { bottom: '' },
	'inset-block-start': { top: '' },
	'inset-inline': { left: '', right: '' },
	'inset-inline-end': { right: '' },
	'inset-inline-start': { left: '' },
	'margin-block': { marginBottom: '', marginTop: '' },
	'margin-block-end': { marginBottom: '' },
	'margin-block-start': { marginTop: '' },
	'margin-inline': { marginLeft: '', marginRight: '' },
	'margin-inline-end': { marginRight: '' },
	'margin-inline-start': { marginLeft: '' },
	'padding-block': { paddingBottom: '', paddingTop: '' },
	'padding-block-end': { paddingBottom: '' },
	'padding-block-start': { paddingTop: '' },
	'padding-inline': { paddingLeft: '', paddingRight: '' },
	'padding-inline-end': { paddingRight: '' },
	'padding-inline-start': { paddingLeft: '' },
	'scroll-margin-block': { scrollMarginBottom: '', scrollMarginTop: '' },
	'scroll-margin-inline': { scrollMarginLeft: '', scrollMarginRight: '' },
	'scroll-padding-block': { scrollPaddingBottom: '', scrollPaddingTop: '' },
	'scroll-padding-inline': { scrollPaddingLeft: '', scrollPaddingRight: '' }
};

// Expand CSS logical properties into physical properties
const expandLogicalProperties = (
	prop: string,
	value: string
): Record<string, string> | null => {
	const mapping = LOGICAL_PROPERTY_MAP[prop];

	if (!mapping) {
		return null;
	}

	const result: Record<string, string> = {};
	for (const key of Object.keys(mapping)) {
		result[key] = value;
	}

	return result;
};

// Extract --name: value; pairs from CSS text (theme @theme blocks)
const extractCustomProperties = (css: string): Record<string, string> => {
	const props: Record<string, string> = {};
	const regex = /^\s*(--[\w-]+)\s*:\s*([^;]+);/gm;
	let match;

	while ((match = regex.exec(css)) !== null) {
		props[match[1]] = match[2].trim();
	}

	return props;
};

// Extract @property initial-value from build output
const extractPropertyDefaults = (css: string): Record<string, string> => {
	const props: Record<string, string> = {};
	const regex =
		/@property\s+(--[\w-]+)\s*\{[^}]*?initial-value:\s*([^;}\n]+)/g;
	let match;

	while ((match = regex.exec(css)) !== null) {
		props[match[1]] = match[2].trim();
	}

	return props;
};

// Extract only top-level text from a block body (strips nested { ... } and at-rule conditions)
const extractTopLevelContent = (body: string): string => {
	let result = '';
	let depth = 0;

	for (let i = 0; i < body.length; i++) {
		if (body[i] === '@' && depth === 0) {
			while (i < body.length && body[i] !== '{') {
				i++;
			}

			depth++;
		} else if (body[i] === '{') {
			depth++;
		} else if (body[i] === '}') {
			depth--;
		} else if (depth === 0) {
			result += body[i];
		}
	}

	return result;
};

// Extract @layer utilities { ... } content using balanced brace matching
const extractUtilitiesBlock = (css: string): string => {
	const startIdx = css.indexOf('@layer utilities');
	if (startIdx === -1) {
		return '';
	}

	const openBrace = css.indexOf('{', startIdx);
	if (openBrace === -1) {
		return '';
	}

	let depth = 1;
	let i = openBrace + 1;

	while (i < css.length && depth > 0) {
		if (css[i] === '{') {
			depth++;
		}
		if (css[i] === '}') {
			depth--;
		}
		i++;
	}

	return css.substring(openBrace + 1, i - 1);
};

// Parse class blocks from utilities block using balanced brace matching
const parseClassBlocks = (
	utilitiesBlock: string
): { className: string; body: string }[] => {
	const blocks: { className: string; body: string }[] = [];
	const selectorRegex = /\.([^\s{]+)\s*\{/g;
	let match;

	while ((match = selectorRegex.exec(utilitiesBlock)) !== null) {
		const rawSelector = match[1];
		const bodyStart = match.index + match[0].length;

		let depth = 1;
		let i = bodyStart;

		while (i < utilitiesBlock.length && depth > 0) {
			if (utilitiesBlock[i] === '{') {
				depth++;
			}
			if (utilitiesBlock[i] === '}') {
				depth--;
			}
			i++;
		}

		const body = utilitiesBlock.substring(bodyStart, i - 1);
		blocks.push({ body, className: unescapeClassName(rawSelector) });

		selectorRegex.lastIndex = i;
	}

	return blocks;
};

// Evaluate simple calc() expressions (one binary operation)
const resolveCalc = (value: string): string => {
	let result = value;
	let iterations = 0;

	while (result.includes('calc(') && iterations < 10) {
		iterations++;

		result = result.replace(
			/calc\(([^()]+)\)/g,
			(_match: string, expr: string) => {
				const trimmed = expr.trim();

				const opMatch = trimmed.match(/^(.+?)\s+([+\-*/])\s+(.+?)$/);
				if (!opMatch) {
					return trimmed;
				}

				const [, leftStr, op, rightStr] = opMatch;

				const parseValue = (
					s: string
				): { num: number; unit: string } => {
					const val = s.trim();

					if (val === 'infinity') {
						return { num: Infinity, unit: '' };
					}

					if (val === '-infinity') {
						return { num: -Infinity, unit: '' };
					}

					const m = val.match(/^(-?[\d.]+)(.*)$/);
					if (!m) {
						return { num: parseFloat(s), unit: '' };
					}

					return { num: parseFloat(m[1]), unit: m[2] };
				};

				const left = parseValue(leftStr);
				const right = parseValue(rightStr);

				let num: number;

				switch (op) {
					case '+':
						num = left.num + right.num;
						break;
					case '-':
						num = left.num - right.num;
						break;
					case '*':
						num = left.num * right.num;
						break;
					case '/':
						num = right.num !== 0 ? left.num / right.num : 0;
						break;
					default:
						return trimmed;
				}

				const unit = left.unit || right.unit;
				const rounded = Number.isFinite(num)
					? Math.round(num * 10000) / 10000
					: num > 0
					? 9999
					: -9999;

				const evaluated = `${rounded}${unit}`;

				if (/\s+[+\-*/]\s+/.test(unit)) {
					return `calc(${evaluated})`;
				}

				return evaluated;
			}
		);
	}

	return result;
};

// Resolve a single value through the full pipeline
const resolveValue = (
	value: string,
	lookup: (name: string) => string | null
): string => {
	let result = resolveVars(value, lookup);
	result = resolveCalc(result);
	result = convertOklch(result);
	result = convertColorMix(result);
	result = convertModernRgb(result);
	return result;
};

// Resolve all var() references in a value string (innermost first)
const resolveVars = (
	value: string,
	lookup: (name: string) => string | null
): string => {
	let result = value;
	let iterations = 0;

	while (result.includes('var(') && iterations < 20) {
		iterations++;

		const lastVarIdx = result.lastIndexOf('var(');
		if (lastVarIdx === -1) {
			break;
		}

		const parenStart = lastVarIdx + 4;
		let depth = 1;
		let i = parenStart;

		while (i < result.length && depth > 0) {
			if (result[i] === '(') {
				depth++;
			}
			if (result[i] === ')') {
				depth--;
			}
			i++;
		}

		const parenEnd = i - 1;
		const content = result.substring(parenStart, parenEnd);
		const commaIdx = content.indexOf(',');

		let name: string;
		let fallback: string;

		if (commaIdx === -1) {
			name = content.trim();
			fallback = '';
		} else {
			name = content.substring(0, commaIdx).trim();
			fallback = content.substring(commaIdx + 1).trim();
		}

		const resolved = lookup(name) ?? fallback;
		result =
			result.substring(0, lastVarIdx) +
			resolved +
			result.substring(parenEnd + 1);
	}

	return result;
};

// Unescape CSS class selector: .w-\[200px\] → w-[200px]
const unescapeClassName = (selector: string): string => {
	return selector.replace(/\\/g, '');
};

export {
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
};
