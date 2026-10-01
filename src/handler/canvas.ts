/**
 * Support for `<canvas webgl={...}>`: Satori asks the user-provided
 * `createWebGLContext` for a context, runs the element's `webgl` callback, and
 * embeds the resulting drawing buffer as an image.
 */

import { encodePNG } from '../png.js'
import { arrayBufferToBase64 } from './image.js'

export interface WebGLCanvasInfo {
  /** Width of the canvas drawing buffer, from the `width` attribute. */
  width: number
  /** Height of the canvas drawing buffer, from the `height` attribute. */
  height: number
}

export type WebGLCanvasRenderer = (
  gl: WebGL2RenderingContext,
  info: WebGLCanvasInfo
) => void | Promise<void>

export type CreateWebGLContext = (
  width: number,
  height: number
) =>
  | WebGL2RenderingContext
  | null
  | undefined
  | Promise<WebGL2RenderingContext | null | undefined>

// https://html.spec.whatwg.org/multipage/canvas.html#attr-canvas-width
const DEFAULT_CANVAS_WIDTH = 300
const DEFAULT_CANVAS_HEIGHT = 150

function parseCanvasDimension(value: unknown, fallback: number): number {
  const parsed =
    typeof value === 'number'
      ? Math.floor(value)
      : typeof value === 'string'
      ? parseInt(value, 10)
      : NaN
  return parsed >= 0 ? parsed : fallback
}

/**
 * Get the drawing buffer size of a `<canvas>` from its `width` and `height`
 * attributes, following the HTML defaults of 300×150.
 */
export function getCanvasSize(props: Record<string, any>): [number, number] {
  return [
    parseCanvasDimension(props.width, DEFAULT_CANVAS_WIDTH),
    parseCanvasDimension(props.height, DEFAULT_CANVAS_HEIGHT),
  ]
}

/**
 * Render a `<canvas webgl>` element and return its content as a PNG data URI.
 */
export async function renderWebGLCanvas(
  renderer: WebGLCanvasRenderer,
  width: number,
  height: number,
  createContext: CreateWebGLContext | undefined
): Promise<string> {
  if (!createContext) {
    throw new Error(
      'Rendering `<canvas webgl={...}>` requires the `createWebGLContext` option. Provide a function that returns a WebGL2 context for the given size, e.g. `(width, height) => new OffscreenCanvas(width, height).getContext("webgl2")` in browsers, or a headless WebGL implementation in Node.js.'
    )
  }

  const gl = await createContext(width, height)
  if (!gl) {
    throw new Error(
      `Failed to create a ${width}x${height} WebGL context for <canvas>: \`createWebGLContext\` returned ${gl}.`
    )
  }

  // Start from the state of a freshly created canvas: the default framebuffer
  // with a viewport covering the whole drawing buffer. This matters when
  // `createWebGLContext` reuses and resizes one context for many canvases.
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

  await renderer(gl, { width, height })

  return readDrawingBuffer(gl)
}

function readDrawingBuffer(gl: WebGL2RenderingContext): string {
  // A canvas displays its default framebuffer, so read from that even if the
  // renderer left an offscreen framebuffer or a pixel pack buffer bound.
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  if (typeof gl.PIXEL_PACK_BUFFER === 'number') {
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null)
  }

  const width = gl.drawingBufferWidth
  const height = gl.drawingBufferHeight
  const stride = width * 4
  const pixels = new Uint8Array(stride * height)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

  // WebGL rows start at the bottom, PNG rows start at the top.
  const rgba = new Uint8Array(pixels.length)
  for (let y = 0; y < height; y++) {
    const from = (height - 1 - y) * stride
    rgba.set(pixels.subarray(from, from + stride), y * stride)
  }

  const attributes = gl.getContextAttributes()
  if (attributes?.alpha === false) {
    // The drawing buffer has no alpha channel, so the canvas is opaque.
    for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255
  } else if (attributes?.premultipliedAlpha !== false) {
    // Browsers composite the drawing buffer as premultiplied alpha (the
    // default), but PNG stores straight alpha.
    for (let i = 0; i < rgba.length; i += 4) {
      const alpha = rgba[i + 3]
      if (alpha !== 0 && alpha !== 255) {
        rgba[i] = Math.min(255, Math.round((rgba[i] * 255) / alpha))
        rgba[i + 1] = Math.min(255, Math.round((rgba[i + 1] * 255) / alpha))
        rgba[i + 2] = Math.min(255, Math.round((rgba[i + 2] * 255) / alpha))
      }
    }
  }

  return `data:image/png;base64,${arrayBufferToBase64(
    encodePNG(rgba, width, height)
  )}`
}
