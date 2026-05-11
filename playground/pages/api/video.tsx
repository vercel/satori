import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { NextApiRequest, NextApiResponse } from 'next'
import React from 'react'
import { video } from 'satori/video'

const TAGLINE = 'ENLIGHTENED JSX, NOW IN MOTION'
const W = 960
const H = 540
const FPS = 30
const DURATION_MS = 3000

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)
const range = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5)

type LoadedFonts = Array<{
  name: string
  data: Buffer
  weight: 400 | 700
  style: 'normal'
}>

let fontsPromise: Promise<LoadedFonts> | null = null
function loadFonts(): Promise<LoadedFonts> {
  if (fontsPromise) return fontsPromise
  const promise: Promise<LoadedFonts> = (async () => {
    const [regular, bold] = await Promise.all([
      readFile(join(process.cwd(), 'public/inter-latin-ext-400-normal.woff')),
      readFile(join(process.cwd(), 'public/inter-latin-ext-700-normal.woff')),
    ])
    return [
      { name: 'Inter', data: regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: bold, weight: 700, style: 'normal' },
    ]
  })()
  promise.catch(() => {
    if (fontsPromise === promise) fontsPromise = null
  })
  fontsPromise = promise
  return promise
}

function sanitizeText(raw: unknown): string {
  if (typeof raw !== 'string') return 'satori'
  // Strip control chars, collapse, clip to 10 grapheme-ish chars.
  // (Codepoint-clip is good enough for a demo.)
  const cleaned = Array.from(raw)
    .filter((c) => c >= ' ' && c !== '\x7f')
    .slice(0, 10)
    .join('')
    .trim()
  return cleaned.length ? cleaned : 'satori'
}

function renderTitleCard(text: string, progress: number): React.ReactElement {
  const dot = easeOutQuint(range(progress, 0, 0.4))
  const tagline = easeOutCubic(range(progress, 0.7, 1))
  const pulse = 1 + 0.18 * Math.sin(range(progress, 0.8, 1) * Math.PI)

  const hueShift = progress * 30
  const bgInner = `hsl(${250 + hueShift}, 45%, 16%)`
  const bgOuter = `hsl(${230 + hueShift}, 40%, 6%)`

  // Scale font size down as text grows so 10 chars still fit.
  const fontSize = Math.max(72, Math.min(168, 720 / Math.max(text.length, 4)))
  const stagger = Math.min(0.08, 0.45 / Math.max(text.length, 1))

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
        fontFamily: 'Inter',
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
          boxShadow: `0 0 ${24 + 56 * dot}px rgba(255,255,255,${0.55 * dot})`,
        }}
      />

      <div style={{ display: 'flex', padding: '12px 0' }}>
        {Array.from(text).map((ch, i) => {
          const start = 0.22 + i * stagger
          const t = easeOutCubic(range(progress, start, start + 0.5))
          const baseStyle = {
            display: 'flex',
            fontSize,
            fontWeight: 700,
            letterSpacing: -fontSize * 0.04,
            opacity: t,
            transform: `translateY(${(1 - t) * 70}px)`,
            padding: '0 2px',
            lineHeight: 1.1,
          } as const
          if (ch === ' ') {
            return (
              <div key={i} style={{ ...baseStyle, width: fontSize * 0.35 }} />
            )
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
          letterSpacing: 8,
          transform: `translateY(${(1 - tagline) * 16}px)`,
        }}
      >
        {TAGLINE}
      </div>
    </div>
  )
}

export const config = {
  api: {
    // Encoded MP4 may be a few MB; leave room.
    responseLimit: '16mb',
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const text = sanitizeText(req.query.text)
    const fonts = await loadFonts()

    const mp4 = await video(
      ({ progress }: { progress: number }) => renderTitleCard(text, progress),
      {
        width: W,
        height: H,
        duration: DURATION_MS,
        fps: FPS,
        fonts: fonts as any,
        quality: 22,
      }
    )

    res.setHeader('Content-Type', 'video/mp4')
    res.setHeader('Content-Length', String(mp4.byteLength))
    res.setHeader(
      'Cache-Control',
      'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
    )
    res.status(200).send(Buffer.from(mp4))
  } catch (err) {
    console.error('[/api/video] failed:', err)
    res.status(500).json({
      error: (err as Error).message ?? 'video render failed',
    })
  }
}
