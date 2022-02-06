<h1 align="center">
  Satori
</h1>

## Quick Start

`satori` is a function that takes a JSX element and returns a SVG string:

```jsx
satori(
  <div style={{ color: 'black' }}>hello, world</div>,
  {
    width: 600,
    height: 400,
    fonts: [
      {
        name: 'Roboto',
        data: robotoArrayBuffer,
        weight: 400,
        style: 'normal',
      },
      ...
    ],
    embedFont: true, // Embed the font in SVG as path data
    debug: false,    // Show/hide the bounding box
  }
)
```

Which yields:

```js
'<svg ...><path d="..." fill="black"></path></svg>'
```

Text will be embedded in the SVG as path.

## Playground

https://satori-playground.vercel.app

## Documentation

### JSX

(TBD: Only pure and stateless function components, only inlined styles.)

### HTML Elements

Satori supports a limited subset of HTML and CSS features, due to its special use cases. In general, only these static and visible elements and properties that are implemented. 

For example, the `<input>` HTML element, the `cursor` CSS property are not in consideration.

(TBD)

### CSS Properties

| Property | Supported Values |
| --- | --- |
| `display` | `none`, `flex` |
| `position` | `relative`, `absolute` |
| `margin`, `padding` | Supported |
| `top`, `right`, `bottom`, `left` | Supported |
| `width`, `height` | Supported |
| `max-width`, `max-height` | Supported |
| `min-width`, `min-height` | Supported |
| `border` | Supported |
| `flex-direction` | Supported |
| `flex-wrap` | Supported |
| `flex-grow` | Supported |
| `flex-shrink` | Supported |
| `flex-basis` | Supported |
| `align-items` | Supported |
| `align-content` | Supported |
| `align-self` | Supported |
| `justify-content` | Supported |
| `font-family` | Support single value |
| `font-size` | Supported |
| `font-weight` | Supported |
| `font-style` | Supported |
| `text-align` | Supported |
| `letter-spacing` | Supported |
| `box-shadow` | All supported except spread-radius (works like `drop-shadow`) |
| `border-radius` | Supported |
| `overflow` | `visible`, `hidden` |
| `color` | Supported |
| `transform` | Support absolute values |
| `object-fit` | `contain`, `cover`, `none` |
| `opacity` | Supported |
| `background-color` | Supported |
| `background-image` | Support `linear-gradient`, `url` |
| `word-break` | Supported |
| `background-clip` | TBD |
| `background-size` | TBD |
| `background-position` | TBD |
| `background-repeat` | TBD |
| `background-origin` | TBD |
| `text-decoration` | TBD |
| `text-shadow` | TBD |
| `text-transform` | TBD |
| `transform-origin` | TBD |

Note:

1. Three-dimensional transforms are not supported.
2. There is no `z-index` support in SVG. Elements that come later in the document will be painted on top.
3. `box-sizing` is set to `border-box` for all elements.

## Contribute

This project uses [pnpm](https://pnpm.io). To install dependencies, run:

```bash
pnpm install
```

To start the playground locally, run:

```bash
cd playground
pnpm dev
```

And visit localhost:3000/test.

To start the development mode, run `pnpm dev` in the root directory (can be used together with the playground to view it in live).

To start and live-watch the tests, run:

```bash
pnpm dev:test
```

## Author

- Shu Ding ([@shuding_](https://twitter.com/shuding_))

---

<a aria-label="Vercel logo" href="https://vercel.com">
  <img src="https://badgen.net/badge/icon/Made%20by%20Vercel?icon=zeit&label&color=black&labelColor=black">
</a>
