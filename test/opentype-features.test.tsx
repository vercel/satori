import { it, describe, expect } from 'vitest'
import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('OpenType Features', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('Ligatures (liga)', () => {
    it('should render ligatures when enabled', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 32,
            fontFamily: 'Roboto',
          }}
        >
          <span>fi fl ff ffi ffl</span>
        </div>,
        { width: 400, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 400)).toMatchImageSnapshot()
    })

    it('should not render ligatures when disabled', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 32,
            fontFamily: 'Roboto',
            fontFeatureSettings: '"liga" off',
          }}
        >
          <span>fi fl ff ffi ffl</span>
        </div>,
        { width: 400, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 400)).toMatchImageSnapshot()
    })

    it('should wrap using the shaped ligature width', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 76,
            fontSize: 36,
            fontFamily: 'Roboto',
            lineHeight: 1,
            backgroundColor: 'white',
            color: '#db2777',
          }}
        >
          office
        </div>,
        { width: 120, height: 100, fonts, embedFont: true }
      )

      expect(await toImage(svg, 120)).toMatchImageSnapshot()
    })
  })

  describe('Kerning (kern)', () => {
    it('should apply kerning by default', async () => {
      // Common kerning pairs: AV, To, Wa, etc.
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 48,
            fontFamily: 'Roboto',
          }}
        >
          <span>AVATAR Wave Type</span>
        </div>,
        { width: 500, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 500)).toMatchImageSnapshot()
    })

    it('should disable kerning when specified', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 48,
            fontFamily: 'Roboto',
            fontFeatureSettings: '"kern" off',
          }}
        >
          <span>AVATAR Wave Type</span>
        </div>,
        { width: 500, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 500)).toMatchImageSnapshot()
    })
  })

  describe('Small Caps (smcp)', () => {
    it('should render small caps when enabled', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 32,
            fontFamily: 'Roboto',
            fontFeatureSettings: '"smcp"',
          }}
        >
          <span>Small Caps Text</span>
        </div>,
        { width: 400, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 400)).toMatchImageSnapshot()
    })
  })

  describe('Numerals', () => {
    it('should render oldstyle numerals (onum)', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 32,
            fontFamily: 'Roboto',
            fontFeatureSettings: '"onum"',
          }}
        >
          <span>0123456789</span>
        </div>,
        { width: 400, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 400)).toMatchImageSnapshot()
    })

    it('should render lining numerals (lnum)', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 32,
            fontFamily: 'Roboto',
            fontFeatureSettings: '"lnum"',
          }}
        >
          <span>0123456789</span>
        </div>,
        { width: 400, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 400)).toMatchImageSnapshot()
    })

    it('should render tabular numerals (tnum)', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 24,
            fontFamily: 'Roboto',
            fontFeatureSettings: '"tnum"',
          }}
        >
          <div>1111</div>
          <div>2222</div>
          <div>3333</div>
        </div>,
        { width: 200, height: 150, fonts, embedFont: true }
      )
      expect(await toImage(svg, 200)).toMatchImageSnapshot()
    })

    it('should render proportional numerals (pnum)', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 24,
            fontFamily: 'Roboto',
            fontFeatureSettings: '"pnum"',
          }}
        >
          <div>1111</div>
          <div>2222</div>
          <div>3333</div>
        </div>,
        { width: 200, height: 150, fonts, embedFont: true }
      )
      expect(await toImage(svg, 200)).toMatchImageSnapshot()
    })
  })

  describe('Fractions (frac)', () => {
    it('should render fractions when enabled', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 32,
            fontFamily: 'Roboto',
            fontFeatureSettings: '"frac"',
          }}
        >
          <span>1/2 3/4 1/4 5/8</span>
        </div>,
        { width: 400, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 400)).toMatchImageSnapshot()
    })
  })

  describe('Superscript and Subscript', () => {
    it('should render superscript (sups)', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 32,
            fontFamily: 'Roboto',
          }}
        >
          <span>
            x<span style={{ fontFeatureSettings: '"sups"' }}>2</span> + y
            <span style={{ fontFeatureSettings: '"sups"' }}>3</span>
          </span>
        </div>,
        { width: 300, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 300)).toMatchImageSnapshot()
    })

    it('should render subscript (subs)', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 32,
            fontFamily: 'Roboto',
          }}
        >
          <span>
            H<span style={{ fontFeatureSettings: '"subs"' }}>2</span>O CO
            <span style={{ fontFeatureSettings: '"subs"' }}>2</span>
          </span>
        </div>,
        { width: 300, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 300)).toMatchImageSnapshot()
    })
  })

  describe('Multiple features combined', () => {
    it('should apply multiple features at once', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 32,
            fontFamily: 'Roboto',
            fontFeatureSettings: '"liga", "kern", "tnum"',
          }}
        >
          <span>Office: 1234567890</span>
        </div>,
        { width: 450, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 450)).toMatchImageSnapshot()
    })

    it('should enable some features and disable others', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 32,
            fontFamily: 'Roboto',
            fontFeatureSettings: '"liga" off, "kern" on',
          }}
        >
          <span>Office AVATAR</span>
        </div>,
        { width: 400, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 400)).toMatchImageSnapshot()
    })
  })

  describe('Feature values', () => {
    it('should handle numeric feature values', async () => {
      // Some fonts support stylistic sets with numeric values
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            fontSize: 32,
            fontFamily: 'Roboto',
            fontFeatureSettings: '"ss01" 1',
          }}
        >
          <span>Stylistic Set Test</span>
        </div>,
        { width: 400, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 400)).toMatchImageSnapshot()
    })
  })

  describe('Edge cases', () => {
    it('should handle empty fontFeatureSettings gracefully', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            padding: 20,
            fontSize: 32,
            fontFamily: 'Roboto',
            fontFeatureSettings: '',
          }}
        >
          <span>Normal text</span>
        </div>,
        { width: 300, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 300)).toMatchImageSnapshot()
    })

    it('should handle "normal" fontFeatureSettings', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            padding: 20,
            fontSize: 32,
            fontFamily: 'Roboto',
            fontFeatureSettings: 'normal',
          }}
        >
          <span>Normal text</span>
        </div>,
        { width: 300, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 300)).toMatchImageSnapshot()
    })

    it('should handle invalid feature tags gracefully', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            padding: 20,
            fontSize: 32,
            fontFamily: 'Roboto',
            fontFeatureSettings: '"xxxx"',
          }}
        >
          <span>Text with invalid feature</span>
        </div>,
        { width: 400, height: 100, fonts, embedFont: true }
      )
      expect(await toImage(svg, 400)).toMatchImageSnapshot()
    })

    describe('parsing', () => {
      const render = (fontFeatureSettings?: string) =>
        satori(
          <div
            style={{
              display: 'flex',
              fontSize: 32,
              fontFamily: 'Roboto',
              fontFeatureSettings,
            }}
          >
            fi ffl
          </div>,
          { width: 200, height: 50, fonts, embedFont: true }
        )

      it('should disable ligatures as a baseline', async () => {
        expect(await render('"liga" off')).not.toBe(await render())
      })

      it('should treat "normal" as no features', async () => {
        expect(await render('normal')).toBe(await render())
      })

      it('should parse CSS syntax', async () => {
        const disabled = await render('"liga" off')
        expect(await render("'liga' off")).toBe(disabled)
        expect(await render('  "liga"   OFF  ')).toBe(disabled)
        expect(await render('"liga" 0')).toBe(disabled)
        expect(await render('"liga"/* comment */off')).toBe(disabled)
        expect(await render('"\\6c iga" off')).toBe(disabled)
        // A comma is a valid character of a tag.
        expect(await render('"a,bc", "liga" off')).toBe(disabled)
      })

      it('should ignore the whole value if any feature is invalid', async () => {
        const enabled = await render()
        for (const value of [
          '"liga" off junk',
          '"liga" off, junk',
          '"liga" off,',
          '"liga" -1',
          '"liga" 1.5',
          '"lig" off',
          '"ligat" off',
          '"lïga" off',
          // HarfBuzz's syntax.
          'liga off',
          '-liga',
          'liga=0',
          '"liga"[0:1] off',
        ]) {
          expect(await render(value), value).toBe(enabled)
        }
      })

      it('should apply the last value of a repeated feature', async () => {
        expect(await render('"liga" off, "liga" on')).toBe(await render())
        expect(await render('"liga" on, "liga" off')).toBe(
          await render('"liga" off')
        )
      })
    })
  })
})
