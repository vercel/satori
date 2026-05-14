import { beforeAll, describe, expect, it } from 'vitest'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { video } from '../src/video/index.js'
import type { SatoriOptions } from '../src/index.js'

const W = 960
const H = 540
const FPS = 30
const DURATION_MS = 3000

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)
const range = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5)

const TITLE = 'hello world'
const STAGGER = 0.05

describe('Video', () => {
  let fonts: SatoriOptions['fonts']

  beforeAll(async () => {
    const [bold, regular] = await Promise.all([
      readFile(join(process.cwd(), 'test/assets/Roboto-Bold.ttf')),
      readFile(join(process.cwd(), 'test/assets/Roboto-Regular.ttf')),
    ])
    fonts = [
      { name: 'Roboto', data: bold, weight: 700, style: 'normal' },
      { name: 'Roboto', data: regular, weight: 400, style: 'normal' },
    ]
  })

  it('renders a kinetic title card to MP4', async () => {
    const mp4 = await video(
      ({ progress }) => {
        const dot = easeOutQuint(range(progress, 0, 0.4))
        const tagline = easeOutCubic(range(progress, 0.7, 1))
        const pulse = 1 + 0.18 * Math.sin(range(progress, 0.8, 1) * Math.PI)

        const hueShift = progress * 30
        const bgInner = `hsl(${250 + hueShift}, 45%, 16%)`
        const bgOuter = `hsl(${230 + hueShift}, 40%, 6%)`

        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: `radial-gradient(circle at 50% 42%, ${bgInner}, ${bgOuter})`,
              color: 'white',
              fontFamily: 'Roboto',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 18,
                height: 18,
                borderRadius: 999,
                backgroundColor: 'white',
                opacity: dot,
                transform: `scale(${(0.25 + 0.75 * dot) * pulse})`,
                marginBottom: 40,
                boxShadow: `0 0 ${24 + 56 * dot}px rgba(255,255,255,${
                  0.55 * dot
                })`,
              }}
            />

            <div style={{ display: 'flex', padding: '12px 0' }}>
              {Array.from(TITLE).map((ch, i) => {
                const start = 0.22 + i * STAGGER
                const t = easeOutCubic(range(progress, start, start + 0.5))
                const baseStyle = {
                  display: 'flex',
                  fontSize: 96,
                  fontWeight: 700,
                  letterSpacing: -4,
                  opacity: t,
                  transform: `translateY(${(1 - t) * 70}px)`,
                  padding: '0 2px',
                  lineHeight: 1.1,
                } as const
                if (ch === ' ') {
                  return <div key={i} style={{ ...baseStyle, width: 32 }} />
                }
                return (
                  <div key={i} style={baseStyle}>
                    {ch}
                  </div>
                )
              })}
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: 28,
                fontSize: 18,
                fontWeight: 400,
                opacity: tagline * 0.72,
                transform: `translateY(${(1 - tagline) * 16}px)`,
              }}
            >
              enlightened jsx, now in motion
            </div>
          </div>
        )
      },
      {
        width: W,
        height: H,
        duration: DURATION_MS,
        fps: FPS,
        fonts,
        quality: 22,
        concurrency: 4,
      }
    )

    expect(mp4).toBeInstanceOf(Uint8Array)
    expect(mp4.byteLength).toBeGreaterThan(1000)
    // ISO base media file: bytes 4..8 spell 'ftyp'
    expect(Buffer.from(mp4.slice(4, 8)).toString('ascii')).toBe('ftyp')

    const outDir = join(process.cwd(), 'test', '__video_output__')
    await mkdir(outDir, { recursive: true })
    await writeFile(join(outDir, 'title-card.mp4'), mp4)
  }, 60_000)
})
