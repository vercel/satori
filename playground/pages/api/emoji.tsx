import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { NextApiRequest, NextApiResponse } from 'next'
import React from 'react'
import sharp from 'sharp'
import satori from 'satori'

const DEFAULT_SIZE = 128
const MAX_SIZE = 1024
const DEFAULT_DELAY_MS = 60
const MAX_DELAY_MS = 65535
const GIF_FRAMES_PER_GLYPH = 2
const GEIST_FONT_DATA = readFileSync(
  join(process.cwd(), 'public/geist-bold.otf')
)

type LoadedFonts = Array<{
  name: string
  data: Buffer
  weight: 700
  style: 'normal'
}>

const fonts: LoadedFonts = [
  { name: 'Geist', data: GEIST_FONT_DATA, weight: 700, style: 'normal' },
]

function readQueryValue(raw: unknown): string | undefined {
  if (Array.isArray(raw)) return raw[0]
  return typeof raw === 'string' ? raw : undefined
}

function sanitizeText(raw: unknown): string[] {
  const text = readQueryValue(raw) ?? 'LFG'
  const cleaned = Array.from(text)
    .filter((c) => c >= ' ' && c !== '\x7f')
    .join('')
    .trim()
  const source = cleaned.length ? cleaned : 'LFG'

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return Array.from(
      segmenter.segment(source),
      ({ segment }) => segment
    ).slice(0, 24)
  }

  return Array.from(source).slice(0, 24)
}

function sanitizeCssColor(raw: unknown, fallback: string): string {
  const value = readQueryValue(raw)?.trim()
  if (!value) return fallback
  // Keep this endpoint color-only; disallow url(), var(), and arbitrary CSS.
  if (/^[#\w\s.,%()+-]{1,64}$/.test(value) && !/url|var/i.test(value)) {
    return value
  }
  return fallback
}

function sanitizeSize(raw: unknown): number {
  const value = Number(readQueryValue(raw))
  if (!Number.isFinite(value)) return DEFAULT_SIZE
  return Math.max(1, Math.min(MAX_SIZE, Math.round(value)))
}

function sanitizeDelay(raw: unknown): number {
  const value = Number(readQueryValue(raw))
  if (!Number.isFinite(value)) return DEFAULT_DELAY_MS
  return Math.max(0, Math.min(MAX_DELAY_MS, Math.round(value)))
}

function renderGlyphCard(
  glyph: string,
  bg: string,
  color: string,
  size: number
): React.ReactElement {
  const fontSize = size * (glyph.length > 2 ? 0.49 : 0.64)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        color,
        fontFamily: 'Geist',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontSize,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: 0,
        }}
      >
        {glyph}
      </div>
    </div>
  )
}

async function renderEmojiGif(
  glyphs: string[],
  bg: string,
  color: string,
  size: number,
  delay: number
): Promise<Buffer> {
  const frameSvgs = await Promise.all(
    glyphs.map((glyph) =>
      satori(renderGlyphCard(glyph, bg, color, size), {
        width: size,
        height: size,
        fonts: fonts as any,
      })
    )
  )

  const frames = frameSvgs.flatMap((svg) =>
    Array.from({ length: GIF_FRAMES_PER_GLYPH }, () => Buffer.from(svg))
  )

  return sharp(frames, { join: { animated: true } })
    .gif({
      delay: frames.map(() => delay),
      loop: 0,
      dither: 0,
      keepDuplicateFrames: true,
    })
    .toBuffer()
}

export const config = {
  api: {
    responseLimit: '16mb',
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const glyphs = sanitizeText(req.query.text)
    const bg = sanitizeCssColor(req.query.bg, '#EA337F')
    const color = sanitizeCssColor(req.query.color, '#FFFFFF')
    const size = sanitizeSize(req.query.size)
    const delay = sanitizeDelay(req.query.delay)
    const gif = await renderEmojiGif(glyphs, bg, color, size, delay)

    res.setHeader('Content-Type', 'image/gif')
    res.setHeader('Content-Length', String(gif.byteLength))
    res.setHeader(
      'Cache-Control',
      'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
    )
    res.status(200).send(gif)
  } catch (err) {
    console.error('[/api/emoji] failed', err)
    res.status(500).json({
      error: (err as Error).message ?? 'emoji render failed',
    })
  }
}
