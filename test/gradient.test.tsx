import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils'
import satori from '../src'

describe('Gradient', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('linear-gradient', () => {
    it('should support linear-gradient', async () => {
      const svg = await satori(
        <div
          style={{
            backgroundColor: 'white',
            backgroundImage: 'linear-gradient(to right, red, blue)',
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

    it('should support repeating linear-gradient', async () => {
      const svg = await satori(
        <div
          style={{
            backgroundColor: 'white',
            backgroundImage: 'linear-gradient(45deg, white, blue)',
            backgroundSize: '50px 50px',
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

    it('should support linear-gradient with transparency', async () => {
      const svg = await satori(
        <div
          style={{
            backgroundColor: 'green',
            backgroundImage: 'linear-gradient(45deg, rgba(255, 0, 0, 0), blue)',
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

    it('should support linear-gradient with omitted orientation', async () => {
      const svg = await satori(
        <div
          style={{
            backgroundColor: 'green',
            backgroundImage: 'linear-gradient(red, blue)',
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

    it('should support using background instead of backgroundImage', async () => {
      const svg = await satori(
        <div
          style={{
            background: 'linear-gradient(to right, red, black)',
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

  it('should support advanced usage', async () => {
    const svg = await satori(
      <div
        style={{
          backgroundColor: 'yellow',
          backgroundImage:
            'radial-gradient(circle at 45px 45px, red, transparent 40%), radial-gradient(circle at 5px 5px, blue, transparent 40%)',
          backgroundSize: '50px 50px',
          backgroundRepeat: 'repeat-y',
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

  it('should resolve gradient layers in the correct order', async () => {
    const svg = await satori(
      <div
        style={{
          backgroundColor: 'yellow',
          backgroundImage:
            'radial-gradient(circle at 45px 45px, red, red 60%, transparent 60%), radial-gradient(circle at 5px 5px, blue, blue 60%, transparent 60%)',
          backgroundSize: '50px 50px',
          backgroundRepeat: 'repeat-y',
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

  it('should render gradient patterns in the correct object space', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '50%',
            height: '50%',
            backgroundImage: 'linear-gradient(to bottom, red, blue)',
          }}
        ></div>
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
