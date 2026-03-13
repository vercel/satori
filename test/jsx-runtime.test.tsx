/** @jsxRuntime automatic */
/** @jsxImportSource ../src/jsx */
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori, { type Font } from '../src/index.js'

describe('Minimal JSX runtime', () => {
  let fonts: Font[]
  initFonts((f) => (fonts = f))

  it('should support async function components', async () => {
    function MyComponent() {
      return <h1 style={{ fontSize: 16 }}>Hello from My Component</h1>
    }

    const svg = await satori(
      <div
        style={{
          backgroundColor: '#ff0',
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <MyComponent />
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()

    async function MyAsyncComponent() {
      await new Promise((resolve) => setTimeout(resolve, 0))
      return <h1 style={{ fontSize: 16 }}>Hello from My Async Component</h1>
    }
    const svg2 = await satori(
      <div
        style={{
          backgroundColor: '#ff0',
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <MyAsyncComponent />
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg2, 100)).toMatchImageSnapshot()
  })

  it('should support Fragment elements', async () => {
    const MyComponent = () => (
      <>
        <h1 style={{ fontSize: 16 }}>
          <>Hello from My Component</>
        </h1>
      </>
    )
    const svg = await satori(<MyComponent />, {
      width: 100,
      height: 100,
      fonts,
    })
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
