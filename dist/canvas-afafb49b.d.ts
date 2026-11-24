/**
 * Support for `<canvas webgl={...}>`: Satori gets a WebGL2 context (from
 * `createWebGLContext`, or a default one), runs the element's `webgl`
 * callback, and embeds the resulting drawing buffer as an image.
 */

interface WebGLCanvasInfo {
    /** Width of the canvas drawing buffer, from the `width` attribute. */
    width: number;
    /** Height of the canvas drawing buffer, from the `height` attribute. */
    height: number;
}
type WebGLCanvasRenderer = (gl: WebGL2RenderingContext, info: WebGLCanvasInfo) => void | Promise<void>;
type CreateWebGLContext = (width: number, height: number) => WebGL2RenderingContext | null | undefined | Promise<WebGL2RenderingContext | null | undefined>;

export { CreateWebGLContext as C, WebGLCanvasInfo as W, WebGLCanvasRenderer as a };
