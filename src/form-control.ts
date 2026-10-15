/**
 * The content of form controls, which browsers render without elements.
 */

import type { ReactElement } from 'react'
import type FontLoader from './font.js'

/** The style of the placeholder of an input, from stylesheets. */
export const PLACEHOLDER_PROP = '__satoriPlaceholder'

/** The types of inputs whose value is text. */
const TEXT_INPUTS = new Set([
  '',
  'text',
  'email',
  'search',
  'url',
  'tel',
  'password',
  'number',
])

const element = (type: string, props: Record<string, unknown>) =>
  ({ type, key: null, props } as unknown as ReactElement)

/**
 * The content of an `<input>`, like in browsers: the value of a text input,
 * or else its placeholder, on a line that's vertically centered and clipped.
 * By default, the line is `size` average characters wide. Other inputs have
 * no content.
 */
export function getInputContent(
  props: Record<string, any>,
  style: Record<string, any>,
  font: FontLoader
): ReactElement[] {
  const type = String(props.type ?? '').toLowerCase()
  if (!TEXT_INPUTS.has(type)) return []

  const value = props.value ?? props.defaultValue
  let text = value === undefined || value === null ? '' : String(value)
  text = text.replace(/[\r\n]/g, '')
  if (type === 'password') text = '\u2022'.repeat([...text].length)
  const placeholder =
    !text && props.placeholder !== undefined && props.placeholder !== null
      ? String(props.placeholder).replace(/[\r\n]/g, '')
      : undefined

  const size = parseInt(props.size, 10)
  const width = Math.ceil(
    (size > 0 ? size : 20) *
      (font.getAverageCharRatio(style) ?? 0.5) *
      (style.fontSize as number)
  )
  return [
    element('::input', {
      style: {
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        overflow: 'hidden',
      },
      children: element('::input-text', {
        style: {
          // The width is the intrinsic width of the input, but the line
          // fits the input otherwise.
          width: `${width}px`,
          flexGrow: 1,
          flexShrink: 1,
          minWidth: 0,
          // An empty input is as tall as a line.
          minHeight: '1lh',
          whiteSpace: 'pre',
          ...(placeholder === undefined
            ? undefined
            : { color: '#757575', ...props[PLACEHOLDER_PROP] }),
        },
        children: placeholder ?? text,
      }),
    }),
  ]
}
