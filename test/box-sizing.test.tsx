import { it, describe, expect } from 'vitest'

import { toImage } from './utils.js'
import satori from '../src/index.js'

describe('box sizing', () => {
  it('should default to border-box', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          backgroundColor: '#e2e2e2',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 50,
            height: 50,
            padding: 10,
            boxSizing: 'border-box',
            backgroundColor: 'purple',
          }}
        >
          <div
            style={{
              height: '100%',
              width: '100%',
              backgroundColor: 'white',
            }}
          />
        </div>
      </div>,
      { width: 100, height: 100, fonts: [] }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support content-box', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          backgroundColor: '#e2e2e2',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 50,
            height: 50,
            padding: 10,
            boxSizing: 'content-box',
            backgroundColor: 'purple',
          }}
        >
          <div
            style={{
              height: '100%',
              width: '100%',
              backgroundColor: 'white',
            }}
          />
        </div>
      </div>,
      { width: 100, height: 100, fonts: [] }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
