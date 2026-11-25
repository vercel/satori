import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'
import { LayoutNode } from '../src/layout-engine/node.js'
import { getLayoutEngine } from '../src/layout-engine/wasm.bundled.js'

describe('Layout', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should stretch items by default', async () => {
    const svg = await satori(
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'blue' }}>x</div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('can lay out another tree after a calc callback throws', async () => {
    const engine = await getLayoutEngine()
    const error = new Error('calc failed')
    const root = new LayoutNode({ width: 100, height: 100 })
    root.insertChild(
      new LayoutNode({
        width: {
          calc() {
            throw error
          },
        },
        height: 10,
      })
    )

    expect(() => engine.computeLayout(root)).toThrow(error)

    const next = new LayoutNode({ width: 20, height: 10 })
    engine.computeLayout(next)
    expect(next.layout.width).toBe(20)
  })
})
