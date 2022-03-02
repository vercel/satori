import { renderAsync } from '@resvg/resvg-js'
import { renderToStaticMarkup } from 'react-dom/server'
import satori from 'satori'
import { promises as fs } from 'fs'
import { join } from 'path'

import rauchgCard from '../../cards/rauchg'
import textCard from '../../cards/text-align'
import githubCard from '../../cards/github'

const card = githubCard

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
      weight: 700,
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

  const { width = 800, height = 510, debug = false, type = 'png' } = req.query

  const t2 = Date.now()

  const svg = satori(card, {
    width,
    height,
    fonts,
    debug: !!debug,
  })

  const t3 = Date.now()

  if (type === 'svg') {
    res.setHeader('Content-Type', 'image/svg+xml')
    res.end(svg)
    return;
  } else if (type === 'html') {
    res.setHeader('Content-Type', 'text/html')
    res.end(renderToStaticMarkup(card))
    return;
  }

  const data = await renderAsync(svg, {
    fitTo: {
      mode: 'width',
      value: width,
    },
    font: {
      loadSystemFonts: false,
    },
  })

  const t4 = Date.now()

  res.setHeader('content-type', 'image/png')

  await new Promise(resolve => {
    res.end(data, resolve)
  })

  const t5 = Date.now()

  console.table({
    loadFonts: t2 - t1,
    Satori: t3 - t2,
    png: t4 - t3,
    response: t5 - t4,
    '-------': '--',
    TOTAL: t5 - t1,
  })
}
