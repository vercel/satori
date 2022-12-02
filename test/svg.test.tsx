import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils'
import satori from '../src'

describe('SVG', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render svg nodes', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'blue',
          display: 'flex',
        }}
      >
        <svg viewBox='0 0 100 100'>
          <circle
            cx='50'
            cy='50'
            r='10'
            stroke='black'
            strokeWidth='3'
            fill='red'
          />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render svg attributes correctly', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'blue',
          display: 'flex',
        }}
      >
        <svg
          viewBox='0 0 100 100'
          fill='yellow'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle
            cx='50'
            cy='50'
            r='10'
            stroke='black'
            strokeWidth='3'
            fill='red'
          />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render svg size correctly', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'blue',
          display: 'flex',
        }}
      >
        <svg
          width='100'
          viewBox='0 0 10 10'
          fill='yellow'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle
            cx='5'
            cy='5'
            r='4'
            stroke='black'
            strokeWidth='3'
            fill='red'
          />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should parse viewBox correctly', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'blue',
          display: 'flex',
        }}
      >
        <svg
          height='100'
          viewBox='0, 0,10.5 20.5 '
          fill='yellow'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle
            cx='5'
            cy='5'
            r='4'
            stroke='black'
            strokeWidth='3'
            fill='red'
          />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support em in svg size', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'blue',
          display: 'flex',
        }}
      >
        <svg
          height='5em'
          viewBox='0, 0,10.5 20.5 '
          fill='yellow'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle
            cx='5'
            cy='5'
            r='4'
            stroke='black'
            strokeWidth='3'
            fill='red'
          />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should error for svg without viewBox', async () => {
    let error
    try {
      await satori(
        <div>
          <svg xmlns='http://www.w3.org/2000/svg'>
            <circle
              cx='5'
              cy='5'
              r='4'
              fill='red'
            />
          </svg>
        </div>,
        { width: 100, height: 100, fonts }
      )
    } catch (err) {
      error = err
    }
    expect(error.message).toBe('`viewBox` is required to be provided for SVG')
  })
})
