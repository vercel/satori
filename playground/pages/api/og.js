import { renderToStaticMarkup } from 'react-dom/server'
import { toSvg, toPng } from 'satori'
import { promises as fs } from 'fs'
import { join } from 'path'

import rauchgCard from '../../cards/rauchg'
import textCard from '../../cards/text-align'
import githubCard from '../../cards/github'
import overflowCard from '../../cards/overflow'
import vercelCard from '../../cards/vercel'

const card = vercelCard

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

  const render = type === 'png' ? toPng : toSvg

  const out = await render(card, {
    width,
    height,
    fonts,
    debug: !!debug,
  })

  const t3 = Date.now()

  if (type === 'svg') {
    res.setHeader('Content-Type', 'image/svg+xml')
    res.end(out)
    return
  } else if (type === 'html') {
    res.setHeader('Content-Type', 'text/html')
    res.end(renderToStaticMarkup(card))
    return
  } else if (type === 'png') {
    res.setHeader('Content-Type', 'image/png')
    res.end(out)
  } else {
    res.status(400).end(`Unknown type ${type}`)
  }

  const t5 = Date.now()

  console.table({
    loadFonts: t2 - t1,
    Satori: t3 - t2,
    response: t5 - t3,
    '-------': '--',
    TOTAL: t5 - t1,
  })
}
