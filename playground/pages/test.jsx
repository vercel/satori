import { useState } from 'react'
import { useEffect } from 'react'
import satori from 'satori'

const example_rauchg = (
  <div
    style={{
      display: 'flex',
      height: '100%',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'Inter',
      backgroundImage: 'linear-gradient(to bottom, white, #ddd)',
    }}
  >
    <div
      style={{
        left: 42,
        top: 42,
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          background: 'black',
        }}
      />
      <span
        style={{
          marginLeft: 8,
          letterSpacing: -0.2,
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        rauchg.com
      </span>
    </div>
    <div
      style={{
        padding: '20px 40px',
        letterSpacing: -2,
        fontSize: 40,
        fontWeight: 700,
        width: 'auto',
        maxWidth: 550,
        textAlign: 'center',
        backgroundColor: 'blue',
        backgroundImage: `linear-gradient(to bottom, red, rgba(255,0,0,0))`,
        color: 'white',
        borderTopLeftRadius: 100,
        borderTopRightRadius: 20,
        borderBottomRightRadius: 100,
        borderBottomLeftRadius: 20,
        border: '8px solid gold',
        transform:
          'rotate(-10deg) translate(0, -10px) skewX(-10deg) scale(1.2, 1.2)',
      }}
    >
      7 Principles of{' '}
      <span
        style={{
          color: 'gold',
          display: 'inline-block',
          transform: 'rotate(10deg) scale(1, 2)',
        }}
      >
        Rich
      </span>{' '}
      Web Applications
    </div>
  </div>
)

// https://opengraph.githubassets.com/f460d576b0a8eb3c0f96ab489be83adfbc198d418a5a38f168e5fc65008f7a4b/vercel/next.js
function Item({ title, subtitle, icon }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        color: '#333',
      }}
    >
      <span
        style={{
          fontFamily: 'Material Icons',
          fontSize: 20,
          marginRight: 5,
          marginTop: 2,
        }}
      >
        {icon}
      </span>
      <div>
        <div style={{ color: '#000', fontSize: 20 }}>{title}</div>
        <div>{subtitle}</div>
      </div>
    </div>
  )
}
const example_github = (
  <div
    style={{
      fontFamily: 'Inter',
      padding: 80,
      display: 'flex',
      flexDirection: 'row',
    }}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        height: '85%',
      }}
    >
      <div
        style={{
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: '75%',
        }}
      >
        <h1 style={{ fontSize: 56, fontWeight: 300, margin: 0 }}>
          vercel/<span style={{ fontWeight: 700 }}>next.js</span>
        </h1>
        <p style={{ fontSize: 24, color: '#666' }}>The React Framework</p>
      </div>
      <div style={{ flexBasis: '25%' }}>
        <img
          width={148}
          height={148}
          src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAAHv0lEQVR4nOzdzUtUfxvH8V/3MdJjAyWczAEZwXAkMAhCF9qmlbiuTZsJ2w25aVXQJpCEQEjXRWtnXdCqhZsycCE4MRVoixppMSOoMYjJ3Nz3QPVrxpM6Z851Zj7v1z/gNYfv23m45uE//wDCCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSCADSHOsBpMXjcdd1v3//bj0IYCGTySwsLFhPAVgYGxsr/9/o6Kj1LEC4HMdZWlqqBLC8vHzixAnriYAQpVKp8m9u3bplPREQFtd1v3379nsA+Xy+o6PDei4gFI8ePSpXuX37tvVcQOPF4/GdnZ3qAFZWVqxHAxpvbm6u+vRX3Llzx3o6oJH6+/tLpdJBAZRKpUQiYT0j0DCZTOag01/BXgwt6+fmyx97MbSg3zdf/tiLoQX9sfnyx14MLaV68+Uvn8+fPn3aemogIDU3X/6mp6etpwaCMDIy4vPS50F2d3eHh4etZwfq4zhOLpc76umvyGazjsMnltDMpqamjnf6K6ampqxvAXBcnucd6blvtUKhEIvFrG8HcCw+b/s5PN4ghKbU29u7t7dXfwAfPnxgL4bmMzMzU//pr2Avhibjuu7m5mZQAbAXQ5N5+vRpUKe/4tmzZ9a3CTiciYmJYE9/xfj4uPUtA/6mns2XP/ZiaAJ1br78sRdDpNW/+fJXKBTOnj1rfSuBAwSy+fL35MkT61sJ1JJMJgPZfPnb29sbHBy0vq1AlRcvXjT69Fe8fPnS+rYC/zY5ORnO6a9gN4wI8Tyv5pe9Nc7W1lZXV5f17W4F/ERSAB4/ftzZ2RnmX4zFYnyXKCIhnOe+1T5//sxerH7cA9QrnU63tbWF/3cTiUQ6nQ7/7wK/eJ4X4Ls+j4q9GIyFsPnyx14MZqwe/f+OvRhstLe3v3nzxvb0V7x9+/bkyZPW1wNi7t27Z33yf7l//7719YCS8Ddf/ra2ts6fP299VSDj+fPn1mf+T3xmEiG5cuWK+XPfavv7+5cvX7a+NhCwuLhofdprW1xctL42aHU3btywPud+rl+/bn2F0Lpc1/306ZP1IfeztrbGS6JolPn5eesT/nd8cB4NMTQ0ZH22DyWfz586dcr6ajUN3g16WM3yLc09PT137961ngKtxfO8Y/zMkRX2YghYBDdf/tiLITDR3Hz5Yy+GwER28+WPvRgCEPHNlz/2YqhLPB7/8uWL9TE+vnw+393dbX0V0bQymYz1Ga7XwsKC9VVEcxobG7M+vcEYHR21vpZoNo7jLC0tWR/dYCwvL/M7kziaVCplfW6DxHeJHoR/DDW4rru+vn7u3DnrQQKzsbHR399fKpWsB4kc3gtUw4MHD1rp9FfeIHTz5k3rKdAM4vF4pD7wHpSVlRXrSxtFfLvqn6anp69evWo9RfC6u7sLhcK7d++sB0GEVR4oW/+zbpRSqZRIJKyvMSKsBTZf/tiL4UAts/nyx14MNbTS5ssfezHU0GKbL3/sxX7iP8E/Lbn58rexsTEwMLCzs2M9iD1eBv2fhw8fjo+PW08RnlgsVi6XX79+bT0IImBkZKSFX/o8yO7u7vDwsPW1hzXHcXK5nPVptJHNZvmdSfX3AqXT6WQyaT2FjYsXL/I7k9JPgj3PW11d1XnuW61YLPb19W1vb1sPYkb6HqD13vV5VF1dXalUynoKS7r3AL29vWtraya/cR0pHz9+HBwcLJfL1oPY0L0HsPqF96gZGBhQvhMQvQdwXffr169nzpyxHiQSlPdiovcA8/PznP6fenp65ubmrKdAWCYmJqxfgo8iqV34T3IPgRzHyWazsq/9+3j//v2lS5f29/etBwmV3EMg5c2XP829mNY9AJsvf8Vi8cKFC5ubm9aDhEfrrSAzMzPXrl2zniK6Ojo62tvbX716ZT1IeITuAZLJ5OrqKq/9+/vx48fQ0FAul7MeJCRCzwFmZ2c5/X/V1tY2OztrPQWCNjk5af0yYzPR+cykxEMgz/PW19c7OzutB2ka29vbfX19xWLRehAAjST0HACoRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQRgCQ9t8AAAD//6oW3AkoFImNAAAAAElFTkSuQmCC'
          style={{
            borderRadius: 20,
          }}
        ></img>
      </div>
    </div>
    <div style={{ display: 'flex', flexBasis: '100%' }}>
      <Item title='2k' subtitle='Contributors' icon='&#xE7FB;' />
      <Item title='18k' subtitle='Used by' icon='&#xe0df;' />
      <Item title='9k' subtitle='Discussions' icon='&#xe0bf;' />
      <Item title='81k' subtitle='Stars' icon='&#xf06f;' />
      <Item title='17k' subtitle='Forks' icon='&#xebac;' />
    </div>
  </div>
)

const element = example_rauchg

async function init() {
  if (typeof window === 'undefined') return []
  if (window.__initialized) return window.__initialized

  const [font, fontBold, fontIcon] = await Promise.all(
    (
      await Promise.all([
        fetch(
          'https://unpkg.com/@fontsource/inter@4.5.2/files/inter-latin-ext-400-normal.woff'
        ),
        fetch(
          'https://unpkg.com/@fontsource/inter@4.5.2/files/inter-latin-ext-700-normal.woff'
        ),
        fetch(
          'https://unpkg.com/@fontsource/material-icons@4.5.2/files/material-icons-base-400-normal.woff'
        ),
      ])
    ).map((res) => res.arrayBuffer())
  )

  return (window.__initialized = [
    {
      name: 'Inter',
      data: font,
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Inter',
      data: fontBold,
      weight: 700,
      style: 'normal',
    },
    {
      name: 'Material Icons',
      data: fontIcon,
      weight: 400,
      style: 'normal',
    },
  ])
}

const waitForResource = init()

const width = 400 * 2
const height = 255 * 2

export default function Playground() {
  const [svg, setSvg] = useState('')

  useEffect(() => {
    ;(async () => {
      const fonts = await waitForResource
      const result = satori(element, {
        width,
        height,
        fonts,
      })

      setSvg(result)
    })()
  }, [])

  return (
    <div id='container'>
      <div id='svg' dangerouslySetInnerHTML={{ __html: svg }}></div>
      <div style={{ position: 'relative', width, height }}>{element}</div>
    </div>
  )
}
