import React from 'react'
import satori from 'satori'

async function init() {
  if (typeof window === 'undefined') return []

  const [font] =
    window.__resource ||
    (window.__resource = await Promise.all([
      fetch('/inter-latin-ext-400-normal.woff').then((res) =>
        res.arrayBuffer()
      ),
    ]))

  return [
    {
      name: 'Inter',
      data: font,
      weight: 400,
      style: 'normal',
    },
  ]
}

const loadFonts = init()

function lerp(current, target, R) {
  for (const key of ['top', 'left', 'width', 'height']) {
    current[key] =
      ~~(((current[key] + target[key] * (R - 1)) / R) * 1000) / 1000
  }
  for (const key in target.props.style) {
    if (typeof current.props.style[key] === 'number') {
      current.props.style[key] =
        ~~(
          ((current.props.style[key] + target.props.style[key] * (R - 1)) / R) *
          1000
        ) / 1000
    } else {
      current.props.style[key] = target.props.style[key]
    }
  }
  current.textContent = target.textContent
  // current.props = {
  //   ...target.props,
  //   style: current.props.style,
  // }
}

function Satori({ children }) {
  const reRender = React.useState({})[1]

  const currentNodeState = React.useRef([])
  const targetNodeState = React.useRef([])

  React.useEffect(() => {
    ;(async () => {
      const nodes = []

      await satori(children, {
        width: 100,
        height: 100,
        fonts: await loadFonts,
        onNodeAdded: (n) => {
          nodes.push(n)
        },
      })

      targetNodeState.current = nodes
      if (currentNodeState.current.length !== nodes.length) {
        currentNodeState.current = nodes
      }
    })()
  }, [children])

  React.useEffect(() => {
    let lastTime = 0
    function update() {
      lastTime = requestAnimationFrame(update)

      const current = currentNodeState.current
      const target = targetNodeState.current

      const targetByKey = {}
      for (let i = 0; i < target.length; i++) {
        if (target[i].key) targetByKey[target[i].key] = target[i]
      }
      for (let i = 0; i < current.length; i++) {
        const movedTarget = current[i].key && targetByKey[current[i].key]
        lerp(current[i], movedTarget || target[i], 1.1)
      }
      reRender({})
    }
    lastTime = requestAnimationFrame(update)
    return () => {
      cancelAnimationFrame(lastTime)
    }
  }, [])

  return currentNodeState.current.map((node, i) => {
    if (node.type === 'img') {
      return (
        <img
          key={i}
          src={node.props.src}
          style={{
            position: 'absolute',
            top: node.top,
            left: node.left,
            width: node.width,
            height: node.height,
            ...node.props.style,
          }}
        />
      )
    }
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          top: node.top,
          left: node.left,
          width: node.width,
          height: node.height,
          ...node.props.style,
        }}
      >
        {node.textContent}
      </div>
    )
  })
}

const images = [
  'https://picsum.photos/200/300',
  'https://picsum.photos/300/100',
  'https://picsum.photos/200/250',
  'https://picsum.photos/250/300',
  'https://picsum.photos/200/200',
]

export default function Test() {
  const [offset, setOffset] = React.useState(0)

  return (
    <div>
      <button onClick={() => setOffset((offset + 4) % 5)}>{'<'}</button>
      <button onClick={() => setOffset((offset + 1) % 5)}>{'>'}</button>
      <div
        style={{
          position: 'relative',
        }}
      >
        <Satori>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {Array(5)
              .fill(0)
              .map((_, i) => {
                const index = (i + offset) % 5

                // Hide the left and right images
                if (i === 0 || i === 4) {
                  return <div key={images[index]} src={images[index]} />
                }
                return <img key={images[index]} src={images[index]} />
              })}
          </div>
        </Satori>
      </div>
    </div>
  )
}
