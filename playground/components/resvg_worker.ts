import * as resvg from '@resvg/resvg-wasm'

fetch('/resvg.wasm').then((res) => resvg.initWasm(res))

self.onmessage = (e) => {
  const { svg, width, _id } = e.data

  const renderer = new resvg.Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  })
  const pngData = renderer.render()
  const url = URL.createObjectURL(new Blob([pngData], { type: 'image/png' }))
  self.postMessage({ _id, url })
}
