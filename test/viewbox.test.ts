import { it, describe, expect } from 'vitest'

import { parseViewBox } from '../src/utils.js'
import { resolveImageData } from '../src/handler/image.js'

describe('parseViewBox', () => {
  it('should split on commas and spaces', () => {
    expect(parseViewBox('0 0 24 24')).toEqual([0, 0, 24, 24])
    expect(parseViewBox('0,0,24,24')).toEqual([0, 0, 24, 24])
    expect(parseViewBox('0, 0, 24, 24')).toEqual([0, 0, 24, 24])
  })

  it('should split on tabs and line breaks', () => {
    expect(parseViewBox('0\t0\t24\t24')).toEqual([0, 0, 24, 24])
    expect(parseViewBox('0 0\n24 24')).toEqual([0, 0, 24, 24])
    expect(parseViewBox('\n  0 0\r\n  24 24\n')).toEqual([0, 0, 24, 24])
  })

  it('should return null for a missing viewBox', () => {
    expect(parseViewBox(undefined)).toBe(null)
    expect(parseViewBox('')).toBe(null)
  })
})

describe('SVG image data URI', () => {
  it('should read the size from a viewBox that contains a line break', async () => {
    const svg = '<svg viewBox="0 0\n24 24" xmlns="http://www.w3.org/2000/svg"></svg>'
    const [, width, height] = await resolveImageData(
      `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    )

    expect(width).toBe(24)
    expect(height).toBe(24)
  })
})
