import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'
import satoriExperimental from '../src/experimental/index.js'

// Each scene was compared with Chrome. Comments describe what both draw.

const Card = ({
  color,
  label = '',
  size = 80,
  style = {},
}: {
  color: string
  label?: string
  size?: number
  style?: Record<string, unknown>
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: 8,
      backgroundColor: color,
      color: 'white',
      fontSize: size * 0.4,
      ...style,
    }}
  >
    {label}
  </div>
)

const Row = ({ children, style = {} }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      ...style,
    }}
  >
    {children}
  </div>
)

const faces = [
  ['#e11d48', 'F', 'translateZ(40px)'],
  ['#2563eb', 'B', 'rotateY(180deg) translateZ(40px)'],
  ['#16a34a', 'R', 'rotateY(90deg) translateZ(40px)'],
  ['#ca8a04', 'L', 'rotateY(-90deg) translateZ(40px)'],
  ['#9333ea', 'T', 'rotateX(90deg) translateZ(40px)'],
  ['#0891b2', 'D', 'rotateX(-90deg) translateZ(40px)'],
]

const Cube = () => (
  <div
    style={{
      display: 'flex',
      position: 'relative',
      width: 80,
      height: 80,
      transformStyle: 'preserve-3d',
      transform: 'rotateX(-30deg) rotateY(-40deg)',
    }}
  >
    {faces.map(([color, label, transform]) => (
      <Card
        key={label}
        color={color}
        label={label}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          borderRadius: 0,
          backfaceVisibility: 'hidden',
          transform,
        }}
      />
    ))}
  </div>
)

const PerspectiveCard = ({
  transform,
  width = 200,
  height = 120,
  text = 'Hello, 3D',
}: {
  transform: string
  width?: number
  height?: number
  text?: string
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width,
      height,
      borderRadius: 16,
      backgroundImage: 'linear-gradient(135deg, #7c3aed, #f97316)',
      color: 'white',
      fontSize: 28,
      transform,
    }}
  >
    {text}
  </div>
)

describe('3D transforms', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should rotate around the X and Y axes', async () => {
    // Half as wide, half as tall, and mirrored.
    const svg = await satori(
      <Row>
        <Card
          color='#e11d48'
          label='Y'
          style={{ transform: 'rotateY(60deg)' }}
        />
        <Card
          color='#2563eb'
          label='X'
          style={{ transform: 'rotateX(60deg)' }}
        />
        <Card
          color='#16a34a'
          label='F'
          style={{ transform: 'rotateY(180deg)' }}
        />
      </Row>,
      { width: 360, height: 120, fonts }
    )
    expect(toImage(svg, 360)).toMatchImageSnapshot()
  })

  it('should support matrix(), matrix3d() and 3D transform functions', async () => {
    // Translations and scales along z have no effect without perspective. The
    // matrix3d() is rotateY(60deg).
    const svg = await satori(
      <Row>
        <Card
          size={60}
          color='#e11d48'
          style={{ transform: 'matrix(1, 0.3, -0.3, 1, 0, 0)' }}
        />
        <Card
          size={60}
          color='#2563eb'
          style={{
            transform:
              'matrix3d(0.5, 0, -0.866025, 0, 0, 1, 0, 0, 0.866025, 0, 0.5, 0, 0, 0, 0, 1)',
          }}
        />
        <Card
          size={60}
          color='#16a34a'
          style={{ transform: 'rotate3d(1, 1, 0, 60deg)' }}
        />
        <Card
          size={60}
          color='#ca8a04'
          style={{ transform: 'translate3d(10px, -10px, 50px)' }}
        />
        <Card
          size={60}
          color='#9333ea'
          style={{ transform: 'scale3d(0.5, 1.2, 3)' }}
        />
        <Card
          size={60}
          color='#0891b2'
          style={{ transform: 'skew(10deg, 5deg) translateZ(30px)' }}
        />
      </Row>,
      { width: 420, height: 120, fonts }
    )
    expect(toImage(svg, 420)).toMatchImageSnapshot()
  })

  it('should support all angle units', async () => {
    // All rotated by 45deg.
    const svg = await satori(
      <Row>
        <Card
          size={50}
          color='#e11d48'
          style={{ transform: 'rotate(45deg)' }}
        />
        <Card
          size={50}
          color='#2563eb'
          style={{ transform: 'rotate(0.125turn)' }}
        />
        <Card
          size={50}
          color='#16a34a'
          style={{ transform: 'rotate(50grad)' }}
        />
        <Card
          size={50}
          color='#ca8a04'
          style={{ transform: 'rotate(0.7853982rad)' }}
        />
        <Card
          size={50}
          color='#9333ea'
          style={{ transform: 'rotateZ(45deg)' }}
        />
      </Row>,
      { width: 420, height: 100, fonts }
    )
    expect(toImage(svg, 420)).toMatchImageSnapshot()
  })

  it('should support relative lengths and percentages', async () => {
    // Percentages are relative to the element's size, em to its font size.
    // `perspective(none)` has no effect.
    const svg = await satori(
      <Row style={{ fontSize: 20 }}>
        <Card
          size={50}
          color='#e11d48'
          style={{ transform: 'translateX(50%)' }}
        />
        <Card
          size={50}
          color='#2563eb'
          style={{ transform: 'translateY(-0.5em)' }}
        />
        <Card
          size={50}
          color='#16a34a'
          style={{ transform: 'translate3d(-10%, 1rem, 2em) rotateY(45deg)' }}
        />
        <Card
          size={50}
          color='#ca8a04'
          style={{ transform: 'perspective(none) rotateY(60deg)' }}
        />
        <Card
          size={50}
          color='#9333ea'
          style={{ transform: 'scale(50%, 120%)' }}
        />
      </Row>,
      { width: 420, height: 120, fonts }
    )
    expect(toImage(svg, 420)).toMatchImageSnapshot()
  })

  it('should support a depth in transform-origin', async () => {
    // The same rotation around different origins. The green card covers part
    // of the blue one.
    const svg = await satori(
      <Row>
        <Card color='#e11d48' style={{ transform: 'rotateY(60deg)' }} />
        <Card
          color='#2563eb'
          style={{
            transform: 'rotateY(60deg)',
            transformOrigin: '50% 50% -60px',
          }}
        />
        <Card
          color='#16a34a'
          style={{
            transform: 'rotateY(60deg)',
            transformOrigin: 'left top 30px',
          }}
        />
      </Row>,
      { width: 360, height: 120, fonts }
    )
    expect(toImage(svg, 360)).toMatchImageSnapshot()
  })

  it('should hide back faces with backface-visibility: hidden', async () => {
    // A is mirrored, B and C face away and are hidden, D faces the viewer.
    const svg = await satori(
      <Row>
        <Card
          color='#e11d48'
          label='A'
          style={{ transform: 'rotateY(180deg)' }}
        />
        <Card
          color='#2563eb'
          label='B'
          style={{
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
          }}
        />
        <Card
          color='#16a34a'
          label='C'
          style={{
            transform: 'rotateX(150deg)',
            backfaceVisibility: 'hidden',
          }}
        />
        <Card
          color='#ca8a04'
          label='D'
          style={{ transform: 'rotateY(60deg)', backfaceVisibility: 'hidden' }}
        />
      </Row>,
      { width: 440, height: 120, fonts }
    )
    expect(toImage(svg, 440)).toMatchImageSnapshot()
  })

  it('should flatten children unless transform-style is preserve-3d', async () => {
    // Both cards are rotated by 30deg inside a parent rotated by 30deg. The
    // flat one is drawn on its parent's plane, 75% wide (cos²30°). The other
    // one stays in 3D and is rotated by 60deg in total, 50% wide. Browsers
    // also cut it where it intersects its parent, which Satori doesn't.
    const Nested = ({ preserve }: { preserve: boolean }) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 120,
          height: 80,
          backgroundColor: '#e5e7eb',
          transform: 'rotateY(30deg)',
          transformStyle: preserve ? 'preserve-3d' : 'flat',
        }}
      >
        <Card
          color='#2563eb'
          size={60}
          style={{ transform: 'rotateY(30deg)' }}
        />
      </div>
    )
    const svg = await satori(
      <Row>
        <Nested preserve={false} />
        <Nested preserve />
      </Row>,
      { width: 360, height: 120, fonts }
    )
    expect(toImage(svg, 360)).toMatchImageSnapshot()
  })

  it('should draw preserve-3d children sorted by depth', async () => {
    // The red card is closer to the viewer, but comes first in the document.
    // It's drawn below the blue one when flat, and above it with preserve-3d.
    const Overlap = ({ preserve }: { preserve: boolean }) => (
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: 100,
          height: 100,
          transform: 'rotateX(20deg)',
          transformStyle: preserve ? 'preserve-3d' : 'flat',
        }}
      >
        <Card
          color='#e11d48'
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: 'translateZ(20px)',
          }}
        />
        <Card
          color='#2563eb'
          style={{
            position: 'absolute',
            left: 20,
            top: 20,
            transform: 'translateZ(-20px)',
          }}
        />
      </div>
    )
    const svg = await satori(
      <Row>
        <Overlap preserve={false} />
        <Overlap preserve />
      </Row>,
      { width: 360, height: 160, fonts }
    )
    expect(toImage(svg, 360)).toMatchImageSnapshot()
  })

  it('should draw a cube with preserve-3d', async () => {
    // Only the front (F), right (R) and top (T) faces are visible.
    const svg = await satori(
      <Row>
        <Cube />
      </Row>,
      { width: 200, height: 200, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should approximate perspective', async () => {
    // `translateZ(100px)` with `perspective: 400px` scales the card by 4/3,
    // like browsers. Tilted planes are drawn with the closest affine
    // transform, so the blue card isn't a trapezoid as in browsers.
    const svg = await satori(
      <Row style={{ perspective: 400 }}>
        <Card
          color='#e11d48'
          label='Z'
          style={{ transform: 'translateZ(100px)' }}
        />
        <Card
          color='#2563eb'
          label='Y'
          style={{ transform: 'rotateY(50deg)' }}
        />
      </Row>,
      { width: 360, height: 160, fonts }
    )
    expect(toImage(svg, 360)).toMatchImageSnapshot()
  })
})

describe('3D transforms with perspective in satori/experimental', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should draw perspective from the perspective property', async () => {
    // The right side is farther away and smaller.
    const svg = await satoriExperimental(
      <Row style={{ perspective: 600 }}>
        <PerspectiveCard transform='rotateY(35deg)' />
      </Row>,
      { width: 320, height: 200, fonts }
    )
    expect(toImage(svg, 320)).toMatchImageSnapshot()
  })

  it('should support perspective() and perspective-origin', async () => {
    // The left card tilts back around its center, the right one is seen from
    // its parent's top left corner.
    const svg = await satoriExperimental(
      <Row>
        <PerspectiveCard
          width={160}
          transform='perspective(300px) rotateX(40deg)'
          text='Top'
        />
        <div
          style={{
            display: 'flex',
            perspective: 300,
            perspectiveOrigin: 'left top',
          }}
        >
          <PerspectiveCard
            width={160}
            transform='rotateX(40deg)'
            text='Origin'
          />
        </div>
      </Row>,
      { width: 480, height: 200, fonts }
    )
    expect(toImage(svg, 480)).toMatchImageSnapshot()
  })

  it('should draw each face of a preserve-3d cube with perspective', async () => {
    const svg = await satoriExperimental(
      <Row style={{ perspective: 250 }}>
        <Cube />
      </Row>,
      { width: 200, height: 200, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should keep ancestor clipping around elements with perspective', async () => {
    // The card is cut by its parent's rounded corners.
    const svg = await satoriExperimental(
      <Row>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 220,
            height: 140,
            borderRadius: 40,
            overflow: 'hidden',
            backgroundColor: '#e5e7eb',
            perspective: 300,
          }}
        >
          <PerspectiveCard
            width={260}
            height={100}
            transform='rotateY(45deg)'
          />
        </div>
      </Row>,
      { width: 320, height: 200, fonts }
    )
    expect(toImage(svg, 320)).toMatchImageSnapshot()
  })
})
