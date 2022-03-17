let renderAsync: typeof import('@resvg/resvg-js').renderAsync

import Mod from '@resvgplaceholder'

// @ts-ignore
renderAsync = Mod.renderAsync || Mod.render
// TODO: could we always use renderAsync?

export function init(mod: any) {
  renderAsync = mod.renderAsync || mod.render
}

export async function render(svg: string | Buffer,
  options?: import('@resvg/resvg-js').ResvgRenderOptions | null,
  signal?: AbortSignal | null,) {
  const result = await renderAsync(svg, options, signal)
  return result;
}