/* eslint-disable react/no-unknown-property -- `webgl` is a Satori prop. */
import { it, describe, expect, beforeAll, afterEach } from 'vitest'
import createGL from 'gl'

import { initFonts, toImage } from './utils.js'
import satori, { type WebGLCanvasRenderer } from '../src/experimental/index.js'
import stableSatori from '../src/index.js'

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface CanvasHTMLAttributes<T> {
    webgl?: WebGLCanvasRenderer
  }
}

/**
 * A tiny software stand-in for a WebGL2 context. It supports `clear` with an
 * optional scissor box (enough to draw rectangles), offscreen framebuffers,
 * viewport state, and resizing. Rows are stored bottom-up like a real drawing
 * buffer.
 */
class FakeWebGL2 {
  FRAMEBUFFER = 0x8d40
  PIXEL_PACK_BUFFER = 0x88eb
  RGBA = 0x1908
  UNSIGNED_BYTE = 0x1401
  COLOR_BUFFER_BIT = 0x4000
  SCISSOR_TEST = 0x0c11
  VIEWPORT = 0x0ba2

  drawingBufferWidth = 0
  drawingBufferHeight = 0

  private framebuffers = new Map<unknown, Uint8Array>()
  private framebuffer: unknown = null
  private color = [0, 0, 0, 0]
  private scissorEnabled = false
  private scissorBox = [0, 0, 0, 0]
  private viewportBox: number[]

  constructor(
    width: number,
    height: number,
    private attributes: WebGLContextAttributes = {}
  ) {
    this.resize(width, height)
    this.viewportBox = [0, 0, width, height]
  }

  /** Like `STACKGL_resize_drawingbuffer`: clears content, keeps the viewport. */
  resize(width: number, height: number) {
    this.drawingBufferWidth = width
    this.drawingBufferHeight = height
    this.framebuffers.clear()
    this.framebuffers.set(null, new Uint8Array(width * height * 4))
  }

  getContextAttributes() {
    return { alpha: true, premultipliedAlpha: true, ...this.attributes }
  }

  getParameter(name: number) {
    if (name === this.VIEWPORT) return Int32Array.from(this.viewportBox)
  }

  createFramebuffer() {
    const framebuffer = {}
    this.framebuffers.set(
      framebuffer,
      new Uint8Array(this.drawingBufferWidth * this.drawingBufferHeight * 4)
    )
    return framebuffer
  }

  bindFramebuffer(_target: number, framebuffer: unknown) {
    this.framebuffer = framebuffer
  }

  bindBuffer() {
    // Buffers are not emulated.
  }

  viewport(x: number, y: number, width: number, height: number) {
    this.viewportBox = [x, y, width, height]
  }

  enable(capability: number) {
    if (capability === this.SCISSOR_TEST) this.scissorEnabled = true
  }

  disable(capability: number) {
    if (capability === this.SCISSOR_TEST) this.scissorEnabled = false
  }

  scissor(x: number, y: number, width: number, height: number) {
    this.scissorBox = [x, y, width, height]
  }

  clearColor(r: number, g: number, b: number, a: number) {
    this.color = [r, g, b, a]
  }

  clear() {
    const pixels = this.framebuffers.get(this.framebuffer)
    const [x0, y0, w, h] = this.scissorEnabled
      ? this.scissorBox
      : [0, 0, this.drawingBufferWidth, this.drawingBufferHeight]
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const i = (y * this.drawingBufferWidth + x) * 4
        for (let c = 0; c < 4; c++) {
          pixels[i + c] = Math.round(this.color[c] * 255)
        }
      }
    }
  }

  readPixels(
    _x: number,
    _y: number,
    _width: number,
    _height: number,
    _format: number,
    _type: number,
    out: Uint8Array
  ) {
    out.set(this.framebuffers.get(this.framebuffer))
  }
}

function fakeWebGLContext(attributes?: WebGLContextAttributes) {
  return (width: number, height: number) =>
    new FakeWebGL2(
      width,
      height,
      attributes
    ) as unknown as WebGL2RenderingContext
}

function fillRect(
  gl: WebGL2RenderingContext,
  [x, y, width, height]: number[],
  [r, g, b, a]: number[]
) {
  gl.enable(gl.SCISSOR_TEST)
  gl.scissor(x, y, width, height)
  gl.clearColor(r, g, b, a)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.disable(gl.SCISSOR_TEST)
}

function fill(color: number[]): WebGLCanvasRenderer {
  return (gl, { width, height }) => fillRect(gl, [0, 0, width, height], color)
}

const RED = [1, 0, 0, 1]
const GREEN = [0, 1, 0, 1]
const BLUE = [0, 0, 1, 1]

describe('Canvas', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render WebGL content right side up', async () => {
    const svg = await satori(
      <canvas
        width={100}
        height={100}
        webgl={(gl, { width, height }) => {
          // WebGL's origin is the bottom-left corner.
          fillRect(gl, [0, height / 2, width, height / 2], RED)
          fillRect(gl, [0, 0, width, height / 2], BLUE)
        }}
      />,
      {
        width: 100,
        height: 100,
        fonts,
        createWebGLContext: fakeWebGLContext(),
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should use the width and height attributes as the drawing buffer size', async () => {
    // A 2px red frame: thin on the default 300×150 buffer, thick on a 20×10
    // buffer scaled up to the same display size.
    const frame: WebGLCanvasRenderer = (gl, { width, height }) => {
      fillRect(gl, [0, 0, width, height], RED)
      fillRect(gl, [2, 2, width - 4, height - 4], BLUE)
    }
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: 'white',
        }}
      >
        <canvas style={{ width: 200, height: 100 }} webgl={frame} />
        <canvas
          width='20'
          height={10}
          style={{ width: 200, height: 100 }}
          webgl={frame}
        />
      </div>,
      {
        width: 200,
        height: 200,
        fonts,
        createWebGLContext: fakeWebGLContext(),
      }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should size the canvas like a replaced element', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: 'white',
        }}
      >
        {/* Intrinsic size: 100×50. */}
        <canvas width={100} height={50} webgl={fill(RED)} />
        {/* CSS width only: keeps the 2:1 aspect ratio, 50×25. */}
        <canvas
          width={100}
          height={50}
          style={{ width: 50 }}
          webgl={fill(GREEN)}
        />
        {/* Both CSS dimensions: 30×70. */}
        <canvas
          width={100}
          height={50}
          style={{ width: 30, height: 70 }}
          webgl={fill(BLUE)}
        />
      </div>,
      {
        width: 100,
        height: 150,
        fonts,
        createWebGLContext: fakeWebGLContext(),
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should start every canvas from the default framebuffer and a full viewport', async () => {
    // Reuse and resize one context for all canvases, like a server would.
    let context: FakeWebGL2
    const createSharedContext = (width: number, height: number) => {
      if (context) context.resize(width, height)
      else context = new FakeWebGL2(width, height)
      return context as unknown as WebGL2RenderingContext
    }

    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: 'white',
        }}
      >
        {/* Shows blue: the offscreen framebuffer left bound is not read. */}
        <canvas
          width={50}
          height={50}
          webgl={(gl, { width, height }) => {
            fillRect(gl, [0, 0, width, height], BLUE)
            gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
            gl.viewport(0, 0, 10, 10)
            fillRect(gl, [0, 0, width, height], GREEN)
          }}
        />
        {/* Fully red: drawn into the default framebuffer, full viewport. */}
        <canvas
          width={50}
          height={50}
          webgl={(gl) => {
            const [x, y, width, height] = gl.getParameter(gl.VIEWPORT)
            fillRect(gl, [x, y, width, height], RED)
          }}
        />
      </div>,
      {
        width: 100,
        height: 50,
        fonts,
        createWebGLContext: createSharedContext,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should convert premultiplied alpha to straight alpha', async () => {
    // Left: 50% red, premultiplied. It must look light red over white, not
    // dark red. Right: fully transparent.
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: 'white',
        }}
      >
        <canvas
          width={100}
          height={50}
          webgl={(gl) => fillRect(gl, [0, 0, 50, 50], [0.5, 0, 0, 0.5])}
        />
      </div>,
      {
        width: 100,
        height: 50,
        fonts,
        createWebGLContext: fakeWebGLContext(),
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should treat contexts without alpha as opaque', async () => {
    // Green with zero alpha must still cover the blue background.
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: 'blue',
        }}
      >
        <canvas width={100} height={50} webgl={fill([0, 1, 0, 0])} />
      </div>,
      {
        width: 100,
        height: 50,
        fonts,
        createWebGLContext: fakeWebGLContext({ alpha: false }),
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should wait for async renderers', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: 'white',
        }}
      >
        <canvas
          width={100}
          height={50}
          webgl={async (gl, { width, height }) => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            fillRect(gl, [0, 0, width, height], BLUE)
          }}
        />
      </div>,
      {
        width: 100,
        height: 50,
        fonts,
        createWebGLContext: fakeWebGLContext(),
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should not render fallback children or hidden canvases', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: 'white',
        }}
      >
        <canvas width={50} height={50} webgl={fill(BLUE)}>
          <div style={{ width: 50, height: 50, backgroundColor: 'red' }} />
        </canvas>
        <canvas
          width={50}
          height={50}
          style={{ display: 'none' }}
          webgl={() => {
            throw new Error('Hidden canvases should not be rendered.')
          }}
        />
      </div>,
      {
        width: 100,
        height: 50,
        fonts,
        createWebGLContext: fakeWebGLContext(),
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render a canvas without content as a box', async () => {
    // No `webgl` prop, so no context is needed.
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: 'white',
        }}
      >
        <canvas
          width={50}
          height={25}
          style={{ backgroundColor: 'red', borderRadius: 10 }}
        />
      </div>,
      { width: 100, height: 50, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should not render WebGL content from the root entry', async () => {
    // Only `satori/experimental` renders `webgl`. The root entry draws the
    // canvas as a plain box and never calls the renderer.
    const svg = await stableSatori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: 'white',
        }}
      >
        <canvas
          style={{
            width: 50,
            height: 25,
            backgroundColor: 'red',
            borderRadius: 10,
          }}
          webgl={() => {
            throw new Error('The root entry should not render WebGL.')
          }}
        />
      </div>,
      { width: 100, height: 50, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})

const FULLSCREEN_VERTEX_SHADER = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader))
  }
  return shader
}

/**
 * Draw a fragment shader over the whole viewport. `resolution` (the viewport
 * size) is always provided; `uniforms` sets additional float uniforms.
 */
function drawShader(
  gl: WebGL2RenderingContext,
  fragmentShader: string,
  uniforms: Record<string, number | number[]> = {}
) {
  const program = gl.createProgram()
  gl.attachShader(
    program,
    compileShader(gl, gl.VERTEX_SHADER, FULLSCREEN_VERTEX_SHADER)
  )
  gl.attachShader(
    program,
    compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader)
  )
  gl.bindAttribLocation(program, 0, 'position')
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program))
  }
  gl.useProgram(program)

  // A single triangle that covers the whole viewport.
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  )
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const [, , width, height] = gl.getParameter(gl.VIEWPORT)
  gl.uniform2f(gl.getUniformLocation(program, 'resolution'), width, height)
  for (const [name, value] of Object.entries(uniforms)) {
    const location = gl.getUniformLocation(program, name)
    const values = typeof value === 'number' ? [value] : value
    if (values.length === 1) gl.uniform1fv(location, values)
    else if (values.length === 2) gl.uniform2fv(location, values)
    else if (values.length === 3) gl.uniform3fv(location, values)
    else gl.uniform4fv(location, values)
  }

  gl.drawArrays(gl.TRIANGLES, 0, 3)
  gl.deleteBuffer(buffer)
  gl.deleteProgram(program)
}

function createTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  pixels: Uint8Array | null
): WebGLTexture {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels
  )
  return texture
}

describe('Canvas shaders', () => {
  let fonts
  initFonts((f) => (fonts = f))

  // Real WebGL2 on the CPU via ANGLE + SwiftShader. Each canvas gets a fresh
  // context: this headless-gl build's `STACKGL_resize_drawingbuffer` only
  // updates the reported size, not the actual drawing buffer.
  const contexts: WebGL2RenderingContext[] = []
  const createWebGLContext = (width: number, height: number) => {
    const gl = createGL(width, height, {
      createWebGL2Context: true,
      useSwiftShader: true,
    })
    if (!gl) throw new Error('Failed to create a SwiftShader context.')
    contexts.push(gl)
    return gl
  }

  // The first context initializes SwiftShader, which can be slow.
  beforeAll(() => {
    createWebGLContext(1, 1)
  }, 30_000)
  afterEach(() => {
    for (const gl of contexts.splice(0)) {
      gl.getExtension('STACKGL_destroy_context').destroy()
    }
  })

  it('should render a fragment shader', async () => {
    // Bottom-left blue, bottom-right red, top-left cyan, top-right yellow.
    const svg = await satori(
      <canvas
        width={100}
        height={100}
        webgl={(gl) =>
          drawShader(
            gl,
            `#version 300 es
            precision highp float;
            uniform vec2 resolution;
            out vec4 fragColor;
            void main() {
              vec2 uv = gl_FragCoord.xy / resolution;
              fragColor = vec4(uv.x, uv.y, 1.0 - uv.x, 1.0);
            }`
          )
        }
      />,
      { width: 100, height: 100, fonts, createWebGLContext }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should pass uniforms to shaders', async () => {
    // Anti-aliased circles with premultiplied alpha over a dark background.
    const circle = `#version 300 es
      precision highp float;
      uniform vec2 center;
      uniform float radius;
      uniform vec3 color;
      out vec4 fragColor;
      void main() {
        float d = distance(gl_FragCoord.xy, center);
        float alpha = 1.0 - smoothstep(radius - 1.0, radius + 1.0, d);
        fragColor = vec4(color * alpha, alpha);
      }`
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: '#111',
        }}
      >
        <canvas
          width={50}
          height={50}
          webgl={(gl) =>
            drawShader(gl, circle, {
              center: [25, 25],
              radius: 20,
              color: [1, 0.5, 0],
            })
          }
        />
        {/* WebGL's y axis points up, so this circle is in the top right. */}
        <canvas
          width={50}
          height={50}
          webgl={(gl) =>
            drawShader(gl, circle, {
              center: [35, 35],
              radius: 12,
              color: [0, 0.8, 0.7],
            })
          }
        />
      </div>,
      { width: 100, height: 50, fonts, createWebGLContext }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should sample textures', async () => {
    // A 2×2 texture tiled twice. Its first row is the bottom one in WebGL.
    const svg = await satori(
      <canvas
        width={80}
        height={80}
        webgl={(gl) => {
          // prettier-ignore
          const pixels = new Uint8Array([
            255, 0, 0, 255,     255, 255, 255, 255,
            255, 255, 255, 255, 0, 0, 255, 255,
          ])
          gl.activeTexture(gl.TEXTURE0)
          createTexture(gl, 2, 2, pixels)
          drawShader(
            gl,
            `#version 300 es
            precision highp float;
            uniform vec2 resolution;
            uniform sampler2D checker;
            out vec4 fragColor;
            void main() {
              vec2 uv = gl_FragCoord.xy / resolution;
              fragColor = texture(checker, fract(uv * 2.0));
            }`
          )
        }}
      />,
      { width: 80, height: 80, fonts, createWebGLContext }
    )
    expect(toImage(svg, 80)).toMatchImageSnapshot()
  })

  it('should render multiple passes through a framebuffer', async () => {
    // Pass 1 renders a gradient into a texture, pass 2 inverts it on screen.
    // Inverted: bottom-left white, bottom-right cyan, top-left magenta,
    // top-right blue.
    const svg = await satori(
      <canvas
        width={100}
        height={100}
        webgl={(gl, { width, height }) => {
          const scene = createTexture(gl, width, height, null)
          const framebuffer = gl.createFramebuffer()
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
          gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            scene,
            0
          )
          drawShader(
            gl,
            `#version 300 es
            precision highp float;
            uniform vec2 resolution;
            out vec4 fragColor;
            void main() {
              vec2 uv = gl_FragCoord.xy / resolution;
              fragColor = vec4(uv, 0.0, 1.0);
            }`
          )

          gl.bindFramebuffer(gl.FRAMEBUFFER, null)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, scene)
          drawShader(
            gl,
            `#version 300 es
            precision highp float;
            uniform vec2 resolution;
            uniform sampler2D scene;
            out vec4 fragColor;
            void main() {
              vec2 uv = gl_FragCoord.xy / resolution;
              fragColor = vec4(1.0 - texture(scene, uv).rgb, 1.0);
            }`
          )

          // Leave the offscreen framebuffer bound, as apps often do.
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
        }}
      />,
      { width: 100, height: 100, fonts, createWebGLContext }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should composite shader output with Satori content', async () => {
    // A rounded shader background at 2x resolution, with text on top.
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: 'white',
        }}
      >
        <canvas
          width={400}
          height={200}
          style={{
            position: 'absolute',
            left: 10,
            top: 10,
            width: 180,
            height: 80,
            borderRadius: 16,
          }}
          webgl={(gl) =>
            drawShader(
              gl,
              `#version 300 es
              precision highp float;
              uniform vec2 resolution;
              out vec4 fragColor;
              void main() {
                vec2 uv = gl_FragCoord.xy / resolution;
                vec3 color = mix(
                  vec3(0.35, 0.2, 0.85),
                  vec3(0.98, 0.45, 0.2),
                  uv.x * 0.6 + uv.y * 0.4
                );
                // Soft diagonal stripes from a continuous triangle wave.
                float wave = abs(fract((gl_FragCoord.x + gl_FragCoord.y) / 40.0) - 0.5) * 2.0;
                color *= 0.85 + 0.15 * smoothstep(0.3, 0.7, wave);
                fragColor = vec4(color, 1.0);
              }`
            )
          }
        />
        <div style={{ fontSize: 24, color: 'white' }}>Hello, shaders</div>
      </div>,
      { width: 200, height: 100, fonts, createWebGLContext }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })
})
