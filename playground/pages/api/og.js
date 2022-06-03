import { renderToStaticMarkup } from 'react-dom/server'
import { toPng, toSvg, init } from '@vercel/satori-core'
import initYoga from 'yoga-wasm-web'
import * as resvg from '@resvg/resvg-wasm'
import { promises as fs } from 'fs'
import { join } from 'path'

import rauchgCard from '../../cards/rauchg'
import textCard from '../../cards/text-align'
import githubCard from '../../cards/github'
import overflowCard from '../../cards/overflow'
import vercelCard from '../../cards/vercel'

const card = vercelCard

const assets = Promise.all([
  fs.readFile(join(process.cwd(), 'assets', 'Roboto-Regular.ttf')),
  fs.readFile(join(process.cwd(), 'assets', 'Roboto-Bold.ttf')),
  fs.readFile(join(process.cwd(), 'public', 'yoga.wasm')).then(WebAssembly.compile).then(initYoga),
  fs.readFile(join(process.cwd(), 'public', 'resvg.wasm')).then(WebAssembly.compile).then(async obj => {
    await resvg.initWasm(obj)
    return resvg.Resvg
  }),
])

export default async (req, res) => {
  const t1 = Date.now()

  const [FONT_ROBOTO, FONT_ROBOTO_BOLD, Yoga, Resvg] = await assets
  init({Yoga, Resvg})

  const fonts = [
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

  const { width = 800, height = 510, debug = false, type = 'png' } = req.query


  const t2 = Date.now()

  if (type === 'html') {
    res.setHeader('Content-Type', 'text/html')
    res.end(renderToStaticMarkup(card))
    return
  }

  if (type === 'svg') {
    const svg = await toSvg(card, {
      width,
      height,
      fonts,
      debug: !!debug,
    })
    const t3 = Date.now()
    res.setHeader('Content-Type', 'image/svg+xml')
    res.end(svg)
    console.table({
      loadFonts: t2 - t1,
      svg: t3 - t2,
      '-------': '--',
      TOTAL: t3 - t1,
    })
    return
  }

  // assume type='png' below

  const data = await toPng(card, {
    width,
    height,
    fonts,
    debug: !!debug,
  })

  const t3 = Date.now()

  res.setHeader('content-type', 'image/png')

  await new Promise((resolve) => {
    res.end(data, resolve)
  })

  const t4 = Date.now()

  console.table({
    loadFonts: t2 - t1,
    png: t3 - t2,
    response: t4 - t3,
    '-------': '--',
    TOTAL: t4 - t1,
  })
}
