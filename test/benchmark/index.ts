import { run, bench, summary } from 'mitata'
import { join } from 'path'
import { readFileSync } from 'fs'

import { Resvg } from '@resvg/resvg-js'
import Sharp from 'sharp'
import satori from '../../dist/index.js'

const fonts = [
  {
    name: 'Geist',
    data: readFileSync(
      join(process.cwd(), 'test', 'benchmark', 'Geist-Regular.otf')
    ),
    weight: 400 as const,
    style: 'normal' as const,
  },
  {
    name: 'Geist',
    data: readFileSync(
      join(process.cwd(), 'test', 'benchmark', 'Geist-Medium.otf')
    ),
    weight: 500 as const,
    style: 'normal' as const,
  },
  {
    name: 'Geist',
    data: readFileSync(
      join(process.cwd(), 'test', 'benchmark', 'Geist-SemiBold.otf')
    ),
    weight: 600 as const,
    style: 'normal' as const,
  },
  {
    name: 'Geist',
    data: readFileSync(
      join(process.cwd(), 'test', 'benchmark', 'Geist-Bold.otf')
    ),
    weight: 700 as const,
    style: 'normal' as const,
  },
  {
    name: 'Geist',
    data: readFileSync(
      join(process.cwd(), 'test', 'benchmark', 'Geist-Black.otf')
    ),
    weight: 800 as const,
    style: 'normal' as const,
  },
]

// Simulated from a real world example:
// https://gist.github.com/BurnedChris/616a72a6b41927b699de3564d4c51a12

async function generateSVG() {
  return await satori(
    {
      type: 'div',
      props: {
        style: {
          fontFamily: 'Geist',
          width: '1200px',
          height: '630px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '100px',
          backgroundColor: '#fff',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                flex: '1',
                gap: 20,
                padding: 20,
              },
              children: [
                {
                  type: 'span',
                  props: {
                    style: {
                      color: '#000',
                      fontSize: '40px',
                      fontWeight: 'bold',
                    },
                    children: 'Next.js Quickstart',
                  },
                },
                {
                  type: 'span',
                  props: {
                    style: {
                      color: '#000',
                      fontSize: '26px',
                      lineHeight: '1.4',
                    },
                    children:
                      'Learn how to integrate LIB_NAME into your Next.js application with this step-by-step guide. Well cover installation, configuration, and basic usage.',
                  },
                },
                {
                  type: 'span',
                  props: {
                    style: {
                      color: '#444',
                      fontSize: '20px',
                      padding: '20px',
                      marginTop: '20px',
                      border: '2px solid #888',
                      borderRadius: '10px',
                    },
                    children: 'npx LIB_NAME',
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flex: '1',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundImage:
                  'linear-gradient(to bottom, lightgray 1px, transparent 0), linear-gradient(to right, lightgray 1px, transparent 0)',
                backgroundSize: '100px 100px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      flex: '1',
                      border: '2px solid #ccc',
                      borderRadius: '10px',
                      padding: '20px',
                      backgroundColor: '#fff',
                      transform: 'translateX(50px)',
                    },
                    children: [
                      {
                        type: 'span',
                        props: {
                          style: {
                            color: '#333',
                            fontSize: '24px',
                            fontWeight: '600',
                            marginBottom: '10px',
                          },
                          children: 'We value your privacy',
                        },
                      },
                      {
                        type: 'span',
                        props: {
                          style: {
                            color: '#333',
                            fontSize: '16px',
                          },
                          children:
                            'This site uses cookies to improve your browsing experience, analyze site traffic, and show personalized content.',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            justifyContent: 'flex-start',
                            gap: '10px',
                            marginTop: '20px',
                            paddingTop: '20px',
                            borderTop: '1px solid #ccc',
                            width: '100%',
                          },
                          children: [
                            {
                              type: 'button',
                              props: {
                                style: {
                                  padding: '10px 20px',
                                  fontSize: '16px',
                                  color: '#777',
                                  border: '1px solid #aaa',
                                  borderRadius: '5px',
                                },
                                children: 'Reject All',
                              },
                            },
                            {
                              type: 'button',
                              props: {
                                style: {
                                  padding: '10px 20px',
                                  fontSize: '16px',
                                  color: '#777',
                                  border: '1px solid #aaa',
                                  borderRadius: '5px',
                                },
                                children: 'Accept All',
                              },
                            },
                            {
                              type: 'div',
                              props: {
                                style: {
                                  flex: '1',
                                },
                              },
                            },
                            {
                              type: 'button',
                              props: {
                                style: {
                                  padding: '10px 20px',
                                  fontSize: '16px',
                                  color: '#66d1bd',
                                  border: '1px solid #66d1bd',
                                  borderRadius: '5px',
                                },
                                children: 'Customize',
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts,
    }
  )
}

function generatePNGWithResvg(svg: string) {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1200,
    },
  })
  const pngData = resvg.render()
  return pngData.asPng()
}

async function generatePNGWithSharp(svg: string) {
  await Sharp(Buffer.from(svg)).png().toBuffer()
}

summary(() => {
  bench('satori', () => generateSVG())
  bench('satori + resvg', async () => {
    const svg = await generateSVG()
    return generatePNGWithResvg(svg)
  })
  bench('satori + sharp', async () => {
    const svg = await generateSVG()
    return generatePNGWithSharp(svg)
  })
})

await run()
