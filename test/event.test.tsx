import { it, describe, expect } from 'vitest'

import { initFonts } from './utils.js'
import satori from '../src/index.js'

describe('Event', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should trigger the onNodeDetected callback', async () => {
    const nodes = []
    await satori(
      <div style={{ width: '100%', height: 50, display: 'flex' }}>
        <div>Hello</div>
        <div>World</div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
        onNodeDetected: (node) => {
          nodes.push(node)
        },
      }
    )
    expect(nodes).toMatchInlineSnapshot(`
      [
        {
          "height": 50,
          "key": null,
          "left": 0,
          "props": {
            "style": {
              "display": "flex",
              "height": 50,
              "width": "100%",
            },
          },
          "textContent": undefined,
          "top": 0,
          "type": "div",
          "width": 100,
        },
        {
          "height": 50,
          "key": null,
          "left": 0,
          "props": {},
          "textContent": "Hello",
          "top": 0,
          "type": "div",
          "width": 37,
        },
        {
          "height": 50,
          "key": null,
          "left": 37,
          "props": {},
          "textContent": "World",
          "top": 0,
          "type": "div",
          "width": 42,
        },
      ]
    `)
  })

  it('should report inline elements like getBoundingClientRect', async () => {
    const rects: Record<string, number[]> = {}
    await satori(
      <div
        style={{
          display: 'block',
          width: 200,
          padding: 10,
          fontSize: 16,
          lineHeight: 1.5,
        }}
      >
        Text with a{' '}
        <span key='wrapped' style={{ padding: '0 4px', border: '1px solid' }}>
          span that wraps onto the next line
        </span>{' '}
        and an <span key='empty'></span> empty one.
      </div>,
      {
        width: 220,
        height: 100,
        fonts,
        onNodeDetected: ({ key, left, top, width, height }) => {
          if (key) rects[key] = [left, top, width, height]
        },
      }
    )

    // The union of the fragments on each line, as measured in Chrome.
    const expected = {
      wrapped: [10, 11, 199.6, 45],
      empty: [189.1, 36, 0, 19],
    }
    for (const [key, rect] of Object.entries(expected)) {
      rect.forEach((value, i) => expect(rects[key][i]).toBeCloseTo(value, 0))
    }
  })
})
