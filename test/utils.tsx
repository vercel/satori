import { beforeAll, expect } from 'vitest'
import { join } from 'path'
import { Resvg } from '@resvg/resvg-js'
import { toMatchImageSnapshot } from 'jest-image-snapshot'
import { readFile } from 'node:fs/promises'
import Sharp from 'sharp'

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

export async function toImageWithSharp(svg: string, width = 100) {
  const webpDataUris = svg.match(/data:image\/webp;base64,[^"']+/g) || []

  for (const dataUri of webpDataUris) {
    // Sharp's SVG decoder cannot decode embedded WebP, so transcode the payload.
    const webp = Buffer.from(dataUri.slice(dataUri.indexOf(',') + 1), 'base64')
    const png = await Sharp(webp).png().toBuffer()
    svg = svg.replace(
      dataUri,
      `data:image/png;base64,${png.toString('base64')}`
    )
  }

  return Sharp(Buffer.from(svg)).resize({ width }).png().toBuffer()
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchImageSnapshot(): R
    }
  }
}

expect.extend({ toMatchImageSnapshot })
