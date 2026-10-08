import { it, describe, expect } from 'vitest'
import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'
import { parseMath } from '../src/parser/math.js'

describe('Math functions', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const evaluate = (value: string, basis = 0) =>
    parseMath(value, (length) => parseFloat(length))?.evaluate(basis)

  it('should parse math functions', () => {
    expect(evaluate('calc(2px + 3px * 2)')).toBe(8)
    expect(evaluate('calc((2px + 3px) * 2)')).toBe(10)
    expect(evaluate('calc(100% - calc(10px * 2))', 100)).toBe(80)
    expect(evaluate('calc(-50% - -10px)', 100)).toBe(-40)
    expect(evaluate('min(50%, 60px)', 100)).toBe(50)
    expect(evaluate('max(50%, 60px)', 100)).toBe(60)
    expect(evaluate('clamp(20px, 30%, 100px)', 50)).toBe(20)
    expect(evaluate('clamp(20px, 30%, 100px)', 1000)).toBe(100)
    expect(parseMath('calc(50%)', () => 0).percentage).toBe(true)
    expect(parseMath('calc(1px + 2px)', parseFloat).percentage).toBe(false)
    // Invalid types.
    expect(evaluate('calc(2px * 3px)')).toBeUndefined()
    expect(evaluate('calc(1px + 2)')).toBeUndefined()
    expect(evaluate('calc(1px / 2px)')).toBeUndefined()
    expect(evaluate('calc(1px + )')).toBeUndefined()
  })

  it('should resolve math functions in lengths', async () => {
    const bar = (style, color) => (
      <div
        style={{ height: 12, marginBottom: 3, background: color, ...style }}
      />
    )
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 200,
          height: 160,
          background: '#111',
          padding: 4,
        }}
      >
        {bar({ width: 'calc(100% - 100px)' }, '#f60')}
        {bar({ width: 'calc(20px + 20px)' }, '#0af')}
        {bar({ width: 'calc(50%)' }, '#3c6')}
        {bar({ width: 'min(50%, 60px)' }, '#fc0')}
        {bar({ width: 'clamp(20px, 30%, 100px)' }, '#c6f')}
        {bar({ width: 50, marginLeft: 'calc(25% + 2px * 2)' }, '#f36')}
        <div
          style={{
            display: 'flex',
            width: 'calc(100% - 2 * 10px)',
            padding: 'calc(5% + 2px)',
            background: '#333',
          }}
        >
          <div style={{ flexGrow: 1, height: 10, background: '#fff' }} />
        </div>
        <div style={{ color: '#fff', fontSize: 'calc(1rem - 4px)' }}>
          calc(1rem - 4px)
        </div>
      </div>,
      { width: 200, height: 160, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should resolve math functions in insets, transforms and gaps', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: 200,
          height: 120,
          background: '#111',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 'calc(10% + 4px) 20px auto 20%',
            height: 20,
            background: '#f60',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 40,
            height: 30,
            background: '#0af',
            transform:
              'translate(calc(-50% - 10px), -50%) rotate(calc(10deg + 5deg))',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: 'calc(100% / 3)',
            height: 'max(10px, 10%)',
            background: '#3c6',
            margin: 'calc(2px * 2) 0',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 4,
            bottom: 4,
            display: 'flex',
            gap: 'calc(1px + 1%) 4px',
            width: 60,
          }}
        >
          <div style={{ width: 20, height: 20, background: '#fc0' }} />
          <div style={{ width: 20, height: 20, background: '#c6f' }} />
        </div>
      </div>,
      { width: 200, height: 120, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })
})
