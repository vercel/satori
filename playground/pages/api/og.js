import { renderAsync } from '@resvg/resvg-js'
import satori from 'satori'
import { promises as fs } from 'fs'
import { join } from 'path'

import rauchgCard from '../../cards/rauchg'

let customFontsLoaded = false
let fonts = []
const loadingCustomFonts = (async () => {
  const [FONT_ROBOTO, FONT_ROBOTO_BOLD] = await Promise.all([
    fs.readFile(join(process.cwd(), 'assets', 'Roboto-Regular.ttf')),
    fs.readFile(join(process.cwd(), 'assets', 'Roboto-Bold.ttf')),
  ])
  fonts = [
    {
      name: 'Inter',
      data: FONT_ROBOTO,
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Inter',
      data: FONT_ROBOTO_BOLD,
      weight: 400,
      style: 'normal',
    },
  ]
  customFontsLoaded = true
})()

export default async (req, res) => {
  const t1 = performance.now()

  if (!customFontsLoaded) {
    await loadingCustomFonts
  }

  const { width = 800, height = 510, debug } = req.query

  const t2 = performance.now()

  let svg

  svg = satori(rauchgCard, {
    width,
    height,
    fonts,
    debug: !!debug,
  })

  const t3 = performance.now()

  const data = await renderAsync(svg, {
    fitTo: {
      mode: 'width',
      value: width,
    },
    font: {
      loadSystemFonts: false,
    },
  })

  res.setHeader('content-type', 'image/png')
  res.send(data)

  const t4 = performance.now()

  console.table({
    loadFonts: t2 - t1,
    Satori: t3 - t2,
    png: t4 - t3,
  })
}
