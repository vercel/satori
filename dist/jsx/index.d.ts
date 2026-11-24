import { F as FC, J as JSXNode, a as JSXElement } from '../jsx-runtime-28d3932e.js';
export { C as CSSProperties, b as Fragment, c as JSX, d as JSXKey } from '../jsx-runtime-28d3932e.js';

/**
 * Create a `ReactElement`-like object.
 *
 * @param type - Tag name string or a function component.
 * @param props - Optional props to create the element with.
 * @param children - Zero or more child nodes.
 * @returns A `ReactElement`-like object with properties like `type`, `key`, `props`, and `props.children`.
 */
declare function createElement<P extends {}>(type: string | FC<P>, props?: P | null, ...children: JSXNode[]): JSXElement<P>;

export { FC, JSXElement, JSXNode, createElement };
