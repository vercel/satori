import type { ReactElement, ReactNode } from 'react'

import { isClass, isForwardRefComponent, isReactComponent } from '../utils.js'

/** Elements whose content is text, so their inner HTML is text too. */
const RAW_TEXT_ELEMENTS = new Set(['style', 'script'])

/**
 * Renders the components of an element tree, so that it only has intrinsic
 * elements, fragments and text. Components are required to be pure, so they
 * can be rendered once before layout, which then knows the whole tree, and
 * sibling components are rendered concurrently.
 */
export async function resolveComponents(node: ReactNode): Promise<ReactNode> {
  if (node === null || typeof node !== 'object') return node
  if (Array.isArray(node)) return Promise.all(node.map(resolveComponents))

  const element = node as ReactElement
  const { type, props } = element

  if (isReactComponent(type)) {
    if (isClass(type as Function)) {
      throw new Error('Class component is not supported.')
    }
    // This is a hack to support React.forwardRef wrapped components.
    // https://github.com/vercel/satori/issues/600
    const render = isForwardRefComponent(type) ? (type as any).render : type
    return resolveComponents(await render(props))
  }

  if (!props) return element

  if (
    RAW_TEXT_ELEMENTS.has(type as string) &&
    props.dangerouslySetInnerHTML !== undefined
  ) {
    const { dangerouslySetInnerHTML, ...rest } = props
    return {
      ...element,
      props: {
        ...rest,
        children: String(dangerouslySetInnerHTML?.__html ?? ''),
      },
    }
  }

  if (props.children === undefined) return element
  return {
    ...element,
    props: { ...props, children: await resolveComponents(props.children) },
  }
}
