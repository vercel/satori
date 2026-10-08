import { it, describe, expect } from 'vitest'

import { initFonts } from './utils.js'
import satori from '../src/index.js'

describe('Error', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should throw for unsupported display values', async () => {
    await expect(
      satori(<div style={{ display: 'table' }}>Test</div>, {
        width: 10,
        height: 10,
        fonts,
      })
    ).rejects.toThrowError(
      `Invalid value for CSS property "display". Allowed values: "block" | "flow-root" | "list-item" | "flex" | "-webkit-box" | "grid" | "inline" | "inline-block" | "inline-flex" | "inline-grid" | "contents" | "none". Received: "table".`
    )
  })

  it('should throw if using invalid values', async () => {
    const result = satori(<div style={{ position: 'sticky' }}>Test</div>, {
      width: 10,
      height: 10,
      fonts,
    })
    await expect(result).rejects.toThrowError(
      `Invalid value for CSS property "position". Allowed values: "absolute" | "relative" | "static" | "fixed". Received: "sticky".`
    )
  })

  it('should not throw if display none on div that has children', async () => {
    const svg = await satori(
      <div style={{ display: 'none' }}>
        Test <span>satori</span> with space
      </div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(typeof svg).toBe('string')
  })

  it('should not throw if flex missing on span that has children', async () => {
    const svg = await satori(
      <span>
        Test <span>satori</span> with space
      </span>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(typeof svg).toBe('string')
  })

  it('should not throw if flex missing on div without children', async () => {
    const svg = await satori(<div></div>, {
      width: 10,
      height: 10,
      fonts,
    })
    expect(typeof svg).toBe('string')
  })

  it('should not allowed to set negative value to rg-size', async () => {
    const result = satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage:
            'radial-gradient(-20% 20% at top left, yellow, blue)',
          fontSize: 32,
          fontWeight: 600,
        }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(result).rejects.toThrowError(
      'disallow setting negative values to the size of the shape. Check https://w3c.github.io/csswg-drafts/css-images/#valdef-rg-size-length-0'
    )
  })
})
