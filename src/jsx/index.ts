import { jsx } from './jsx-runtime.ts'
import type { JSXNode, FC } from './types.ts'

export type * from './types.ts'

export function createElement(
  type: string | FC,
  props: Record<string, any> = {},
  ...children: JSXNode[]
): JSXNode {
  props.children = children
  return jsx(type, props)
}
