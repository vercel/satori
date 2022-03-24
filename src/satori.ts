import type { ReactNode } from 'react'

import { guessLanguage } from 'guesslanguage'

import getYoga, { init } from './yoga'
import layout from './layout'
import FontLoader, { FontOptions } from './font'
import svg from './builder/svg'
import { segment } from './utils'

// @TODO: Support font style and weights, and make this option extensible rather
// than built-in.
// @TODO: Cover most languages with Noto Sans.
// @TODO: Fix CJK missing punctuations, maybe inline guessLanguage?
const languageFontMap = {
  zh: 'Noto+Sans+SC',
  ja: 'Noto+Sans+JP',
  ko: 'Noto+Sans+KR',
  th: 'Noto+Sans+Thai',
  unknown: 'Noto+Sans',
}
async function loadDynamicGoogleFont(
  code: string,
  text: string
): Promise<FontOptions> {
  if (!languageFontMap[code]) code = 'unknown'

  try {
    const data = await (
      await fetch(
        `/api/font?font=${encodeURIComponent(
          languageFontMap[code]
        )}&text=${encodeURIComponent(text)}`
      )
    ).arrayBuffer()

    if (data) {
      return {
        name: `satori_${code}_fallback_${text}`,
        data,
        weight: 400,
        style: 'normal',
      }
    }
  } catch (e) {
    console.error('Failed to load dynamic font for', text, '. Error:', e)
  }
}

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
    graphemeImages: options.graphemeImages,
  })

  let segmentsMissingFont = handler.next([1, 1]).value as string[]
  if (segmentsMissingFont.length) {
    // Potentially CJK fonts are missing.
    segmentsMissingFont = [
      ...new Set(segment(segmentsMissingFont.join(''), 'grapheme')),
    ]

    const langaugeCodes: Record<string, string[]> = {}
    segmentsMissingFont.forEach((seg) =>
      guessLanguage.detect(seg, (code) => {
        langaugeCodes[code] = langaugeCodes[code] || []
        langaugeCodes[code].push(seg)
      })
    )

    font.addFonts(
      (
        await Promise.all(
          Object.entries(langaugeCodes).map(([code, segments]) =>
            loadDynamicGoogleFont(code, segments.join(''))
          )
        )
      ).filter(Boolean)
    )
  }

  handler.next()
  root.calculateLayout(options.width, options.height, Yoga.DIRECTION_LTR)

  const content = handler.next([0, 0]).value as string

  root.freeRecursive()

  return svg({ width: options.width, height: options.height, content })
}
