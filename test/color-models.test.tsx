import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils'
import satori from '../src'

// TODO: no support for 'text-decoration' or 'outline'

describe('Color Models', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('background shorthand', () => {
    it('should support hexadecimal', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            background: '#C3D7EE',
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
            background: '#C3D7EE70',
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
            background: 'rgb(148, 183, 223)',
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
            background: 'rgba(148, 183, 223, .7)',
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
            background: 'hsl(186, 22%, 26%)',
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
            background: 'hsla(186, 22%, 26%, .5)',
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
            background: 'pink',
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
  })

  describe('drop-shadow filter', () => {
    it('should support hexadecimal', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            backgroundColor: '#fff',
            height: '100%',
            width: '100%',
          }}
        >
          <div style={{ filter: 'drop-shadow(16px 16px 10px #EFBA50)' }}>
            hello world
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

    it('should support hexadecimal with transparency', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            backgroundColor: '#fff',
            height: '100%',
            width: '100%',
          }}
        >
          <div style={{ filter: 'drop-shadow(16px 16px 10px #EFBA5070)' }}>
            hello world
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

    it('should support rgb', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            background: '#fff',
            height: '100%',
            width: '100%',
          }}
        >
          <div
            style={{ filter: 'drop-shadow(16px 16px 10px rgb(29, 212, 84))' }}
          >
            hello world
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

    it('should support rgba', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            background: '#fff',
            height: '100%',
            width: '100%',
          }}
        >
          <div
            style={{
              filter: 'drop-shadow(16px 16px 10px rgba(29, 212, 84, .3))',
            }}
          >
            hello world
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

    it('should support hsl', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            background: '#fff',
            height: '100%',
            width: '100%',
          }}
        >
          <div
            style={{
              filter: 'drop-shadow(16px 16px 10px hsl(268, 64%, 51%))',
            }}
          >
            hello world
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

    it('should support hsla', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            background: '#fff',
            height: '100%',
            width: '100%',
          }}
        >
          <div
            style={{
              filter: 'drop-shadow(16px 16px 10px hsl(268, 64%, 51%, .3))',
            }}
          >
            hello world
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
  })

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

    // TODO: add `currentcolor` support to css-to-react-native lib
    // it('should support currentcolor', async () => {
    //   const svg = await satori(
    //     <div
    //       style={{
    //         display: 'flex',
    //         backgroundColor: 'pink',
    //         color: 'red',
    //         height: '100%',
    //         width: '100%',
    //       }}
    //     >
    //       <div style={{ backgroundColor: 'currentcolor' }}>
    //         Predefined color names
    //       </div>
    //     </div>,
    //     {
    //       width: 100,
    //       height: 100,
    //       fonts,
    //     }
    //   )
    //   expect(toImage(svg, 100)).toMatchImageSnapshot()
    // })
  })
})
