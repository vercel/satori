import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'
import { expandBackground } from '../src/parser/background.js'

describe('background', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const render = async (style: any, size = 100) =>
    toImage(
      await satori(
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
          <div style={{ width: size, height: size, ...style }} />
        </div>,
        { width: size, height: size, fonts }
      ),
      size
    )

  it('should draw several layers above the color', async () => {
    expect(
      await render({
        background:
          'linear-gradient(90deg, rgba(255,0,0,.8), rgba(0,0,255,.8)) left top / 50% 50% no-repeat, repeating-linear-gradient(45deg, #ccc 0 5px, #fff 5px 10px) #ffeb3b',
      })
    ).toMatchImageSnapshot()
  })

  it('should position, size and repeat layers', async () => {
    expect(
      await render({
        background:
          'radial-gradient(circle, red 40%, transparent 41%) center / 25px 25px space, linear-gradient(blue, green) right bottom / 40% no-repeat, #eee',
      })
    ).toMatchImageSnapshot()
  })

  it('should repeat layers along one axis', async () => {
    const tile = 'linear-gradient(red, blue) 0 0 / 20px 20px'
    const image = await toImage(
      await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            gap: 4,
            background: '#eee',
          }}
        >
          <div style={{ height: 30, background: `${tile} repeat-x` }} />
          <div style={{ height: 30, background: `${tile} repeat no-repeat` }} />
          <div
            style={{ height: 60, width: 60, background: `${tile} repeat-y` }}
          />
        </div>,
        { width: 100, height: 132, fonts }
      ),
      100
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should space and round repeated layers', async () => {
    const dot = 'radial-gradient(circle, red 40%, transparent 41%)'
    const image = await toImage(
      await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            gap: 4,
            background: '#eee',
          }}
        >
          <div
            style={{ height: 30, background: `${dot} center / 30px space` }}
          />
          <div style={{ height: 30, background: `${dot} 0 0 / 30px round` }} />
          <div
            style={{
              height: 30,
              background: `${dot} 0 0 / 30px 30px round space`,
            }}
          />
        </div>,
        { width: 100, height: 98, fonts }
      ),
      100
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should position layers with keywords and offsets', async () => {
    const tile = 'linear-gradient(red, blue)'
    const image = await toImage(
      await satori(
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            width: '100%',
            height: '100%',
            gap: 4,
            background: '#fff',
          }}
        >
          {[
            'center',
            'right bottom',
            'bottom 5px right 10px',
            'left 25% top 5px',
            '75%',
            'top',
          ].map((position) => (
            <div
              key={position}
              style={{
                width: 48,
                height: 48,
                backgroundColor: '#ddd',
                backgroundImage: tile,
                backgroundSize: '20px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: position,
              }}
            />
          ))}
        </div>,
        { width: 100, height: 152, fonts }
      ),
      100
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should support single lengths in the longhands', async () => {
    expect(
      await render({
        backgroundColor: '#ddd',
        backgroundImage: 'linear-gradient(red, blue)',
        backgroundSize: '40px',
        backgroundPosition: '10px',
        backgroundRepeat: 'no-repeat',
        border: '5px solid black',
      })
    ).toMatchImageSnapshot()
  })

  it('should support the clip box', async () => {
    expect(
      await render({
        background: 'linear-gradient(red, blue) content-box',
        padding: 15,
        border: '10px dashed black',
      })
    ).toMatchImageSnapshot()
  })

  it('should support color keywords in any case', async () => {
    const image = await toImage(
      await satori(
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            background: 'Cyan',
            padding: 10,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              background: 'MAGENTA',
              border: '6px solid Cyan',
              borderTopColor: 'RED',
              fontSize: 24,
              color: 'white',
              textShadow: '2px 2px Black',
            }}
          >
            Hi
          </div>
        </div>,
        { width: 100, height: 100, fonts }
      ),
      100
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should reset the longhands', async () => {
    const svg = await satori(
      <div
        style={{
          width: 50,
          height: 50,
          backgroundColor: 'red',
          backgroundImage: 'linear-gradient(red, blue)',
          background: 'none',
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(svg).not.toContain('red')
    expect(svg).not.toContain('<pattern')
  })

  it('should expand the shorthand', () => {
    expect(
      expandBackground(
        'red url(a.png) repeat-x 10px 20px / 50% auto padding-box content-box'
      )
    ).toEqual({
      backgroundColor: 'red',
      backgroundImage: 'url(a.png)',
      backgroundPosition: '10px 20px',
      backgroundSize: '50% auto',
      backgroundRepeat: 'repeat-x',
      backgroundOrigin: 'padding-box',
      backgroundClip: 'content-box',
    })
    expect(
      expandBackground('url(a.png) top left / cover no-repeat, blue')
    ).toEqual({
      backgroundColor: 'blue',
      backgroundImage: 'url(a.png), none',
      backgroundPosition: 'top left, 0% 0%',
      backgroundSize: 'cover, auto',
      backgroundRepeat: 'no-repeat, repeat',
      backgroundOrigin: 'padding-box, padding-box',
      backgroundClip: undefined,
    })
  })

  it('should throw for invalid values', () => {
    for (const value of [
      'red blue',
      'url(a) url(b)',
      'center /',
      ', red',
      'red, url(a)',
      'fixed fixed',
    ]) {
      expect(() => expandBackground(value), value).toThrow(
        'Invalid `background` value'
      )
    }
  })
})
