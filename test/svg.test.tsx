import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

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

  it('should support currentColor for svg fill', async () => {
    const svg = await satori(
      <svg
        width='40'
        height='40'
        viewBox='0 0 15 15'
        fill='none'
        style={{ color: 'black' }}
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          d='M0.877014 7.49988C0.877014 3.84219 3.84216 0.877045 7.49985 0.877045C11.1575 0.877045 14.1227 3.84219 14.1227 7.49988C14.1227 11.1575 11.1575 14.1227 7.49985 14.1227C3.84216 14.1227 0.877014 11.1575 0.877014 7.49988ZM7.49985 1.82704C4.36683 1.82704 1.82701 4.36686 1.82701 7.49988C1.82701 8.97196 2.38774 10.3131 3.30727 11.3213C4.19074 9.94119 5.73818 9.02499 7.50023 9.02499C9.26206 9.02499 10.8093 9.94097 11.6929 11.3208C12.6121 10.3127 13.1727 8.97172 13.1727 7.49988C13.1727 4.36686 10.6328 1.82704 7.49985 1.82704ZM10.9818 11.9787C10.2839 10.7795 8.9857 9.97499 7.50023 9.97499C6.01458 9.97499 4.71624 10.7797 4.01845 11.9791C4.97952 12.7272 6.18765 13.1727 7.49985 13.1727C8.81227 13.1727 10.0206 12.727 10.9818 11.9787ZM5.14999 6.50487C5.14999 5.207 6.20212 4.15487 7.49999 4.15487C8.79786 4.15487 9.84999 5.207 9.84999 6.50487C9.84999 7.80274 8.79786 8.85487 7.49999 8.85487C6.20212 8.85487 5.14999 7.80274 5.14999 6.50487ZM7.49999 5.10487C6.72679 5.10487 6.09999 5.73167 6.09999 6.50487C6.09999 7.27807 6.72679 7.90487 7.49999 7.90487C8.27319 7.90487 8.89999 7.27807 8.89999 6.50487C8.89999 5.73167 8.27319 5.10487 7.49999 5.10487Z'
          fill='currentColor'
          fillRule='evenodd'
          clipRule='evenodd'
        />
      </svg>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support currentColor for svg stroke', async () => {
    const svg = await satori(
      <svg
        viewBox='0 0 20 10'
        xmlns='http://www.w3.org/2000/svg'
        style={{ color: 'blue' }}
      >
        <circle cx='5' cy='5' r='4' fill='none' stroke='currentColor' />
      </svg>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support currentColor when color is set on parent element', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 32,
          fontWeight: 600,
          color: 'red',
        }}
      >
        <svg
          width='75'
          viewBox='0 0 75 65'
          fill='currentColor'
          style={{ margin: '0 75px' }}
        >
          <path d='M37.59.25l36.95 64H.64l36.95-64z'></path>
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render svg prefer size props rather than viewBox', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100px',
          height: '100px',
          background: '#8250df',
          display: 'flex',
        }}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='60'
          viewBox='0 0 100 100'
        >
          <circle cx='50' cy='50' r='50' fill='red' />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support currentColor when used on svg nodes', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          color: 'red',
        }}
      >
        <svg
          width='75'
          viewBox='0 0 75 65'
          fill='#000'
          style={{ margin: '0 75px' }}
        >
          <path
            stroke='currentColor'
            d='M37.59.25l36.95 64H.64l36.95-64z'
          ></path>
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render svg without viewBox', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100px',
          height: '100px',
          background: '#1a73e8',
          display: 'flex',
        }}
      >
        <svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'>
          <circle cx='50' cy='50' r='50' fill='red' />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  // TODO wait for @resvg/resvg-js to support mask-type
  it('should respect style on svg node', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'>
          <circle cx='50' cy='50' r='50' style={{ fill: 'gold' }} />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
