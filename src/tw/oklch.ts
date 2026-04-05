const oklchToHex = (
	L: number,
	C: number,
	H: number,
	alpha?: number | null
): string => {
	// OKLCH → OKLab (polar → cartesian)
	const hRad = (H * Math.PI) / 180;
	const a = C * Math.cos(hRad);
	const b = C * Math.sin(hRad);

	// OKLab → Linear sRGB via intermediate LMS
	const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = L - 0.0894841775 * a - 1.291485548 * b;

	const l = l_ * l_ * l_;
	const m = m_ * m_ * m_;
	const s = s_ * s_ * s_;

	const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
	const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
	const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

	const gamma = (x: number): number => {
		if (x <= 0.0031308) {
			return 12.92 * x;
		}

		return 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
	};

	const clamp = (x: number): number => {
		return Math.max(0, Math.min(1, x));
	};

	const r = Math.round(clamp(gamma(lr)) * 255);
	const g = Math.round(clamp(gamma(lg)) * 255);
	const blueValue = Math.round(clamp(gamma(lb)) * 255);

	const toHex = (n: number): string => {
		return n.toString(16).padStart(2, '0');
	};

	if (alpha != null && alpha < 1) {
		const alphaValue = Math.round(clamp(alpha) * 255);
		return `#${toHex(r)}${toHex(g)}${toHex(blueValue)}${toHex(alphaValue)}`;
	}

	return `#${toHex(r)}${toHex(g)}${toHex(blueValue)}`;
};

// Match oklch(...) handling nested parens via manual scan
const convertOklch = (value: string): string => {
	let result = value;
	let searchStartPosition = 0;

	for (;;) {
		const index = result.indexOf('oklch(', searchStartPosition);
		if (index === -1) {
			break;
		}

		// Find matching closing paren
		let depth = 1;
		let i = index + 6;
		while (i < result.length && depth > 0) {
			if (result[i] === '(') {
				depth++;
			}
			if (result[i] === ')') {
				depth--;
			}
			i++;
		}

		const args = result.substring(index + 6, i - 1).trim();

		// Parse: L C H or L C H / A
		const slashIndex = args.indexOf('/');
		let colorPart: string;
		let alpha: number | null = null;

		if (slashIndex !== -1) {
			colorPart = args.substring(0, slashIndex).trim();
			const alphaStr = args.substring(slashIndex + 1).trim();
			alpha =
				parseFloat(alphaStr.replace('%', '')) /
				(alphaStr.includes('%') ? 100 : 1);
		} else {
			colorPart = args;
		}

		const parts = colorPart.split(/\s+/);
		if (parts.length < 3) {
			searchStartPosition = i;
			continue;
		}

		const L =
			parseFloat(parts[0].replace('%', '')) /
			(parts[0].includes('%') ? 100 : 1);
		const C = parseFloat(parts[1]);
		const H = parseFloat(parts[2]);

		if (Number.isNaN(L) || Number.isNaN(C) || Number.isNaN(H)) {
			searchStartPosition = i;
			continue;
		}

		const hex = oklchToHex(L, C, H, alpha);
		result = result.substring(0, index) + hex + result.substring(i);
		searchStartPosition = index + hex.length;
	}

	return result;
};

export { convertOklch, oklchToHex };
