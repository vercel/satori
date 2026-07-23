import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { resolveImageData } from '../src/handler/image.js'
import { toImageWithSharp } from './utils.js'

const WEBP_CASES = [
  [
    'lossy VP8',
    'UklGRmAAAABXRUJQVlA4IFQAAACwAwCdASoQAAwAAUAmJagCdLoB+AEsA/gGEAf0D2/7sABrDa6PmAD+69YSX0VP1m2zOaCWH0/Vm/kIT0IX7ZP/3G/+y0eDDZFghrpQuik297ZQAAA=',
    16,
    12,
  ],
  [
    'lossless VP8L',
    'UklGRkoAAABXRUJQVlA4TD4AAAAvDUACAB8gECBibCtw50YsmFzTyR8rBDVtGzBgOokXZZ/5D8bclQZqAgBp2KsfeSCPJT2pENH/gH11/2m9AQ==',
    14,
    10,
  ],
  [
    'extended VP8X',
    'UklGRtIAAABXRUJQVlA4WAoAAAAQAAAAEQAACwAAQUxQSB0AAAABD3BA8IiIYCAAETTJJ598MqwJEf0vgn0tNyR6WwBWUDggjgAAALAEAJ0BKhIADAA+bSySRaQioZgEAEAGxLYATplCPBt4GCgeu3SmYGmwHOwCcEAA/tjrbG65qswPARCYYoQoS37cZNU8FZ/k39r6YQdu3E5ODv/Ssfo/7mP97/8Pq/+oY/VPTs39G+sI//xTnH36rd7pl3eyR2q/jaapbKvV0b7gyMriK3s6o7H88f0AAAA=',
    18,
    12,
  ],
] as const

function decodeBase64(data: string) {
  return Uint8Array.from(atob(data), (char) => char.charCodeAt(0)).buffer
}

describe('WebP images', () => {
  it.each(WEBP_CASES)('renders %s images', async (_, data, width, height) => {
    const svg = await satori(<img src={`data:image/webp;base64,${data}`} />, {
      width,
      height,
      fonts: [],
    })
    expect(await toImageWithSharp(svg, width * 10)).toMatchImageSnapshot()
  })

  it.each(WEBP_CASES)(
    'resolves %s dimensions from a data URI',
    async (_, data, width, height) => {
      const src = `data:image/webp;base64,${data}`
      await expect(resolveImageData(src)).resolves.toEqual([src, width, height])
    }
  )

  it.each(WEBP_CASES)(
    'resolves %s dimensions from an ArrayBuffer',
    async (_, data, width, height) => {
      const result = await resolveImageData(decodeBase64(data))
      expect(result.slice(1)).toEqual([width, height])
      expect(result[0]).toMatch(/^data:image\/webp;base64,/)
    }
  )

  it('rejects truncated WebP data', async () => {
    const truncated = decodeBase64('UklGRgQAAABXRUJQ')
    await expect(resolveImageData(truncated)).rejects.toThrow('Invalid WebP')
  })
})
