import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import satori from '../src/index.js'
import { resolveImageData } from '../src/handler/image.js'

describe('PNG dimensions', () => {
  it.each([
    [20, 15],
    [65535, 1],
    [1, 65535],
    [65536, 1],
    [1, 65536],
    [65537, 2],
    [2, 65537],
  ])('resolves a %i by %i PNG', async (width, height) => {
    const png = await sharp({
      create: { width, height, channels: 4, background: '#ff0000' },
    })
      .png()
      .toBuffer()
    const src = `data:image/png;base64,${png.toString('base64')}`

    await expect(resolveImageData(src)).resolves.toEqual([src, width, height])
    const buffer = Uint8Array.from(png).buffer
    await expect(resolveImageData(buffer)).resolves.toEqual([
      src,
      width,
      height,
    ])
  })

  it('preserves the aspect ratio of a tall PNG when rendering', async () => {
    const png = await sharp({
      create: {
        width: 2,
        height: 65538,
        channels: 4,
        background: '#ff0000',
      },
    })
      .png()
      .toBuffer()
    const nodes: { type: string; width: number; height: number }[] = []

    await satori(
      <img
        src={`data:image/png;base64,${png.toString('base64')}`}
        height={65538}
      />,
      {
        width: 100,
        height: 65538,
        fonts: [],
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const image = nodes.find((node) => node.type === 'img')
    expect(image.height).toBe(65538)
    expect(image.width).toBe(2)
  })
})
