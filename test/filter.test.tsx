import { it, describe, expect } from 'vitest'
import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

const circle =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="20" fill="#eee"/></svg>'
  )

describe('filter', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const frame = (children) => (
    <div
      style={{
        display: 'flex',
        width: 160,
        height: 100,
        background: '#111',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  )

  it('should not clip the filter of images to the image', async () => {
    const svg = await satori(
      frame(
        <>
          <img
            src={circle}
            width={40}
            height={40}
            style={{ filter: 'drop-shadow(0 0 8px white)', marginRight: 20 }}
          />
          <svg
            width='40'
            height='40'
            viewBox='0 0 40 40'
            style={{ filter: 'drop-shadow(0 0 8px white)' }}
          >
            <circle cx='20' cy='20' r='20' fill='#eee' />
          </svg>
        </>
      ),
      { width: 160, height: 100, fonts }
    )
    expect(await toImage(svg, 160)).toMatchImageSnapshot()
  })

  it('should blur rounded images beyond their corners', async () => {
    const svg = await satori(
      frame(
        <img
          src={circle}
          width={40}
          height={40}
          style={{ filter: 'blur(4px)', borderRadius: 8, objectFit: 'cover' }}
        />
      ),
      { width: 160, height: 100, fonts }
    )
    expect(await toImage(svg, 160)).toMatchImageSnapshot()
  })

  it('should blur the content of an element after its overflow clip', async () => {
    const svg = await satori(
      frame(
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: 80,
            height: 50,
            background: '#eee',
            overflow: 'hidden',
            filter: 'blur(4px)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -10,
              top: -10,
              width: 50,
              height: 30,
              background: '#f60',
            }}
          />
        </div>
      ),
      { width: 160, height: 100, fonts }
    )
    expect(await toImage(svg, 160)).toMatchImageSnapshot()
  })

  it('should clip the filtered element with its clip path', async () => {
    const svg = await satori(
      frame(
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: 80,
            height: 50,
            background: '#eee',
            clipPath: 'inset(0 round 10px)',
            filter: 'blur(4px)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -10,
              top: -10,
              width: 50,
              height: 30,
              background: '#f60',
            }}
          />
        </div>
      ),
      { width: 160, height: 100, fonts }
    )
    expect(await toImage(svg, 160)).toMatchImageSnapshot()
  })

  it('should blur text with background-clip: text', async () => {
    const svg = await satori(
      frame(
        <div
          style={{
            fontSize: 40,
            backgroundImage: 'linear-gradient(90deg, #f60, #0af)',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'blur(2px)',
          }}
        >
          Blur
        </div>
      ),
      { width: 160, height: 100, fonts }
    )
    expect(await toImage(svg, 160)).toMatchImageSnapshot()
  })

  it('should filter an element and its descendants as a group', async () => {
    const svg = await satori(
      frame(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            color: '#fff',
            fontSize: 20,
            filter: 'grayscale(1) drop-shadow(4px 4px 0 #f60)',
          }}
        >
          <span>Parent</span>
          <span style={{ background: '#0af', marginTop: -6 }}>child</span>
        </div>
      ),
      { width: 160, height: 100, fonts }
    )
    // The child overlaps the parent's text, so the shadow is only cast by
    // the outline of both together.
    expect(svg.match(/<filter /g)).toHaveLength(1)
    expect(await toImage(svg, 160)).toMatchImageSnapshot()
  })

  it('should apply chained filters in order', async () => {
    const box = (filter: string) => (
      <div
        style={{
          width: 30,
          height: 30,
          margin: 6,
          background: '#f60',
          filter,
        }}
      />
    )
    const svg = await satori(
      frame(
        <>
          {box('blur(2px) drop-shadow(0 0 4px #0af)')}
          {box('drop-shadow(4px 4px 0 #0af) blur(2px)')}
          {box('hue-rotate(180deg) opacity(50%)')}
        </>
      ),
      { width: 160, height: 100, fonts }
    )
    expect(await toImage(svg, 160)).toMatchImageSnapshot()
  })
})
