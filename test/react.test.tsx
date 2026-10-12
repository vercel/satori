import { forwardRef } from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('React APIs', () => {
  let fonts: any
  initFonts((f) => (fonts = f))

  it('should support `forwardRef` wrapped components', async () => {
    const Foo = forwardRef(function _() {
      return <div>hello</div>
    })

    const svg = await satori(
      <div
        style={{
          display: 'flex',
          color: 'red',
          fontSize: 14,
        }}
      >
        <Foo />
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render sibling components concurrently', async () => {
    // The first component waits for the second one, which would never render
    // if they were rendered one by one.
    let start: () => void
    const started = new Promise<void>((resolve) => (start = resolve))
    async function First() {
      await started
      return <span>First</span>
    }
    async function Second() {
      start()
      return <span>Second</span>
    }

    const options = { width: 100, height: 40, fonts }
    expect(
      await satori(
        <div style={{ display: 'flex' }}>
          {/* @ts-ignore */}
          <First />
          {/* @ts-ignore */}
          <Second />
        </div>,
        options
      )
    ).toBe(
      await satori(
        <div style={{ display: 'flex' }}>
          <span>First</span>
          <span>Second</span>
        </div>,
        options
      )
    )
  })

  it('should render components in <svg>', async () => {
    const Circle = ({ fill }: { fill: string }) => (
      <circle cx='5' cy='5' r='5' fill={fill} />
    )
    const options = { width: 20, height: 20, fonts }
    expect(
      await satori(
        <svg width='10' height='10' viewBox='0 0 10 10'>
          <Circle fill='red' />
        </svg>,
        options
      )
    ).toBe(
      await satori(
        <svg width='10' height='10' viewBox='0 0 10 10'>
          <circle cx='5' cy='5' r='5' fill='red' />
        </svg>,
        options
      )
    )
  })
})
