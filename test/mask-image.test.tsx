import { it, describe, expect, beforeEach, afterEach } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

const PNG_SAMPLE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAPCAYAAADkmO9VAAAAAXNSR0IArs4c6QAAAIRlWElmTU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAABSgAwAEAAAAAQAAAA8AAAAAVtc7bQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAVlpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDYuMC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KGV7hBwAAA1FJREFUOBGNVFtME0EUnd3S3T5paamRxidoihRKRVGJkaDBRCFNiMkSP9QPiaHhgwRREwOGEUn8MfERIDEqMfxZEtEoSviQGh8Qg4YagQCipVIepdoWSh+03XFndRXkx/uxc+fOPWfO3nt3AfhtDGMTCf6VK3PFFRVTDADdGhyDEJEAAUI4z+7Mzmj1t6bwewhIIY5XPgkDICRYAMZ1Vmv0FkEsH5qcFKFd+bKRDwPUsa6uzT4BVNVZBbVJ2lMBScDPqtm65vzm54yNEXWUdyRwDomVYbL2doe8uDjYtrgYOUpRsUggEBxXK1H+lg3B8wJZU0/jHcmyuNr9w+1eCCxok8PJLYo3inWYDCLIKyWNRoZXOTNDq0pLqWyzWbQ8MoJCuSZasRQKB1sGiQMC4SxayhPLVN5t8gxkSM0MO/1OWU2ixorP096n8SUT2e2XWQh7k+rr8wNFRWc3arTKYplE5I2RbIKmpSrLd7enrdqkrdxXWJE25VJ7iFCi3nPDr/MpKXdoVu4MOV+7Ol1vg/og6bQ72aRftxdx9QMAoXVXFZJAYXqmcmfUuTRVKLIvyPI+b/X9kDbNP3o4p99fAooIMnpAv0cnl6fQYNF9/dXJ/msYa2+wJwD83RQcEBozYJtQDWnTDQpYW5aG2svD2oJw8nYDq8zNFROaFBkxMhrv9tTerj5+ugfktTkwlp8Agnty9mcU8IYfD0jgi9g+E7BE9lW1RmLRWb3ZpCRpWuy1Wucle3anqvzr67LGnj6wMUaq3DgU5wD8G2KOVTOEu81AyJeBlJSMijXJy7RCop1ou6Yaugv18aZGg+7chYxwWWYOBhuZBk7FXzIc48HYESwLwhinnSDePRsbLC3oi8/4LEvmg4Th8BFSGYvHfP39A/Hxb/dwvmd4+I8yAb9KIQ5yNUAdkBFj//smx2N2BxtGEf/o/KcXX6YTL6Pegvt1e590fB2yQeoghHGct9LWEPKHDQw/9VSuaWw6RwkWLXrNZA6d5NJRKlnGJV6VR7f6VQXSVU0RgnhF3LdLcJ173nXmYiyhPhGNBlxikdQx9/FmYyUEIeF8Jea//d7eMrXNBqQCAJMJ/r/rmqasTEAIcUCCk/rIj+OQ/7NAbg/XNEPA/QQBqVjfA25FYgAAAABJRU5ErkJggg=='

let fonts
initFonts((f) => (fonts = f))

let requests = []

beforeEach(() => {
  // Polyfill fetch
  requests = []
  ;(globalThis as any).fetch = async (url) => {
    requests.push(url)
    if (url.includes('wrong-url')) {
      throw Error('wrong url')
    } else if (url.startsWith('data:')) {
      return {
        headers: {
          get: () => 'image/png',
        },
        text: async () => {
          const binary_string = atob(url.replace('data:image/png;base64,', ''))
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

describe('Mask-*', () => {
  it('should support mask-image', async () => {
    const svgs = await Promise.all(
      [
        'linear-gradient(to right, blue, transparent)',
        'radial-gradient(circle at 50% 50%, blue, transparent)',
        'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMTIwMCAxMjAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMCwzNSBBMjAsMjAsMCwwLDEsNTAsMzUgQTIwLDIwLDAsMCwxLDkwLDM1IFE5MCw2NSw1MCw5NSBRMTAsNjUsMTAsMzUgWiIgZmlsbD0id2hpdGUiIC8+PC9zdmc+)',
      ].map((maskImage) =>
        satori(
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              backgroundImage: `url(${PNG_SAMPLE})`,
              maskImage,
            }}
          ></div>,
          { width: 100, height: 100, fonts }
        )
      )
    )

    svgs.forEach((svg) => {
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
  it('should support mask-image on img', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <img
          src={PNG_SAMPLE}
          width='100%'
          height='100%'
          style={{
            maskImage: 'linear-gradient(to right, blue, transparent)',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
  it('should support mask-size', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundImage: `url(${PNG_SAMPLE})`,
          maskImage: 'linear-gradient(to right, blue, transparent)',
          maskSize: '50px 50%',
        }}
      ></div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
  it('should support mask-position', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundImage: `url(${PNG_SAMPLE})`,
          maskImage: 'linear-gradient(to right, blue, transparent)',
          maskSize: '10px 10px',
          maskPosition: '10px 10px',
        }}
      ></div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
  it('should support mask-repeat', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundImage: `url(${PNG_SAMPLE})`,
          maskImage: 'linear-gradient(to right, blue, transparent)',
          maskSize: '10px 10px',
          maskRepeat: 'repeat-x',
        }}
      ></div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support mask-image on text', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundImage: `url(${PNG_SAMPLE})`,
          maskImage: 'linear-gradient(to right, blue, transparent)',
          color: 'white',
        }}
      >
        Lynnnnn6666666
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support multiple mask-image', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundImage: `url(${PNG_SAMPLE})`,
          maskImage: [
            'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMTIwMCAxMjAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMCwzNSBBMjAsMjAsMCwwLDEsNTAsMzUgQTIwLDIwLDAsMCwxLDkwLDM1IFE5MCw2NSw1MCw5NSBRMTAsNjUsMTAsMzUgWiIgZmlsbD0id2hpdGUiIC8+PC9zdmc+)',
            'radial-gradient(circle at 100% 100%, blue, transparent)',
          ].join(','),
          color: 'white',
        }}
      ></div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support mask-image on positioned elements', async () => {
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
            top: 20,
            left: 20,
            height: 100,
            width: 100,
            display: 'flex',
            background: 'green',
            maskImage:
              "url(data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Crect fill='white' width='100' height='100' /%3E%3C/svg%3E)",
            border: '1px solid red',
          }}
        ></div>
      </div>,
      { width: 120, height: 120, fonts }
    )
    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })
})
