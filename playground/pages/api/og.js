import { renderAsync } from '@resvg/resvg-js'
import satori from 'satori'
import { promises as fs } from 'fs'
import { join } from 'path'

import rauchgCard from '../../cards/rauchg'

let customFontsLoaded = false
let fonts = []
const loadingCustomFonts = (async () => {
  const [FONT_ROBOTO, FONT_ROBOTO_BOLD] = await Promise.all([
    fs.readFile(
      join(process.cwd(), 'assets', 'inter-latin-ext-400-normal.woff')
    ),
    fs.readFile(
      join(process.cwd(), 'assets', 'inter-latin-ext-700-normal.woff')
    ),
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
  const t1 = Date.now()

  if (!customFontsLoaded) {
    await loadingCustomFonts
  }

  const { width = 800, height = 510, debug } = req.query

  const t2 = Date.now()

  let svg

  svg = satori(rauchgCard, {
    width,
    height,
    fonts,
    debug: !!debug,
  })

  const t3 = Date.now()

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

  const t4 = Date.now()

  console.table({
    loadFonts: t2 - t1,
    Satori: t3 - t2,
    png: t4 - t3,
  })
}
