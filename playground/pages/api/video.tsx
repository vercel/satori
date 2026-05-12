import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { NextApiRequest, NextApiResponse } from 'next'
import React from 'react'
import satori from 'satori'
import { video } from 'satori/video'

// Record module-evaluation timing so a stage probe can report cold-start cost.
const MODULE_LOADED_AT = Date.now()

// Surface anything that would otherwise silently kill the worker on Lambda.
// `--unhandled-rejections=strict` would otherwise terminate the process and
// Vercel would report only a 120s timeout, no log, no error response.
if (!(global as any).__videoProbeHandlersInstalled) {
  ;(global as any).__videoProbeHandlersInstalled = true
  process.on('unhandledRejection', (reason) => {
    console.error('[video] UNHANDLED REJECTION:', reason)
  })
  process.on('uncaughtException', (err) => {
    console.error('[video] UNCAUGHT EXCEPTION:', err)
  })
}

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

const SOLID_FRAME = {
  type: 'div',
  props: {
    style: {
      width: '100%',
      height: '100%',
      backgroundColor: 'red',
    },
  },
} as const

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const stage = String(req.query.stage ?? 'full')
  const handlerStart = Date.now()
  const log = (event: string, extra: Record<string, unknown> = {}) => {
    console.log(
      `[video] stage=${stage} ${event} ms=${Date.now() - handlerStart}`,
      extra
    )
  }

  try {
    // Stage 0: did module evaluation complete? If you hit a 120s timeout
    // *before* this handler runs, none of the stage probes will respond — the
    // hang is in one of the top-level imports (satori/video, sharp, h264).
    if (stage === 'module') {
      return res.status(200).json({
        ok: true,
        moduleLoadAt: MODULE_LOADED_AT,
        handlerStart,
        sinceModuleLoad: handlerStart - MODULE_LOADED_AT,
      })
    }

    // Stage 1: just import the video entry. With static imports it's already
    // done; this probe confirms the module is reachable.
    if (stage === 'import') {
      log('import-only')
      return res.status(200).json({
        ok: true,
        videoFn: typeof video,
        satoriFn: typeof satori,
        ms: Date.now() - handlerStart,
      })
    }

    // Stage 2: read fonts from disk. Will fail with ENOENT if `public/` isn't
    // bundled into the serverless function.
    if (stage === 'fonts') {
      const fonts = await loadFonts()
      log('fonts-loaded', { count: fonts.length })
      return res.status(200).json({
        ok: true,
        fonts: fonts.map((f) => ({
          name: f.name,
          weight: f.weight,
          bytes: f.data.byteLength,
        })),
        ms: Date.now() - handlerStart,
      })
    }

    // Stage 3: one Satori call → SVG string. Exercises yoga + text shaping,
    // but neither sharp nor the encoder.
    if (stage === 'satori') {
      const fonts = await loadFonts()
      log('fonts-loaded')
      const svg = await satori(renderTitleCard('hi', 0.5), {
        width: 320,
        height: 180,
        fonts: fonts as any,
      })
      log('satori-done', { svgBytes: svg.length })
      return res.status(200).json({
        ok: true,
        svgBytes: svg.length,
        ms: Date.now() - handlerStart,
      })
    }

    // Stage 4a: exercise *only* the h264 WASM against a hand-built RGBA buffer.
    // No satori, no sharp. If this hangs, every line between `log()`s in the
    // Vercel function logs tells us exactly which WASM call doesn't return.
    if (stage === 'encoder-only') {
      const hme: any = await import('h264-mp4-encoder')
      const { createH264MP4Encoder } = hme.default ?? hme
      log('encoder-module-loaded')

      const encoder = await createH264MP4Encoder()
      log('encoder-constructed')

      encoder.width = 64
      encoder.height = 64
      encoder.frameRate = 30
      encoder.outputFilename = `probe-${Date.now()}.mp4`
      log('encoder-configured')

      encoder.initialize()
      log('encoder-initialized')

      const rgba = Buffer.alloc(64 * 64 * 4, 0xff) // solid white
      encoder.addFrameRgba(rgba)
      log('encoder-frame-added')

      encoder.finalize()
      log('encoder-finalized')

      const bytes = encoder.FS.readFile(encoder.outputFilename) as Uint8Array
      log('encoder-readFile-done', { bytes: bytes.byteLength })

      try {
        encoder.FS.unlink(encoder.outputFilename)
      } catch {
        // ignore
      }
      encoder.delete()
      log('encoder-deleted')

      return res.status(200).json({
        ok: true,
        bytes: bytes.byteLength,
        ms: Date.now() - handlerStart,
      })
    }

    // Stage 4b: full video pipeline but trivial — 1 frame, 64×64, solid color
    // (no text shaping). If `encoder-only` passes but this hangs, it's the
    // satori → sharp → encoder integration.
    if (stage === 'encode-one') {
      const fonts = await loadFonts()
      log('fonts-loaded')
      const mp4 = await video(() => SOLID_FRAME as any, {
        width: 64,
        height: 64,
        duration: 33,
        fps: 30,
        fonts: fonts as any,
      })
      log('encode-done', { bytes: mp4.byteLength })
      return res.status(200).json({
        ok: true,
        bytes: mp4.byteLength,
        ms: Date.now() - handlerStart,
      })
    }

    // Stage full (default): the real thing, with per-frame timing.
    const text = sanitizeText(req.query.text)
    const fonts = await loadFonts()
    log('fonts-loaded')

    let frameCount = 0
    const sampleTimings: Array<{ frame: number; ms: number }> = []
    let lastFrameEnd = Date.now()

    const mp4 = await video(
      ({ progress, frame }: { progress: number; frame: number }) => {
        if (frame % 10 === 0) {
          const now = Date.now()
          sampleTimings.push({ frame, ms: now - lastFrameEnd })
          lastFrameEnd = now
        }
        frameCount++
        return renderTitleCard(text, progress)
      },
      {
        width: W,
        height: H,
        duration: DURATION_MS,
        fps: FPS,
        fonts: fonts as any,
        quality: 22,
      }
    )

    log('full-done', {
      frameCount,
      bytes: mp4.byteLength,
      sampleTimings,
    })

    res.setHeader('Content-Type', 'video/mp4')
    res.setHeader('Content-Length', String(mp4.byteLength))
    res.setHeader(
      'Cache-Control',
      'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
    )
    res.status(200).send(Buffer.from(mp4))
  } catch (err) {
    console.error('[/api/video] failed at stage=', stage, err)
    res.status(500).json({
      stage,
      error: (err as Error).message ?? 'video render failed',
    })
  }
}
