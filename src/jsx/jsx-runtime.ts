/**
 * @file
 * Minimal JSX runtime for Satori.
 *
 * Use the `@jsxImportSource` pragma directive in files containing JSX for Satori.
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/jsx.html TypeScript: JSX reference}
 * @see {@link https://www.typescriptlang.org/tsconfig/#jsxImportSource TSConfig: using "jsxImportSource" or `@jsxImportSource` pragma directive}
 * @see {@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/index.d.ts React typings `@types/react`}
 * @see {@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/jsx-runtime.d.ts React typings for `jsx-runtime`}
 */

// Adapted from React v19.1 `ReactElement`.
export interface JSXElement<
  P = unknown,
  T extends string | FC<P> = string | FC<P>
> {
  type: T
  props: P
  key: string | null
}

// Adapted from React v19.1 `ReactNode`.
export type JSXNode =
  | JSXElement
  | string
  | number
  | bigint
  | Iterable<JSXNode>
  | boolean
  | null
  | undefined

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = Record<string, any>

// Adapted from React v19.1 `React.FC`.
export type FC<P = {}> = (props: P) => JSXNode

export namespace JSX {
  /**
   * **WARNING**: Satori does not support class components.
   * @see {@link https://github.com/vercel/satori?tab=readme-ov-file#jsx Satori JSX documentation}
   */
  export type ElementClass = never

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type ElementType = string | FC<any>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Element = JSXElement<any, any>

  export interface ElementAttributesProperty {
    props: Props
  }

  export interface ElementChildrenAttribute {
    children: JSXNode
  }

  // TODO: define IntrinsicElements supported by Satori.
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface IntrinsicElements extends globalThis.JSX.IntrinsicElements {}

  export interface IntrinsicAttributes {
    /** **INFO**: Allowed as prop, but will be ignored by Satori. */
    key?: string | number | bigint | undefined | null
  }
}

export function jsx(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type: string | FC<any>,
  props: unknown,
  key: string | null = null
): JSXNode {
  if (typeof type === 'function') return type(props)
  return { type, props, key }
}

export function createElement(
  type: string | FC,
  props: Props = {},
  ...children: JSXNode[]
): JSXNode {
  props.children = children
  return jsx(type, props)
}

export const jsxs = jsx
export const jsxDEV = jsx
export function Fragment(props: { children?: JSXNode }) {
  return props.children
}
