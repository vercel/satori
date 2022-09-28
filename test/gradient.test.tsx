import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils'
import satori from '../src'

describe('Gradient', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('radial-gradient', () => {
    it('should support radial-gradient', async () => {
      const svg = await satori(
        <div
          style={{
            backgroundColor: 'white',
            backgroundImage: 'radial-gradient(circle at 25px 25px, blue, red)',
            backgroundSize: '100px 100px',
            height: '100%',
            width: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
