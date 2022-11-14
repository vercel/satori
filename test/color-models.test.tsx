import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils'
import satori from '../src'

// TODO: no support for 'text-decoration' or 'outline'

describe('Color Models', () => {
  let fonts
  initFonts((f) => (fonts = f))

  // TODO: test `background` shorthand?

  // TODO: `filter` supported?

  describe('backgroundColor and color', () => {
    it('should support hexadecimal', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            backgroundColor: '#C3D7EE',
            color: '#132539',
            height: '100%',
            width: '100%',
          }}
        >
          Hexadecimal
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support hexadecimal with transparency', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            backgroundColor: '#C3D7EE70',
            color: '#13253950',
            height: '100%',
            width: '100%',
          }}
        >
          Hexadecimal with transparency
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support rgb', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgb(148, 183, 223)',
            color: 'rgb(19, 37, 57)',
            height: '100%',
            width: '100%',
          }}
        >
          RGB
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support rgba', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgba(148, 183, 223, .7)',
            color: 'rgba(19, 37, 57, .5)',
            height: '100%',
            width: '100%',
          }}
        >
          RGBA
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support hsl', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            backgroundColor: 'hsl(186, 22%, 26%)',
            color: 'hsl(212, 0%, 100%)',
            height: '100%',
            width: '100%',
          }}
        >
          HSL
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support hsla', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            backgroundColor: 'hsla(186, 22%, 26%, .5)',
            color: 'hsla(212, 0%, 100%, .2)',
            height: '100%',
            width: '100%',
          }}
        >
          HSLA
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support predefined color names', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            backgroundColor: 'pink',
            color: 'red',
            height: '100%',
            width: '100%',
          }}
        >
          Predefined color names
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support inherit color', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            backgroundColor: 'pink',
            color: 'red',
            height: '100%',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex' }}>
            red
            <div>red</div>
          </div>
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support currentcolor when inherit', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            backgroundColor: 'pink',
            color: 'red',
            height: '100%',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', color: 'currentcolor' }}>
            red
            <div>red</div>
          </div>
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support currentcolor when background', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'black',
            color: 'pink',
            height: '100%',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', backgroundColor: 'currentcolor' }}>
            <span style={{ color: 'white' }}>pink background</span>
          </div>
          <div style={{ display: 'flex', backgroundColor: 'gray', padding: '4px' }}>
            <div style={{ display: 'flex', backgroundColor: 'currentcolor' }}>
              <span style={{ color: 'white' }}>pink background</span>
            </div>
          </div>
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support currentcolor when border', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'black',
            color: 'pink',
            height: '100%',
            width: '100%',
          }}
        >
          <div style={{ border: '1px solid currentcolor' }}>
            pink border
          </div>
          <div style={{ display: 'flex', backgroundColor: 'gray', padding: '4px' }}>
            <div style={{ border: '1px solid currentcolor' }}>
              pink border
            </div>
          </div>
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

  // Borders: shorthand, border-bottom-color, border-color, border-left-color, border-right-color, border-top-color

  // Box shadow

  // Filter
})
