import type { ReactNode } from 'react'
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

let sharpModule: SharpFactory | undefined
async function loadSharp(): Promise<SharpFactory> {
  if (sharpModule) return sharpModule
  try {
    const mod: any = await import('sharp')
    sharpModule = (mod.default ?? mod) as SharpFactory
    return sharpModule
  } catch (err) {
    throw new Error(
      'satori/video requires `sharp` as a peer dependency. Install it with your package manager (e.g. `npm install sharp`). ' +
        `Original error: ${(err as Error).message}`
    )
  }
}

let hmeModule: HMEModule | undefined
async function loadHME(): Promise<HMEModule> {
  if (hmeModule) return hmeModule
  const mod: any = await import('h264-mp4-encoder')
  hmeModule = (mod.default ?? mod) as HMEModule
  return hmeModule
}

function computeTotalFrames(durationMs: number, fps: number): number {
  return Math.max(1, Math.round((durationMs / 1000) * fps))
}

async function rasterize(
  sharp: SharpFactory,
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
  fps: number,
  sharp: SharpFactory
): Promise<Buffer> {
  const progress = totalFrames <= 1 ? 0 : frame / (totalFrames - 1)
  const time = (frame / fps) * 1000
  const element = await renderer({ frame, progress, time })
  const svg = await satori(element, satoriOptions)
  return rasterize(sharp, svg, width, height)
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

  const satoriOptions = { ...rest, width, height } as SatoriOptions
  const totalFrames = computeTotalFrames(duration, fps)

  const sharp = await loadSharp()
  const { createH264MP4Encoder } = await loadHME()

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

  try {
    for (let frame = 0; frame < totalFrames; frame++) {
      const rgba = await renderFrame(
        renderer,
        satoriOptions,
        width,
        height,
        frame,
        totalFrames,
        fps,
        sharp
      )
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
