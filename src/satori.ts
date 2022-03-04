import type { ReactNode } from 'react'

import getYoga, { init } from './yoga'
import layout from './layout'
import FontLoader, { FontOptions } from './font'
import svg from './builder/svg'

// We don't need to initialize the opentype instances every time.
const fontCache = new WeakMap()

export interface SatoriOptions {
  width: number
  height: number
  fonts: FontOptions[]
  embedFont?: boolean
  debug?: boolean
  graphemeImages?: Record<string, string>
}

export { init }

export default function satori(
  element: ReactNode,
  options: SatoriOptions
): string {
  const Yoga = getYoga()
  if (!Yoga) throw new Error('Satori is not initialized.')

  let font
  if (fontCache.has(options.fonts)) {
    font = fontCache.get(options.fonts)
  } else {
    fontCache.set(options.fonts, (font = new FontLoader(options.fonts)))
  }

  const root = Yoga.Node.create()
  root.setWidth(options.width)
  root.setHeight(options.height)
  root.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
  root.setFlexWrap(Yoga.WRAP_WRAP)
  root.setAlignContent(Yoga.ALIGN_AUTO)
  root.setAlignItems(Yoga.ALIGN_FLEX_START)
  root.setJustifyContent(Yoga.JUSTIFY_FLEX_START)

  const handler = layout(element, {
    id: 1,
    parentStyle: {},
    inheritedStyle: {
      fontSize: 16,
      fontWeight: 'normal',
      fontFamily: 'serif',
      fontStyle: 'normal',
      lineHeight: 1.2,
      color: 'black',
      opacity: 1,
      whiteSpace: 'normal',

      // Special style properties:
      _viewportWidth: options.width,
      _viewportHeight: options.height,
    },
    parent: root,
    font,
    embedFont: options.embedFont,
    debug: options.debug,
    graphemeImages: options.graphemeImages,
  })

  handler.next()
  root.calculateLayout(options.width, options.height, Yoga.DIRECTION_LTR)

  const content = handler.next([0, 0]).value

  root.freeRecursive()

  return svg({ width: options.width, height: options.height, content })
}
