import type { ReactElement, ReactNode } from 'react';

import { buildCss, initCompiler } from './compiler.js';
import { cssToStyle, extractCustomProperties } from './css-to-style.js';
import { TAILWIND_CSS } from './tailwind-css.js';
import { isReactElement } from '../utils.js';

type ElementProps = {
	children?: ReactNode;
	className?: string | null;
	style?: Record<string, unknown>;
	[key: string]: unknown;
};

type OnTailwind = (
	className: string,
	style: Record<string, string | number>
) => void;

type TwElement = ReactElement & {
	props: ElementProps;
	type: string | ((...args: unknown[]) => ReactNode);
};

let customProps: Record<string, string> = {};
const cache = new Map<string, Record<string, string | number>>();

const initTw = async (customCss?: string): Promise<void> => {
	const changed = await initCompiler(customCss);

	if (changed) {
		cache.clear();
		customProps = extractCustomProperties(customCss || TAILWIND_CSS);
	}
};

const tw = (classString: string): Record<string, string | number> => {
	const classes = classString.trim().split(/\s+/).filter(Boolean);

	if (!classes.length) {
		return {};
	}

	const normalizedKey = classes.join(' ');
	const cached = cache.get(normalizedKey);

	if (cached) {
		return cached;
	}

	const css = buildCss(classes);
	const style = cssToStyle(css, customProps, classes);
	cache.set(normalizedKey, style);

	return style;
};

const isTwElement = (node: ReactNode): node is TwElement => {
	return (
		isReactElement(node) &&
		node != null &&
		typeof node === 'object' &&
		'type' in node &&
		'props' in node
	);
};

const transformTwElement = async (
	element: TwElement,
	onTailwind?: OnTailwind
): Promise<TwElement> => {
	if (typeof element.type === 'function') {
		const rendered: ReactNode = await element.type(element.props);
		const transformed = await transformTwNode(rendered, onTailwind);

		if (!isTwElement(transformed)) {
			throw new Error('Invalid element');
		}

		return transformed;
	}

	const { children, className, style } = element.props;
	let newProps: ElementProps = { ...element.props };
	let changed = false;

	if (typeof className === 'string') {
		const twStyles = tw(className);

		if (onTailwind) {
			onTailwind(className, twStyles);
		}
		const rawStyle: Record<string, unknown> = style ?? {};
		const existingStyle: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(rawStyle)) {
			if (value !== '' && value != null) {
				existingStyle[key] = value;
			}
		}

		newProps = {
			...newProps,
			className: null,
			style: { ...twStyles, ...existingStyle }
		};
		changed = true;
	}

	if (children) {
		const newChildren = Array.isArray(children)
			? await Promise.all(
					children.map(child => {
						return transformTwNode(child, onTailwind);
					})
			  )
			: await transformTwNode(children, onTailwind);

		if (newChildren !== children) {
			newProps = { ...newProps, children: newChildren };
			changed = true;
		}
	}

	if (!changed) {
		return element;
	}

	const result: TwElement = {
		type: element.type,
		props: newProps,
		key: element.key
	} as TwElement;

	return result;
};

const transformTwNode = async (
	node: ReactNode,
	onTailwind?: OnTailwind
): Promise<ReactNode> => {
	if (Array.isArray(node)) {
		return Promise.all(
			node.map(child => {
				return transformTwNode(child, onTailwind);
			})
		);
	}

	if (!isTwElement(node)) {
		return node;
	}

	return transformTwElement(node, onTailwind);
};

export { initTw, transformTwElement, transformTwNode, tw };
export type { ElementProps, TwElement };
