import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Opacity', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render element with opacity 0', async () => {
    const svg = await satori(
      <div
        style={{
          width: 50,
          height: 50,
          background: 'red',
          opacity: 0,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render element with opacity 0.5', async () => {
    const svg = await satori(
      <div
        style={{
          width: 50,
          height: 50,
          background: 'red',
          opacity: 0.5,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render element with opacity 1', async () => {
    const svg = await satori(
      <div
        style={{
          width: 50,
          height: 50,
          background: 'red',
          opacity: 1,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should apply opacity to text elements', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 40,
          color: 'black',
          opacity: 0.5,
        }}
      >
        Hello World
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should combine opacity with linear gradients', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          background: 'linear-gradient(to right, red, blue)',
          opacity: 0.7,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should combine opacity with radial gradients', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          background: 'radial-gradient(circle, yellow, green)',
          opacity: 0.6,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should cascade opacity through nested elements', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', opacity: 0.5 }}>
        <div
          style={{
            width: 50,
            height: 50,
            background: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should combine multiple opacity values in nested elements', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', opacity: 0.8 }}>
        <div
          style={{
            width: 50,
            height: 50,
            background: 'red',
            opacity: 0.5,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should apply opacity to elements with box-shadow', async () => {
    const svg = await satori(
      <div
        style={{
          width: 50,
          height: 50,
          margin: '25px 25px',
          background: 'white',
          boxShadow: '10px 10px 10px rgba(0, 0, 0, 0.5)',
          opacity: 0.6,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should apply opacity to text with text-shadow', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 40,
          color: 'black',
          textShadow: '2px 2px 2px red',
          opacity: 0.7,
        }}
      >
        Hello
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should apply opacity to elements with border', async () => {
    const svg = await satori(
      <div
        style={{
          width: 50,
          height: 50,
          background: 'white',
          border: '5px solid red',
          opacity: 0.5,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should apply opacity to elements with border-radius', async () => {
    const svg = await satori(
      <div
        style={{
          width: 50,
          height: 50,
          background: 'blue',
          borderRadius: 25,
          opacity: 0.5,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should apply opacity with transform', async () => {
    const svg = await satori(
      <div
        style={{
          width: 50,
          height: 50,
          background: 'green',
          transform: 'rotate(45deg)',
          opacity: 0.6,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should handle opacity 0 with nested content', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'red',
          opacity: 0,
        }}
      >
        <div
          style={{
            fontSize: 20,
            color: 'white',
          }}
        >
          Hidden Text
        </div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should apply opacity to flex container', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: 100,
          height: 100,
          gap: 10,
          opacity: 0.5,
        }}
      >
        <div style={{ width: 40, height: 40, background: 'red' }} />
        <div style={{ width: 40, height: 40, background: 'blue' }} />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should apply opacity to positioned elements', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            width: 50,
            height: 50,
            background: 'purple',
            opacity: 0.4,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should combine opacity with background-clip text', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 40,
          background: 'linear-gradient(90deg, #ff00bc, #6400ff)',
          backgroundClip: 'text',
          color: 'transparent',
          opacity: 0.7,
        }}
      >
        Hello
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should apply very low opacity', async () => {
    const svg = await satori(
      <div
        style={{
          width: 50,
          height: 50,
          background: 'black',
          opacity: 0.1,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should apply near-full opacity', async () => {
    const svg = await satori(
      <div
        style={{
          width: 50,
          height: 50,
          background: 'black',
          opacity: 0.99,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should apply opacity to multiple siblings', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 100,
          height: 100,
        }}
      >
        <div
          style={{
            width: 100,
            height: 30,
            background: 'red',
            opacity: 0.3,
          }}
        />
        <div
          style={{
            width: 100,
            height: 30,
            background: 'green',
            opacity: 0.6,
          }}
        />
        <div
          style={{
            width: 100,
            height: 30,
            background: 'blue',
            opacity: 0.9,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should apply opacity to overlapping elements', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 60,
            height: 60,
            background: 'red',
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 40,
            width: 60,
            height: 60,
            background: 'blue',
            opacity: 0.5,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
