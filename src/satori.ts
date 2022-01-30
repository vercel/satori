import type { ReactNode } from 'react'

import Yoga from 'yoga-layout-prebuilt'
import layout from './layout'
import FontLoader, { FontOptions } from './font'
import svg from './builder/svg'

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
  root.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
  root.setFlexWrap(Yoga.WRAP_WRAP)

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
    },
    parent: root,
    font,
  })

  handler.next()
  root.calculateLayout(options.width, options.height, Yoga.DIRECTION_LTR)

  const content = handler.next([0, 0]).value
  return svg({ width: options.width, height: options.height, content })
}
