import { ReactNode } from 'react';
import { S as SatoriOptions$1 } from './wasm-9062e2b3.js';
export { F as Font, a as FontStyle, W as FontWeight, L as Locale, b as SatoriNode, i as init } from './wasm-9062e2b3.js';
import { C as CreateWebGLContext } from './canvas-afafb49b.js';
export { W as WebGLCanvasInfo, a as WebGLCanvasRenderer } from './canvas-afafb49b.js';

/**
 * `satori/experimental`: Satori with experimental features that may change or
 * be removed in any release. They're kept out of the root `satori` entry, so
 * they don't add to its size.
 *
 * - `<canvas webgl={(gl, { width, height }) => ...}>`, drawn with WebGL2.
 * - Perspective in CSS transforms (the `perspective` property and the
 *   `perspective()` function), drawn exactly. The root entry approximates it.
 */

type SatoriOptions = SatoriOptions$1 & {
    /**
     * Creates the WebGL2 context used to render `<canvas webgl={...}>` elements,
     * sized to the canvas `width` and `height` attributes. The caller owns the
     * returned contexts.
     *
     * By default, each canvas gets a fresh context that's destroyed afterwards:
     * from OffscreenCanvas in browsers and Web Workers, or from the app's `gl`
     * package (a WebGL2 build of headless-gl) in Node.js 20.16+.
     */
    createWebGLContext?: CreateWebGLContext;
};
declare function satori(element: ReactNode, options: SatoriOptions): Promise<string>;

export { CreateWebGLContext, SatoriOptions, satori as default };
