import { describe, expect, it, vi } from 'vitest';

import type { ElementProps, TwElement } from '../../src/tw';
import { transformTwElement, transformTwNode } from '../../src/tw';

vi.mock('../../src/tw/compiler', () => {
	return {
		buildCss: () => {
			return '';
		},
		initCompiler: async () => {
			return false;
		}
	};
});

vi.mock('../../src/tw/css-to-style', () => {
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
	describe('transformtwelement', () => {
		it('should transform classname to style', async () => {
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

		it('should return element unchanged when no classname and no children changes', async () => {
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

		it('should call ontailwind with classname and computed style', async () => {
			const onTailwind = vi.fn();
			const element = createElement('div', { className: 'flex' });
			await transformTwElement(element, onTailwind);

			expect(onTailwind).toHaveBeenCalledOnce();
			expect(onTailwind).toHaveBeenCalledWith('flex', {
				display: 'flex'
			});
		});

		it('should call ontailwind for each element with a classname', async () => {
			const onTailwind = vi.fn();
			const child = createElement('span', { className: 'p-4' });
			const parent = createElement('div', { className: 'flex' }, child);

			await transformTwElement(parent, onTailwind);

			expect(onTailwind).toHaveBeenCalledTimes(2);
			expect(onTailwind).toHaveBeenCalledWith('flex', {
				display: 'flex'
			});
			expect(onTailwind).toHaveBeenCalledWith('p-4', { padding: '1rem' });
		});

		it('should not call ontailwind when element has no classname', async () => {
			const onTailwind = vi.fn();
			const element = createElement('div', { id: 'test' });
			await transformTwElement(element, onTailwind);

			expect(onTailwind).not.toHaveBeenCalled();
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

	describe('transformtwnode', () => {
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
