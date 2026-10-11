import { describe, it, expect, vi } from 'vitest'

import satori from '../src/index.js'
import { initFonts } from './utils.js'

// HarfBuzz measures offsets in font units with the y axis pointing up. The
// shaper is wrapped to move "I" up and "L" down by 1000 units. "H", "I" and "L"
// all have their tops at the cap height of Roboto.
const offsets: Record<string, number> = { I: 1000, L: -1000 }

vi.mock('../src/harfbuzz.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/harfbuzz.js')>()
  return {
    ...original,
    shapeText: (
      ...args: Parameters<typeof original.shapeText>
    ): ReturnType<typeof original.shapeText> =>
      original
        .shapeText(...args)
        .map((glyph) => ({ ...glyph, dy: offsets[args[1]] ?? glyph.dy })),
  }
})

describe('HarfBuzz vertical offset', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const top = async (text: string) => {
    const svg = await satori(
      <div style={{ fontSize: 100, fontFamily: 'Roboto' }}>{text}</div>,
      { width: 200, height: 200, fonts }
    )
    const d = svg.match(/<path[^>]* d="([^"]+)"/)![1]
    const ys = d
      .match(/-?\d+(\.\d+)?/g)!
      .map(Number)
      .filter((_, i) => i % 2 === 1)
    return Math.min(...ys)
  }

  it('should move a glyph up for a positive y offset', async () => {
    const base = await top('H')
    const raised = await top('I')
    const lowered = await top('L')

    // Roboto has 2048 units per em, so 1000 units are 1000 / 2048 * 100px.
    const delta = (1000 / 2048) * 100
    expect(base - raised).toBeCloseTo(delta, 0)
    expect(lowered - base).toBeCloseTo(delta, 0)
  })
})
