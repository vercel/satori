import { it, describe, expect, beforeEach, afterEach } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

const PNG_SAMPLE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAPCAYAAADkmO9VAAAAAXNSR0IArs4c6QAAAIRlWElmTU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAABSgAwAEAAAAAQAAAA8AAAAAVtc7bQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAVlpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDYuMC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KGV7hBwAAA1FJREFUOBGNVFtME0EUnd3S3T5paamRxidoihRKRVGJkaDBRCFNiMkSP9QPiaHhgwRREwOGEUn8MfERIDEqMfxZEtEoSviQGh8Qg4YagQCipVIepdoWSh+03XFndRXkx/uxc+fOPWfO3nt3AfhtDGMTCf6VK3PFFRVTDADdGhyDEJEAAUI4z+7Mzmj1t6bwewhIIY5XPgkDICRYAMZ1Vmv0FkEsH5qcFKFd+bKRDwPUsa6uzT4BVNVZBbVJ2lMBScDPqtm65vzm54yNEXWUdyRwDomVYbL2doe8uDjYtrgYOUpRsUggEBxXK1H+lg3B8wJZU0/jHcmyuNr9w+1eCCxok8PJLYo3inWYDCLIKyWNRoZXOTNDq0pLqWyzWbQ8MoJCuSZasRQKB1sGiQMC4SxayhPLVN5t8gxkSM0MO/1OWU2ixorP096n8SUT2e2XWQh7k+rr8wNFRWc3arTKYplE5I2RbIKmpSrLd7enrdqkrdxXWJE25VJ7iFCi3nPDr/MpKXdoVu4MOV+7Ol1vg/og6bQ72aRftxdx9QMAoXVXFZJAYXqmcmfUuTRVKLIvyPI+b/X9kDbNP3o4p99fAooIMnpAv0cnl6fQYNF9/dXJ/msYa2+wJwD83RQcEBozYJtQDWnTDQpYW5aG2svD2oJw8nYDq8zNFROaFBkxMhrv9tTerj5+ugfktTkwlp8Agnty9mcU8IYfD0jgi9g+E7BE9lW1RmLRWb3ZpCRpWuy1Wucle3anqvzr67LGnj6wMUaq3DgU5wD8G2KOVTOEu81AyJeBlJSMijXJy7RCop1ou6Yaugv18aZGg+7chYxwWWYOBhuZBk7FXzIc48HYESwLwhinnSDePRsbLC3oi8/4LEvmg4Th8BFSGYvHfP39A/Hxb/dwvmd4+I8yAb9KIQ5yNUAdkBFj//smx2N2BxtGEf/o/KcXX6YTL6Pegvt1e590fB2yQeoghHGct9LWEPKHDQw/9VSuaWw6RwkWLXrNZA6d5NJRKlnGJV6VR7f6VQXSVU0RgnhF3LdLcJ173nXmYiyhPhGNBlxikdQx9/FmYyUEIeF8Jea//d7eMrXNBqQCAJMJ/r/rmqasTEAIcUCCk/rIj+OQ/7NAbg/XNEPA/QQBqVjfA25FYgAAAABJRU5ErkJggg=='

function dataUriToArrayBuffer(dataUri: string): ArrayBuffer {
  const binary_string = atob(dataUri.slice(dataUri.indexOf(',') + 1))
  const len = binary_string.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i)
  }
  return bytes.buffer
}

const PNG_SAMPLE_ARRAYBUFFER = dataUriToArrayBuffer(PNG_SAMPLE)

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

describe('Image', () => {
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
        <img width='100%' height='100%' src='https://via.placeholder.com/150' />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()

    expect(requests).toEqual(['https://via.placeholder.com/150'])
  })

  it('should render svg with image', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <svg
          width='100'
          height='100'
          viewBox='0 0 100 100'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <image
            id='image0_1_2'
            width='100'
            height='100'
            href='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNiAzNiI+PHBhdGggZmlsbD0iI0ZGQ0M0RCIgZD0iTTM2IDE4YzAgOS45NDEtOC4wNTkgMTgtMTggMTgtOS45NCAwLTE4LTguMDU5LTE4LTE4QzAgOC4wNiA4LjA2IDAgMTggMGM5Ljk0MSAwIDE4IDguMDYgMTggMTgiLz48ZWxsaXBzZSBmaWxsPSIjNjY0NTAwIiBjeD0iMTEuNSIgY3k9IjEyLjUiIHJ4PSIyLjUiIHJ5PSI1LjUiLz48ZWxsaXBzZSBmaWxsPSIjNjY0NTAwIiBjeD0iMjQuNSIgY3k9IjEyLjUiIHJ4PSIyLjUiIHJ5PSI1LjUiLz48cGF0aCBmaWxsPSIjNjY0NTAwIiBkPSJNMTggMjJjLTMuNjIzIDAtNi4wMjctLjQyMi05LTEtLjY3OS0uMTMxLTIgMC0yIDIgMCA0IDQuNTk1IDkgMTEgOSA2LjQwNCAwIDExLTUgMTEtOSAwLTItMS4zMjEtMi4xMzItMi0yLTIuOTczLjU3OC01LjM3NyAxLTkgMXoiLz48cGF0aCBmaWxsPSIjRkZGIiBkPSJNOSAyM3MzIDEgOSAxIDktMSA5LTEtMiA0LTkgNC05LTQtOS00eiIvPjwvc3ZnPg=='
          />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should throw error when relative path is used', async () => {
    await expect(
      satori(
        <div>
          <img width='100%' height='100%' src='/image.png' />
        </div>,
        { width: 100, height: 100, fonts }
      )
    ).rejects.toThrowError('Image source must be an absolute URL: /image.png')
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

  it('should scale image to fit max-width and max-height but maintain the aspect ratio', async () => {
    // Hit max-width
    const svg1 = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'blue',
        }}
      >
        <img
          src={PNG_SAMPLE}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            background: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg1, 100)).toMatchImageSnapshot()

    // Hit max-height
    const svg2 = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'blue',
          flexDirection: 'column',
        }}
      >
        <img
          src={PNG_SAMPLE}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            background: 'red',
          }}
        />
      </div>,
      { width: 100, height: 50, fonts }
    )
    expect(toImage(svg2, 100)).toMatchImageSnapshot()
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

  it('should have a separate border radius clip path when transform is used', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <img
          width='100%'
          height='100%'
          src='https://via.placeholder.com/150'
          style={{
            transform: 'rotate(45deg) translate(30px, 15px)',
            borderRadius: '20px',
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

  it('should support ArrayBuffer as src', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <img width='100%' height='100%' src={PNG_SAMPLE_ARRAYBUFFER as any} />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should not throw when image is not valid', async () => {
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
          src='https://wrong-url.placeholder.com/150'
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

  it('should support SVG data uris with various quotes inside url()', async () => {
    const backgroundImagesWithDoubleQuotes = [
      `url(data:image/svg+xml,<svg width="116" height="100" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M57.5 0L115 100H0L57.5 0z" /></svg>)`,
      `url(data:image/svg+xml;utf8,<svg width="116" height="100" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M57.5 0L115 100H0L57.5 0z" /></svg>)`,
      `url(data:image/svg+xml,%3Csvg width="116" height="100" fill="white" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M57.5 0L115 100H0L57.5 0z" /%3E%3C/svg%3E)`,
      `url(data:image/svg+xml;utf8,%3Csvg width="116" height="100" fill="white" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M57.5 0L115 100H0L57.5 0z" /%3E%3C/svg%3E)`,
      `url(data:image/svg+xml,%3Csvg%20width%3D%22116%22%20height%3D%22100%22%20fill%3D%22white%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M57.5%200L115%20100H0L57.5%200z%22%20%2F%3E%3C%2Fsvg%3E)`,
      `url(data:image/svg+xml;utf8,%3Csvg%20width%3D%22116%22%20height%3D%22100%22%20fill%3D%22white%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M57.5%200L115%20100H0L57.5%200z%22%20%2F%3E%3C%2Fsvg%3E)`,
      `url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTE2IiBoZWlnaHQ9IjEwMCIgZmlsbD0id2hpdGUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTU3LjUgMEwxMTUgMTAwSDBMNTcuNSAweiIgLz48L3N2Zz4=)`,
    ]

    const backgroundImagesWithSingleQuotes = [
      `url(data:image/svg+xml,<svg width='116' height='100' fill='white' xmlns='http://www.w3.org/2000/svg'><path d='M57.5 0L115 100H0L57.5 0z' /></svg>)`,
      `url(data:image/svg+xml;utf8,<svg width='116' height='100' fill='white' xmlns='http://www.w3.org/2000/svg'><path d='M57.5 0L115 100H0L57.5 0z' /></svg>)`,
      `url(data:image/svg+xml,%3Csvg width='116' height='100' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M57.5 0L115 100H0L57.5 0z' /%3E%3C/svg%3E)`,
      `url(data:image/svg+xml;utf8,%3Csvg width='116' height='100' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M57.5 0L115 100H0L57.5 0z' /%3E%3C/svg%3E)`,
      `url(data:image/svg+xml,%3Csvg%20width%3D%27116%27%20height%3D%27100%27%20fill%3D%27white%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cpath%20d%3D%27M57.5%200L115%20100H0L57.5%200z%27%20%2F%3E%3C%2Fsvg%3E)`,
      `url(data:image/svg+xml;utf8,%3Csvg%20width%3D%27116%27%20height%3D%27100%27%20fill%3D%27white%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cpath%20d%3D%27M57.5%200L115%20100H0L57.5%200z%27%20%2F%3E%3C%2Fsvg%3E)`,
      `url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTE2JyBoZWlnaHQ9JzEwMCcgZmlsbD0nd2hpdGUnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+PHBhdGggZD0nTTU3LjUgMEwxMTUgMTAwSDBMNTcuNSAweicgLz48L3N2Zz4=)`,
    ]

    const backgroundImagesWithDoubleQuotesWrappedInSingleQuotes =
      backgroundImagesWithDoubleQuotes.map((b) =>
        b.replace(/^url\(/, `url('`).replace(/\)$/, `')`)
      )
    const backgroundImagesWithSingleQuotesWrappedInDoubleQuotes =
      backgroundImagesWithDoubleQuotes.map((b) =>
        b.replace(/^url\(/, `url("`).replace(/\)$/, `")`)
      )

    const backgroundImages = [
      ...backgroundImagesWithDoubleQuotes,
      ...backgroundImagesWithSingleQuotes,
      ...backgroundImagesWithDoubleQuotesWrappedInSingleQuotes,
      ...backgroundImagesWithSingleQuotesWrappedInDoubleQuotes,
    ]

    let lastImageBuffer = null
    for (const backgroundImage of backgroundImages) {
      const svg = await satori(
        <div
          style={{
            border: '1px solid',
            width: '50%',
            height: '50%',
            display: 'flex',
            backgroundImage,
            backgroundSize: '50px 50px',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )

      const newImageBuffer = toImage(svg, 100)
      if (lastImageBuffer) {
        expect(newImageBuffer.equals(lastImageBuffer)).toBe(true)
      }
      lastImageBuffer = newImageBuffer
    }
  })

  it('should resolve data uris with size for supported image formats', async () => {
    // tests with all the supported image data uri formats.
    const renderSvg = (imageUri) =>
      satori(
        <div
          style={{
            border: '1px solid',
            width: '100%',
            height: '100%',
            display: 'flex',
            backgroundImage: `url(${imageUri})`,
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )

    const basedOnPlainSvg = await renderSvg(
      'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2036%2036%22%3E%3Cpath%20fill%3D%22%23FFCC4D%22%20d%3D%22M36%2018c0%209.941-8.059%2018-18%2018-9.94%200-18-8.059-18-18C0%208.06%208.06%200%2018%200c9.941%200%2018%208.06%2018%2018%22%2F%3E%3Cellipse%20fill%3D%22%23664500%22%20cx%3D%2211.5%22%20cy%3D%2212.5%22%20rx%3D%222.5%22%20ry%3D%225.5%22%2F%3E%3Cellipse%20fill%3D%22%23664500%22%20cx%3D%2224.5%22%20cy%3D%2212.5%22%20rx%3D%222.5%22%20ry%3D%225.5%22%2F%3E%3Cpath%20fill%3D%22%23664500%22%20d%3D%22M18%2022c-3.623%200-6.027-.422-9-1-.679-.131-2%200-2%202%200%204%204.595%209%2011%209%206.404%200%2011-5%2011-9%200-2-1.321-2.132-2-2-2.973.578-5.377%201-9%201z%22%2F%3E%3Cpath%20fill%3D%22%23FFF%22%20d%3D%22M9%2023s3%201%209%201%209-1%209-1-2%204-9%204-9-4-9-4z%22%2F%3E%3C%2Fsvg%3E'
    )
    const basedOnEncodedSvg = await renderSvg(
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNiAzNiI+PHBhdGggZmlsbD0iI0ZGQ0M0RCIgZD0iTTM2IDE4YzAgOS45NDEtOC4wNTkgMTgtMTggMTgtOS45NCAwLTE4LTguMDU5LTE4LTE4QzAgOC4wNiA4LjA2IDAgMTggMGM5Ljk0MSAwIDE4IDguMDYgMTggMTgiLz48ZWxsaXBzZSBmaWxsPSIjNjY0NTAwIiBjeD0iMTEuNSIgY3k9IjEyLjUiIHJ4PSIyLjUiIHJ5PSI1LjUiLz48ZWxsaXBzZSBmaWxsPSIjNjY0NTAwIiBjeD0iMjQuNSIgY3k9IjEyLjUiIHJ4PSIyLjUiIHJ5PSI1LjUiLz48cGF0aCBmaWxsPSIjNjY0NTAwIiBkPSJNMTggMjJjLTMuNjIzIDAtNi4wMjctLjQyMi05LTEtLjY3OS0uMTMxLTIgMC0yIDIgMCA0IDQuNTk1IDkgMTEgOSA2LjQwNCAwIDExLTUgMTEtOSAwLTItMS4zMjEtMi4xMzItMi0yLTIuOTczLjU3OC01LjM3NyAxLTkgMXoiLz48cGF0aCBmaWxsPSIjRkZGIiBkPSJNOSAyM3MzIDEgOSAxIDktMSA5LTEtMiA0LTkgNC05LTQtOS00eiIvPjwvc3ZnPg=='
    )
    const basedOnPng = await renderSvg(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAMAAABiM0N1AAAAh1BMVEVHcEz/zE3/zE3/zE3/zE3/zE3/zE3/zE3/zE3/zE3/zE3/zE3/zE3/zE2pgCJmRQDsu0OfeB31xEjGmTCDXg7isz/Zqjp5VgqWbxiziSfPojWMZxO8kSvs6N/Z0b+zooCWf1CDaDB5XCD18+/////i3M+8ro+MdECfi2BwURDGuZ/Pxa9wTQUxvYUJAAAADnRSTlMAIGCPv9//UJ/vQK+Az1vcyGwAAAJTSURBVHgB5JRFlsQwEENjUhzG+191WM12K7Cbv5WfXFxkMNb5gD+Cd9YUOyhjwBMhlttcjKuQoHJ6XHWDLE2tRRPxlihE1VYQqNp34XQQ6Uy2VRVkqjKTFjaRTC9iI/GwD4m6j+6k10erU4mdPPTOVHdqPww9SF6p7uepe3z97JRSunSBxuGHESSvtMnEpuGHCSSvVCbR+Xn4YwagKJE+Ne5Y+HwBNIX3qXmOnxloSvNXIdyz8vkKVfmtksM9wwWoivsxqo4bVVyOQ0ZclHjUiBMQzjAK7NlRI5jCAsfbD1g2f/9AcgA8gAMrQjxrvX9pWW2QnWeE0OjAYXs20k+tYCQdf8FI4t8ZBZxCeFqRz1bMAsF1GIihH5d3FTQGy3T/65VRtYt+B1Ah0cxIuXi5TiIitgiZNskASKVN5NOIjFYSgE3ItH/IA3sy+6MLsSYSKwr9YzPAPQH+0GDDHfBC+s/2vhUatb/eWKis6qaFl05TVyULvfE6wpK221vSrwZ1PVzTDjfU9aDq95Z0WxZ65QUpsWTUu8IISyQtyNOVHePwnXx027On9vfsiDBYM678OtUYawwdEXTWSGxoSrdM2WCDpLNmxYdrUWA46Z79qMkQrkXy4Tr9MhwY1tP+TqQ/rfcqtCLfnMdojpvI3Zf2F/+4a6S+FPHtMq6fmA92/nE3KsW+CMFG0biIZnP4Y5aZwcvMuPOD+/xPFDyo5M4IKSwcWPFAqM3jGf2oOOcT9Na4LrSVWCOtFjfH9QAFQvBKI1zJEqD2CV9EBajGApR1AerDBQPAoCxnErpYAAAAAElFTkSuQmCC'
    )
    const basedOnJpeg = await renderSvg(
      'data:image/jpeg;base64,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'
    )
    const basedOnGif = await renderSvg(
      'data:image/gif;base64,R0lGODlhSABIANUAAAAAAGZFAHBNBXBREHlWCnlcIINeDoNoMIxnE4x0QJZvGJZ/UJ94HZ+LYKmAIrOJJ7OigLyRK7yuj8aZMMa5n8+iNc/Fr9mqOtnRv+KzP+Lcz+y7Q+zo3/XESPXz7//MTf///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAUKAAAALAAAAABIAEgAAAb/QIBwSCwaj4CPcslkIp/QqJTYrFqd06yWeu16t+CndzwOm5Pk9Pc8VbvLbPF7fo0f6XirfZjv6+N+gU1sgoVLZoaJH2CKiluNiVpqDgEBDn6UlmptaZmVl3iemmlRahuVqAEbdKepqptyZAyuAQx0s662pEhqHbSVHW++v8G7RmoTvwETb8m/zMZcabi0umrUuW7HagbKBm/dv9+wfG7KlW/nAW/Saerp5+zlau/m8dpCc/X09/j6/e4A7vqnDF5BeXPC0RrHzdscNG+wpbI2TRlFSEqc0YKGTBlHjEqG0SrWSxlJkEok1rpVDWWTVqlWzYGJSqbLJaJA0cl5s0om/52hPvUcSrSo0aNIkyodmuHCzQ4XbCbqoJCAggcVpObZUOGBAgKoEJz8UvGcAQQOHkS4wLbthrZsIzxwgEDhr4t1IHpRx7cv34FjRPodPBiwF8EcMEBYcIAw3wILIGDgkMoYmVQHPIDYDEIDBgkQICQYTfoA6dOhJWDQwBmEh8aoyLS7AhZVg9a4c+vevblBKgKy53WRmJm3cd6vs8ERbqUCrQEYjkvnjGEArQrLmVup7WoBh+m8OSz4BTy79iYaaSWgoBm8awoJzn38s82L3V8JIFhgrVuDBdF8MdRFLFdk4NiBrmRgXhFkpIfgYPPRx8sYKj14Dl5VcOJFhRYqt2WGhl080OE5DwSXRRoVCDBiKgJgZ+KJZHSgwIoBKDBWXoykcQECFiLgVDQ5ppEBAyr6JQADCpJzxhwXPIAAd6gQgMADP+Kzh1J7MHhUlvUNxeWELn1ZCkZiwmhImWH4geaVQO4RBAA7'
    )

    expect(toImage(basedOnPlainSvg, 100)).toMatchImageSnapshot()
    expect(toImage(basedOnEncodedSvg, 100)).toMatchImageSnapshot()
    expect(toImage(basedOnPng, 100)).toMatchImageSnapshot()
    expect(toImage(basedOnJpeg, 100)).toMatchImageSnapshot()
    expect(toImage(basedOnGif, 100)).toMatchImageSnapshot()
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

  it('should handle charset=utf-8', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100px',
          height: '100px',
          display: 'flex',
          backgroundImage:
            'url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="15" fill="#ee7621"/></svg>\')',
          backgroundSize: '100px 100px',
        }}
      ></div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should handle charset=utf-8 with comma in data', async () => {
    const svg = await satori(
      <img
        src={`data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 100 100"><polygon fill="#ffffff" points="50,0 100,85 0,85" /></svg>`}
      />,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should handle charset=utf-8 with in base64', async () => {
    const svg = await satori(
      <img
        src={`data:image/svg+xml;charset=utf-8;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTUiIGZpbGw9IiNlZTc2MjEiLz48L3N2Zz4=`}
      />,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
