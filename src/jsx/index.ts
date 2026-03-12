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
  props?: { key?: JSXKey | undefined | null } & Omit<P, 'children'>,
  ...children: JSXNode[]
): JSXElement<P> {
  if (!props)
    return jsx(type, children.length ? { children } : {}) as JSXElement<P>

  let maybeKey: string | number | bigint | undefined | null
  let restProps: Record<string, unknown>

    // Destructure key from props.
  ;({ key: maybeKey = null, ...restProps } = props)
  const key = maybeKey !== null ? String(maybeKey) : null
  if (children.length) restProps.children = children

  return jsx(type, restProps, key) as JSXElement<P>
}
