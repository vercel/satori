/**
 * Renders a 1200×630 PNG card with a WebGL shader background and the `text`
 * query parameter on top, e.g. `/api/shader-card?text=Hello`.
 *
 * WebGL runs on the CPU through headless-gl (ANGLE + SwiftShader). The
 * `Server-Timing` header reports the time spent in each step.
 */

/* eslint-disable react/no-unknown-property -- `webgl` is a Satori prop. */
import type { NextApiRequest, NextApiResponse } from 'next'
import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'

// The playground declares `satori` as an untyped module, so mirror its type.
type WebGLCanvasRenderer = (
  gl: WebGL2RenderingContext,
  info: { width: number; height: number }
) => void

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface CanvasHTMLAttributes<T> {
    webgl?: WebGLCanvasRenderer
  }
}

const WIDTH = 1200
const HEIGHT = 630
const MAX_TEXT_LENGTH = 200

const VERTEX_SHADER = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`

// Domain-warped fractal noise.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec2 resolution;
uniform float seed;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.y + seed;
  vec2 q = vec2(fbm(uv * 3.0), fbm(uv * 3.0 + 5.2));
  float n = fbm(uv * 3.0 + 4.0 * q);
  vec3 color = mix(vec3(0.05, 0.02, 0.15), vec3(0.9, 0.4, 0.2), n);
  color = mix(color, vec3(0.2, 0.7, 1.0), q.x * q.y);
  fragColor = vec4(color, 1.0);
}`

// glibc dlopen flags. RTLD_NODELETE keeps a library loaded after Node closes
// its handle.
const RTLD_NOW = 0x2
const RTLD_GLOBAL = 0x100
const RTLD_NODELETE = 0x1000

type ProcessWithDlopen = NodeJS.Process & {
  dlopen(module: object, filename: string, flags: number): void
}

const LIBS_DIRECTORY = path.join(process.cwd(), '.webgl-libs')

/**
 * Locate headless-gl: the copy prepared by `scripts/bundle-webgl-libs.mjs`
 * (deployments), or the installed package (`next dev`). Resolved at runtime
 * so the bundler leaves it alone.
 */
function getGLDirectory() {
  const copy = path.join(LIBS_DIRECTORY, 'gl')
  if (existsSync(copy)) return copy
  return path.dirname(
    createRequire(path.join(process.cwd(), 'index.js')).resolve(
      'gl/package.json'
    )
  )
}

/**
 * On Linux, load the libraries ANGLE depends on by absolute path before the
 * first context is created: the bundled X11 client libraries (the function
 * runtime doesn't have them) and headless-gl's Vulkan loader. The dynamic
 * linker then reuses them when it resolves ANGLE's dependencies.
 */
function preloadLibraries(glDirectory: string): string[] {
  if (process.platform !== 'linux') return []

  const loadOrderFile = path.join(LIBS_DIRECTORY, 'load-order.json')
  const bundled: string[] = existsSync(loadOrderFile)
    ? JSON.parse(readFileSync(loadOrderFile, 'utf8'))
    : []
  const files = [
    ...bundled.map((name) => path.join(LIBS_DIRECTORY, name)),
    path.join(glDirectory, 'build', 'Release', 'libvulkan.so.1'),
  ]

  const loaded: string[] = []
  for (const file of files) {
    if (!existsSync(file)) continue
    try {
      ;(process as ProcessWithDlopen).dlopen(
        { exports: {} },
        file,
        RTLD_NOW | RTLD_GLOBAL | RTLD_NODELETE
      )
    } catch (error) {
      // Plain shared libraries aren't Node addons, so Node throws after
      // loading them. RTLD_NODELETE keeps them loaded anyway.
      if (!String(error).includes('did not self-register')) throw error
    }
    loaded.push(path.basename(file))
  }
  return loaded
}

let preloaded: string[] | undefined
let context: { gl: WebGL2RenderingContext; program: WebGLProgram } | undefined

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed.')
  }
  return shader
}

/**
 * Reuse one context and compiled program per function instance. Every card
 * has the same size, so the context never needs to be resized.
 */
function getContext(width: number, height: number) {
  if (context) {
    if (
      context.gl.drawingBufferWidth !== width ||
      context.gl.drawingBufferHeight !== height
    ) {
      throw new Error(`Expected a ${WIDTH}x${HEIGHT} canvas.`)
    }
    return context
  }

  const glDirectory = getGLDirectory()
  preloaded ??= preloadLibraries(glDirectory)
  const createGL: typeof import('gl') = createRequire(
    path.join(process.cwd(), 'index.js')
  )(glDirectory)
  const gl = createGL(width, height, {
    createWebGL2Context: true,
    useSwiftShader: true,
  })
  if (!gl) throw new Error('Failed to create a SwiftShader WebGL2 context.')

  const program = gl.createProgram()!
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER))
  gl.attachShader(
    program,
    compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  )
  gl.bindAttribLocation(program, 0, 'position')
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || 'Program linking failed.')
  }

  // A single triangle that covers the whole canvas.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  )
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  context = { gl, program }
  return context
}

// Renders share one context, so they must not interleave.
let queue: Promise<unknown> = Promise.resolve()
function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task)
  queue = result.catch(() => undefined)
  return result
}

const fontData = readFile(
  path.join(process.cwd(), 'public', 'geist-700-normal.ttf')
)

function hashText(text: string) {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0
  }
  return (Math.abs(hash) % 1000) / 10
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const query = Array.isArray(req.query.text)
    ? req.query.text[0]
    : req.query.text
  const text = (query || 'Hello, WebGL').slice(0, MAX_TEXT_LENGTH)
  const timings: string[] = []

  async function time<T>(name: string, task: () => T | Promise<T>) {
    const start = performance.now()
    const result = await task()
    timings.push(`${name};dur=${(performance.now() - start).toFixed(1)}`)
    return result
  }

  const background: WebGLCanvasRenderer = (gl, { width, height }) => {
    const start = performance.now()
    const { program } = getContext(width, height)
    gl.useProgram(program)
    gl.uniform2f(gl.getUniformLocation(program, 'resolution'), width, height)
    gl.uniform1f(gl.getUniformLocation(program, 'seed'), hashText(text))
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.finish()
    timings.push(`shader;dur=${(performance.now() - start).toFixed(1)}`)
  }

  try {
    const fonts = [
      { name: 'Geist', data: await fontData, weight: 700 as const },
    ]
    const svg = await exclusive(() =>
      time('satori', () =>
        satori(
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              backgroundColor: 'black',
            }}
          >
            <canvas
              width={WIDTH}
              height={HEIGHT}
              webgl={background}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
              }}
            />
            <div
              style={{
                display: 'flex',
                maxWidth: 1000,
                padding: '32px 56px',
                borderRadius: 32,
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                color: 'white',
                fontFamily: 'Geist',
                fontSize: 72,
                fontWeight: 700,
                letterSpacing: -2,
                lineHeight: 1.1,
                textAlign: 'center',
              }}
            >
              {text}
            </div>
          </div>,
          {
            width: WIDTH,
            height: HEIGHT,
            fonts,
            createWebGLContext: (width: number, height: number) =>
              time('context', () => getContext(width, height).gl),
          }
        )
      )
    )
    const png = await time('resvg', () => new Resvg(svg).render().asPng())

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Server-Timing', timings.join(', '))
    res.send(png)
  } catch (error) {
    // Report enough to debug the native setup on a deployment.
    res.status(500).json({
      error: error instanceof Error ? error.stack : String(error),
      platform: `${process.platform}-${process.arch}`,
      node: process.version,
      preloaded,
    })
  }
}
