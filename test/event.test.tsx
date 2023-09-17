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
})
