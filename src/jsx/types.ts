/**
 * @file
 * These types are adapted from React v19.1
 *
 * @see {@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/index.d.ts `@types/react`}
 */
export type { CSSProperties } from './intrinsic-elements.ts'

export interface JSXElement<
  P = unknown,
  T extends string | FC<P> = string | FC<P>
> {
  type: T
  props: P
  key: string | null
}

type AwaitedJSXNode =
  | JSXElement
  | string
  | number
  | bigint
  | Iterable<JSXNode>
  | boolean
  | null
  | undefined

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
  | Promise<AwaitedJSXNode>

export type FC<P = {}> = (props: P) => JSXNode | Promise<JSXNode>
