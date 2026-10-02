/**
 * `satori/experimental`: Satori with experimental features that may change or
 * be removed in any release. They're kept out of the root `satori` entry, so
 * they don't add to its size.
 *
 * - `<canvas webgl={(gl, { width, height }) => ...}>`, which needs the
 *   `createWebGLContext` option.
 */

import type { ReactNode } from 'react'
import { render, type SatoriOptions as BaseSatoriOptions } from '../satori.js'
import { canvas, type CreateWebGLContext } from './canvas.js'

export type {
  FontOptions as Font,
  Weight as FontWeight,
  FontStyle,
} from '../font.js'
export type { Locale } from '../language.js'
export type { SatoriNode } from '../satori.js'
export type {
  CreateWebGLContext,
  WebGLCanvasInfo,
  WebGLCanvasRenderer,
} from './canvas.js'
export { init } from '../yoga.js'

export type SatoriOptions = BaseSatoriOptions & {
  /**
   * Creates the WebGL2 context used to render `<canvas webgl={...}>` elements,
   * sized to the canvas `width` and `height` attributes.
   */
  createWebGLContext?: CreateWebGLContext
}

export default function satori(
  element: ReactNode,
  options: SatoriOptions
): Promise<string> {
  return render(element, options, {
    canvas: canvas(options.createWebGLContext),
  })
}
