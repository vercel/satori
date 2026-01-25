import { it, describe, expect } from 'vitest'

import { initFonts } from './utils.js'
import satori from '../src/index.js'

describe('embedFont: false', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should have consistent x positions for multi-line text', async () => {
    // This test verifies that when embedFont is false, consecutive text elements
    // have consistent x positions (x[n] should equal x[n-1] + width[n-1]).
    //
    // Regression test for: src/text/index.ts rounding leftOffset to integers
    // and using inconsistent width measurements (measureGrapheme vs measureText).
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          fontFamily: 'Roboto',
          fontSize: 16,
          width: 200,
        }}
      >
        Hello world this is a test of text wrapping behavior
      </div>,
      {
        width: 200,
        height: 100,
        fonts,
        embedFont: false,
      }
    )

    // Parse all <text> elements from the SVG
    const textElementRegex =
      /<text[^>]*\bx="([^"]+)"[^>]*\bwidth="([^"]+)"[^>]*>([^<]*)<\/text>/g
    const textElements: { x: number; width: number; content: string }[] = []

    let match
    while ((match = textElementRegex.exec(svg)) !== null) {
      textElements.push({
        x: parseFloat(match[1]),
        width: parseFloat(match[2]),
        content: match[3],
      })
    }

    expect(textElements.length).toBeGreaterThan(1)

    // Check consecutive elements on the same line
    // The x position of each element should equal the previous element's x + width
    let maxGap = 0

    for (let i = 1; i < textElements.length; i += 1) {
      const prev = textElements[i - 1]
      const curr = textElements[i]

      const expectedX = prev.x + prev.width
      const gap = Math.abs(curr.x - expectedX)

      // Only check elements that appear to be on the same line (small gap)
      // Large gaps indicate line breaks
      if (gap < 50) {
        maxGap = Math.max(maxGap, gap)
      }
    }

    // The gap between consecutive elements should be negligible (< 0.01px)
    expect(maxGap).toBeLessThan(0.01)
  })
})
