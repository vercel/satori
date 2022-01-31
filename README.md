<h1 align="center">
  🄪 Satori
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
  }
)
```

Which yields:

```js
'<svg ...><text x="0" y="16" width="45" height="16" fill="black">hello, world</text></svg>'
```

## Playground

(TBD)

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
| `box-shadow` | All supported except spread-radius |
| `border-radius` | Supported |
| `overflow` | `visible`, `hidden` |
| `color` | Supported |
| `background-color` | Supported |
| `background-image` | TBD |
| `opacity` | TBD |
| `text-decoration` | TBD |
| `text-shadow` | TBD |
| `text-transform` | TBD |
| `word-break` | TBD |
| `transform` | TBD |

## Contribute

This project uses [pnpm](https://pnpm.io). To install dependencies, run:

```bash
pnpm install
```

To start the preview mode, run:

```bash
pnpm dev:preview
```

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
