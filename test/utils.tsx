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

/**
 * Renders an SVG to a PNG of a width with Sharp, which draws SVG with librsvg.
 *
 * Text that isn't embedded, in `<text>` elements, is drawn with resvg and the
 * fonts of the tests instead: Sharp finds fonts with CoreText on macOS and
 * fontconfig on Linux, so the images would differ between platforms.
 */
export async function toImage(svg: string, width = 100) {
  if (/<text[\s>]/.test(svg)) return toImageWithResvg(svg, width)

  // librsvg only decodes embedded PNG, JPEG and SVG images, so other formats
  // are transcoded to PNG.
  const dataUris =
    svg.match(/data:image\/(webp|gif|avif|tiff|heif);base64,[^"']+/g) || []
  for (const dataUri of dataUris) {
    const data = Buffer.from(dataUri.slice(dataUri.indexOf(',') + 1), 'base64')
    const png = await Sharp(data).png().toBuffer()
    svg = svg.replace(
      dataUri,
      `data:image/png;base64,${png.toString('base64')}`
    )
  }

  // Rendered at the size of the image, instead of resizing it from 72 DPI.
  // The height is rounded up, like with resvg.
  const svgWidth = Number(/<svg[^>]*?\swidth="([\d.]+)"/.exec(svg)?.[1])
  const svgHeight = Number(/<svg[^>]*?\sheight="([\d.]+)"/.exec(svg)?.[1])
  const scale = svgWidth > 0 ? width / svgWidth : 1
  return Sharp(Buffer.from(svg), { density: 72 * scale })
    .resize({
      width,
      height: svgHeight > 0 ? Math.ceil(svgHeight * scale) : undefined,
      fit: 'fill',
    })
    .png()
    .toBuffer()
}

function toImageWithResvg(svg: string, width: number) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: {
      fontFiles: [
        join(process.cwd(), 'test', 'assets', 'playfair-display.ttf'),
      ],
      loadSystemFonts: false,
      defaultFontFamily: 'Playfair Display',
    },
  })
  return resvg.render().asPng()
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchImageSnapshot(): R
    }
  }
}

expect.extend({ toMatchImageSnapshot })
