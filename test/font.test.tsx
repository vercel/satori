import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts } from './utils'
import satori from '../src'

describe('Font', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should error when no font is specified', async () => {
    try {
      await satori(<div>hello</div>, {
        width: 100,
        height: 100,
        fonts: [],
      })
    } catch (e) {
      expect(e.message).toMatchInlineSnapshot(
        '"No fonts are loaded. At least one font is required to calculate the layout."'
      )
    }
  })

  it('should not error when no font is specified and no text rendered', async () => {
    const svg = await satori(<div></div>, {
      width: 100,
      height: 100,
      fonts: [],
    })
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"/>"'
    )
  })

  describe('font-size', () => {
    it('should allow font-size to be 0', async () => {
      const svg = await satori(<div style={{ fontSize: 0 }}>hi</div>, {
        width: 100,
        height: 100,
        fonts,
      })
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><path fill=\\"black\\" d=\\" \\"/></svg>"'
      )
    })
  })
})
