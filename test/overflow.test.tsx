import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Overflow', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should not show overflowed text', async () => {
    const svg = await satori(
      <div
        style={{
          width: 15,
          height: 15,
          backgroundColor: 'white',
          overflow: 'hidden',
        }}
      >
        Hello
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should work with nested border, border-radius, padding', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          border: '10px solid rgba(0,0,0,0.5)',
          borderRadius: '100px 20%',
          display: 'flex',
          overflow: 'hidden',
          background: 'green',
          padding: 5,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'red',
            borderRadius: '0% 60%',
            display: 'flex',
            padding: 5,
            overflow: 'hidden',
          }}
        >
          <div style={{ width: '100%', height: '100%', background: 'blue' }}>
            Satori
          </div>
        </div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should work with ellipsis, nowrap', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: 'white',
          fontSize: 60,
          fontWeight: 400,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 450,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              width: 450,
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {'LuciNyan 1 2 345'}
          </div>
          <div
            style={{
              width: 450,
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {'LuciNyan 1 2 345 6'}
          </div>
        </div>
      </div>,
      { width: 450, height: 450, fonts, embedFont: true }
    )
    expect(await toImage(svg, 450)).toMatchImageSnapshot()
  })

  it("should not work when overflow is not 'hidden' and overflow property should not be inherited", async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: 'white',
          fontSize: 60,
          fontWeight: 400,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 450,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              width: 450,
              textOverflow: 'ellipsis',
            }}
          >
            {'LuciNyan 1 2 345'}
          </div>
          <div
            style={{
              width: 450,
              textOverflow: 'ellipsis',
            }}
          >
            {'LuciNyan 1 2 345 6'}
          </div>
        </div>
      </div>,
      { width: 450, height: 450, fonts, embedFont: true }
    )
    expect(await toImage(svg, 450)).toMatchImageSnapshot()
  })

  describe('values', () => {
    const child = (
      <div
        style={{
          width: 90,
          height: 90,
          marginLeft: -15,
          marginTop: -15,
          background: 'linear-gradient(45deg, red, gold)',
        }}
      />
    )
    const box = (style: Record<string, any>) => (
      <div
        style={{
          width: 60,
          height: 60,
          border: '4px solid black',
          borderRadius: 14,
          background: '#ddd',
          ...style,
        }}
      >
        {child}
      </div>
    )

    it('should clip with hidden, clip, scroll and auto', async () => {
      const svg = await satori(
        <div style={{ display: 'flex', gap: 30, padding: 20 }}>
          {box({ overflow: 'hidden' })}
          {box({ overflow: 'clip' })}
          {box({ overflow: 'scroll' })}
          {box({ overflow: 'auto' })}
          {box({ overflow: 'visible' })}
        </div>,
        { width: 420, height: 100, fonts }
      )
      expect(await toImage(svg, 420)).toMatchImageSnapshot()
    })

    it('should clip each axis', async () => {
      const svg = await satori(
        <div style={{ display: 'flex', gap: 30, padding: 20 }}>
          {box({ overflowX: 'clip' })}
          {box({ overflowY: 'clip' })}
          {box({ overflowY: 'hidden' })}
          {box({ overflow: 'hidden visible' })}
          {box({ overflow: 'clip visible' })}
        </div>,
        { width: 420, height: 100, fonts }
      )
      expect(await toImage(svg, 420)).toMatchImageSnapshot()
    })

    it('should extend the clip by overflowClipMargin', async () => {
      const svg = await satori(
        <div style={{ display: 'flex', gap: 30, padding: 25 }}>
          {box({ overflow: 'clip', overflowClipMargin: 10 })}
          {box({
            overflow: 'clip',
            overflowClipMargin: 'content-box',
            padding: 6,
            background: 'none',
          })}
          {box({ overflow: 'clip', overflowClipMargin: 'border-box 5px' })}
          {box({ overflowX: 'clip', overflowClipMargin: 8 })}
        </div>,
        { width: 420, height: 110, fonts }
      )
      expect(await toImage(svg, 420)).toMatchImageSnapshot()
    })

    it('should only make scroll containers with values other than clip', async () => {
      const svg = await satori(
        <div style={{ padding: 6, fontSize: 14 }}>
          <div
            style={{
              float: 'left',
              width: 60,
              height: 70,
              background: 'purple',
            }}
          />
          <div style={{ overflow: 'clip', background: '#fee' }}>
            clip goes under
          </div>
          <div style={{ overflow: 'auto', background: '#efe' }}>
            auto beside
          </div>
          <div
            style={{
              display: 'flex',
              clear: 'left',
              width: 200,
              gap: 6,
              paddingTop: 6,
            }}
          >
            <div
              style={{
                overflow: 'clip',
                background: '#fee',
                whiteSpace: 'nowrap',
              }}
            >
              clip keeps min-content
            </div>
            <div
              style={{
                overflow: 'hidden',
                background: '#efe',
                whiteSpace: 'nowrap',
              }}
            >
              hidden can shrink
            </div>
          </div>
        </div>,
        { width: 300, height: 120, fonts }
      )
      expect(await toImage(svg, 300)).toMatchImageSnapshot()
    })

    it('should show an ellipsis with clip', async () => {
      const svg = await satori(
        <div style={{ padding: 6, fontSize: 14 }}>
          <div
            style={{
              width: 150,
              whiteSpace: 'nowrap',
              overflow: 'clip',
              textOverflow: 'ellipsis',
              background: '#eee',
            }}
          >
            A long line of text that overflows
          </div>
          <div
            style={{
              width: 150,
              whiteSpace: 'nowrap',
              overflowX: 'clip',
              background: '#eef',
            }}
          >
            A long line of text that overflows
          </div>
        </div>,
        { width: 300, height: 50, fonts }
      )
      expect(await toImage(svg, 300)).toMatchImageSnapshot()
    })

    it('should throw for invalid values', async () => {
      await expect(
        satori(<div style={{ overflow: 'sideways' as any }} />, {
          width: 100,
          height: 100,
          fonts,
        })
      ).rejects.toThrowError('Invalid value for CSS property "overflow"')
    })
  })

  it('should only keep a character before an ellipsis at the start of a line', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: 8,
          width: '100%',
          height: '100%',
          background: '#fff',
          fontSize: 14,
        }}
      >
        {[60, 75, 90, 105, 120, 135, 150, 165, 180, 12].map((width) => (
          <div
            style={{
              width,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              background: '#eef',
              marginBottom: 2,
            }}
          >
            search-indexer-with-a-long-name
          </div>
        ))}
      </div>,
      { width: 200, height: 220, fonts }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })
})
