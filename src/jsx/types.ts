/**
 * @file
 * These types are adapted from React v19.1
 *
 * @see {@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/index.d.ts `@types/react`}
 */
export type { CSSProperties } from './intrinsic-elements.js'

export type JSXKey = string | number | bigint

/**
 * Represents a JSX element.
 *
 * Where {@link JSXNode} represents everything that can be rendered,
 * `JSXElement` only represents JSX.
 *
 * @template P The type of the props object
 * @template T The type of the component or tag
 *
 * @example
 *
 * ```tsx
 * const element: JSXElement = <div />;
 * ```
 */
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

/**
 * Represents all of the things React can render.
 *
 * Where {@link JSXElement} only represents JSX, `JSXNode` represents
 * everything that can be rendered.
 *
 * @see {@link https://react-typescript-cheatsheet.netlify.app/docs/react-types/reactnode/ React TypeScript Cheatsheet}
 *
 * @example
 *
 * ```tsx
 * // Typing children
 * type Props = { children: JSXNode }
 *
 * const Component = ({ children }: Props) => <div>{children}</div>
 *
 * <Component>hello</Component>
 * ```
 *
 * @example
 *
 * ```tsx
 * // Typing a custom element
 * type Props = { customElement: JSXNode }
 *
 * const Component = ({ customElement }: Props) => <div>{customElement}</div>
 *
 * <Component customElement={<div>hello</div>} />
 * ```
 */
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

/**
 * Represents the type of a function component. Can optionally receive a type
 * argument that represents the props the component receives.
 *
 * @template P The props the component accepts.
 * @see {@link https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/function_components React TypeScript Cheatsheet}
 *
 * @example
 *
 * ```tsx
 * // With props:
 * type Props = { name: string }
 *
 * const MyComponent: FC<Props> = (props) => {
 *  return <div>{props.name}</div>
 * }
 * ```
 *
 * @example
 *
 * ```tsx
 * // Without props:
 * const MyComponentWithoutProps: FC = () => {
 *   return <div>MyComponentWithoutProps</div>
 * }
 * ```
 */
export type FC<P = {}> = (props: P) => JSXNode | Promise<JSXNode>
