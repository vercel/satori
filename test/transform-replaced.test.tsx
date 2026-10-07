import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'
import { svgTransformToCSS } from '../src/parser/svg-transform.js'

const checker =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#f00"/><rect width="20" height="20" fill="#00f"/><rect x="20" y="20" width="20" height="20" fill="#00f"/></svg>'
  ).toString('base64')

function Center({ children, style }: { children: any; style?: any }) {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#eee',
        alignItems: 'center',
        justifyContent: 'space-around',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function Shape({ style, transform }: { style?: any; transform?: string }) {
  return (
    <svg
      width='40'
      height='40'
      viewBox='0 0 40 40'
      style={style}
      transform={transform}
    >
      <rect width='40' height='40' fill='#0a0' />
      <rect width='20' height='20' fill='#fa0' />
    </svg>
  )
}

describe('transform of images and inline SVGs', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should transform images', async () => {
    const svg = await satori(
      <Center>
        <img
          src={checker}
          width={40}
          height={40}
          style={{ transform: 'rotate(30deg)' }}
        />
        <img
          src={checker}
          width={40}
          height={40}
          style={{ transform: 'scale(1.3, 0.6)' }}
        />
        <img
          src={checker}
          width={40}
          height={40}
          style={{ transform: 'skewX(20deg)' }}
        />
        <img
          src={checker}
          width={40}
          height={40}
          style={{ transform: 'translate(10px, -10px) rotate(-15deg)' }}
        />
      </Center>,
      { width: 240, height: 80, fonts }
    )
    expect(toImage(svg, 240)).toMatchImageSnapshot()
  })

  it('should transform images with their box decorations', async () => {
    const svg = await satori(
      <Center>
        <img
          src={checker}
          width={40}
          height={40}
          style={{ borderRadius: 20, transform: 'rotate(30deg)' }}
        />
        <img
          src={checker}
          width={40}
          height={40}
          style={{
            border: '4px solid #000',
            padding: 4,
            background: '#ff0',
            transform: 'rotate(20deg)',
          }}
        />
        <img
          src={checker}
          width={40}
          height={40}
          style={{ boxShadow: '6px 6px 0 #888', transform: 'rotate(-20deg)' }}
        />
        <img
          src={checker}
          style={{
            width: 50,
            height: 25,
            objectFit: 'cover',
            transform: 'rotate(30deg)',
          }}
        />
      </Center>,
      { width: 240, height: 80, fonts }
    )
    expect(toImage(svg, 240)).toMatchImageSnapshot()
  })

  it('should transform images around the transform origin', async () => {
    const svg = await satori(
      <Center>
        {['center', 'top left', '0 0', '100% 100%', '40px 0'].map((origin) => (
          <div key={origin} style={{ display: 'flex', background: '#ccc' }}>
            <img
              src={checker}
              width={30}
              height={30}
              style={{ transform: 'rotate(30deg)', transformOrigin: origin }}
            />
          </div>
        ))}
      </Center>,
      { width: 250, height: 80, fonts }
    )
    expect(toImage(svg, 250)).toMatchImageSnapshot()
  })

  it('should clip transformed images by overflow', async () => {
    const svg = await satori(
      <Center>
        <div
          style={{
            display: 'flex',
            width: 50,
            height: 50,
            overflow: 'hidden',
            borderRadius: 10,
            background: '#ff0',
          }}
        >
          <img
            src={checker}
            width={50}
            height={50}
            style={{ transform: 'rotate(30deg) scale(1.3)' }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            transform: 'rotate(20deg)',
            padding: 5,
            background: '#ff0',
          }}
        >
          <img src={checker} width={40} height={40} />
        </div>
      </Center>,
      { width: 160, height: 80, fonts }
    )
    expect(toImage(svg, 160)).toMatchImageSnapshot()
  })

  it('should transform inline SVGs with the transform property', async () => {
    const svg = await satori(
      <Center>
        <Shape style={{ transform: 'rotate(45deg)' }} />
        <Shape style={{ transform: 'scale(1.5) rotate(20deg)' }} />
        <Shape style={{ transform: 'rotate(45deg)', transformOrigin: '0 0' }} />
        <Shape
          style={{
            border: '4px solid #000',
            borderRadius: 8,
            transform: 'rotate(-20deg)',
          }}
        />
      </Center>,
      { width: 240, height: 80, fonts }
    )
    expect(toImage(svg, 240)).toMatchImageSnapshot()
  })

  it('should transform inline SVGs with the transform attribute', async () => {
    const svg = await satori(
      <Center>
        <Shape transform='rotate(45)' />
        <Shape transform='scale(1.5, 0.75)' />
        <Shape transform='translate(5 -10) rotate(-30)' />
        <Shape transform='matrix(1 0 0.5 1 0 0)' />
        <Shape transform='rotate(90, -20, -20)' />
      </Center>,
      { width: 300, height: 80, fonts }
    )
    // It isn't applied again inside the image.
    expect(svg).not.toContain('rotate(45)')
    expect(toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should prefer the transform property to the attribute', async () => {
    const [withProperty, withBoth] = await Promise.all(
      [
        <Shape key={0} style={{ transform: 'rotate(10deg)' }} />,
        <Shape
          key={1}
          style={{ transform: 'rotate(10deg)' }}
          transform='rotate(45)'
        />,
      ].map((element) =>
        satori(<Center>{element}</Center>, { width: 100, height: 100, fonts })
      )
    )
    expect(withBoth).toBe(withProperty)
  })

  it('should ignore invalid transform attributes', async () => {
    const [plain, invalid] = await Promise.all(
      [<Shape key={0} />, <Shape key={1} transform='rotate(45deg)' />].map(
        (element) =>
          satori(<Center>{element}</Center>, { width: 100, height: 100, fonts })
      )
    )
    expect(invalid).toBe(plain)
  })
})

describe('svgTransformToCSS', () => {
  it('should convert SVG transforms to a matrix', () => {
    expect(svgTransformToCSS('translate(10)')).toBe('matrix(1,0,0,1,10,0)')
    expect(svgTransformToCSS('translate(10, 20) scale(2)')).toBe(
      'matrix(2,0,0,2,10,20)'
    )
    expect(svgTransformToCSS(' scale(2 3)  translate(1 1) ')).toBe(
      'matrix(2,0,0,3,2,3)'
    )
    expect(svgTransformToCSS('rotate(90)')).toBe('matrix(0,1,-1,0,0,0)')
    expect(svgTransformToCSS('rotate(90 10 0)')).toBe('matrix(0,1,-1,0,10,-10)')
    expect(svgTransformToCSS('skewX(45),skewY(45)')).toBe('matrix(2,1,1,1,0,0)')
    expect(svgTransformToCSS('matrix(1,2,3,4,5,6)')).toBe('matrix(1,2,3,4,5,6)')
  })

  it('should reject invalid transforms', () => {
    for (const value of [
      '',
      'rotate(45deg)',
      'rotate(1 2)',
      'translate(1px)',
      'scale()',
      'matrix(1 2 3)',
      'perspective(10)',
      'rotate(1) x',
    ]) {
      expect(svgTransformToCSS(value)).toBeUndefined()
    }
  })
})
