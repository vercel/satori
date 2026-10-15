import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('text-wrap', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should wrap normally with text-wrap: wrap', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          fontSize: 18,
          color: 'red',
          // @ts-ignore: This isn't a valid CSS property supported by browsers yet.
          textWrap: 'wrap',
        }}
      >
        {'a a a a a a a a'}
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should wrap balancedly with text-wrap: balance', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          fontSize: 18,
          color: 'red',
          // @ts-ignore: This isn't a valid CSS property supported by browsers yet.
          textWrap: 'balance',
        }}
      >
        {'a a a a a a a a'}
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should inherit text-wrap', async () => {
    const render = (parent: object, child: object) =>
      satori(
        <div style={{ display: 'flex', flexDirection: 'column', ...parent }}>
          <div style={{ width: 100, fontSize: 18, ...child }}>
            a a a a a a a a
          </div>
          <div style={{ width: 100, fontSize: 18, ...child }}>
            a a a a a <b>a</b> a a
          </div>
        </div>,
        { width: 100, height: 200, fonts }
      )
    expect(await render({ textWrap: 'balance' }, {})).toBe(
      await render({}, { textWrap: 'balance' })
    )
  })

  it('should balance text with inline elements', async () => {
    const render = async (content: JSX.Element, textWrap: string) =>
      toImage(
        await satori(
          <div
            style={{
              width: 100,
              fontSize: 18,
              color: 'red',
              textAlign: 'center',
              // @ts-ignore
              textWrap,
            }}
          >
            {content}
          </div>,
          { width: 100, height: 100, fonts }
        ),
        100
      )
    // Greedily, the first line has 6 of the 8 words, and balanced 4.
    expect(
      await render(
        <>
          a a a a a <b>a</b> a a
        </>,
        'balance'
      )
    ).toEqual(
      await render(
        <>
          a a a a
          <br />a <b>a</b> a a
        </>,
        'wrap'
      )
    )
  })
  it('should not change the size of balanced text', async () => {
    // Like in browsers, the box is as wide as without balancing, and the lines
    // are balanced in it.
    const measure = async (textWrap?: string) => {
      const boxes: { width: number; height: number }[] = []
      await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: 200,
            fontSize: 16,
          }}
        >
          <div id='text' style={{ maxWidth: 120, textWrap } as any}>
            {'aa aa aa aa aa aa aa aa aa'}
          </div>
        </div>,
        {
          width: 200,
          height: 100,
          fonts,
          onNodeDetected: (node) => {
            if (node.props.id === 'text') boxes.push(node)
          },
        }
      )
      return { width: boxes[0].width, height: boxes[0].height }
    }
    const balanced = await measure('balance')
    expect(balanced).toEqual(await measure())
    expect(balanced.width).toBe(120)
  })
})
