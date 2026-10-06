/**
 * Default WebGL2 contexts for `<canvas webgl>`, used when `createWebGLContext`
 * isn't provided: OffscreenCanvas in browsers and Web Workers, and headless-gl
 * in Node.js. Like a real `<canvas>`, each one gets a fresh context, which is
 * destroyed with everything drawn into it once its content is read.
 */

type CreateHeadlessGL = (
  width: number,
  height: number,
  options: { createWebGL2Context: true; useSwiftShader: true }
) => WebGL2RenderingContext | null

let createHeadlessGL: CreateHeadlessGL | undefined

const MISSING_WEBGL =
  'Rendering `<canvas webgl={...}>` needs a WebGL2 context. Satori uses OffscreenCanvas in browsers and Web Workers, and the `gl` package (a WebGL2 build of headless-gl, such as github:encharm/headless-gl) in Node.js 20.16+. Install it in your project, or pass the `createWebGLContext` option.'

/**
 * Load headless-gl from the app instead of from Satori, so it doesn't have to
 * be a Satori dependency. `process.getBuiltinModule` (Node.js 20.16+) avoids
 * an import of `module` that bundlers would try to resolve for browsers.
 */
function loadHeadlessGL(): CreateHeadlessGL {
  const nodeModule = (globalThis as any).process?.getBuiltinModule?.('module')
  if (!nodeModule) throw new Error(MISSING_WEBGL)

  const require = nodeModule.createRequire(process.cwd() + '/')
  let path: string
  try {
    path = require.resolve('gl')
  } catch {
    throw new Error(MISSING_WEBGL)
  }
  return require(path)
}

function createContext(
  width: number,
  height: number
): [WebGL2RenderingContext, () => void] {
  if (typeof OffscreenCanvas !== 'undefined') {
    const gl = new OffscreenCanvas(width, height).getContext('webgl2', {
      preserveDrawingBuffer: true,
    })
    if (!gl) throw new Error('Failed to create a WebGL2 context.')
    return [gl, () => gl.getExtension('WEBGL_lose_context')?.loseContext()]
  }

  createHeadlessGL ??= loadHeadlessGL()
  const gl = createHeadlessGL(width, height, {
    createWebGL2Context: true,
    useSwiftShader: true,
  })
  if (!gl) throw new Error('Failed to create a WebGL2 context.')
  const destroy = () => gl.getExtension('STACKGL_destroy_context')?.destroy()
  if (!/WebGL 2|OpenGL ES 3/.test(gl.getParameter(gl.VERSION))) {
    destroy()
    throw new Error(
      'The installed `gl` package only supports WebGL1. Install a WebGL2 build of headless-gl, such as github:encharm/headless-gl, or pass the `createWebGLContext` option.'
    )
  }
  return [gl, destroy]
}

/** Run `task` with a fresh WebGL2 context, destroyed afterwards. */
export async function withDefaultContext<T>(
  width: number,
  height: number,
  task: (gl: WebGL2RenderingContext) => Promise<T>
): Promise<T> {
  const [gl, destroy] = createContext(width, height)
  try {
    return await task(gl)
  } finally {
    destroy()
  }
}
