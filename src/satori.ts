import type { ReactNode } from 'react'

import Yoga from 'yoga-layout-prebuilt'
import layout from './layout'
import FontLoader, { FontOptions } from './font'

interface SatoriOptions {
  width: number
  height: number
  fonts: FontOptions[]
}

export default function satori(
  element: ReactNode,
  options: SatoriOptions
): string {
  const font = new FontLoader(options.fonts)

  const root = Yoga.Node.create()
  root.setWidth(options.width)
  root.setHeight(options.height)
  root.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
  root.setFlexWrap(Yoga.WRAP_WRAP)

  const handler = layout(element, {
    id: 0,
    inheritedStyle: {
      fontSize: 16,
      fontWeight: 'normal',
      fontFamily: 'serif',
      fontStyle: 'normal',
      lineHeight: 1.2,
      color: 'black',
    },
    parent: root,
    font,
  })

  handler.next()
  root.calculateLayout(options.width, options.height, Yoga.DIRECTION_LTR)
  return handler.next().value
}
