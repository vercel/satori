import { jsx } from './jsx-runtime.ts'
import type { JSXNode, JSXElement, JSXKey, FC } from './types.ts'

export type * from './types.ts'
export { Fragment, type JSX } from './jsx-runtime.ts'

/**
 * Create a `ReactElement`-like object.
 *
 * @param type - Tag name string or a function component.
 * @param props - Optional props to create the element with.
 * @param children - Zero or more child nodes.
 * @returns A `ReactElement`-like object with properties like `type`, `key`, `props`, and `props.children`.
 */
export function createElement<P extends {}>(
  type: string | FC<P>,
  props?: P | null,
  ...children: JSXNode[]
): JSXElement<P> {
  if (!props) {
    const newProps = children.length ? { children } : {}
    return jsx(type, newProps, null) as JSXElement<P>
  }

  // Destructure key from props.
  const { key, ...restProps } = props as {
    key?: JSXKey | undefined | null
    [x: string]: unknown
  }
  // Pass children as props.
  if (children.length) restProps.children = children

  return jsx(type, restProps, key) as JSXElement<P>
}
