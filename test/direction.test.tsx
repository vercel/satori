import { it, describe, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { toImage } from './utils.js'
import satori, { type SatoriOptions } from '../src/index.js'
import { getBidiClass, reorderLine, resolveLevels } from '../src/text/bidi.js'

const arabic =
  'السلام عليكم ورحمة الله وبركاته، أهلا وسهلا بكم في موقعنا الجديد'

/** The x of the rects of a color. */
function rectsOf(svg: string, color: string) {
  return [...svg.matchAll(/<rect x="([\d.-]+)"[^>]*fill="([^"]+)"/g)]
    .filter((match) => match[2] === color)
    .map((match) => Number(match[1]))
}

describe('direction', () => {
  let fonts: SatoriOptions['fonts']

  beforeAll(async () => {
    const asset = (name: string) =>
      readFile(join(process.cwd(), 'test', 'assets', name))
    fonts = [
      {
        name: 'Noto Sans Arabic',
        data: await asset('NotoSansArabic-Regular.ttf'),
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Roboto',
        data: await asset('Roboto-Regular.ttf'),
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Noto Sans Hebrew',
        data: await asset('NotoSansHebrew-Regular.ttf'),
        weight: 400,
        style: 'normal',
      },
    ]
  })

  describe('bidi', () => {
    it('should classify pieces of text by their first strong character', () => {
      expect(getBidiClass('مرحبا')).toBe('R')
      expect(getBidiClass('שלום')).toBe('R')
      expect(getBidiClass('Hello')).toBe('L')
      expect(getBidiClass('3rd')).toBe('L')
      expect(getBidiClass('2024')).toBe('EN')
      expect(getBidiClass('۲۰۲۴')).toBe('EN')
      expect(getBidiClass('٢٠٢٤')).toBe('AN')
      expect(getBidiClass(' ')).toBe('N')
      expect(getBidiClass('(')).toBe('N')
      expect(getBidiClass('\u200f')).toBe('R')
    })

    it('should resolve levels with a right-to-left base direction', () => {
      // Neutrals between left-to-right text are left-to-right.
      expect(resolveLevels(['R', 'N', 'L', 'N', 'L', 'N', 'R'])).toEqual([
        1, 1, 2, 2, 2, 1, 1,
      ])
      // Numbers are a level higher, and count as right-to-left for neutrals.
      expect(resolveLevels(['R', 'N', 'EN', 'N', 'R'])).toEqual([1, 1, 2, 1, 1])
      expect(resolveLevels(['EN', 'N', 'EN'])).toEqual([2, 1, 2])
      // European numbers after left-to-right text are left-to-right.
      expect(resolveLevels(['L', 'N', 'EN'])).toEqual([2, 2, 2])
      expect(resolveLevels(['L', 'N', 'AN'])).toEqual([2, 1, 2])
      // Neutrals at the start and end have the base direction.
      expect(resolveLevels(['N', 'L', 'N'])).toEqual([1, 2, 1])
    })

    it('should mirror lines and keep the order of left-to-right runs', () => {
      // "R1 L1 L2 R2" with spaces, at the start of the line.
      const pieces = [
        { x: 0, width: 10 },
        { x: 10, width: 2 },
        { x: 12, width: 10 },
        { x: 22, width: 2 },
        { x: 24, width: 10 },
        { x: 34, width: 2 },
        { x: 36, width: 10 },
      ]
      // R2, L1 L2, R1 from the left.
      expect(reorderLine(pieces, [1, 1, 2, 2, 2, 1, 1], 46)).toEqual([
        36, 34, 12, 22, 24, 10, 0,
      ])
    })
  })

  describe('boxes', () => {
    it('should lay out flex rows and grid columns from the right', async () => {
      const svg = await satori(
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', direction: 'rtl', height: 10 }}>
            <div style={{ width: 10, background: 'red' }} />
            <div style={{ width: 20, background: 'blue' }} />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '10px 20px',
              direction: 'rtl',
              height: 10,
            }}
          >
            <div style={{ background: 'green' }} />
            <div style={{ background: 'orange' }} />
          </div>
        </div>,
        { width: 100, height: 20, fonts }
      )
      expect(rectsOf(svg, 'red')).toEqual([90])
      expect(rectsOf(svg, 'blue')).toEqual([70])
      expect(rectsOf(svg, 'green')).toEqual([90])
      expect(rectsOf(svg, 'orange')).toEqual([70])
    })

    it('should place block children at the right', async () => {
      const svg = await satori(
        <div style={{ direction: 'rtl' }}>
          <div style={{ width: 10, height: 10, background: 'red' }} />
        </div>,
        { width: 100, height: 10, fonts }
      )
      expect(rectsOf(svg, 'red')).toEqual([90])
    })

    it('should be inherited and set by the `dir` attribute', async () => {
      const svg = await satori(
        <div dir='rtl' style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', height: 10 }}>
            <div style={{ width: 10, background: 'red' }} />
          </div>
          <div style={{ display: 'flex', height: 10, direction: 'ltr' }}>
            <div style={{ width: 10, background: 'blue' }} />
          </div>
          <div dir='ltr' style={{ display: 'flex', height: 10 }}>
            <div style={{ width: 10, background: 'green' }} />
          </div>
        </div>,
        { width: 100, height: 30, fonts }
      )
      expect(rectsOf(svg, 'red')).toEqual([90])
      expect(rectsOf(svg, 'blue')).toEqual([0])
      expect(rectsOf(svg, 'green')).toEqual([0])
    })

    it('should resolve physical and logical keywords', async () => {
      const svg = await satori(
        <div style={{ direction: 'rtl' }}>
          <div style={{ display: 'flex', justifyContent: 'left', height: 10 }}>
            <div style={{ width: 10, background: 'red' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'end', height: 10 }}>
            <div style={{ width: 10, background: 'blue' }} />
          </div>
          <div style={{ height: 10 }}>
            <div
              style={{
                float: 'inline-start',
                width: 10,
                height: 10,
                background: 'green',
              }}
            />
          </div>
        </div>,
        { width: 100, height: 30, fonts }
      )
      expect(rectsOf(svg, 'red')).toEqual([0])
      expect(rectsOf(svg, 'blue')).toEqual([0])
      expect(rectsOf(svg, 'green')).toEqual([90])
    })

    it('should reject invalid values', async () => {
      await expect(
        satori(<div style={{ direction: 'up' as any }} />, {
          width: 10,
          height: 10,
          fonts,
        })
      ).rejects.toThrow('Invalid value for CSS property "direction"')
    })
  })

  describe('text', () => {
    const container = {
      boxSizing: 'border-box',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: 10,
      backgroundColor: 'white',
      fontFamily: 'Noto Sans Arabic, Roboto',
      fontSize: 24,
    } as const
    const line = { backgroundColor: '#eef' }

    it('should lay out lines from the right', async () => {
      const svg = await satori(
        <div style={{ ...container, direction: 'rtl' }}>
          <div style={line}>{arabic}</div>
          <div style={{ ...line, display: 'flex' }}>مرحبا بالعالم</div>
          <div style={{ ...line, display: 'flex', alignSelf: 'flex-start' }}>
            مرحبا بالعالم
          </div>
        </div>,
        { width: 400, height: 220, fonts, embedFont: true }
      )
      expect(await toImage(svg, 400)).toMatchImageSnapshot()
    })

    it('should keep the order of left-to-right text and numbers', async () => {
      const svg = await satori(
        <div style={{ ...container, direction: 'rtl' }}>
          <div style={line}>مرحبا بكم في Vercel Ship لعام 2024</div>
          <div style={line}>العدد 1 2 3 والرقم ٤٥٦</div>
          <div style={line}>מה שלום? (טוב) Next.js 15!</div>
        </div>,
        { width: 400, height: 190, fonts, embedFont: true }
      )
      expect(await toImage(svg, 400)).toMatchImageSnapshot()
    })

    it('should align text to the start and the end', async () => {
      const svg = await satori(
        <div style={{ ...container, direction: 'rtl' }}>
          <div style={{ ...line, textAlign: 'start' }}>مرحبا بالعالم</div>
          <div style={{ ...line, textAlign: 'end' }}>مرحبا بالعالم</div>
          <div style={{ ...line, textAlign: 'center' }}>مرحبا بالعالم</div>
          <div style={{ ...line, textAlign: 'left' }}>مرحبا بالعالم</div>
          <div style={{ ...line, direction: 'ltr', textAlign: 'end' }}>
            Hello world
          </div>
        </div>,
        { width: 300, height: 310, fonts, embedFont: true }
      )
      expect(await toImage(svg, 300)).toMatchImageSnapshot()
    })

    it('should justify lines and indent them from the right', async () => {
      const svg = await satori(
        <div style={{ ...container, direction: 'rtl' }}>
          <div style={{ ...line, textAlign: 'justify' }}>{arabic}</div>
          <div style={{ ...line, textIndent: 40 }}>مرحبا بكم في موقعنا</div>
        </div>,
        { width: 400, height: 190, fonts, embedFont: true }
      )
      expect(await toImage(svg, 400)).toMatchImageSnapshot()
    })

    it('should put the ellipsis at the end of the line, on the left', async () => {
      const svg = await satori(
        <div style={{ ...container, direction: 'rtl' }}>
          <div style={{ ...line, lineClamp: 2, textDecoration: 'underline' }}>
            {arabic} {arabic}
          </div>
          <div
            style={{
              ...line,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {arabic}
          </div>
        </div>,
        { width: 400, height: 170, fonts, embedFont: true }
      )
      expect(await toImage(svg, 400)).toMatchImageSnapshot()
    })

    it('should position text that is not embedded', async () => {
      const svg = await satori(
        <div style={{ direction: 'rtl', fontSize: 24 }}>
          مرحبا بكم في Vercel Ship لعام 2024
        </div>,
        { width: 400, height: 60, fonts, embedFont: false }
      )
      const texts = new Map(
        [
          ...svg.matchAll(
            /<text x="([\d.]+)"[^>]*width="([\d.]+)"[^>]*>(.+?)</g
          ),
        ].map(([, x, width, text]) => [text, [Number(x), Number(width)]])
      )
      const [x, width] = texts.get('مرحبا')
      expect(x + width).toBeCloseTo(400)
      const order = ['2024', 'لعام', 'Vercel', 'Ship', 'في', 'بكم', 'مرحبا']
      const lefts = order.map((text) => texts.get(text)[0])
      expect(lefts).toEqual([...lefts].sort((a, b) => a - b))
    })
  })
})
