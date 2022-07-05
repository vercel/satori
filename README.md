<h1 align="center">
  Satori
</h1>

## API

Satori converts HTML and CSS into SVG.

```jsx
import satori from 'satori'

const svg = await satori(
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
    embedFont: true,     // Embed the font in SVG as path data. Optional, default: true.
    debug: false,        // Show the bounding box for debugging. Optional, default: false.
    graphemeImages: {},  // Custom grapheme images, see "Emojis". Optional, default: empty.
    loadAdditionalAsset, // See "Dynamically Load Emojis and Fonts" below. Optional.
  },
)
```

Which yields:

```js
'<svg ...><path d="..." fill="black"></path></svg>'
```

Text (with font data) will be embedded in the SVG as paths.

## Playground

https://satori-playground.vercel.app

## Documentation

### JSX

Satori only accepts JSX elements that are pure and stateless. You can use a subset of HTML
elements (see section below), or custom React components, but React APIs such as `useState` and
`useEffect` are not supported.

#### Use without JSX

If you don't have JSX transpiler enabled, you can simply pass [React-elements-like objects](https://reactjs.org/docs/introducing-jsx.html) that have `type`, `props.children` and `props.style` (and other properties too) directly:

```js
await satori(
  {
    type: 'div',
    props: {
      children: 'hello, world',
      style: { color: 'black' },
    },
  },
  options
)
```

### HTML Elements

Satori supports a limited subset of HTML and CSS features, due to its special use cases. In general, only these static and visible elements and properties that are implemented. 

For example, the `<input>` HTML element, the `cursor` CSS property are not in consideration. And you can't use `<style>` tags or external resources via `<link>` or `<script>`.

Also, Satori does not guarantee that the SVG will 100% match the browser-rendered HTML output since Satori implements its own layout engine based on the [SVG 1.1 spec](https://www.w3.org/TR/SVG11).

You can find the list of supported HTML elements and their preset styles [here](https://github.com/vercel/satori/blob/main/src/handler/presets.ts).

#### Images

You can use `<img>` to embed images but `src`, `width`, and `height` attributes are all required.

```jsx
await satori(
  <img src="https://picsum.photos/200/300" width={200} height={300} />,
  options
)
```

When using `background-image`, the image will be stretched to fit the element by default if you don't specify the size.

If you want to render the generated SVG to another image format such as PNG, it would be better to use base64 encoded image data directly as `props.src` so no extra I/O is needed.

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
| `flex-basis` | Supported except for `auto` |
| `align-items` | Supported |
| `align-content` | Supported |
| `align-self` | Supported |
| `justify-content` | Supported |
| `font-family` | Supported |
| `font-size` | Supported |
| `font-weight` | Supported |
| `font-style` | Supported |
| `text-align` | Supported |
| `letter-spacing` | Supported |
| `box-shadow` | All supported except `spread-radius` and `inset` (works like `drop-shadow`) |
| `border-radius` | Supported |
| `overflow` | `visible`, `hidden` |
| `color` | Supported |
| `transform` | Support absolute values |
| `transform-origin` | Support one-value and two-value syntax (both relative and absolute values) |
| `object-fit` | `contain`, `cover`, `none` |
| `opacity` | Supported |
| `background-color` | Supported |
| `background-image` | Support `linear-gradient`, `radial-gradient`, `url` |
| `word-break` | Supported |
| `text-shadow` | Supported |
| `text-transform` | Support `lowercase`, `uppercase`, `capitalize` |
| `background-position` | Supported |
| `background-size` | Support two-value size string such as `10px 20%` |
| `white-space` | Support `normal`, `pre`, `pre-wrap` and `nowrap` |
| `text-overflow` | Support `clip` and `ellipsis` |
| `text-decoration` | Support line types `underline` and `line-through`, and styles `dotted`, `dashed`, `solid` |
| `line-height` | Supported |
| `background-clip` | Support `border-box` and `text` |
| `background-repeat` | Supported |
| `filter` | Supported |

Note:

1. Three-dimensional transforms are not supported.
2. There is no `z-index` support in SVG. Elements that come later in the document will be painted on top.
3. `box-sizing` is set to `border-box` for all elements.
4. `calc` isn't supported.
5. `overflow: hidden` and `transform` can't be used together.

### Typography

Advanced typography features such as kerning, ligatures and other OpenType features are not currently supported. 

RTL languages are not supported either.

#### Emojis

To render custom images for specific graphemes, you can use `graphemeImages` option to map the grapheme to an image source:

```jsx
await satori(
  <div>Next.js is 🤯!</div>,
  {
    ...,
    graphemeImages: {
      '🤯': 'https://twemoji.maxcdn.com/v/13.1.0/svg/1f92f.svg',
    },
  }
)
```

The image will be resized to the current font-size (both width and height), so it must be a square.

#### Dynamically Load Emojis and Fonts

Satori supports an option to dynamically load emoji images (grapheme pictures) and fonts when they're used but missing:

```jsx
await satori(
  <div>👋 你好</div>,
  {
    // `code` will be the detected language code, `emoji` if it's an Emoji, or `unknwon` if not able to tell.
    // `segment` will be the content to render.
    loadAdditionalAsset: async (code: string, segment: string) => {
      // if segment is an emoji
      return `data:image/svg+xml;base64,...`

      // if segment is normal text
      return loadFontFromSystem(code)
    }
  }
)
```

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
