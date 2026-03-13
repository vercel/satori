/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-interface */
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
import type { JSXElement, JSXKey, FC } from './types.js'
import type { IntrinsicElements as DefinedIntrinsicElements } from './intrinsic-elements.js'

export namespace JSX {
  /**
   * **WARNING**: Satori does not support class components.
   * @see {@link https://github.com/vercel/satori?tab=readme-ov-file#jsx Satori JSX documentation}
   */
  export type ElementClass = never

  export type ElementType = string | FC<any>

  export type Element = JSXElement<any, any>

  export interface ElementAttributesProperty {
    props: {}
  }

  export interface ElementChildrenAttribute {
    children: {}
  }

  // TODO: define IntrinsicElements supported by Satori.
  export interface IntrinsicElements extends DefinedIntrinsicElements {}

  export interface IntrinsicAttributes {
    /** **INFO**: Allowed as prop, but will be ignored by Satori. */
    key?: JSXKey | undefined | null
  }
}

export function jsx(
  type: string | FC<any>,
  props: Record<string, unknown>,
  key?: JSXKey | undefined | null
): JSXElement {
  if ('key' in props) {
    // Destructure spread key from props.
    const { key: keyProp, ...restProps } = props
    // Key param takes precedence over spread key prop.
    key = arguments.length === 3 ? key : (keyProp as JSXKey)
    // Shallow copy of props without key.
    props = restProps
  }
  // Coerce key to string if not nullish.
  key = key != null ? String(key) : null
  return { type, props, key }
}

export const jsxs = jsx
export const jsxDEV = jsx

// HACK: Symbol used internally by React.
export const Fragment = Symbol.for('react.fragment')
