import React from 'react'
import { it, describe, expect, beforeEach, afterEach } from 'vitest'

import { initFonts, toImage } from './utils'
import satori from '../src'

describe('Image', () => {
  let fonts
  initFonts((f) => (fonts = f))

  let requests = []

  beforeEach(() => {
    // Polyfill fetch
    requests = []
    ;(globalThis as any).fetch = async (url) => {
      requests.push(url)
      if (url.endsWith('.svg')) {
        return {
          headers: {
            get: () => 'image/svg+xml',
          },
          text: async () =>
            '<svg width="116" height="100" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M57.5 0L115 100H0L57.5 0z"/></svg>',
        }
      }

      return {
        headers: {
          get: (key) => {
            if (key === 'content-type') return 'image/png'
          },
        },
        arrayBuffer: async () => {
          // 1x1 #00F blue image.
          const binary_string = atob(
            `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==`
          )
          const len = binary_string.length
          const bytes = new Uint8Array(len)
          for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i)
          }
          return bytes.buffer
        },
      }
    }
  })

  afterEach(() => {
    delete globalThis.fetch
  })

  describe('img', () => {
    it('should resolve image data', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px solid',
            width: '50%',
            height: '50%',
            display: 'flex',
          }}
        >
          <img
            width='100%'
            height='100%'
            src='https://via.placeholder.com/150'
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()

      expect(requests).toEqual(['https://via.placeholder.com/150'])
    })

    it('should deduplicate image data requests', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px solid',
            width: '50%',
            height: '50%',
            display: 'flex',
          }}
        >
          <img width='10%' height='10%' src='https://via.placeholder.com/200' />
          <img width='20%' height='30%' src='https://via.placeholder.com/200' />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()

      expect(requests).toEqual(['https://via.placeholder.com/200'])
    })

    it('should resolve the image size and scale automatically', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px solid',
            width: '50%',
            height: '50%',
            display: 'flex',
          }}
        >
          <img width={30} src='https://via.placeholder.com/200' />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support styles', async () => {
      const svg = await satori(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
          }}
        >
          <img
            width='100%'
            height='100%'
            src='https://via.placeholder.com/150'
            style={{
              transform: 'scale(0.8) skew(10deg, 10deg)',
              borderRadius: '10px 20%',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support opacity', async () => {
      const svg = await satori(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
          }}
        >
          <img
            width='100%'
            height='100%'
            src='https://via.placeholder.com/150'
            style={{
              opacity: 0.5,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support SVG images and percentage with correct aspect ratio', async () => {
      const svg = await satori(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
          }}
        >
          <img width='100%' src='https://via.placeholder.com/150.svg' />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should clip content in the border area', async () => {
      const svg = await satori(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
          }}
        >
          <img
            width='100%'
            height='100%'
            src='https://via.placeholder.com/150'
            style={{
              borderRadius: '10px 20%',
              border: '10px solid rgba(0, 0, 0, 0.5)',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should clip content in the border and padding areas', async () => {
      const svg = await satori(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
          }}
        >
          <img
            width='100%'
            height='100%'
            src='https://via.placeholder.com/150'
            style={{
              padding: 10,
              borderRadius: '20px 30%',
              border: '10px solid rgba(0, 0, 0, 0.5)',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('background-image: url()', () => {
    it('should resolve image data', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px solid',
            width: '50%',
            height: '50%',
            display: 'flex',
            backgroundImage: 'url(https://via.placeholder.com/300)',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )

      expect(toImage(svg, 100)).toMatchImageSnapshot()

      expect(requests).toEqual(['https://via.placeholder.com/300'])
    })

    it('should support stretched backgroundSize', async () => {
      const svg = await satori(
        <div
          style={{
            width: '50%',
            height: '50%',
            display: 'flex',
            backgroundImage: 'url(https://via.placeholder.com/300)',
            backgroundSize: '100% 100%',
          }}
        ></div>,
        { width: 100, height: 50, fonts }
      )

      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
