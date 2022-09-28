import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts } from './utils'
import satori from '../src'

describe('Error', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should throw if flex missing on div that has children', async () => {
    const result = satori(
      <div>
        Test <span>satori</span> with space
      </div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(result).rejects.toThrowError(
      `Expected <div> to have style={{display: 'flex'}} but received style={{display: 'block'}}`
    )
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
      `Expected <div> to have style={{display: 'flex'}} but received style={{display: 'inline-block'}}`
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
