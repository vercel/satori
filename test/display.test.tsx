import { it, describe, expect } from 'vitest'

import { toImage } from './utils.js'
import satori from '../src/index.js'

describe('display', () => {
  it('should support display: contents', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          gap: 10,
          backgroundColor: '#e2e2e2',
        }}
      >
        <div
          style={{
            display: 'contents',
          }}
        >
          <div
            style={{
              height: 10,
              width: 10,
              backgroundColor: 'black',
            }}
          />
          <div
            style={{
              height: 10,
              width: 10,
              backgroundColor: 'black',
            }}
          />
        </div>
      </div>,
      { width: 100, height: 100, fonts: [] }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
