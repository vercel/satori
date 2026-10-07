import { it, describe, expect } from 'vitest'
import type { ReactNode } from 'react'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Position', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('absolute', () => {
    it('should support absolute position', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 10,
              height: 10,
              background: 'black',
            }}
          ></div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    // https://www.yogalayout.dev/blog/announcing-yoga-3.0#better-support-for-absolute-positioning
    it('should have correct size calculation of absolutely positioned elements', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            padding: 10,
            background: 'red',
          }}
        >
          <div
            style={{
              position: 'absolute',
              height: '25%',
              width: '25%',
              background: 'black',
            }}
          ></div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('static', () => {
    it('should support static position', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
          }}
        >
          <div
            style={{
              position: 'static',
              left: 10,
              top: 10,
              bottom: 0,
              right: 0,
              width: 10,
              height: 10,
              background: 'black',
            }}
          ></div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('fixed', () => {
    // Render and return the layout of elements with a key.
    async function getLayout(
      element: ReactNode,
      options: { width: number; height?: number } = { width: 100, height: 100 }
    ) {
      const layout: Record<string, number[]> = {}
      await satori(element, {
        ...options,
        fonts,
        onNodeDetected: ({ key, left, top, width, height }) => {
          if (key) layout[key] = [left, top, width, height]
        },
      })
      return layout
    }

    it('should position and size relative to the viewport', async () => {
      const element = (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            padding: 10,
            background: 'red',
          }}
        >
          <div
            style={{
              display: 'flex',
              position: 'relative',
              left: 10,
              top: 10,
              width: 50,
              height: 50,
              background: 'blue',
            }}
          >
            <div
              key='fixed'
              style={{
                position: 'fixed',
                right: 5,
                bottom: 5,
                width: '20%',
                height: '10%',
                background: 'black',
              }}
            />
          </div>
        </div>
      )
      expect(await getLayout(element)).toEqual({ fixed: [75, 85, 20, 10] })

      const svg = await satori(element, { width: 100, height: 100, fonts })
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support fixed root and nested fixed elements', async () => {
      expect(
        await getLayout(
          <div
            key='root'
            style={{
              display: 'flex',
              position: 'fixed',
              top: 10,
              left: 20,
              width: 50,
              height: 50,
              padding: 5,
            }}
          >
            <div
              key='inner'
              style={{
                position: 'fixed',
                top: 1,
                left: 2,
                width: 3,
                height: 4,
              }}
            />
            <div key='flow' style={{ width: 3, height: 4 }} />
          </div>
        )
      ).toEqual({
        root: [20, 10, 50, 50],
        inner: [2, 1, 3, 4],
        flow: [25, 15, 3, 4],
      })
    })

    it('should keep the static position on axes without insets', async () => {
      expect(
        await getLayout(
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                width: 60,
                height: 60,
                padding: 10,
              }}
            >
              <div
                key='x'
                style={{
                  position: 'fixed',
                  bottom: 0,
                  width: '50%',
                  height: 10,
                  marginLeft: 4,
                }}
              />
              <div
                key='y'
                style={{
                  position: 'fixed',
                  right: 0,
                  width: 10,
                  height: 10,
                  marginTop: '10%',
                }}
              />
            </div>
          </div>
        )
      ).toEqual({
        // Centered in the parent's content box, including margins.
        x: [27, 90, 50, 10],
        // Percentage margins resolve against the viewport.
        y: [90, 40, 10, 10],
      })
    })

    it('should use the computed viewport height without a defined height', async () => {
      expect(
        await getLayout(
          <div style={{ display: 'flex', width: '100%', height: 80 }}>
            <div
              key='fixed'
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                width: 10,
                height: '50%',
              }}
            />
          </div>,
          { width: 100 }
        )
      ).toEqual({ fixed: [0, 40, 10, 40] })
    })

    it('should be contained by ancestors with transform, perspective or filters', async () => {
      for (const containerStyle of [
        { transform: 'translateX(10px)' },
        { perspective: 100 },
        { filter: 'blur(1px)' },
        { backdropFilter: 'blur(1px)' },
        { transformStyle: 'preserve-3d' as const },
      ]) {
        expect(
          await getLayout(
            <div
              style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                padding: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: 50,
                  height: 50,
                  ...containerStyle,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: 20,
                    height: 20,
                    marginLeft: 7,
                  }}
                >
                  <div
                    key='fixed'
                    style={{
                      position: 'fixed',
                      right: 0,
                      bottom: 0,
                      width: '10%',
                      height: '10%',
                    }}
                  />
                </div>
              </div>
            </div>
          )
        ).toEqual({ fixed: [65, 65, 5, 5] })
      }
    })

    it('should not be clipped by overflow of ancestors', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 50,
              height: 50,
              overflow: 'hidden',
              borderRadius: 10,
              background: 'blue',
            }}
          >
            <div
              style={{
                position: 'fixed',
                right: 10,
                bottom: 10,
                width: 50,
                height: 50,
                background: 'black',
              }}
            />
          </div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should be clipped by the clip-path of ancestors', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            clipPath: 'circle(40%)',
            background: 'red',
          }}
        >
          <div style={{ display: 'flex', width: 10, height: 10 }}>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'black',
              }}
            />
          </div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should not display inside elements with display: none', async () => {
      expect(
        await getLayout(
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
            }}
          >
            <div style={{ display: 'none' }}>
              <div
                key='fixed'
                style={{
                  position: 'fixed',
                  top: 10,
                  left: 10,
                  width: 10,
                  height: 10,
                  background: 'black',
                }}
              />
            </div>
          </div>
        )
      ).toEqual({ fixed: [0, 0, 0, 0] })
    })
  })

  describe('relative', () => {
    it('should support relative position', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
          }}
        >
          <div
            style={{
              position: 'relative',
              left: 10,
              top: 10,
              bottom: 0,
              right: 0,
              width: 10,
              height: 10,
              background: 'black',
            }}
          ></div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
