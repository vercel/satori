import { describe, expect, it, vi } from 'vitest';

import type { ElementProps, TwElement } from '../../src/tw/index.js';
import { transformTwElement, transformTwNode } from '../../src/tw/index.js';

vi.mock('../../src/tw/compiler.js', () => {
	return {
		buildCss: () => {
			return '';
		},
		initCompiler: async () => {
			return false;
		}
	};
});

vi.mock('../../src/tw/css-to-style.js', () => {
	const styles: Record<string, Record<string, string>> = {
		flex: { display: 'flex' },
		'p-4': { padding: '1rem' },
		'text-red': { color: 'red' }
	};

	return {
		cssToStyle: (_css: string, _theme: unknown, classes: string[]) => {
			const key = classes.join(' ');
			return styles[key] ?? {};
		},
		extractCustomProperties: () => {
			return {};
		}
	};
});

const createElement = (
	type: string | ((...args: unknown[]) => unknown),
	props?: Record<string, unknown>,
	...children: unknown[]
): TwElement => {
	const resolvedChildren =
		children.length === 1
			? children[0]
			: children.length > 0
			? children
			: undefined;

	return {
		type,
		props: { ...props, children: resolvedChildren } as ElementProps,
		key: null
	} as TwElement;
};

describe('tw/transform', () => {
	describe('transformTwElement', () => {
		it('should transform className to style', async () => {
			const element = createElement('div', { className: 'flex' });
			const result = await transformTwElement(element);
			expect(result.props.style).toEqual({ display: 'flex' });
			expect(result.props.className).toEqual(null);
		});

		it('should preserve existing inline style (existing takes priority)', async () => {
			const element = createElement('div', {
				className: 'flex',
				style: { color: 'red', display: 'block' }
			});

			const result = await transformTwElement(element);
			const { style } = result.props;
			expect((style as Record<string, unknown>)?.display).toEqual(
				'block'
			);
			expect((style as Record<string, unknown>)?.color).toEqual('red');
		});

		it('should strip empty values from existing style', async () => {
			const element = createElement('div', {
				className: 'flex',
				style: {
					color: '',
					fontSize: null,
					margin: undefined,
					padding: '2rem'
				}
			});

			const result = await transformTwElement(element);
			const style = result.props.style as Record<string, unknown>;
			expect(style?.display).toEqual('flex');
			expect(style?.padding).toEqual('2rem');
			expect(style?.color).toBeUndefined();
			expect(style?.fontSize).toBeUndefined();
			expect(style?.margin).toBeUndefined();
		});

		it('should recursively transform children', async () => {
			const child = createElement('span', { className: 'p-4' });
			const parent = createElement('div', { className: 'flex' }, child);

			const result = await transformTwElement(parent);
			expect(result.props.style).toEqual({ display: 'flex' });

			const resultChild = result.props.children as TwElement;
			expect(resultChild.props.style).toEqual({ padding: '1rem' });
		});

		it('should return element unchanged when no className and no children changes', async () => {
			const element = createElement('div', { id: 'test' });
			const result = await transformTwElement(element);
			expect(result).toBe(element);
		});

		it('should resolve function components and transform their output', async () => {
			const MyComponent = () => {
				return createElement('div', { className: 'flex' });
			};

			const element = createElement(MyComponent);
			const result = await transformTwElement(element);
			expect(result.props.style).toEqual({ display: 'flex' });
			expect(result.props.className).toEqual(null);
		});

		it('should resolve async function components', async () => {
			const AsyncComponent = async () => {
				return createElement('div', { className: 'p-4' });
			};

			const element = createElement(AsyncComponent);
			const result = await transformTwElement(element);
			expect(result.props.style).toEqual({ padding: '1rem' });
		});

		it('should throw on invalid element from function component', async () => {
			const BadComponent = () => {
				return 42;
			};

			const element = createElement(BadComponent);

			try {
				await transformTwElement(element);

				throw new Error('expected to throw');
			} catch (err) {
				expect((err as Error).message).toEqual('Invalid element');
			}
		});
	});

	describe('transformTwNode', () => {
		it('should return non-element values unchanged', async () => {
			expect(await transformTwNode('hello')).toEqual('hello');
			expect(await transformTwNode(42)).toEqual(42);
			expect(await transformTwNode(null)).toEqual(null);
		});

		it('should transform elements inside array', async () => {
			const elements = [
				createElement('span', { className: 'flex', key: '1' }),
				createElement('span', { className: 'p-4', key: '2' })
			];
			const result = await transformTwNode(elements);

			if (!Array.isArray(result)) {
				throw new Error('expected array');
			}

			const first = result[0] as TwElement;
			const second = result[1] as TwElement;

			expect(first.props.style).toEqual({ display: 'flex' });
			expect(second.props.style).toEqual({ padding: '1rem' });
		});
	});
});
