/**
 * Support for `<canvas webgl={...}>`: Satori gets a WebGL2 context (from
 * `createWebGLContext`, or a default one), runs the element's `webgl`
 * callback, and embeds the resulting drawing buffer as an image.
 */

import {
  setReplacedElementSize,
  type ReplacedElementHandler,
} from '../handler/compute.js'
import { arrayBufferToBase64 } from '../handler/image.js'
import { encodePNG } from './png.js'
import { withDefaultContext } from './webgl.js'

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
 * Handle `<canvas>` elements. Like browsers, the `width` and `height`
 * attributes (300×150 by default) set the drawing buffer size, which is also
 * the intrinsic size.
 */
export function canvas(
  createContext: CreateWebGLContext | undefined
): ReplacedElementHandler {
  return async (node, style, props) => {
    const width = parseCanvasDimension(props.width, DEFAULT_CANVAS_WIDTH)
    const height = parseCanvasDimension(props.height, DEFAULT_CANVAS_HEIGHT)

    if (!width || !height) {
      if (style.width === undefined) style.width = width
      if (style.height === undefined) style.height = height
      return
    }

    // Unlike <img>, the width and height attributes of a <canvas> are not CSS
    // size hints, so a CSS width alone keeps the aspect ratio.
    const useIntrinsicSize =
      style.width === undefined && style.height === undefined
    setReplacedElementSize(
      node,
      style,
      width,
      height,
      useIntrinsicSize ? width : undefined,
      useIntrinsicSize ? height : undefined
    )

    if (typeof props.webgl === 'function' && style.display !== 'none') {
      style.__src = await renderWebGLCanvas(
        props.webgl,
        width,
        height,
        createContext
      )
    }
  }
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
  const draw = async (gl: WebGL2RenderingContext) => {
    // Start like a new canvas: the default framebuffer, cleared to
    // transparent, with a viewport covering the whole drawing buffer. This
    // matters when contexts are reused, and because headless-gl doesn't clear
    // the drawing buffer of new contexts, which could otherwise show what an
    // earlier context drew. The state set here is a new context's default.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.disable(gl.SCISSOR_TEST)
    gl.colorMask(true, true, true, true)
    gl.depthMask(true)
    gl.stencilMask(0xffffffff)
    gl.clearColor(0, 0, 0, 0)
    gl.clearDepth(1)
    gl.clearStencil(0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT)

    await renderer(gl, { width, height })

    return readDrawingBuffer(gl)
  }

  if (!createContext) return withDefaultContext(width, height, draw)

  const gl = await createContext(width, height)
  if (!gl) {
    throw new Error(
      `Failed to create a ${width}x${height} WebGL context for <canvas>: \`createWebGLContext\` returned ${gl}.`
    )
  }
  return draw(gl)
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
