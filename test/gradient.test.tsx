import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Gradient', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('linear-gradient', () => {
    it('should support linear-gradient', async () => {
      const svg = await satori(
        <div
          style={{
            backgroundColor: 'white',
            backgroundImage: 'linear-gradient(to right, red, blue)',
            height: '100%',
            width: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support repeating linear-gradient', async () => {
      const svg = await satori(
        <div
          style={{
            backgroundColor: 'white',
            backgroundImage: 'linear-gradient(45deg, white, blue)',
            backgroundSize: '50px 50px',
            height: '100%',
            width: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support linear-gradient with transparency', async () => {
      const svg = await satori(
        <div
          style={{
            backgroundColor: 'green',
            backgroundImage: 'linear-gradient(45deg, rgba(255, 0, 0, 0), blue)',
            height: '100%',
            width: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support linear-gradient with omitted orientation', async () => {
      const svg = await satori(
        <div
          style={{
            backgroundColor: 'green',
            backgroundImage: 'linear-gradient(red, blue)',
            height: '100%',
            width: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support using background instead of backgroundImage', async () => {
      const svg = await satori(
        <div
          style={{
            background: 'linear-gradient(to right, red, black)',
            height: '100%',
            width: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support multiple direction keywords', async () => {
      const svg = await satori(
        <div
          style={{
            background: 'linear-gradient(to right top, red, blue)',
            height: '100%',
            width: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support other degree unit', async () => {
      const svgs = await Promise.all(
        [
          'linear-gradient(0.5turn, red, blue)',
          `linear-gradient(${Math.PI}rad, red, blue)`,
          `linear-gradient(200grad, red, blue)`,
        ].map((background) =>
          satori(
            <div
              style={{
                background,
                height: '100%',
                width: '100%',
              }}
            ></div>,
            {
              width: 100,
              height: 100,
              fonts,
            }
          )
        )
      )

      for (const svg of svgs) {
        expect(toImage(svg, 100)).toMatchImageSnapshot()
      }
    })
  })

  describe('radial-gradient', () => {
    it('should support radial-gradient', async () => {
      const svg = await satori(
        <div
          style={{
            backgroundColor: 'white',
            backgroundImage: 'radial-gradient(circle at 25px 25px, blue, red)',
            backgroundSize: '100px 100px',
            height: '100%',
            width: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support radial-gradient with unspecified <ending-shape>', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgb(225, 168, 211)',
              height: '100%',
              width: '100%',
              backgroundImage:
                'radial-gradient(at 3% 42%, rgb(228, 105, 236) 0px, transparent 50%)',
            }}
          ></div>
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support default value', async () => {
      const svg = await satori(
        <div
          style={{
            backgroundColor: 'white',
            backgroundImage: 'radial-gradient(blue, red)',
            backgroundSize: '100px 100px',
            height: '100%',
            width: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support releative unit', async () => {
      const svgs = await Promise.all(
        [
          'radial-gradient(ellipse at 1em 25px,blue, red)',
          'radial-gradient(circle at 1rem 25px,blue, red)',
          'radial-gradient(circle at 2vw 25px,blue, red)',
          'radial-gradient(circle at 1vh 50%,blue, red)',
        ].map((backgroundImage) =>
          satori(
            <div
              style={{
                backgroundColor: 'white',
                backgroundImage,
                backgroundSize: '100px 100px',
                height: '100%',
                width: '100%',
              }}
            ></div>,
            {
              width: 100,
              height: 100,
              fonts,
            }
          )
        )
      )
      svgs.forEach((svg) => {
        expect(toImage(svg, 100)).toMatchImageSnapshot()
      })
    })

    it('should support rg-size with rg-extent-keyword', async () => {
      const svgs = await Promise.all(
        [
          'radial-gradient(closest-corner at 50% 50%, yellow, green)',
          'radial-gradient(farthest-side at left bottom, red, yellow 50px, green)',
          'radial-gradient(closest-side at 20px 30px, red, yellow, green)',
        ].map((backgroundImage) =>
          satori(
            <div
              style={{
                backgroundColor: 'white',
                backgroundImage,
                backgroundSize: '100px 100px',
                height: '100%',
                width: '100%',
              }}
            ></div>,
            {
              width: 100,
              height: 100,
              fonts,
            }
          )
        )
      )

      svgs.forEach((svg) => {
        expect(toImage(svg, 100)).toMatchImageSnapshot()
      })
    })

    it('should support explicitly setting rg-size', async () => {
      const svgs = await Promise.all(
        [
          'radial-gradient(20% 20% at top left, yellow, blue)',
          'radial-gradient(30px at top left, yellow, blue)',
        ].map((backgroundImage) =>
          satori(
            <div
              style={{
                backgroundColor: 'white',
                backgroundImage,
                backgroundSize: '100px 100px',
                height: '100%',
                width: '100%',
              }}
            ></div>,
            {
              width: 100,
              height: 100,
              fonts,
            }
          )
        )
      )

      svgs.forEach((svg) => {
        expect(toImage(svg, 100)).toMatchImageSnapshot()
      })
    })
  })

  it('should support advanced usage', async () => {
    const svg = await satori(
      <div
        style={{
          backgroundColor: 'yellow',
          backgroundImage:
            'radial-gradient(circle at 45px 45px, red, transparent 40%), radial-gradient(circle at 5px 5px, blue, transparent 40%)',
          backgroundSize: '50px 50px',
          backgroundRepeat: 'repeat-y',
          height: '100%',
          width: '100%',
        }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should resolve gradient layers in the correct order', async () => {
    const svg = await satori(
      <div
        style={{
          backgroundColor: 'yellow',
          backgroundImage:
            'radial-gradient(circle at 45px 45px, red, red 60%, transparent 60%), radial-gradient(circle at 5px 5px, blue, blue 60%, transparent 60%)',
          backgroundSize: '50px 50px',
          backgroundRepeat: 'repeat-y',
          height: '100%',
          width: '100%',
        }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render gradient patterns in the correct object space', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '50%',
            height: '50%',
            backgroundImage: 'linear-gradient(to bottom, red, blue)',
          }}
        ></div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should calculate the gradient angle and length correctly', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: 'blue',
          backgroundImage:
            'linear-gradient(-15deg, green 20px, transparent 10px), linear-gradient(to top, red 10px, transparent 10px), linear-gradient(to left, red 10px, transparent 10px), linear-gradient(470deg, orange 10px, transparent 10px), linear-gradient(-470deg, black 30px, transparent 10px)',
        }}
      ></div>,
      {
        width: 300,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should calculate the gradient angle and length correctly with offset', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: 'blue',
          backgroundImage:
            'linear-gradient(-15deg, green 20px, transparent 10px), linear-gradient(to top, red 10px, transparent 10px), linear-gradient(to left, red 10px, transparent 10px), linear-gradient(470deg, orange 10px, transparent 10px), linear-gradient(-470deg, black 30px, transparent 10px)',
          backgroundSize: '100px 50px',
          backgroundPosition: '25px 25px',
        }}
      ></div>,
      {
        width: 200,
        height: 300,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should be able to render grid backgrounds', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          backgroundColor: 'white',
          backgroundImage:
            'linear-gradient(#222222 1px , transparent 1px ),linear-gradient(to right, #222222 1px , transparent 1px )',
          backgroundSize: '100px 100px',
        }}
      ></div>,
      {
        width: 300,
        height: 300,
        fonts,
      }
    )
    expect(toImage(svg, 300)).toMatchImageSnapshot()
  })

  describe('repeating-linear-gradient', async () => {
    it('should support repeating-linear-gradient', async () => {
      const svgs = await Promise.all(
        [
          'repeating-linear-gradient(to right, red, blue 50%)',
          'repeating-linear-gradient(to right top, red, blue 30%)',
        ].map((backgroundImage) =>
          satori(
            <div
              style={{
                backgroundColor: 'white',
                backgroundImage,
                width: '100%',
                height: '100%',
              }}
            ></div>,
            {
              width: 100,
              height: 100,
              fonts,
            }
          )
        )
      )
      svgs.forEach((svg) => {
        expect(toImage(svg, 100)).toMatchImageSnapshot()
      })
    })

    it('should support degree', async () => {
      const svgs = await Promise.all(
        [
          'repeating-linear-gradient(30deg, red, blue 50%)',
          'repeating-linear-gradient(150deg, red, blue 30%)',
          'repeating-linear-gradient(-15deg, red, blue 30%)',
          'repeating-linear-gradient(210deg, red, blue 30%)',
        ].map((backgroundImage) =>
          satori(
            <div
              style={{
                backgroundColor: 'white',
                backgroundImage,
                width: '100%',
                height: '100%',
              }}
            ></div>,
            {
              width: 200,
              height: 100,
              fonts,
            }
          )
        )
      )

      svgs.forEach((svg) => {
        expect(toImage(svg, 100)).toMatchImageSnapshot()
      })
    })

    it('should support background-size and background-repeat', async () => {
      const svg = await satori(
        <div
          style={{
            backgroundColor: 'white',
            backgroundImage: 'repeating-linear-gradient(30deg, red, blue 30%)',
            backgroundSize: '50px 25px',
            height: '100%',
            width: '100%',
          }}
        ></div>,
        {
          width: 200,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support multiple repeating-linear-gradient', async () => {
      const svg = await satori(
        <div
          style={{
            backgroundColor: 'white',
            backgroundImage:
              'repeating-linear-gradient(rgba(77, 159, 12, .1), #4d9f0c 40px), repeating-linear-gradient(0.25turn, rgba(63, 135, 166, .3), #3f87a6 20px)',
            height: '100%',
            width: '100%',
          }}
        ></div>,
        {
          width: 200,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should compute correct cycle', async () => {
      const svgs = await Promise.all(
        [
          `repeating-linear-gradient(45deg, #606dbc, #606dbc 5px, #465298 5px, #465298 10px)`,
          `repeating-linear-gradient(45deg, #606dbc, #606dbc 5px, #465298 5px, #465298 10%)`,
        ].map((backgroundImage) =>
          satori(
            <div
              style={{
                backgroundColor: 'white',
                backgroundImage,
                width: '100px',
                height: '100px',
              }}
            ></div>,
            {
              width: 100,
              height: 100,
              fonts,
            }
          )
        )
      )
      svgs.forEach((svg) => {
        expect(toImage(svg, 100)).toMatchImageSnapshot()
      })
    })
  })
})
