import { join } from 'node:path'
import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils'
import satori from '../src'
import { readFile } from 'node:fs/promises'

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
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should use correct fonts', async () => {
    const fontName = 'MontserratSubrayada'
    const fontPath = join(
      process.cwd(),
      'test',
      'assets',
      `${fontName}-Regular.ttf`
    )
    const fontData = await readFile(fontPath)
    const montserratFont = {
      name: fontName,
      data: fontData,
      weight: 400,
      style: 'normal',
    }
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontSize: '20px',
          fontWeight: 400,
          color: 'yellow',
        }}
      >
        <div>Hello</div>
        <div style={{ fontFamily: fontName }}>Hello</div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts: fonts.concat(montserratFont),
      }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  describe('font-size', () => {
    it('should allow font-size to be 0', async () => {
      const svg = await satori(<div style={{ fontSize: 0 }}>hi</div>, {
        width: 100,
        height: 100,
        fonts,
      })
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
