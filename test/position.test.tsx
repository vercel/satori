import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

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

    // https://www.yogalayout.dev/blog/announcing-yoga-3.0#better-support-for-absolute-positioning
    it('should have correct size calculation of absolutely positioned elements', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            padding: 10,
            background: 'red',
          }}
        >
          <div
            style={{
              position: 'absolute',
              height: '25%',
              width: '25%',
              background: 'black',
            }}
          ></div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('static', () => {
    it('should support static position', async () => {
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
              position: 'static',
              left: 10,
              top: 10,
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

  describe('relative', () => {
    it('should support relative position', async () => {
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
              position: 'relative',
              left: 10,
              top: 10,
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
