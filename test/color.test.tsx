import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

function Swatches({ colors, color }: { colors: string[]; color?: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', width: 160, color }}>
      {colors.map((c) => (
        <div key={c} style={{ width: 20, height: 20, backgroundColor: c }} />
      ))}
    </div>
  )
}

describe('Color', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should support colors of CSS Color 4', async () => {
    const svg = await satori(
      <Swatches
        colors={[
          'hwb(220 20% 20%)',
          'lab(44 9 -54)',
          'lch(44 55 280)',
          'oklab(0.52 -0.02 -0.17)',
          'oklch(0.7 0.15 150)',
          // Out of the sRGB gamut, so it's clipped.
          'oklch(0.7 0.4 150)',
          'color(display-p3 0.25 0.4 0.77)',
          'color(rec2020 0 1 0)',
          'color(xyz-d50 0.2 0.2 0.6)',
          'color(srgb-linear 0.2 0.4 0.8)',
          'rgb(255 0 0 / 50%)',
          'hsl(120deg 60% 40%)',
          'hsl(0.5turn 60% 40% / 0.5)',
          'rebeccapurple',
          'oklch(0.6 0.15 none)',
          'lab(50% 50% -50%)',
        ]}
      />,
      { width: 160, height: 40, fonts }
    )
    expect(toImage(svg, 160)).toMatchImageSnapshot()
  })

  it('should support color-mix(), relative colors and light-dark()', async () => {
    const svg = await satori(
      <Swatches
        color='green'
        colors={[
          'color-mix(in srgb, red 30%, blue)',
          'color-mix(in oklab, red, blue)',
          'color-mix(in oklch, red, blue)',
          'color-mix(in oklch longer hue, red, blue)',
          'color-mix(in lch, red 20%, blue 20%)',
          'color-mix(in hsl, red, lime)',
          'color-mix(in srgb, red, transparent)',
          'color-mix(in oklch, white, blue)',
          'color-mix(in hsl decreasing hue, red, blue)',
          'color-mix(in srgb, currentColor 40%, white)',
          'rgb(from #3366cc r g b / 0.5)',
          'oklch(from #3366cc calc(l + 0.1) c h)',
          'hsl(from red calc(h + 120) s l)',
          'lab(from #3366cc l 0 0)',
          'light-dark(#3366cc, black)',
          'color(from oklch(0.6 0.2 30) srgb r g calc(b * 2))',
        ]}
      />,
      { width: 160, height: 40, fonts }
    )
    expect(toImage(svg, 160)).toMatchImageSnapshot()
  })

  it('should convert colors in all properties', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', gap: 12, padding: 10, color: 'blue' }}>
        <div
          style={{
            width: 50,
            height: 50,
            backgroundImage:
              'linear-gradient(to right, oklch(0.7 0.2 30), color-mix(in oklch, blue, white))',
            border: '4px solid lab(50 40 -60)',
            boxShadow: '4px 4px 0 oklch(0.6 0.2 140)',
          }}
        />
        <div
          style={{
            width: 50,
            height: 50,
            backgroundImage:
              'conic-gradient(lab(60 60 40), oklch(0.7 0.2 200), lab(60 60 40))',
            border: '6px inset oklch(0.6 0.15 250)',
            outline: '2px dashed hwb(30 0% 0%)',
            outlineOffset: 2,
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 16,
            color: 'oklch(0.5 0.2 260)',
            textShadow: '1px 1px 0 color-mix(in srgb, red 50%, transparent)',
          }}
        >
          <span style={{ textDecoration: 'underline lch(60 80 30)' }}>
            Text
          </span>
          <svg
            width='24'
            height='24'
            viewBox='0 0 24 24'
            style={{ color: 'lab(50 60 40)' }}
          >
            <circle
              cx='12'
              cy='12'
              r='9'
              fill='oklch(0.7 0.2 140)'
              stroke='color-mix(in srgb, currentColor 50%, white)'
            />
          </svg>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'oklch(0.8 0.1 90)',
            filter: 'drop-shadow(3px 3px 0 oklch(0.6 0.2 300))',
          }}
        />
      </div>,
      { width: 260, height: 90, fonts }
    )
    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should interpolate gradients in color spaces', async () => {
    const gradients = [
      'linear-gradient(to right, red, blue)',
      'linear-gradient(to right in oklab, red, blue)',
      'linear-gradient(in oklch to right, red, blue)',
      'linear-gradient(to right in oklch longer hue, red, blue)',
      'linear-gradient(to right in hsl, red, blue)',
      'linear-gradient(to right in lab, red, blue)',
      'linear-gradient(to right in srgb-linear, red, blue)',
      'linear-gradient(to right in display-p3, red, blue)',
      // Colors that aren't in a legacy syntax are interpolated in Oklab.
      'linear-gradient(to right, red, oklch(0.452 0.313 264))',
      'linear-gradient(to right in srgb, oklch(0.628 0.258 29.2), blue)',
      // With premultiplied alpha.
      'linear-gradient(to right, red, transparent)',
      'linear-gradient(to right in oklab, red, 25%, blue)',
      'linear-gradient(to right, red, 75%, blue)',
      'repeating-linear-gradient(to right in oklch, red, blue 50px)',
      'radial-gradient(circle in oklch, red, blue)',
      'conic-gradient(in oklch longer hue, red, red)',
    ]
    const svg = await satori(
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {gradients.map((backgroundImage) => (
          <div
            key={backgroundImage}
            style={{ width: 160, height: 8, backgroundImage }}
          />
        ))}
      </div>,
      { width: 160, height: 128, fonts }
    )
    expect(toImage(svg, 160)).toMatchImageSnapshot()
  })

  it('should keep colors with `convertColors: false`', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', color: 'oklch(0.5 0.2 260)' }}>
        <div
          style={{
            width: 30,
            height: 30,
            backgroundColor: 'lab(50 40 -60)',
            border: '3px solid oklch(0.6 0.2 30)',
            boxShadow: '2px 2px 0 color-mix(in oklch, red, blue)',
            filter: 'drop-shadow(2px 2px 0 hwb(30 0% 0%))',
          }}
        />
        <span style={{ textShadow: '1px 1px 0 oklab(0.5 0.1 0.1)' }}>Hi</span>
        <svg width='20' height='20' viewBox='0 0 20 20'>
          <circle cx='10' cy='10' r='8' fill='color(display-p3 1 0 0)' />
        </svg>
      </div>,
      { width: 100, height: 40, fonts, convertColors: false }
    )
    for (const color of [
      'oklch(0.5 0.2 260)',
      'lab(50 40 -60)',
      'oklch(0.6 0.2 30)',
      'color-mix(in oklch, red, blue)',
      'hwb(30 0% 0%)',
      'oklab(0.5 0.1 0.1)',
      // In the data URL of the SVG.
      'color(display-p3 1 0 0)',
    ]) {
      expect(svg).toContain(color)
    }

    const converted = await satori(
      <div
        style={{ width: 30, height: 30, backgroundColor: 'lab(50 40 -60)' }}
      />,
      { width: 100, height: 40, fonts }
    )
    expect(converted).not.toContain('lab(')
  })
})
