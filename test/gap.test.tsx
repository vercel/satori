import { it, describe, expect } from 'vitest'

import { toImage } from './utils.js'
import satori from '../src/index.js'

const items = [
  'red',
  'red',
  'red',
  'green',
  'green',
  'green',
  'blue',
  'blue',
  'blue',
]

describe('flex gap', () => {
  it('should support gap', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          backgroundColor: '#e2e2e2',
          gap: 30,
        }}
      >
        {items.map((color, index) => (
          <div
            key={index}
            style={{
              width: 10,
              height: 10,
              backgroundColor: color,
            }}
          ></div>
        ))}
      </div>,
      { width: 100, height: 100, fonts: [] }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support rowGap and columnGap', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          backgroundColor: '#e2e2e2',
          rowGap: 60,
          columnGap: 80,
        }}
      >
        {items.slice(0, 4).map((color, index) => (
          <div
            key={index}
            style={{
              width: 10,
              height: 10,
              backgroundColor: color,
            }}
          ></div>
        ))}
      </div>,
      { width: 100, height: 100, fonts: [] }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support percentage values as gap', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          backgroundColor: '#e2e2e2',
          gap: '10%',
        }}
      >
        {items.map((color, index) => (
          <div
            key={index}
            style={{
              width: 10,
              height: 10,
              backgroundColor: color,
            }}
          ></div>
        ))}
      </div>,
      { width: 100, height: 100, fonts: [] }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
