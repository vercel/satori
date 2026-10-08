![Satori](.github/card.png)

**Satori**: Enlightened library to convert HTML and CSS to SVG.

> **Note**
>
> To use Satori in your project to generate PNG images like Open Graph images and social cards, check out our [announcement](https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images) and [Vercel’s Open Graph Image Generation docs →](https://vercel.com/docs/og-image-generation)
>
> To use it in Next.js, take a look at the [Open Graph Image Generation examples →](https://vercel.com/docs/og-image-generation/examples)

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

To render it to a PNG, use [Sharp](https://sharp.pixelplumbing.com), which draws SVG with librsvg:

```js
import sharp from 'sharp'

const png = await sharp(Buffer.from(svg)).png().toBuffer()
```

Under the hood, it handles layout calculation, font, typography and more, to generate a SVG that matches the exact same HTML and CSS in a browser.

<br/>

## Documentation

### JSX

Satori only accepts JSX elements that are pure and stateless. You can use a subset of HTML
elements (see section below), or custom React components, but React APIs such as `useState`, `useEffect`, `dangerouslySetInnerHTML` are not supported.

#### Experimental: builtin JSX support

Satori has an experimental JSX runtime that you can use without having to install React. You can enable it on a per-file basis with [`@jsxImportSource` pragmas](https://www.typescriptlang.org/tsconfig/#jsxImportSource). In the future, it will autocomplete only the subset of HTML elements and CSS properties that Satori supports for better type-safety.

```tsx
/** @jsxRuntime automatic */
/** @jsxImportSource satori/jsx */

import satori from 'satori';
import { FC, JSXNode } from 'satori/jsx';

const MyComponent: FC<{ children: JSXNode }> = ({ children }) => (
  <div style={{ color: 'black' }}>{children}</div>
)

const svg = await satori(
  <MyComponent>hello, world</MyComponent>,
  options,
)
```

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

If you want to render the generated SVG to another image format such as PNG, it would be better to use base64 encoded image data (or buffer) directly as `props.src` so no extra I/O is needed in Satori:

```jsx
await satori(
  <img src="data:image/png;base64,..." width={200} height={300} />,
  // Or src={arrayBuffer}, src={buffer}
  options
)
```

#### Canvas (WebGL, experimental)

> **Note:** This is experimental and may change or be removed in any release. It's only available from `satori/experimental`, so it doesn't add to the size of the `satori` import.

With `satori/experimental`, you can draw the content of a `<canvas>` with WebGL2 via the `webgl` prop. Satori calls it with a WebGL2 context sized to the canvas, then embeds what you drew as an image:

```jsx
import satori from 'satori/experimental'

await satori(
  <canvas
    width={1200}
    height={630}
    style={{ width: '100%', height: '100%' }}
    webgl={(gl, { width, height }) => {
      gl.clearColor(0, 0.5, 1, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      // Compile shaders, draw, etc.
    }}
  />,
  options
)
```

Each canvas gets a new WebGL2 context, which is destroyed with everything drawn into it afterwards:

- In browsers and Web Workers, Satori uses `OffscreenCanvas`.
- In Node.js 20.16+, Satori loads the `gl` package from your project, which must be a WebGL2 build of [headless-gl](https://github.com/stackgl/headless-gl) such as an ANGLE + SwiftShader one (e.g. `github:encharm/headless-gl`). It runs shaders on the CPU. If you bundle your server code, keep `gl` external and include its files in the deployment.

To provide contexts yourself, e.g. to reuse them across renders, pass a `createWebGLContext(width, height)` option that returns a WebGL2 context. Satori doesn't destroy the contexts it returns.

- The `width` and `height` attributes set the drawing buffer size (300×150 by default), like in browsers. The canvas is displayed at its CSS size, keeping that aspect ratio unless both CSS dimensions are set.
- Before calling `webgl`, Satori binds the default framebuffer, sets the viewport to the whole drawing buffer, and clears it to transparent, like a new canvas. Afterwards, it reads the default framebuffer. The `webgl` callback can be async.
- The drawing buffer is treated as premultiplied alpha unless the context was created with `premultipliedAlpha: false`.
- Children of `<canvas>` are fallback content and are not rendered.
- The `satori` import ignores the `webgl` prop and draws `<canvas>` like any other element.

If you use React's JSX types, add the `webgl` prop to them:

```ts
import type { WebGLCanvasRenderer } from 'satori/experimental'

declare module 'react' {
  interface CanvasHTMLAttributes<T> {
    webgl?: WebGLCanvasRenderer
  }
}
```

### CSS

Satori uses [Taffy](https://github.com/DioxusLabs/taffy) to lay out Flexbox, Grid and block layouts, and its own inline layout for text and inline elements. It’s **not** a complete CSS implementation, but it supports most common CSS features. Properties marked “Supported” behave as in browsers; otherwise, the differences are listed:

<table>
<thead>
<tr>
  <th>Property</th>
  <th>Property Expanded</th>
  <th>Support</th>
  <th>Example</th>
</tr>
</thead>
<tbody>

<tr>
<td colspan="2"><b>CSS Variables</b></td>
<td>Supported</td>
<td><a href="https://og-playground.vercel.app/?share=rVLRTsIwFP2V5hIzTbY4wBjTIC9oos-a8MJLt95tha4lXQfOZf9uOxwRlTeeentO7zntuW0h1RyBwoyL3UoRUtlG4mPb-pqQIIpsgSVGqZbaBJQEnJlNImsMwsOJAkVeWEeM4_hqAPeC2-IXxkW1laxxaCbxY0B9_SQMplZo5TjnU5dqYJkUuXq1WFaeQmXRDNS6rqzImoV2oPL-p3TC0k1udK34wt_c8aMsy46urutNfCIl08kPaPn9lvs47tGuW6m5L3w4x2RIn4VT3DFzfZLPTeBa5i8opQ7JUhvJZ7eu8x-Jv7lqw1TuUr2E-lmJaBKSUTaNx_H4vNqwQgh668dSAW2hHynQBxcNHGYO9M5vOCZ1DjRjssIQsNRr8d5s_Zey-37ndHy4z2WCHKg1NXYhWJa4E4W333tz6L4A">Example</a></td>
</tr>

<tr>
<td colspan="2"><code>display</code></td>
<td>Supported, with these differences: <code>table</code>, <code>ruby</code> and their inner values, and two-value syntax like <code>inline flow-root</code>, aren't supported and throw. <code>-webkit-box</code> is laid out like <code>flex</code>, to support <code>WebkitLineClamp</code>. The top-level element is laid out as a block, like the root element of a page. Form controls like <code>button</code> are inline instead of <code>inline-block</code>, and have no default styles.</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>position</code></td>
<td>Positioned inline elements (with <code>display: inline</code>) aren't the containing block of their absolutely positioned descendants, the nearest positioned block is. Sticky inline elements aren't moved.</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>float</code>, <code>clear</code></td>
<td>A float in the middle of a paragraph is placed at the start of the paragraph, instead of on the line it's in. Each line is shortened by the floats beside its top, so a line that is taller than its text can overlap a float that starts lower. <code>lineClamp</code>, <code>textOverflow: ellipsis</code> and <code>textWrap</code> don't apply to text after a float.</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>zIndex</code></td>
<td>Supported</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>visibility</code></td>
<td>Supported</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>color</code></td>
<td>Colors that SVG renderers may not support are converted to <code>rgb()</code> and <code>rgba()</code>, see <a href="#colors">Colors</a>. Colors outside the sRGB gamut, like <code>color(display-p3 1 0 0)</code>, are clipped to it. <code>light-dark()</code> always uses the light color, since <code>color-scheme</code> isn't supported. System colors like <code>Canvas</code> aren't supported.</td>
<td></td>
</tr>

<tr><td rowspan="5"><code>margin</code></td></tr>
<tr><td><code>marginTop</code></td><td>Supported</td><td></td></tr>
<tr><td><code>marginRight</code></td><td>Supported</td><td></td></tr>
<tr><td><code>marginBottom</code></td><td>Supported</td><td></td></tr>
<tr><td><code>marginLeft</code></td><td>Supported</td><td></td></tr>

<tr><td rowspan="6">Position</td></tr>
<tr><td><code>top</code></td><td>Supported</td><td></td></tr>
<tr><td><code>right</code></td><td>Supported</td><td></td></tr>
<tr><td><code>bottom</code></td><td>Supported</td><td></td></tr>
<tr><td><code>left</code></td><td>Supported</td><td></td></tr>
<tr><td><code>inset</code></td><td>Supported</td><td></td></tr>

<tr><td rowspan="4">Size</td></tr>
<tr><td><code>width</code></td><td>Supported except for <code>min-content</code>, <code>max-content</code> and <code>fit-content</code></td><td></td></tr>
<tr><td><code>height</code></td><td>Supported except for <code>min-content</code>, <code>max-content</code> and <code>fit-content</code></td><td></td></tr>
<tr><td><code>aspectRatio</code></td><td>Supported</td><td></td></tr>

<tr><td rowspan="5">Min & max size</td></tr>
<tr><td><code>minWidth</code></td><td>Supported except for <code>min-content</code>, <code>max-content</code> and <code>fit-content</code></td><td></td></tr>
<tr><td><code>minHeight</code></td><td>Supported except for <code>min-content</code>, <code>max-content</code> and <code>fit-content</code></td><td></td></tr>
<tr><td><code>maxWidth</code></td><td>Supported except for <code>min-content</code>, <code>max-content</code> and <code>fit-content</code></td><td></td></tr>
<tr><td><code>maxHeight</code></td><td>Supported except for <code>min-content</code>, <code>max-content</code> and <code>fit-content</code></td><td></td></tr>

<tr><td rowspan="5"><code>border</code></td></tr>
<tr><td>Width (<code>borderWidth</code>, <code>borderTopWidth</code>, ...)</td><td>Supported</td><td></td></tr>
<tr><td>Style (<code>borderStyle</code>, <code>borderTopStyle</code>, ...)</td><td>Dots and dashes are spaced per side, so on rounded corners they're placed differently</td><td></td></tr>
<tr><td>Color (<code>borderColor</code>, <code>borderTopColor</code>, ...)</td><td>Supported</td><td></td></tr>
<tr><td>Shorthand (<code>border</code>, <code>borderTop</code>, ...)</td><td>Supported</td><td></td></tr>

<tr>
<td colspan="2"><code>outline</code>, <code>outlineWidth</code>, <code>outlineStyle</code>, <code>outlineColor</code>, <code>outlineOffset</code></td>
<td>Outlines of inline elements aren't drawn, and <code>auto</code> is drawn like <code>solid</code> instead of as a focus ring. Dots and dashes are spaced like those of borders.</td>
<td></td>
</tr>

<tr><td rowspan="6"><code>borderRadius</code></td></tr>
<tr><td><code>borderTopLeftRadius</code></td><td>Supported</td><td></td></tr>
<tr><td><code>borderTopRightRadius</code></td><td>Supported</td><td></td></tr>
<tr><td><code>borderBottomLeftRadius</code></td><td>Supported</td><td></td></tr>
<tr><td><code>borderBottomRightRadius</code></td><td>Supported</td><td></td></tr>
<tr><td>Shorthand</td><td>Supported</td><td></td></tr>

<tr><td rowspan="4"><code>cornerShape</code></td></tr>
<tr><td>Values</td><td>Supported</td><td></td></tr>
<tr><td>Corner longhands (<code>cornerTopLeftShape</code>, <code>cornerTopRightShape</code>, ...)</td><td>Supported</td><td></td></tr>
<tr><td>Side shorthands (<code>cornerTopShape</code>, <code>cornerRightShape</code>, ...)</td><td>Supported</td><td></td></tr>

<tr><td rowspan="12">Flex</td></tr>
<tr><td><code>flexDirection</code></td><td>Supported</td><td></td></tr>
<tr><td><code>flexWrap</code></td><td>Supported</td><td></td></tr>
<tr><td><code>flexGrow</code></td><td>Supported</td><td></td></tr>
<tr><td><code>flexShrink</code></td><td>Supported</td><td></td></tr>
<tr><td><code>flexBasis</code></td><td>Supported except for <code>content</code></td><td></td></tr>
<tr><td><code>alignItems</code></td><td>Supported</td><td></td></tr>
<tr><td><code>alignContent</code></td><td>Supported</td><td></td></tr>
<tr><td><code>alignSelf</code></td><td>Supported</td><td></td></tr>
<tr><td><code>justifyContent</code></td><td>Supported</td><td></td></tr>
<tr><td><code>gap</code>, <code>rowGap</code>, <code>columnGap</code></td><td>Supported</td><td></td></tr>
<tr><td><code>order</code></td><td>Supported</td><td></td></tr>

<tr><td rowspan="9">Grid</td></tr>
<tr><td><code>gridTemplateColumns</code>, <code>gridTemplateRows</code></td><td>Supported except for <code>subgrid</code>, which throws, and <code>masonry</code></td><td></td></tr>
<tr><td><code>gridTemplateAreas</code></td><td>Supported</td><td></td></tr>
<tr><td><code>gridAutoColumns</code>, <code>gridAutoRows</code></td><td>Supported</td><td></td></tr>
<tr><td><code>gridAutoFlow</code></td><td>Supported</td><td></td></tr>
<tr><td><code>gridRow</code>, <code>gridColumn</code>, <code>gridArea</code> and their longhands</td><td>Supported</td><td></td></tr>
<tr><td><code>justifyItems</code>, <code>justifySelf</code></td><td>Supported</td><td></td></tr>
<tr><td><code>placeItems</code>, <code>placeContent</code>, <code>placeSelf</code></td><td>Supported</td><td></td></tr>
<tr><td>Shorthands (<code>grid</code>, <code>gridTemplate</code>)</td><td>Supported</td><td></td></tr>

<tr><td rowspan="6">List</td></tr>
<tr><td><code>listStyleType</code></td><td>The Chinese, Japanese, Korean and Ethiopic counter styles, <code>symbols()</code> and names of <code>@counter-style</code> rules are drawn like <code>decimal</code>. Markers can't be styled, since <code>::marker</code> isn't supported</td><td></td></tr>
<tr><td><code>listStylePosition</code></td><td>Supported</td><td></td></tr>
<tr><td><code>listStyleImage</code></td><td>Only <code>url()</code> is supported, not gradients</td><td></td></tr>
<tr><td>Shorthand (<code>listStyle</code>)</td><td>Supported</td><td></td></tr>
<tr><td><code>counterReset</code>, <code>counterIncrement</code>, <code>counterSet</code></td><td>Counters other than <code>list-item</code> aren't displayed, since <code>content</code> and <code>counter()</code> aren't supported. Where a marker is placed, and how many items a <code>reversed()</code> counter counts, are found from the <code>style</code> prop and the default styles of elements, not their <code>tw</code> classes</td><td></td></tr>

<tr><td rowspan="6">Font</td></tr>
<tr><td><code>fontFamily</code></td><td>Only the fonts passed in the <code>fonts</code> option are used. After the listed families, the other loaded fonts are used as fallbacks in the order they were passed, so generic families like <code>serif</code> don't select a font</td><td></td></tr>
<tr><td><code>fontSize</code></td><td>Supported</td><td></td></tr>
<tr><td><code>fontWeight</code></td><td>Bold isn't synthesized when no bold font is loaded</td><td></td></tr>
<tr><td><code>fontStyle</code></td><td>Italic isn't synthesized when the font has no italic</td><td></td></tr>
<tr><td><code>fontFeatureSettings</code></td><td>Supported</td><td></td></tr>

<tr><td rowspan="15">Text</td></tr>
<tr><td><code>tabSize</code></td><td>Supported</td><td></td></tr>
<tr><td><code>textAlign</code></td><td><code>start</code> and <code>end</code> are always left and right, since <code>direction</code> isn't supported. <code>match-parent</code> isn't supported</td><td></td></tr>
<tr><td><code>textIndent</code></td><td>Supported except for the <code>hanging</code> and <code>each-line</code> keywords</td><td></td></tr>
<tr><td><code>verticalAlign</code></td><td><code>middle</code>, <code>top</code>, <code>bottom</code>, <code>text-top</code> and <code>text-bottom</code> only apply to images and other atomic inlines, not to inline elements</td><td></td></tr>
<tr><td><code>textTransform</code></td><td>Supported except for <code>full-width</code> and <code>full-size-kana</code></td><td></td></tr>
<tr><td><code>textOverflow</code></td><td><code>ellipsis</code> only applies to text without inline elements in it</td><td></td></tr>
<tr><td><code>textDecoration</code></td><td>Decorations are drawn per element: <code>textDecoration: none</code> on a descendant removes the parent's lines, and a descendant's own decoration replaces them instead of adding to them. <code>textUnderlinePosition</code> isn't supported</td><td><a href="https://og-playground.vercel.app/?share=pVPLTsMwEPwVaytUkAKkPCRklV4oXwDHXhx7YxtcO3Ic2hLl37GTtEKIQynywTvjndGstG6BO4FAYS70x8oSUoedwce2TTUhCrVUgZLpLM_PptlAbrQI6gcndF0ZtotsaXC7Z1O91B550M7GN-5Ms7b714oJoa2kZJaPTMH4u_SuseLJGeejYlKW5cHN2fCiP5GS25uRkqxK8gS6bmUXqUiTHMYgAbdhidx5NmawzuI0di9SMb-OzceoYiT0Ro_SAzpan5ovg4qzSdVbfCf-noIIFwIK4lH0bgM8KQ0RrFbRqjDNMNyAT8rUFAbJhHP-_1CDl5cFO8-z_lzdX_ySb39DBq5KTjXQFvoVBfqQ5xkMOwz0LgGBRSOBlszUmAGu3Zt-3VXpA4RNj6JP2rPndYECaPANdhkEVsQOhca4jfNGQPcF">Example</a></td></tr>
<tr><td><code>textShadow</code></td><td>Supported</td><td></td></tr>
<tr><td><code>lineHeight</code></td><td>Line heights are rounded to whole pixels</td><td></td></tr>
<tr><td><code>letterSpacing</code></td><td>Isn't added after the last character</td><td></td></tr>
<tr><td><code>wordSpacing</code></td><td>Supported</td><td></td></tr>
<tr><td><code>whiteSpace</code></td><td><code>break-spaces</code> is laid out like <code>pre-wrap</code></td><td></td></tr>
<tr><td><code>wordBreak</code></td><td><code>auto-phrase</code> is laid out like <code>normal</code></td><td></td></tr>
<tr><td><code>overflowWrap</code></td><td>Not supported, use <code>wordBreak: break-word</code></td><td></td></tr>
<tr><td><code>textWrap</code></td><td><code>balance</code> and <code>pretty</code> only apply to text without inline elements in it, and <code>pretty</code> is approximated</td><td></td></tr>

<tr><td rowspan="10">Background</td></tr>
<tr><td><code>background</code></td><td>Supported</td><td></td></tr>
<tr><td><code>backgroundColor</code></td><td>Supported</td><td></td></tr>
<tr><td><code>backgroundImage</code></td><td>Supported except for <code>image-set()</code> and <code>cross-fade()</code></td><td></td></tr>
<tr><td><code>backgroundPosition</code></td><td>Supported</td><td></td></tr>
<tr><td><code>backgroundSize</code></td><td>Supported</td><td><a href="https://og-playground.vercel.app/?share=ZZXXjqNIFIZfpeWb2RW9Itik3tmRwAQDJgeDNTfkHEwwYdTvvnhGWq003HDOqZ8fDlX11Y9D2Ebx4ePwNcqf35u3t2Fcq_ifHz9e8dtbFudpNn68wRD0_qsy59GY_b8Q-GGZ9u3UREbcxf4u_tK0f_U_4y-_acx8i3dF2Dajnze_jwu1n74EU1_9Efmj_5G_CmDXpH8H_hBjp_fcoVVjhiQ-ban9Ukw7Y-10j3j9ldtnyttvND6LubMHTABVrO4YJypeXGSdBtuwwCRWANMRpy7W49jmUFvuyU0fnmZeduAiZ6ZZaueUXM0V5VDBNs2OtfX6MimW0iTTBD0JeYbFeSOrpLGR5_iMkrHGYSAGEFJl77xRCsjNDC_MmIHV8KDOdsboszJAXchEZifrokEtSyrT5cUkbkifODIuyKC2oblXy8yAqyt-VLcJr8UhYJc2PGoWrW4dppebvMnexThypKZD-IRPx2dFjjnj3eAxqMU1XLTipNKFhrv-1Te3ZWE41aKHtHUogVtC98ZlniyqI9lkcOS5xQnRSlTV0-tKaHckalSGADnQlda0i12YNG7wcO3J-IrGTiWLXtviZ6tc1LDpTrmyhe5uybE1CSYwMHinsikaLkdSepmcxdufvxhlwGcYZFBUF9yqXt9fIT5MC0L3H99JUi4UOqz4PPHkFsq72zM8WjYnYGqRWukUlGh4gcFkBi7zyiOuA0c-D4-VW-zWoSnBLSFHV2qkeLMWcwGd7jWpWVCi5AgElPbN7TB1vJpQbagUW4USzTgmUwZs5ckWiKtbeoovGVYKVZYplg37_NjrsGiWVdUBSYO2HADFotULPEJ1kl-3_QMDRpkEjjNQJkq5rpYMXk6gMN14z9Nh9lIhURHsoqlSm5QUTb2sFTs1ag4JjyqDx8eRoJY24GdbW3E7mrfC2jYpulOIfsX9q8znWkYJIU1Lpl3RHbd1jvHq2hVJ27w8Hu0DQtHereC9qSlsH2pBzdY8HbMclOVBaxkCNQPbCS280YnTjDj1vRVdXk2GTcHUtcLIC2kuZmc-F0CjT5O0bxLguUZX0-46gocAOemyO9ud16EQRYoEzoUHKbUT2c6Z6iVo8ikGz_c28GlfMMZFXId-3ndkk55Y6pEpLu00ERw5DiE5ibPw6Jg0pxiXMCDPY5Xv0ooyy07SOY2ItUJA0GcAc95NKKS17ERr91XBFBjo7kTiSi-nM-MjY9_WyXH_6BRO6OxOPK9k9bA925tNd9HmcmRzKI6YXmAFWWNmoOixTTtukLU1GRFeZIuaqTM24QNH063N0Ubq86kAJkdSfl7B89Dt0_KkVXVtMRYgb4Wsogggys-O-89XYZGtuDtasBrKY6ZmsIg42314VQNix3wBqQC70a0ODgxY3BbqKvgnxsscyioJTTAUoJHSrXUiwWwtLqtAakcVCILGBrn4C1p0-WKUzlCXhIAKTFUJTXzV9zXLWaU56fX5_OfvsDy3VdvvsJyzfIy_vEY_P783376CO8u_fW8O74e2G_O2GQ4fPw4_wX34IHZwH35h_fBxeiVRHEzp4SPxqyF-P8R1W-TW2r3OhHH-me0-yc5rtg7i6PAx9lP8-X4Y_WBXZHFVtXPbV9Hh818">Example</a></td></tr>
<tr><td><code>backgroundClip</code></td><td>Supported, also as <code>WebkitBackgroundClip</code></td><td></td></tr>
<tr><td><code>backgroundRepeat</code></td><td>Supported</td><td></td></tr>
<tr><td><code>backgroundOrigin</code></td><td>Supported</td><td></td></tr>
<tr><td><code>backgroundBlendMode</code></td><td>Not supported</td><td></td></tr>

<tr><td rowspan="9"><code>transform</code></td></tr>
<tr><td>Translate (<code>translate</code>, <code>translateX</code>, <code>translateY</code>, <code>translateZ</code>, <code>translate3d</code>)</td><td>Supported</td><td></td></tr>
<tr><td>Rotate (<code>rotate</code>, <code>rotateX</code>, <code>rotateY</code>, <code>rotateZ</code>, <code>rotate3d</code>)</td><td>Supported</td><td></td></tr>
<tr><td>Scale (<code>scale</code>, <code>scaleX</code>, <code>scaleY</code>, <code>scaleZ</code>, <code>scale3d</code>)</td><td>Supported</td><td></td></tr>
<tr><td>Skew (<code>skew</code>, <code>skewX</code>, <code>skewY</code>)</td><td>Supported</td><td></td></tr>
<tr><td>Matrix (<code>matrix</code>, <code>matrix3d</code>)</td><td>Supported</td><td></td></tr>
<tr><td>Perspective (<code>perspective</code>)</td><td>Approximated, see the notes below</td><td></td></tr>
<tr><td>The <code>transform</code> attribute of inline <code>&lt;svg&gt;</code></td><td>Supported</td><td></td></tr>
<tr><td>Individual properties (<code>translate</code>, <code>rotate</code>, <code>scale</code>)</td><td>Supported</td><td></td></tr>

<tr>
<td colspan="2"><code>transformOrigin</code></td>
<td>Supported</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>transformStyle</code></td>
<td>Supported, see the notes below</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>backfaceVisibility</code></td>
<td>Supported</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>perspective</code></td>
<td>Approximated, see the notes below</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>perspectiveOrigin</code></td>
<td>Supported</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>objectFit</code></td>
<td>Supported</td>
<td><a href="https://og-playground.vercel.app/?share=7VVNj5swEP0ro6mqJFJaslJVVVbYQ6X2F_TIBewBvHVsZMwmEeK_75BAAvsl7WUPq-WC5j0P896zNLQonSIUuFxBfAttYgHyxsqgnYXf7rBsQZbaKE8WutWZB_AUGm9hq_Q91OFoKG4HBmCvVSgF3Gw26xEqSRdlmGNK15VJjwIWuaHD4oJnqfxfeNdYxdSXPM8nlPOKPMM31QFqZ7RiIWpxprvudjzXjoq7M7KNWOeJZaB_DfKXA83s2PrYzMs6L0Z_TEzNrI5gN8i46NtyrpeCS70rrhVr8DJOsAyhqkUU8XBJpTPqu3TRz83mwPOiyhYJTntOWuKW-WHYVE3ccs8Mf2pzYmjB2r9OjU59PUu67I5k-Kt7PtfGDFcyt98_0TWDaBrCh05Eunvyn5HMI7Eh1fZdQ-FMXonkhUTeK5Bapoa-Kbd_aybX3bZKbAeQWFyjq_r1XaNo8aQOxS9eUnhWg6LfWKgoawoUeWpqWiPt3J3-d6z6P0HYnyr-Ts7X9GeXkUIRfEPdGkOa8YmSjHF7543C7gE">Example</a></td>
</tr>

<tr>
<td colspan="2"><code>objectPosition</code></td>
<td>Supported</td>
<td><a href="https://og-playground.vercel.app/?share=7VTBitswEP2VQaUkgbTOQilFxHsotOceevTFlsa2torGyHKTYPzvHSV24rS7Xfayp_XFzHsj6b0nMb1QpFFIsVxBeg995gDKzqlgyMFXOix7ULWx2qODYXXmATyGzjvYavMb2nC0mPYjA7A3OtQS7jab9QTVaKo63GLatI3NjxIWpcXD4oIXufpVeeqcZupdWZYzirxGz_Bdc4CWrNEsRC_O9DDcT339pHg4I9uEdZ5YBuJvlL8caWanpX-beVrnxeinmakbqxM4jDIu-rac66Xg0uyqa8UavEozUYfQtDJJ-HCFNVn9UVHyebM58HlJ46pMzNectKQ98-NhczVpz2tu8H9tzgwtWPv7udG5r0dJKh5Qhe8m8opcyI17vOUHtSa-rNiHLqAfL-82qPgl17SSeVxv2XFfQSHQ7lWz4-j-k9wTwb1Wbq3KLX7QtH8-ukAN-LjtC9O7zpBV5gaAzIm1oCbu2grZi5MPIb_wMBBn3ULGySA0Fl0lZJnbFtcCd_Rgfh6bOHHD_lTxPiXf-7ddgVrI4Dsc1iLkBXfUaC3tyVsthj8">Example</a></td>
</tr>

<tr>
<td colspan="2"><code>opacity</code></td>
<td>Supported</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>mixBlendMode</code></td>
<td>Supported</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>isolation</code></td>
<td>Supported</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>boxSizing</code></td>
<td>Supported</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>boxShadow</code></td>
<td>Supported</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>overflow</code>, <code>overflowX</code>, <code>overflowY</code></td>
<td>Scrollbars aren't drawn and take no space, like overlay scrollbars, so <code>scroll</code> and <code>auto</code> look like <code>hidden</code>.</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>overflowClipMargin</code></td>
<td>Supported</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>filter</code></td>
<td>Supported except for <code>url()</code></td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>backdropFilter</code></td>
<td>Supported except for <code>url()</code></td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>clipPath</code></td>
<td>Supported except for <code>url()</code> and geometry boxes like <code>content-box</code></td>
<td><a href="https://og-playground.vercel.app/?share=XVJNb9wgEP0rI6poW8lJnX6pstpe0h7aQ1UlrXLJBZvBZosZBDgbZ7X_PQMbZze5wPCGmXmPx1Z0pFA04osytzcOIKbZ4tftNscAA5p-SA2szuv6ZFXtwY1RaXiBKRO9lTOj2uLdgub4uwnYJUOOcx3ZaXRLVlrTu58Jx5hT6BKGJbWeYjJ6viAGXZ7_PN3K7n8faHLqgiwFzr_SWj9N5aorc48NvH93BF0_avlU1wXd7W7ctxws0l-KP8j_8FhypP4Y8lIp4_oGzg_YgSKzY6FDau2EC0WAzhr_R5Z39GTnntzrj_UJ1BU34Z3jKi_lVEGd4zerfXEmDlCoA_yLqKCdIdKIQBrSgLChYNUqgpWhx5igo9FLZzBW8Bvv0tk6AjrZWoww0wSJoAsoE4KerD2NianDNbYgvbemk9m8mGdwLbqstEyxXMHNL1F2CTTXTyFPkE6BYbP6wIV81dMGAzeGS_b0tJWZ7y95K6-6YHzi4WTzNU2hdNUylrbtZKyKZ8Wft2wQy112UQnyhZRotqL4IZrP7IfY-yWabI5Q2E69aLS0ESuBI63N39nnv5425cR98r_4MbaoRJPChLtKJNnyjQGtpfKMYvcA">Example</a></td>
</tr>

<tr>
<td colspan="2"><code>lineClamp</code></td>
<td>Only applies to text without inline elements in it. Also <code>WebkitLineClamp</code> with <code>display: -webkit-box</code></td>
<td><a href="https://og-playground.vercel.app/?share=5VPBbtQwEP2VkRFakNKSshxQBBwoXDhwaEFc9uLYk6xbx2PZk-6G1Up8DR_GlzDOkgr13FtPGb_xvPf8ojkoQxZVo95Zd7cJAJknj-8Ph1IDbNH1W25gdVHXz1fVCdw5y9sHmHU5ej0J2nncL2ipP7mEhh0F6Rny4xCWbtTWutA3cFH_Q1ptbvtEY7CX5CnJxLOu6-7ZKPC1-4kNrF_P0PG4CR9KsZh_aP9_X60nc7tQAXgX8NLrIQrbPTjo1LvwkZhpkJF1HferU69IAcxiAN8zWmgnyDQgUAe8RdhR8naVwQsFZgZDQ9TBYa7gK-75_CYDBt16zDDRCExgEmpG6EbvzzLLy-EHtqBj9M7oElguGjKLocQ0q3iZEPIr1Iahk_kxFQUdLLjA2CcZlKuRdpiEGK7GzGetLn6_6Dt9bZKLLOIkz-8l0DSzdjrPtO3ovM3nc6KvJNJHyHa1ho368-s3vDBihQb5fVayEa-BX27UE093-apKUZxNqeag5v1Szdu6rtRpAVXzphwstmOvmk77jJXCgW7ctymW7eXdfBKesiSfhxatajiNeKwU61ZubNF7mmNUx78">Example</a></td>
</tr>

<tr><td rowspan="6">Mask</td></tr>
<tr><td><code>maskImage</code></td><td>Supported, also as <code>WebkitMaskImage</code></td><td><a href="https://og-playground.vercel.app/?share=pZJfb9MwFMW_imVp2ZDS5s_I1kULSMAkhgRoYlJf-uLYN8ltHTvYDm2o-t2xuxXBXvcQXed3rONj37unXAugJb0V-GulCLFuklDt92FNSAfYdq4k51manp3HT3CLwnUvmEA7SDZ52kjYnWhYf0ID3KFWXuNajr06qUxiq-4d9DZIoByYk7QercNm-qg9VOH8_-XG8x_4G0pymf-Dls9pr9L0mdaMb1qjRyW8x2jkRefcYMskwZ61YOejCrFtN-e6T4ZOOz3LinyRL65v3ubZdTZrari8KkQmbhh_jzuJdWXqWTbP51n0s1oUUdNX66GNuNFD5TP6MkXbKsvTNOK2sqatI9yhqGD60vHPHxq2fMDv67v022NbNA9vTjfqmd3ch0w-p2ECmZy1oXrLC46GSyDMkSI9C19MajlCTJxhPj8zftNfoyXUG3RfX21HkuTYBf-whhhowGMOBBXpXC_DWYfDSr1bqdvET46vNKZ6CH22tNzT44zQMrxDTJ-miJahL1RAPba0bJi0EFPo9RofpyGMoNse_7xRaOZdX4OgpTMjHGLqWO13dCCl3mojBT38AQ">Example</a></td></tr>
<tr><td><code>maskPosition</code></td><td>Supported</td><td><a href="https://og-playground.vercel.app/?share=pVJda9swFP0rQlC3Ayf-6NKmpt5gW2Ed7KOskJe8yNK1fRNZ8iR5iRfy3yelCayFPfXBvtK5h3uP7j07yrUAWtBbgb-XihDrRgnlbhfOhLSATesKcp6l6dl5_ARuULj2BSbQ9pKNHq0lbE9oOH9CA9yhVj7HtRw6dcoyiY26d9DZkALlwJxSq8E6rMeP2oMq9H-erj3-E_9AQS7zf6DFUe1Vmh7RivF1Y_SghK8xGHnROtfbIkmwYw3Y6aCCbNtOue6SvtVOT7JZPs_n1zdv8-w6m9QVXF7NRCZuGH-PW4lVaapJNs2nWfSrnM-iuitXfRNxo_vSa_RhjDZllqdpxG1pTVNFuEVRwvil5Z8_1GzxgN9Xd-m3x2ZWP7w5vahjdn0fNHmdhglkctKE6EtecDRcAmGOzNKz8MWkkgPExBnm9TPjSc8K_dAWjxP3O-q35PA_MRZQrdF9fX1DkiSHRfnZG2KgBo9zIKhI6zr5stl_RAXafr9U75bqNvEe9JHGVPeBammxowe30SJMNKZPfqRF2DAVUA0NLWomLcQUOr3Cx7EPZnabw80XCra46yoQtHBmgH1MHas8owUp9UYbKej-Lw">Example</a></td></tr>
<tr><td><code>maskSize</code></td><td>Supported</td><td><a href="https://og-playground.vercel.app/?share=pVLfb9MwEP5XLEvLhpQ2P0a3LlpAAiYxJEATk_rSF8e-JNc6drAd2lD1f8duV8H6yoN19ved7j7ffTvKtQBa0HuBv5aKEOtGCeVuF-6EtIBN6wpymaXpxWV8BDcoXHuGCbS9ZKNHawnbExrun9AAd6iV57iWQ6dOLJPYqEcHnQ0UKAfmRK0G67AeP2oPqtD_NV17_Af-hoJc5_9Aixe1N2n6glaMrxujByV8jcHIq9a53hZJgh1rwE4HFWTbdsp1l_StdnqSzfJ5Pr-9e5tnt9mkruD6ZiYyccf4e9xKrEpTTbJpPs2in-V8FtVdueqbiBvdl16jD2O0KbM8TSNuS2uaKsItihLGLy3__KFmiyf8vnpIvz03s_rpzelHHbPrx6DJ6zRMIJOTJkRf8oqj4RIIc2SWXoQTk0oOEBNnmNfPjE96Veg4Gr-ffkvyvztaQLVG9_X_O5EkOWzID90QAzV4nANBRVrXyfNm52oCv98v1buluk-863ykMdV98IilxY4e_EWLMMOYHh1Ii7BTKqAaGlrUTFqIKXR6hc9jH-zrNoeXLxSM8NBVIGjhzAD7mDpW-YwWpNQbbaSg-z8">Example</a></td></tr>
<tr><td><code>maskRepeat</code></td><td>Supported</td><td><a href="https://og-playground.vercel.app/?share=nVbpjqNIEn6VkqXVzMg1AhtjQ-3MStwGA-Ywl9U_hssJ5jSHAbf63TdxdfXUzh4_FhllHF8cGZkm4usirKJ48bb4LUrvX8qXl7ab8vj3r19n-uUliVOQdG8vP61Q9G8_vb4LhzTqkr_IorStc3-C0ksejx_SmWbTJg67tCqhLqzyvig_tH6eglLs4qKdVXHZxc2H6tq3XXqZmAoKyzn-v6ovUG6mj_jtBVt_Ejnfs92i6Hdp4IcZaKq-jKCPvsl_jvzOf0sLH8RIXYK_B34bbzevqU0fjQE9CKCi4KOaVsJZAFK0PvMaQ3lwYbPiSNqzgHJV00BFqmk34XaGiEbucHlxslDqMNtRAJpyJkUpM0NTFAcXzqco6ztPUSbggs-8BTgY_AMvwl9UU9Qz_lPvPP0-WaiEz6zinkKoPwLIs9_lkGcATGEO-o6jTUANn3iKeJJ2F-6CJ58PJp8_ICFzA7QeFZqSbqHwBOW1zSeow62UY6HeAxNPzgKZnk18E7jfU2LHzbFMulBY5ZHAgVhYtUGpbGMWTT3HuHuFtZ35wLFRzyRScQ-2EDNEQkuKeaJaDM0GmJSLrNcrzGYQr5uDyFBA20vZ-VqbBuf98BkWRqGZUhXtjeGYEvcIizC5DB9yQU7niRiPpwyXH9QkP8RJdqF9unrEDo56Luig_fXD9yf_3NlVr2GRw3zye5DS01nwtp4j3SNXJ8VU_IH_eD9ygfjifEVTf2-gIVvd5TUO8-CzYC3l8rNWJOo750J-cHBfRKqB6rMf4t2-1mDsPCiN5Bn_uhk15t3umJGT79h9JPCQJ_tP9oSM_YfcP-rGwFrAPViZIUAbiH2v97P-p81BsHcJDc-ZWvGSwfHWkRZUm-8UDuWsMsJM7ITXvl8YYxpVaWIcDFuQMp-lDYZXUyUzNVLX4KYTMBgGNxwFaEUoF84QWe6mXMYz13GVeU91ISF0sPF8oDNpbYtxHVWOmSxRzOXLyHCzEenHcHk5as7liJUdRl2SjhWUE3PZ2gdM43nDPrEUGwnJxHISvL6WuHksd8qjuK66bTDEQyKKHu5qIGNFxvAo5byyizvKZ1y7x28hf-CjZXAw2EGzWn_bP04b2lbtMx3Y0jpXaDNktVtXbPH7o8A3k8q5jhVNxsBWhe0F8jqqYqJnr17XAO9o1UZrAcDRo3tY7Zc5wGhikM4Wilz3YTH1akMOy1XMMGOVEZokexWWlo7HMrJ4mBzVqM7u8aSyN7SWb870cAKdUCqJ6c2z3xr6gV61QqrD22-O_pRosq3iHQHGzFRQ5Yisjo61Tseq0VByWxKmdVrHa9fRk122bBpiUHnDCTG_OR28OudwcW0E4qGozUaOdnHZRLesiUbXkbg1bku7lGdSrNTYBlHqgxtVdr9RjvZyd8xXd4BUYBvou7VvXLoxGkldoSrXdvmzRHnurQiLi9WfDPsgi_dJE5cB4pIZG6gaVm1qkrxQVSUqZU3d0bDMtxfdU3kSiVwJKVrPXy8HaWAJzNBDjq4entTprFOeWL32HNwX1u2dXVfSQJQeeyMecFNHn6ezUUmaO9md4uaKL3twybpTNuQ1QYGym8gitAjRu7DoFaQkWHI7miNzZ2UUsuEE2LlmjNrpp5XTh3mM-eXt_mi2O1kor9tBsfwbxgILhzkJ68PRPh25nlhRkxTTuWQq6dWVpp3BVPWq6ree34P7ivDPAljuwsQbB8fxjnTSn-lsx7sPMdwQe48zB3lI0rI02Vgz2kBmsColkI3M3QuwOSUEzZuCd99fNIykkP0YINFwL6LNUiQmKiAPoo5PqkVFGc1fEaQtxrW6psdO4C5IhRxC1916J3mrxeDerWKcRC_0etLjCiR7IexI2eG0w57VB4S0zd53hq0xZI7sNuqZ2ka4KhmHvBQke2sbO_gn013TtlADlAmPyZEcSqsdVrqFl8IbmAgqnY9pFukjifCFN1mcGPOEFPsIAi-V0rgqfdMZSlIkpEGa4ua3J44SQ4thMqQRr8ujjuxUKgCIq3Iaheg6fbOvF2qN895725IMC-eaTAIA_P77Lx_NvfDbTJw79NvLH3laxn7zK2j8KIUTwM9d9dLMPf71Jcj7-PWla_yyrf0G6n7545P9-3AwTyj1-LJaz8tn90Zcx_48VjRP4tcfSicOsrRTPmXwl6GhvYPlWOQfg4O2V9fnicZ8x0B92OyOLDWIKV2dnbz097B5XMGgMCKICnsK1_MHGk0VczNCzBp-2DG9IDeaKQ4iSwHlJEIsNSrXp49N4Ix9-PjUXGCjiyYcUyb8HhbhfcYpDPmIijDVruPguUYlCjBmho4KMzxUk6Yhpn2-zDDILNeqJ0g_LKDDWDI7v0_dKLMZpJWVyHM45NeqOazgikMfhgJt1KvVzuts66QiOBd5G8D9RuukjgQrFRliCZvOnMvyx0H8ezH_n-P808v_ONQ_Qf_laL99-1L-40v5GwLHXLguXhdVPQ-l7eLt6-I50C7eZpevi_eRd_E2D5GLKA56sHi7-Hkbvy7iorqmp6me5-VueHLQ0Tx5ckUQR4u3runjb6-Lzg8gIonzvBqqJo8W3_4J">Example</a></td></tr>
<tr><td><code>maskOrigin</code></td><td>Supported. The <code>mask</code> shorthand, <code>maskClip</code>, <code>maskMode</code> and <code>maskComposite</code> aren't supported</td><td></td></tr>

<tr>
<td rowspan="2"><code>WebkitTextStroke</code></td>
<td><code>WebkitTextStrokeWidth</code></td>
<td>Supported</td>
<td></td>
</tr>
<tr>
<td><code>WebkitTextStrokeColor</code></td>
<td>Supported</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>WebkitTextFillColor</code></td>
<td>Supported</td>
<td></td>
</tr>

<tr>
<td colspan="2"><code>paintOrder</code></td>
<td>Supported</td>
<td></td>
</tr>

</tbody>
</table>

Note:

1. In 3D transforms, elements in a `preserve-3d` context are drawn back to front by the depth of their centers, and elements that intersect aren't cut where they cross. Perspective is approximated: each element is drawn with the affine transform closest to it around its center, which is exact for elements facing the viewer, such as `translateZ()`. `satori/experimental` [draws perspective exactly](#perspective-experimental).
2. Percentages in `calc()`, `min()`, `max()` and `clamp()` only work in sizes, margins, paddings, insets, gaps, `flexBasis` and translations. Elsewhere, values with them are ignored.
3. Properties that aren't listed are ignored, for example `columns`, `direction`, `writingMode`, `fontVariant`, `fontStretch` and `fontKerning`.
4. Invalid values throw an error, which fails the whole render, unless they're ignored with [`onStyleError`](#invalid-styles).

#### Perspective (experimental)

> **Note:** This is experimental and may change or be removed in any release. It's only available from `satori/experimental`, so it doesn't add to the size of the `satori` import.

With `satori/experimental`, perspective from the `perspective` property and the `perspective()` function is drawn exactly:

```jsx
import satori from 'satori/experimental'

await satori(
  <div style={{ display: 'flex', perspective: 600 }}>
    <div style={{ display: 'flex', transform: 'rotateY(35deg)' }}>Hello</div>
  </div>,
  options
)
```

SVG has no perspective transforms, so each element with perspective is split into triangles that are each drawn with an affine transform, within 0.5px of the exact position. This makes the SVG larger and slower to render: depending on the angle, an element is drawn up to a few hundred times.

### Language and Typography

**OpenType Features**: Satori supports advanced typography features via HarfBuzz text shaping. Use the `font-feature-settings` CSS property to enable OpenType features such as:
- Ligatures (`liga`, `dlig`, `hlig`)
- Small caps (`smcp`, `c2sc`)
- Stylistic sets (`ss01`-`ss20`)
- Contextual alternates (`calt`)
- Swashes (`swsh`, `cswh`)
- And many more OpenType features

Example:
```jsx
<div style={{ fontFeatureSettings: '"smcp" 1, "liga" 0' }}>
  This Text Uses Small Caps
</div>
```

HarfBuzz also improves glyph shaping for complex scripts such as Arabic. Full
Unicode bidirectional layout is not yet supported, so mixed LTR and RTL text
may not follow browser ordering.

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

> [!TIP]
> We recommend you define global fonts instead of creating a new object and pass it to satori for better performance, if your fonts do not change. [Read it for more detail](https://github.com/vercel/satori/issues/590)

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

### Runtime Support

Satori can be directly used in browser, Node.js (>= 16), and Web Workers. It bundles its underlying WASM dependencies as base64-encoded strings and loads them at runtime.

If there is a limitation on dynamically loading WASM (e.g. Cloudflare Workers), you can use the Standalone Build which is mentioned below.

#### Standalone Build of Satori

Satori's standalone build doesn't include the WASM binary of its layout engine by default, and you need to load it manually before using Satori.

First, you need to download the `layout.wasm` binary from [Satori build](https://unpkg.com/satori/) and provide it yourself. Let's use `fetch` to load it directly from the CDN as an example:

```jsx
import satori, { init } from 'satori/standalone'

const res = await fetch('https://unpkg.com/satori/layout.wasm')
const layoutWasm = await res.arrayBuffer()

await init(layoutWasm)

// Now you can use satori as usual
const svg = await satori(...)
```

Of course, you can also load the `layout.wasm` file from your local disk via `fs.readFile` in Node.js or other methods.

### Font Embedding

By default, Satori renders the text as `<path>` in SVG, instead of `<text>`. That means it embeds the font path data as inlined information, so succeeding processes (e.g. render the SVG on another platform) don’t need to deal with font files anymore.

You can turn off this behavior by setting `embedFont` to `false`, and Satori will use `<text>` instead:

```jsx
const svg = await satori(
  <div style={{ color: 'black' }}>hello, world</div>,
  {
    ...,
    embedFont: false,
  },
)
```

### Pixel Grid Rounding

Set `pointScaleFactor` to control how layout values are rounded to the pixel grid: they are rounded to multiples of `1 / pointScaleFactor` px, or not rounded with `0`. It defaults to `1`, and higher values improve rendering precision on high-DPI displays.

```jsx
const svg = await satori(
  <div style={{ color: 'black' }}>hello, world</div>,
  {
    ...,
    pointScaleFactor: 2,
  },
)
```

### Invalid Styles

By default, an invalid or unsupported style declaration throws an error, which fails the whole render. With `onStyleError`, the declaration is ignored instead, and its error is passed to the callback:

```jsx
const svg = await satori(
  <div style={{ display: 'table', color: 'black' }}>hello, world</div>,
  {
    ...,
    onStyleError: (error) => console.warn(error.message),
  },
)
```

### Colors

Satori converts the colors that SVG renderers may not support to `rgb()` and `rgba()`. Sharp, for example, draws most of them black. They are:

- `lab()`, `lch()`, `oklab()`, `oklch()` and `color()`;
- `color-mix()`, `light-dark()` and relative colors like `rgb(from red r g b / 50%)`;
- `hwb()`, `rebeccapurple`, and `rgb()` and `hsl()` without commas, like `rgb(255 0 0 / 50%)`.

To keep them as they're written, for an SVG renderer that supports them, set `convertColors` to `false`:

```jsx
const svg = await satori(
  <div style={{ color: 'oklch(0.7 0.2 30)' }}>hello, world</div>,
  {
    ...,
    convertColors: false,
  },
)
```

Colors in gradients are converted either way. SVG interpolates gradients in sRGB, so Satori adds stops to gradients that are interpolated in another color space: those with a color space like `linear-gradient(in oklch, red, blue)`, and those in Oklab by default because they have colors from `lab()`, `lch()`, `oklab()`, `oklch()`, `color()`, `color-mix()` or relative colors.

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

- Shu Ding ([@shuding](https://twitter.com/shuding))

---

<a aria-label="Vercel logo" href="https://vercel.com">
  <img src="https://badgen.net/badge/icon/Made%20by%20Vercel?icon=zeit&label&color=black&labelColor=black">
</a>
