import { it, describe, expect } from 'vitest'

import { initFonts } from './utils.js'
import satori from '../src/index.js'

describe('Error', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should throw if flex missing on div that has children', async () => {
    let error = new Error();
    try {
      await satori(
        <div>
          Test <span>satori</span> with space
        </div>,
        {
          width: 10,
          height: 10,
          fonts,
        }
      )
    } catch(err) {
      error = err;
    }
    expect(error?.message).toBe('Expected <div> to have explicit "display: flex" or "display: none" if it has more than one child node.')
  })

  it('should throw if display inline-block on div that has children', async () => {
    const result = satori(
      <div style={{ display: 'inline-block' }}>
        Test <span>satori</span> with space
      </div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(result).rejects.toThrowError(
      `Invalid value for CSS property "display". Allowed values: "flex" | "none". Received: "inline-block".`
    )
  })

  it('should throw if using invalid values', async () => {
    const result = satori(
      // @ts-expect-error
      <div style={{ position: 'fixed ' }}>Test</div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(result).rejects.toThrowError(
      `Invalid value for CSS property "position". Allowed values: "absolute" | "relative". Received: "fixed".`
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
})
