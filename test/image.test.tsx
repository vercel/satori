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
  })
})
