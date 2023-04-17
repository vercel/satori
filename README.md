![Satori](.github/card.png)

**Satori**: Enlightened library to convert HTML and CSS to SVG.

> **Note**
>
> To use Satori in your project to generate PNG images like Open Graph images and social cards, check out our [announcement](https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images) and [Vercel’s Open Graph Image Generation →](https://vercel.com/docs/concepts/functions/edge-functions/og-image-generation)
>
> To use it in Next.js, take a look at the [Next.js Open Graph Image Generation template →](https://vercel.com/templates/next.js/og-image-generation)

## Overview

Satori supports the JSX syntax, which makes it very straightforward to use. Here’s an overview of the basic usage:

```jsx
// api.jsx
import satori from 'satori'

const svg = await satori(
  <div style={{ color: 'black' }}>hello, world</div>,
  {
    width: 600,
    height: 400,
    fonts: [
      {
        name: 'Roboto',
        // Use `fs` (Node.js only) or `fetch` to read the font as Buffer/ArrayBuffer and provide `data` here.
        data: robotoArrayBuffer,
        weight: 400,
        style: 'normal',
      },
    ],
  },
)
```

Satori will render the element into a 600×400 SVG, and return the SVG string:

```js
'<svg ...><path d="..." fill="black"></path></svg>'
```

Under the hood, it handles layout calculation, font, typography and more, to generate a SVG that matches the exact same HTML and CSS in a browser.

<br/>

## Documentation

### JSX

Satori only accepts JSX elements that are pure and stateless. You can use a subset of HTML
elements (see section below), or custom React components, but React APIs such as `useState`, `useEffect`, `dangerouslySetInnerHTML` are not supported.

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

You can use `<img>` to embed images. However, `width`, and `height` attributes are recommended to set:

```jsx
await satori(
  <img src="https://picsum.photos/200/300" width={200} height={300} />,
  options
)
```

When using `background-image`, the image will be stretched to fit the element by default if you don't specify the size.

If you want to render the generated SVG to another image format such as PNG, it would be better to use base64 encoded image data directly as `props.src` so no extra I/O is needed.

### CSS

Satori uses the same Flexbox [layout engine](https://yogalayout.com) as React Native, and it’s **not** a complete CSS implementation. However, it supports a subset of the spec that covers most common CSS features:

<table>
<thead>
<tr>
  <th>Property</th>
  <th>Property Expanded</th>
  <th>Supported Values</th>
</tr>
</thead>
<tbody>

<tr>
<td colspan="2"><code>display</code></td>
<td><code>none</code> and <code>flex</code>, default to <code>flex</code></td>
</tr>

<tr>
<td colspan="2"><code>position</code></td>
<td><code>relative</code> and <code>absolute</code>, default to <code>relative</code></td>
</tr>

<tr>
<td colspan="2"><code>color</code></td>
<td>Supported</td>
</tr>

<tr><td rowspan="5"><code>margin</code></td></tr>
<tr><td><code>marginTop</code></td><td>Supported</td></tr>
<tr><td><code>marginRight</code></td><td>Supported</td></tr>
<tr><td><code>marginBottom</code></td><td>Supported</td></tr>
<tr><td><code>marginLeft</code></td><td>Supported</td></tr>

<tr><td rowspan="5">Position</td></tr>
<tr><td><code>top</code></td><td>Supported</td></tr>
<tr><td><code>right</code></td><td>Supported</td></tr>
<tr><td><code>bottom</code></td><td>Supported</td></tr>
<tr><td><code>left</code></td><td>Supported</td></tr>

<tr><td rowspan="3">Size</td></tr>
<tr><td><code>width</code></td><td>Supported</td></tr>
<tr><td><code>height</code></td><td>Supported</td></tr>

<tr><td rowspan="5">Min & max size</td></tr>
<tr><td><code>min-width</code></td><td>Supported</td></tr>
<tr><td><code>min-height</code></td><td>Supported</td></tr>
<tr><td><code>max-width</code></td><td>Supported</td></tr>
<tr><td><code>max-height</code></td><td>Supported</td></tr>

<tr><td rowspan="5"><code>border</code></td></tr>
<tr><td>Width (<code>borderWidth</code>, <code>borderTopWidth</code>, ...)</td><td>Supported</td></tr>
<tr><td>Style (<code>borderStyle</code>, <code>borderTopStyle</code>, ...)</td><td><code>solid</code> and <code>dashed</code>, default to <code>solid</code></td></tr>
<tr><td>Color (<code>borderColor</code>, <code>borderTopColor</code>, ...)</td><td>Supported</td></tr>
<tr><td>
  Shorthand (<code>border</code>, <code>borderTop</code>, ...)</td><td>Supported, i.e. <code>1px solid gray</code><br/>
</td></tr>

<tr><td rowspan="6"><code>borderRadius</code></td></tr>
<tr><td><code>borderTopLeftRadius</code></td><td>Supported</td></tr>
<tr><td><code>borderTopRightRadius</code></td><td>Supported</td></tr>
<tr><td><code>borderBottomLeftRadius</code></td><td>Supported</td></tr>
<tr><td><code>borderBottomRightRadius</code></td><td>Supported</td></tr>
<tr><td>Shorthand</td><td>Supported, i.e. <code>5px</code>, <code>50% / 5px</code></td></tr>

<tr><td rowspan="11">Flex</td></tr>
<tr><td><code>flexDirection</code></td><td><code>column</code>, <code>row</code>, <code>row-reverse</code>, <code>column-reverse</code>, default to <code>row</code></td></tr>
<tr><td><code>flexWrap</code></td><td><code>wrap</code>, <code>nowrap</code>, <code>wrap-reverse</code>, default to <code>wrap</code></td></tr>
<tr><td><code>flexGrow</code></td><td>Supported</td></tr>
<tr><td><code>flexShrink</code></td><td>Supported</td></tr>
<tr><td><code>flexBasis</code></td><td>Supported except for <code>auto</code></td></tr>
<tr><td><code>alignItems</code></td><td>Supported</td></tr>
<tr><td><code>alignContent</code></td><td>Supported</td></tr>
<tr><td><code>alignSelf</code></td><td>Supported</td></tr>
<tr><td><code>justifyContent</code></td><td>Supported</td></tr>
<tr><td><code>gap</code></td><td>Supported</td></tr>

<tr><td rowspan="5">Font</td></tr>
<tr><td><code>fontFamily</code></td><td>Supported</td></tr>
<tr><td><code>fontSize</code></td><td>Supported</td></tr>
<tr><td><code>fontWeight</code></td><td>Supported</td></tr>
<tr><td><code>fontStyle</code></td><td>Supported</td></tr>

<tr><td rowspan="11">Text</td></tr>
<tr><td><code>textAlign</code></td><td><code>start</code>, <code>end</code>, <code>left</code>, <code>right</code>, <code>center</code>, <code>justify</code>, default to <code>start</code></td></tr>
<tr><td><code>textTransform</code></td><td><code>none</code>, <code>lowercase</code>, <code>uppercase</code>, <code>capitalize</code>, defaults to <code>none</code></td></tr>
<tr><td><code>textOverflow</code></td><td><code>clip</code>, <code>ellipsis</code>, defaults to <code>clip</code></td></tr>
<tr><td><code>textDecoration</code></td><td>Support line types <code>underline</code> and <code>line-through</code>, and styles <code>dotted</code>, <code>dashed</code>, <code>solid</code></td></tr>
<tr><td><code>textShadow</code></td><td>Supported</td></tr>
<tr><td><code>lineHeight</code></td><td>Supported</td></tr>
<tr><td><code>letterSpacing</code></td><td>Supported</td></tr>
<tr><td><code>whiteSpace</code></td><td><code>normal</code>, <code>pre</code>, <code>pre-wrap</code>, <code>pre-line</code>, <code>nowrap</code>, defaults to <code>normal</code></td></tr>
<tr><td><code>wordBreak</code></td><td><code>normal</code>, <code>break-all</code>, <code>break-word</code>, <code>keep-all</code>, defaults to <code>normal</code></td></tr>
<tr><td><code>textWrap</code></td><td><code>wrap</code>, <code>balance</code>, defaults to <code>wrap</code></td></tr>

<tr><td rowspan="7">Background</td></tr>
<tr><td><code>backgroundColor</code></td><td>Supported, single value</td></tr>
<tr><td><code>backgroundImage</code></td><td><code>linear-gradient</code>, <code>radial-gradient</code>, <code>url</code>, single value</td></tr>
<tr><td><code>backgroundPosition</code></td><td>Support single value</td></tr>
<tr><td><code>backgroundSize</code></td><td>Support two-value size i.e. `10px 20%`</td></tr>
<tr><td><code>backgroundClip</code></td><td><code>border-box</code>, <code>text</code></td></tr>
<tr><td><code>backgroundRepeat</code></td><td><code>repeat</code>, <code>repeat-x</code>, <code>repeat-y</code>, <code>no-repeat</code>, defaults to <code>repeat</code></td></tr>

<tr><td rowspan="5"><code>transform</code></td></tr>
<tr><td>Translate (<code>translate</code>, <code>translateX</code>, <code>translateY</code>)</td><td>Supported</td></tr>
<tr><td>Rotate</td><td>Supported</td></tr>
<tr><td>Scale (<code>scale</code>, <code>scaleX</code>, <code>scaleY</code>)</td><td>Supported</td></tr>
<tr><td>Skew (<code>skew</code>, <code>skewX</code>, <code>skewY</code>)</td><td>Supported</td></tr>

<tr>
<td colspan="2"><code>transformOrigin</code></td>
<td>Support one-value and two-value syntax (both relative and absolute values)</td>
</tr>

<tr>
<td colspan="2"><code>objectFit</code></td>
<td><code>contain</code>, <code>cover</code>, <code>none</code>, default to <code>none</code></td>
</tr>

<tr>
<td colspan="2"><code>opacity</code></td>
<td>Supported</td>
</tr>

<tr>
<td colspan="2"><code>boxShadow</code></td>
<td>Supported</td>
</tr>

<tr>
<td colspan="2"><code>overflow</code></td>
<td><code>visible</code> and <code>hidden</code>, default to <code>visible</code></td>
</tr>

<tr>
<td colspan="2"><code>filter</code></td>
<td>Supported</td>
</tr>

</tbody>
</table>

Note:

1. Three-dimensional transforms are not supported.
2. There is no `z-index` support in SVG. Elements that come later in the document will be painted on top.
3. `box-sizing` is set to `border-box` for all elements.
4. `calc` isn't supported.
5. `overflow: hidden` and `transform` can't be used together.
6. `currentcolor` support is only available for the `color` property.

### Language and Typography

Advanced typography features such as kerning, ligatures and other OpenType features are not currently supported.

RTL languages are not supported either.

#### Fonts

Satori currently supports three font formats: TTF, OTF and WOFF. Note that WOFF2 is not supported at the moment. You must specify the font if any text is rendered with Satori, and pass the font data as ArrayBuffer (web) or Buffer (Node.js):

```js
await satori(
  <div style={{ fontFamily: 'Inter' }}>Hello</div>,
  {
    width: 600,
    height: 400,
    fonts: [
      {
        name: 'Inter',
        data: inter,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: interBold,
        weight: 700,
        style: 'normal',
      },
    ],
  }
)
```

Multiple fonts can be passed to Satori and used in `fontFamily`.

#### Emojis

To render custom images for specific graphemes, you can use `graphemeImages` option to map the grapheme to an image source:

```jsx
await satori(
  <div>Next.js is 🤯!</div>,
  {
    ...,
    graphemeImages: {
      '🤯': 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f92f.svg',
    },
  }
)
```

The image will be resized to the current font-size (both width and height) as a square.

#### Locales

Satori supports rendering text in different locales. You can specify the supported locales via the `lang` attribute:

```jsx
await satori(
  <div lang="ja-JP">骨</div>
)
```

Same characters can be rendered differently in different locales, you can specify the locale when necessary to force it to render with a specific font and locale. Check out [this example](https://og-playground.vercel.app/?share=nVLdSsMwFH6VcEC86VgdXoyweTMVpyiCA296kzWnbWaalCZ160rfwAcRH8Bn0rcwWVdQEYTdnJzz_ZyEnNNArDkChQkXz5EixNha4rRpfE4IF6aQrKbkOJG4OQ461OfnosTYCq0cF2tZ5apnMxRpZh18EoZHPbgW3Ga_sIJxLlS6Q4sNGbnQU0yKVM0t5sa3R2Wx7KlVZaxI6pl2oPLX_KQTh1-yXEj_6LlnAhLBLXOJYJLMY61MBN_VD2KLlIzGe2jJ4qe01JXiMy116bqsM2Gxc7Stj2edcmIKpohkKp1GsGKD6_sI9hQhn2-vHy_ve-HQK_9ybbPB7O4Q1-LxENfVzX-uydDtgTshAF348RqgDeymB3QchgF04wV66guOyyoFmjBpMADM9Uos6sLvk13vKtfH__FFvkQO1JYVtu0X) to learn more. 

Supported locales are exported as the `Locale` enum type.

#### Dynamically Load Emojis and Fonts

Satori supports dynamically loading emoji images (grapheme pictures) and fonts. The `loadAdditionalAsset` function will be called when a text segment is rendered but missing the image or font:

```jsx
await satori(
  <div>👋 你好</div>,
  {
    // `code` will be the detected language code, `emoji` if it's an Emoji, or `unknown` if not able to tell.
    // `segment` will be the content to render.
    loadAdditionalAsset: async (code: string, segment: string) => {
      if (code === 'emoji') {
        // if segment is an emoji
        return `data:image/svg+xml;base64,...`
      }

      // if segment is normal text
      return loadFontFromSystem(code)
    }
  }
)
```

### Runtime and WASM

Satori can be used in browser, Node.js (>= 16), and Web Workers.

By default, Satori depends on asm.js for the browser runtime, and native module in Node.js. However, you can optionally load WASM instead by importing `satori/wasm` and provide the initialized WASM module instance of Yoga to Satori:

```js
import satori, { init } from 'satori/wasm'
import initYoga from 'yoga-wasm-web'

const yoga = initYoga(await fetch('/yoga.wasm').then(res => res.arrayBuffer()))
init(yoga)

await satori(...)
```

When running in the browser or in the Node.js environment, WASM files need to be hosted and fetched before initializing. asm.js can be bundled together with the lib. In this case WASM should be faster.

When running on the Node.js server, native modules should be faster. However there are Node.js environments where native modules are not supported (e.g. StackBlitz's WebContainers), or other JS runtimes that support WASM (e.g. Vercel's Edge Runtime, Cloudflare Workers, or Deno).

Additionally, there are other difference between asm.js, native and WASM, such as security and compatibility.

Overall there are many trade-offs between each choice, and it's better to pick the one that works the best for your use case.

### Font Embedding

By default, Satori renders the text as `<path>` in SVG, instead of `<text>`. That means it embeds the font path data as inlined information, so succeeding processes (e.g. render the SVG on another platform) don’t need to deal with font files anymore.

You can turn off this behavior by setting `embedFonts` to `false`, and Satori will use `<text>` instead:

```jsx
const svg = await satori(
  <div style={{ color: 'black' }}>hello, world</div>,
  {
    ...,
    embedFont: false,
  },
)
```

### Debug

To draw the bounding box for debugging, you can pass `debug: true` as an option:

```jsx
const svg = await satori(
  <div style={{ color: 'black' }}>hello, world</div>,
  {
    ...,
    debug: true,
  },
)
```

<br/>

## Contribute

You can use the [Vercel OG Image Playground](https://og-playground.vercel.app/) to test and report bugs of Satori.  Please follow our [contribution guidelines](/CONTRIBUTING.md) before opening a Pull Request.

<br/>

## Author

- Shu Ding ([@shuding_](https://twitter.com/shuding_))

---

<a aria-label="Vercel logo" href="https://vercel.com">
  <img src="https://badgen.net/badge/icon/Made%20by%20Vercel?icon=zeit&label&color=black&labelColor=black">
</a>
