import { TAILWIND_CSS } from './tailwind-css.js';

type TailwindCompiler = {
	build: (classes: string[]) => string;
};

let compiler: TailwindCompiler | null = null;
let currentCss: string | null = null;

const initCompiler = async (customCss?: string): Promise<boolean> => {
	const css = customCss || TAILWIND_CSS;

	if (compiler && currentCss === css) {
		return false;
	}

	const { compile } = await import('tailwindcss');
	compiler = await compile(css);
	currentCss = css;

	return true;
};

const buildCss = (classes: string[]): string => {
	if (!compiler) {
		throw new Error('tw not initialized — call initTw() first');
	}

	return compiler.build(classes);
};

export { buildCss, initCompiler };
