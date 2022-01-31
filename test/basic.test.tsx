import React from 'react'
import { it, describe, expect } from 'vitest'
import fs from 'fs/promises'
import { join } from 'path'

import satori from '../src'

describe('', () => {
  it('', async () => {
    const fontPath = join(process.cwd(), 'test', 'assets', 'Roboto-Regular.ttf')
    const fontData = await fs.readFile(fontPath)

    function Foo({ children }) {
      return <div>Hi, {children}!</div>
    }

    // @TODO: We need a couple of utils to construct SVG strings from attributes,
    // sort them in order, etc.
    expect(
      satori(
        <div>
          <p>hello, world</p>
          <Foo>Satori</Foo>
        </div>,
        {
          width: 100,
          height: 100,
          fonts: [
            {
              name: 'Roboto',
              data: fontData,
              weight: 400,
              style: 'normal',
            },
          ],
        }
      )
    ).toBe(
      `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100" height="100" fill="transparent"   ></rect><rect x="0" y="16" width="100" height="23" fill="transparent"   ></rect><text x="0" y="34" width="41" height="18" fill="black" font-weight="normal" font-style="normal" font-size="16" font-family="serif" >hello, </text><text x="41" y="34" width="40" height="18" fill="black" font-weight="normal" font-style="normal" font-size="16" font-family="serif" >world</text><rect x="0" y="55" width="100" height="22" fill="transparent"   ></rect><text x="0" y="72" width="22" height="17" fill="black" font-weight="normal" font-style="normal" font-size="16" font-family="serif" >Hi, </text><text x="22" y="72" width="42" height="17" fill="black" font-weight="normal" font-style="normal" font-size="16" font-family="serif" >Satori</text><text x="64" y="72" width="4" height="17" fill="black" font-weight="normal" font-style="normal" font-size="16" font-family="serif" >!</text></svg>`
    )
  })
})
