import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Flexbox Advanced', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('flex-grow', () => {
    it('should render elements with flex-grow', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div
            style={{
              flexGrow: 1,
              background: 'red',
              height: 50,
            }}
          />
          <div
            style={{
              flexGrow: 2,
              background: 'blue',
              height: 50,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render with different flex-grow ratios', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div
            style={{
              flexGrow: 1,
              background: 'red',
              height: 50,
            }}
          />
          <div
            style={{
              flexGrow: 3,
              background: 'blue',
              height: 50,
            }}
          />
          <div
            style={{
              flexGrow: 1,
              background: 'green',
              height: 50,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('flex-shrink', () => {
    it('should render elements with flex-shrink', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div
            style={{
              width: 80,
              flexShrink: 1,
              background: 'red',
              height: 50,
            }}
          />
          <div
            style={{
              width: 80,
              flexShrink: 0,
              background: 'blue',
              height: 50,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render with different flex-shrink values', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div
            style={{
              width: 60,
              flexShrink: 2,
              background: 'red',
              height: 50,
            }}
          />
          <div
            style={{
              width: 60,
              flexShrink: 1,
              background: 'blue',
              height: 50,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('flex-basis', () => {
    it('should render elements with flex-basis', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div
            style={{
              flexBasis: '40px',
              background: 'red',
              height: 50,
            }}
          />
          <div
            style={{
              flexBasis: '60px',
              background: 'blue',
              height: 50,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render flex-basis with flex-grow', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div
            style={{
              flexBasis: '20px',
              flexGrow: 1,
              background: 'red',
              height: 50,
            }}
          />
          <div
            style={{
              flexBasis: '30px',
              flexGrow: 2,
              background: 'blue',
              height: 50,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('flex shorthand', () => {
    it('should render with flex: 1', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div
            style={{
              flex: 1,
              background: 'red',
              height: 50,
            }}
          />
          <div
            style={{
              flex: 1,
              background: 'blue',
              height: 50,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render with different flex values', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div
            style={{
              flex: 2,
              background: 'red',
              height: 50,
            }}
          />
          <div
            style={{
              flex: 1,
              background: 'blue',
              height: 50,
            }}
          />
          <div
            style={{
              flex: 1,
              background: 'green',
              height: 50,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('align-self', () => {
    it('should render alignSelf flex-start', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              background: 'red',
            }}
          />
          <div
            style={{
              width: 30,
              height: 30,
              background: 'blue',
              alignSelf: 'flex-start',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render alignSelf flex-end', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              background: 'red',
            }}
          />
          <div
            style={{
              width: 30,
              height: 30,
              background: 'blue',
              alignSelf: 'flex-end',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render alignSelf center', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              background: 'red',
            }}
          />
          <div
            style={{
              width: 30,
              height: 30,
              background: 'blue',
              alignSelf: 'center',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render alignSelf stretch', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              background: 'red',
            }}
          />
          <div
            style={{
              width: 30,
              background: 'blue',
              alignSelf: 'stretch',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('align-content', () => {
    it('should render alignContent flex-start', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignContent: 'flex-start',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div style={{ width: 60, height: 30, background: 'red' }} />
          <div style={{ width: 60, height: 30, background: 'blue' }} />
          <div style={{ width: 60, height: 30, background: 'green' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render alignContent center', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignContent: 'center',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div style={{ width: 60, height: 20, background: 'red' }} />
          <div style={{ width: 60, height: 20, background: 'blue' }} />
          <div style={{ width: 60, height: 20, background: 'green' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render alignContent space-between', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignContent: 'space-between',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div style={{ width: 60, height: 20, background: 'red' }} />
          <div style={{ width: 60, height: 20, background: 'blue' }} />
          <div style={{ width: 60, height: 20, background: 'green' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('complex layouts', () => {
    it('should render nested flex containers', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flex: 1,
              background: 'lightblue',
            }}
          >
            <div style={{ flex: 1, background: 'red' }} />
            <div style={{ flex: 2, background: 'blue' }} />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flex: 1,
              background: 'lightgreen',
            }}
          >
            <div style={{ flex: 2, background: 'green' }} />
            <div style={{ flex: 1, background: 'yellow' }} />
          </div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render flex with gap and wrapping', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div style={{ width: 35, height: 35, background: 'red' }} />
          <div style={{ width: 35, height: 35, background: 'blue' }} />
          <div style={{ width: 35, height: 35, background: 'green' }} />
          <div style={{ width: 35, height: 35, background: 'yellow' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should combine flex-grow and flex-shrink', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div
            style={{
              width: 60,
              flexGrow: 1,
              flexShrink: 2,
              background: 'red',
              height: 50,
            }}
          />
          <div
            style={{
              width: 60,
              flexGrow: 2,
              flexShrink: 1,
              background: 'blue',
              height: 50,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render complex flex layout with multiple properties', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 100,
            height: 100,
            background: 'lightgray',
            padding: 10,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              background: 'red',
              flexShrink: 0,
            }}
          />
          <div
            style={{
              flexGrow: 1,
              height: 40,
              background: 'blue',
              margin: '0 5px',
            }}
          />
          <div
            style={{
              width: 20,
              height: 60,
              background: 'green',
              flexShrink: 0,
              alignSelf: 'flex-end',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render gap with percentage values', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '5%',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div style={{ width: 20, height: 20, background: 'red' }} />
          <div style={{ width: 20, height: 20, background: 'blue' }} />
          <div style={{ width: 20, height: 20, background: 'green' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render row-gap with percentage values', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            rowGap: '10%',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div style={{ width: 60, height: 20, background: 'red' }} />
          <div style={{ width: 60, height: 20, background: 'blue' }} />
          <div style={{ width: 60, height: 20, background: 'green' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render column-gap with percentage values', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            columnGap: '10%',
            width: 100,
            height: 100,
            background: 'lightgray',
          }}
        >
          <div style={{ width: 20, height: 40, background: 'red' }} />
          <div style={{ width: 20, height: 40, background: 'blue' }} />
          <div style={{ width: 20, height: 40, background: 'green' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
