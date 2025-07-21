import { beforeAll, expect } from 'vitest'
import { join } from 'path'
import { Resvg } from '@resvg/resvg-js'
import { toMatchImageSnapshot } from 'jest-image-snapshot'
import { readFile } from 'node:fs/promises'

import { type SatoriOptions } from '../src/index.js'

export async function getDynamicAsset(text: string): Promise<Buffer> {
  const fontPath = join(process.cwd(), 'test', 'assets', text)
  return await readFile(fontPath)
}

export async function loadDynamicAsset(code: string, text: string) {
  return [
    {
      name: `satori_${code}_fallback_${text}`,
      data: await getDynamicAsset(text),
      weight: 400,
      style: 'normal',
      lang: code === 'unknown' ? undefined : code.split('|')[0],
    },
  ]
}

export function initFonts(callback: (fonts: SatoriOptions['fonts']) => void) {
  beforeAll(async () => {
    const fontPath = join(process.cwd(), 'test', 'assets', 'Roboto-Regular.ttf')
    const fontData = await readFile(fontPath)
    callback([
      {
        name: 'Roboto',
        data: fontData,
        weight: 400,
        style: 'normal',
      },
    ])
  })
}

export function toImage(svg: string, width = 100) {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: width,
    },
    font: {
      // As system fallback font
      fontFiles: [
        join(process.cwd(), 'test', 'assets', 'playfair-display.ttf'),
      ],
      loadSystemFonts: false,
      defaultFontFamily: 'Playfair Display',
    },
  })
  const pngData = resvg.render()
  return pngData.asPng()
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchImageSnapshot(): R
    }
  }
}

expect.extend({ toMatchImageSnapshot })
