import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils'
import satori from '../src'

describe('Position', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('absolute', () => {
    it('should support absolute position', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 10,
              height: 10,
              background: 'black',
            }}
          ></div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
