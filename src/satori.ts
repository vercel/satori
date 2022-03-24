import type { ReactNode } from 'react'

import { guessLanguage } from 'guesslanguage'

import getYoga, { init } from './yoga'
import layout from './layout'
import FontLoader, { FontOptions } from './font'
import svg from './builder/svg'
import { segment } from './utils'

// We don't need to initialize the opentype instances every time.
const fontCache = new WeakMap()

export interface SatoriOptions {
  width: number
  height: number
  fonts: FontOptions[]
  embedFont?: boolean
  debug?: boolean
  graphemeImages?: Record<string, string>
  // Can be used to dynamically load missing fonts or image for a given segment.
  loadAdditionalAsset?: (
    code: string,
    segment: string
  ) => Promise<FontOptions | string | undefined>
}

export { init }

export default async function satori(
  element: ReactNode,
  options: SatoriOptions
): Promise<string> {
  const Yoga = getYoga()
  if (!Yoga) throw new Error('Satori is not initialized.')

  let font: FontLoader
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
  root.setOverflow(Yoga.OVERFLOW_HIDDEN)

  const graphemeImages = { ...options.graphemeImages }

  const handler = layout(element, {
    id: 'id',
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
    graphemeImages,
    canLoadAdditionalAssets: !!options.loadAdditionalAsset,
  })

  let segmentsMissingFont = handler.next().value as string[]

  if (options.loadAdditionalAsset) {
    if (segmentsMissingFont.length) {
      // Potentially CJK fonts are missing.
      segmentsMissingFont = [
        ...new Set(segment(segmentsMissingFont.join(''), 'grapheme')),
      ]

      const langaugeCodes: Record<string, string[]> = {}
      segmentsMissingFont.forEach((seg) =>
        guessLanguage.detect(seg, (code) => {
          langaugeCodes[code] = langaugeCodes[code] || []
          if (code === 'unknown') {
            langaugeCodes[code].push(seg)
          } else {
            langaugeCodes[code][0] = (langaugeCodes[code][0] || '') + seg
          }
        })
      )

      const fonts: FontOptions[] = []
      const images: Record<string, string> = {}

      await Promise.all(
        Object.entries(langaugeCodes).flatMap(([code, segments]) =>
          segments.map((segment) =>
            options.loadAdditionalAsset(code, segment).then((asset) => {
              if (typeof asset === 'string') {
                images[segment] = asset
              } else if (asset) {
                fonts.push(asset)
              }
            })
          )
        )
      )

      // Directly mutate the font provider and the grapheme map.
      font.addFonts(fonts)
      Object.assign(graphemeImages, images)
    }
  }

  handler.next()
  root.calculateLayout(options.width, options.height, Yoga.DIRECTION_LTR)

  const content = handler.next([0, 0]).value as string

  root.freeRecursive()

  return svg({ width: options.width, height: options.height, content })
}
