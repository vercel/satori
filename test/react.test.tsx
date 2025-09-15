import { forwardRef } from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('React APIs', () => {
  let fonts: any
  initFonts((f) => (fonts = f))

  it('should support `forwardRef` wrapped components', async () => {
    const Foo = forwardRef(function _() {
      return <div>hello</div>
    })

    const svg = await satori(
      <div
        style={{
          display: 'flex',
          color: 'red',
          fontSize: 14,
        }}
      >
        <Foo />
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
