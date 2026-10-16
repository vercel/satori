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

/** The types of button inputs, and their labels without a value. */
const BUTTON_INPUTS: Record<string, string> = {
  submit: 'Submit',
  reset: 'Reset',
  button: '',
}

const element = (type: string, props: Record<string, unknown>) =>
  ({ type, key: null, props } as unknown as ReactElement)

/**
 * The content of an `<input>`, like in browsers: the value of a text input,
 * or else its placeholder, on a line that's vertically centered and clipped.
 * By default, the line is `size` average characters wide. Button inputs show
 * their value, or a default label, on a centered line. Other inputs have no
 * content.
 */
export function getInputContent(
  props: Record<string, any>,
  style: Record<string, any>,
  font: FontLoader
): ReactElement[] {
  const type = String(props.type ?? '').toLowerCase()
  if (Object.prototype.hasOwnProperty.call(BUTTON_INPUTS, type)) {
    const value = props.value ?? props.defaultValue
    const label = (
      value === undefined || value === null
        ? BUTTON_INPUTS[type]
        : String(value)
    ).replace(/[\r\n]/g, '')
    if (!label) return []
    return [
      element('::input', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          overflow: 'hidden',
        },
        children: element('::input-text', {
          style: { whiteSpace: 'pre' },
          children: label,
        }),
      }),
    ]
  }
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

interface SelectOption {
  label: string
  value: string
  selected: boolean
  disabled: boolean
  /** Whether the option is in an `<optgroup>`. */
  grouped: boolean
}

type SelectRow =
  | { kind: 'group'; label: string }
  | { kind: 'option'; option: SelectOption }

const REACT_FRAGMENT = Symbol.for('react.fragment')

/** Whether a boolean attribute is set, like `selected` or `disabled`. */
const isSet = (value: unknown) =>
  value !== undefined && value !== null && value !== false

/** The text of an element's children. */
function textContent(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return ''
  }
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textContent).join('')
  return textContent((node as ReactElement).props?.children)
}

const collapse = (text: string) => text.replace(/[ \t\n\f\r]+/g, ' ').trim()

/** Whether a select is a list box, rather than a drop-down. */
export function isListBox(props: Record<string, any>) {
  return isSet(props?.multiple) || parseInt(props?.size, 10) > 1
}

/**
 * The options and groups of a select, and which options are selected, like in
 * browsers: the options with `selected`, or the ones with the `value` or
 * `defaultValue` of the select, as in React. Only one is selected in a
 * select without `multiple`: the last one, or else the first one that isn't
 * disabled in a drop-down.
 */
function getSelectRows(props: Record<string, any>): SelectRow[] {
  const rows: SelectRow[] = []
  const visit = (node: unknown, group?: { disabled: boolean }) => {
    if (Array.isArray(node)) {
      for (const child of node) visit(child, group)
      return
    }
    if (!node || typeof node !== 'object' || !('type' in node)) return
    const { type, props: childProps = {} } = node as ReactElement<any>
    if (type === 'option') {
      const text = collapse(textContent(childProps.children))
      const label =
        typeof childProps.label === 'string' && childProps.label
          ? childProps.label
          : text
      rows.push({
        kind: 'option',
        option: {
          label,
          value: isSet(childProps.value) ? String(childProps.value) : text,
          selected: isSet(childProps.selected),
          disabled: isSet(childProps.disabled) || !!group?.disabled,
          grouped: !!group,
        },
      })
    } else if (type === 'optgroup' && !group) {
      rows.push({ kind: 'group', label: String(childProps.label ?? '') })
      visit(childProps.children, { disabled: isSet(childProps.disabled) })
    } else if ((type as unknown) === REACT_FRAGMENT) {
      visit(childProps.children, group)
    }
  }
  visit(props.children)

  const options = rows.flatMap((row) =>
    row.kind === 'option' ? [row.option] : []
  )
  const value = props.value ?? props.defaultValue
  if (value !== undefined && value !== null) {
    const values = new Set([].concat(value).map(String))
    for (const option of options) option.selected = values.has(option.value)
  }
  if (!isSet(props.multiple)) {
    const last = options.findLastIndex((option) => option.selected)
    options.forEach((option, i) => (option.selected = i === last))
    if (last === -1 && !isListBox(props)) {
      const first = options.find((option) => !option.disabled)
      if (first) first.selected = true
    }
  }
  return rows
}

/** The arrow of a drop-down, like the one of Chrome. */
const ARROW = element('svg', {
  width: 9,
  height: 6,
  viewBox: '0 0 9 6',
  fill: 'none',
  children: element('path', {
    d: 'M1 1l3.5 3.5L8 1',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }),
})

/**
 * The content of a `<select>`, like in Chrome. A drop-down shows its selected
 * option, as wide as its widest option, and an arrow, unless its `appearance`
 * is `none`. A list box shows `size` rows of options, 4 with `multiple`, and
 * highlights the selected ones.
 */
export function getSelectContent(
  props: Record<string, any>,
  style: Record<string, any>
): ReactElement[] {
  const rows = getSelectRows(props)
  const line = { whiteSpace: 'pre', overflow: 'hidden' }

  if (isListBox(props)) {
    const size = parseInt(props.size, 10)
    const count = size > 0 ? size : 4
    const children = rows.map((row, i) => {
      const option = row.kind === 'option' ? row.option : undefined
      return element('::option', {
        style: {
          ...line,
          flexShrink: 0,
          minHeight: '1.2em',
          padding: '0 2px 1px',
          ...(row.kind === 'group' ? { fontWeight: 'bold' } : undefined),
          ...(option?.grouped ? { paddingLeft: 20 } : undefined),
          ...(option?.disabled ? { color: '#808080' } : undefined),
          ...(option?.selected
            ? { backgroundColor: '#cecece', color: '#101010' }
            : undefined),
          // Rows after the visible ones are still as wide as they are.
          ...(i >= count ? { height: 0, minHeight: 0, padding: 0 } : undefined),
        },
        children: row.kind === 'group' ? row.label : option.label,
      })
    })
    // Empty rows fill the list box.
    for (let i = rows.length; i < count; i++) {
      children.push(
        element('::option', {
          style: { flexShrink: 0, minHeight: '1.2em', paddingBottom: 1 },
        })
      )
    }
    return [
      element('::select', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        },
        children,
      }),
    ]
  }

  const options = rows.flatMap((row) =>
    row.kind === 'option' ? [row.option] : []
  )
  const selected = options.find((option) => option.selected)
  const appearance = String(
    style.appearance ?? style.WebkitAppearance ?? 'auto'
  ).toLowerCase()
  const hasArrow = appearance !== 'none'
  return [
    element('::select', {
      style: {
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        ...(hasArrow ? { padding: '1px 0 1px 4px' } : undefined),
      },
      children: [
        element('::select-text', {
          style: {
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            flexShrink: 1,
            minWidth: 0,
            overflow: 'hidden',
          },
          children: [
            element('::option', {
              style: { ...line, minHeight: '1lh' },
              children: selected?.label ?? '',
            }),
            // Every option, without a height, makes the drop-down as wide as
            // the widest one. Options in groups are indented in the menu.
            ...options.map((option) =>
              element('::option', {
                style: {
                  ...line,
                  height: 0,
                  ...(option.grouped ? { paddingLeft: '1.1em' } : undefined),
                },
                children: option.label,
              })
            ),
          ],
        }),
        ...(hasArrow
          ? [
              element('::select-arrow', {
                style: {
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                  width: 12,
                  paddingRight: 3,
                  // Chrome draws the arrow at the end of the padding box.
                  ...(typeof style.paddingRight === 'number'
                    ? { position: 'relative', left: style.paddingRight }
                    : undefined),
                },
                children: ARROW,
              }),
            ]
          : []),
      ],
    }),
  ]
}
