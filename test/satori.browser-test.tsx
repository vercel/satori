import { it, expect } from 'vitest'
import { page } from 'vitest/browser'
import satori from '../src/index.js'

it('should render a div to SVG in the browser', async () => {
  const fontData = await fetch('/test/assets/Roboto-Regular.ttf').then((r) =>
    r.arrayBuffer()
  )
  const svg = await satori(<div style={{ color: 'red' }}>Hello</div>, {
    width: 100,
    height: 100,
    fonts: [{ name: 'Roboto', data: fontData, weight: 400, style: 'normal' }],
  })
  expect(svg).toContain('<svg')

  const container = document.createElement('div')
  container.innerHTML = svg
  document.body.appendChild(container)

  const svgLocator = page.elementLocator(container.querySelector('svg')!)
  await expect.element(svgLocator).toBeInTheDocument()
})
