import React from 'react'
import { it, describe, expect, beforeEach, afterEach } from 'vitest'

import { initFonts, toImage } from './utils'
import satori from '../src'

const PNG_SAMPLE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAPCAYAAADkmO9VAAAAAXNSR0IArs4c6QAAAIRlWElmTU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAABSgAwAEAAAAAQAAAA8AAAAAVtc7bQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAVlpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDYuMC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KGV7hBwAAA1FJREFUOBGNVFtME0EUnd3S3T5paamRxidoihRKRVGJkaDBRCFNiMkSP9QPiaHhgwRREwOGEUn8MfERIDEqMfxZEtEoSviQGh8Qg4YagQCipVIepdoWSh+03XFndRXkx/uxc+fOPWfO3nt3AfhtDGMTCf6VK3PFFRVTDADdGhyDEJEAAUI4z+7Mzmj1t6bwewhIIY5XPgkDICRYAMZ1Vmv0FkEsH5qcFKFd+bKRDwPUsa6uzT4BVNVZBbVJ2lMBScDPqtm65vzm54yNEXWUdyRwDomVYbL2doe8uDjYtrgYOUpRsUggEBxXK1H+lg3B8wJZU0/jHcmyuNr9w+1eCCxok8PJLYo3inWYDCLIKyWNRoZXOTNDq0pLqWyzWbQ8MoJCuSZasRQKB1sGiQMC4SxayhPLVN5t8gxkSM0MO/1OWU2ixorP096n8SUT2e2XWQh7k+rr8wNFRWc3arTKYplE5I2RbIKmpSrLd7enrdqkrdxXWJE25VJ7iFCi3nPDr/MpKXdoVu4MOV+7Ol1vg/og6bQ72aRftxdx9QMAoXVXFZJAYXqmcmfUuTRVKLIvyPI+b/X9kDbNP3o4p99fAooIMnpAv0cnl6fQYNF9/dXJ/msYa2+wJwD83RQcEBozYJtQDWnTDQpYW5aG2svD2oJw8nYDq8zNFROaFBkxMhrv9tTerj5+ugfktTkwlp8Agnty9mcU8IYfD0jgi9g+E7BE9lW1RmLRWb3ZpCRpWuy1Wucle3anqvzr67LGnj6wMUaq3DgU5wD8G2KOVTOEu81AyJeBlJSMijXJy7RCop1ou6Yaugv18aZGg+7chYxwWWYOBhuZBk7FXzIc48HYESwLwhinnSDePRsbLC3oi8/4LEvmg4Th8BFSGYvHfP39A/Hxb/dwvmd4+I8yAb9KIQ5yNUAdkBFj//smx2N2BxtGEf/o/KcXX6YTL6Pegvt1e590fB2yQeoghHGct9LWEPKHDQw/9VSuaWw6RwkWLXrNZA6d5NJRKlnGJV6VR7f6VQXSVU0RgnhF3LdLcJ173nXmYiyhPhGNBlxikdQx9/FmYyUEIeF8Jea//d7eMrXNBqQCAJMJ/r/rmqasTEAIcUCCk/rIj+OQ/7NAbg/XNEPA/QQBqVjfA25FYgAAAABJRU5ErkJggg=='

describe('Image', () => {
  let fonts
  initFonts((f) => (fonts = f))

  let requests = []

  beforeEach(() => {
    // Polyfill fetch
    requests = []
    ;(globalThis as any).fetch = async (url) => {
      requests.push(url)
      if (url.startsWith('data:')) {
        return {
          headers: {
            get: () => 'image/png',
          },
          text: async () => {
            const binary_string = atob(
              url.replace('data:image/png;base64,', '')
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

      if (url.endsWith('.svg')) {
        return {
          headers: {
            get: () => 'image/svg+xml',
          },
          text: async () =>
            '<svg width="116.15" height="100" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M57.5 0L115 100H0L57.5 0z"/></svg>',
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

    it('should resolve non-square image size correctly', async () => {
      const svg = await satori(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
          }}
        >
          <img width={100} height={50} src='https://via.placeholder.com/200' />
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

    it('should support transparent image with background', async () => {
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
            src={PNG_SAMPLE}
            style={{
              backgroundColor: 'green',
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

    it('should support single quotes inside url()', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px solid',
            width: '50%',
            height: '50%',
            display: 'flex',
            backgroundImage: "url('https://via.placeholder.com/301')",
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()

      expect(requests).toEqual(['https://via.placeholder.com/301'])
    })

    it('should support double quotes inside url()', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px solid',
            width: '50%',
            height: '50%',
            display: 'flex',
            backgroundImage: 'url("https://via.placeholder.com/302")',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )

      expect(toImage(svg, 100)).toMatchImageSnapshot()

      expect(requests).toEqual(['https://via.placeholder.com/302'])
    })
    
    it('should resolve data uris with size for supported image formats', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px solid',
            width: '100%',
            height: '100%',
            display: 'flex',
            backgroundImage:
              'url(data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2036%2036%22%3E%3Cpath%20fill%3D%22%23FFCC4D%22%20d%3D%22M36%2018c0%209.941-8.059%2018-18%2018-9.94%200-18-8.059-18-18C0%208.06%208.06%200%2018%200c9.941%200%2018%208.06%2018%2018%22%2F%3E%3Cellipse%20fill%3D%22%23664500%22%20cx%3D%2211.5%22%20cy%3D%2212.5%22%20rx%3D%222.5%22%20ry%3D%225.5%22%2F%3E%3Cellipse%20fill%3D%22%23664500%22%20cx%3D%2224.5%22%20cy%3D%2212.5%22%20rx%3D%222.5%22%20ry%3D%225.5%22%2F%3E%3Cpath%20fill%3D%22%23664500%22%20d%3D%22M18%2022c-3.623%200-6.027-.422-9-1-.679-.131-2%200-2%202%200%204%204.595%209%2011%209%206.404%200%2011-5%2011-9%200-2-1.321-2.132-2-2-2.973.578-5.377%201-9%201z%22%2F%3E%3Cpath%20fill%3D%22%23FFF%22%20d%3D%22M9%2023s3%201%209%201%209-1%209-1-2%204-9%204-9-4-9-4z%22%2F%3E%3C%2Fsvg%3E)',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )

      expect(toImage(svg, 100)).toMatchImageSnapshot()
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

    it('should correctly position the background pattern', async () => {
      const svg = await satori(
        <div
          style={{
            margin: '30px 30px',
            width: '70px',
            height: '70px',
            display: 'flex',
            backgroundImage: `url(${PNG_SAMPLE})`,
            backgroundSize: '70px 70px',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )

      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
