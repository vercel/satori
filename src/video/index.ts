import type { ReactNode } from 'react'
import * as sharpNs from 'sharp'
import * as hmeNs from 'h264-mp4-encoder'
import type { SatoriOptions } from '../satori.js'
import satori from '../satori.js'

export type VideoOptions = Omit<SatoriOptions, 'width' | 'height'> & {
  width: number
  height: number
  duration: number
  fps?: number
  bitrate?: number
  quality?: number
  groupOfPictures?: number
  /**
   * Number of frames whose Satori + sharp work can be in flight at once. The
   * H.264 encoder still consumes frames strictly in order — concurrency lets
   * upcoming frames render while the current one is being encoded, and lets
   * sharp use its libuv threadpool for multiple frames in parallel.
   *
   * Default: 4 (matches the default libuv UV_THREADPOOL_SIZE).
   */
  concurrency?: number
}

export type FrameContext = {
  frame: number
  progress: number
  time: number
}

export type VideoRenderer = (
  ctx: FrameContext
) => ReactNode | Promise<ReactNode>

type SharpFactory = typeof import('sharp')
type HMEModule = typeof import('h264-mp4-encoder')

// Resolve both backends at module evaluation. On serverless platforms this
// front-loads the native binding and WASM compilation into cold-start rather
// than the first request.
const sharp: SharpFactory = ((sharpNs as any).default ??
  sharpNs) as SharpFactory
const hme: HMEModule = ((hmeNs as any).default ?? hmeNs) as HMEModule
const { createH264MP4Encoder } = hme

function computeTotalFrames(durationMs: number, fps: number): number {
  return Math.max(1, Math.round((durationMs / 1000) * fps))
}

async function rasterize(
  svg: string,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 96 })
    .resize(width, height)
    .ensureAlpha()
    .raw()
    .toBuffer()
}

async function renderFrame(
  renderer: VideoRenderer,
  satoriOptions: SatoriOptions,
  width: number,
  height: number,
  frame: number,
  totalFrames: number,
  fps: number
): Promise<Buffer> {
  const progress = totalFrames <= 1 ? 0 : frame / (totalFrames - 1)
  const time = (frame / fps) * 1000
  const element = await renderer({ frame, progress, time })
  const svg = await satori(element, satoriOptions)
  return rasterize(svg, width, height)
}

export async function video(
  renderer: VideoRenderer,
  options: VideoOptions
): Promise<Uint8Array> {
  const {
    width,
    height,
    duration,
    fps = 30,
    bitrate,
    quality,
    groupOfPictures,
    concurrency = 4,
    ...rest
  } = options

  if (width % 2 !== 0 || height % 2 !== 0) {
    throw new Error(
      'satori/video: width and height must be even (H.264 requirement)'
    )
  }
  if (duration <= 0) {
    throw new Error('satori/video: duration must be > 0')
  }
  if (fps <= 0) {
    throw new Error('satori/video: fps must be > 0')
  }
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('satori/video: concurrency must be a positive integer')
  }

  const satoriOptions = { ...rest, width, height } as SatoriOptions
  const totalFrames = computeTotalFrames(duration, fps)
  const windowSize = Math.min(concurrency, totalFrames)

  const encoder = await createH264MP4Encoder()
  encoder.width = width
  encoder.height = height
  encoder.frameRate = fps
  if (bitrate != null) encoder.kbps = bitrate
  if (quality != null) encoder.quantizationParameter = quality
  if (groupOfPictures != null) encoder.groupOfPictures = groupOfPictures
  encoder.outputFilename = `satori-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.mp4`
  encoder.initialize()

  // Sliding window of in-flight render promises. Producers run ahead of the
  // encoder so Satori + sharp can overlap with the synchronous WASM encode.
  const inFlight = new Map<number, Promise<Buffer>>()
  const startFrame = (i: number) => {
    const p = renderFrame(
      renderer,
      satoriOptions,
      width,
      height,
      i,
      totalFrames,
      fps
    )
    // Suppress unhandled-rejection warnings for frames we may never await
    // (e.g. an earlier frame throws and we bail out of the loop).
    p.catch(() => undefined)
    inFlight.set(i, p)
  }

  let nextStart = 0
  while (nextStart < windowSize) startFrame(nextStart++)

  try {
    for (let i = 0; i < totalFrames; i++) {
      const rgba = await inFlight.get(i)!
      inFlight.delete(i)
      if (nextStart < totalFrames) startFrame(nextStart++)
      encoder.addFrameRgba(rgba)
    }
    encoder.finalize()
    return encoder.FS.readFile(encoder.outputFilename)
  } finally {
    try {
      encoder.FS.unlink(encoder.outputFilename)
    } catch {
      // Encoder may have failed before producing the file; nothing to clean up.
    }
    encoder.delete()
  }
}

export default video
