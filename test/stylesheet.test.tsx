import type { ReactNode } from 'react'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('stylesheets', () => {
  let fonts: any
  initFonts((f) => (fonts = f))

  // The stylesheet is after the content, so that the content is the same as
  // with inline styles.
  const page = (content: ReactNode, css?: string, rootStyle = {}) => (
    <div
      style={{ display: 'flex', width: '100%', height: '100%', ...rootStyle }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {content}
      </div>
      <style>{css}</style>
    </div>
  )

  /** Expects content with a stylesheet to render like other content. */
  async function expectSame(
    css: string,
    content: ReactNode,
    expected: ReactNode,
    rootStyle = {}
  ) {
    const options = { width: 200, height: 160, fonts }
    expect(await satori(page(content, css), options)).toBe(
      await satori(page(expected, undefined, rootStyle), options)
    )
  }

  it('should match simple selectors', async () => {
    await expectSame(
      `span { color: red }
      .a { color: blue }
      #b { color: green }
      [data-x="1"] { color: purple }
      [title~="two" i] { color: orange }
      *.c { font-size: 20px }`,
      <>
        <span>Type</span>
        <span className='a'>Class</span>
        <span id='b'>ID</span>
        <span data-x='1'>Attribute</span>
        <span title='One TWO'>Flag</span>
        <span className='c d'>Classes</span>
      </>,
      <>
        <span style={{ color: 'red' }}>Type</span>
        <span style={{ color: 'blue' }}>Class</span>
        <span style={{ color: 'green' }}>ID</span>
        <span style={{ color: 'purple' }}>Attribute</span>
        <span style={{ color: 'orange' }}>Flag</span>
        <span style={{ color: 'red', fontSize: '20px' }}>Classes</span>
      </>
    )
  })

  it('should match combinators', async () => {
    await expectSame(
      `.list > span { color: red }
      .list span span { color: blue }
      .x + span { color: green }
      .y ~ span { text-decoration: underline }`,
      <div className='list' style={{ display: 'flex', gap: 4 }}>
        <span>A</span>
        <span className='x'>
          B <span>C</span>
        </span>
        <span>D</span>
        <span className='y'>E</span>
        <span>F</span>
        <span>G</span>
      </div>,
      <div style={{ display: 'flex', gap: 4 }}>
        <span style={{ color: 'red' }}>A</span>
        <span style={{ color: 'red' }}>
          B <span style={{ color: 'blue' }}>C</span>
        </span>
        <span style={{ color: 'green' }}>D</span>
        <span style={{ color: 'red' }}>E</span>
        <span style={{ color: 'red', textDecoration: 'underline' }}>F</span>
        <span style={{ color: 'red', textDecoration: 'underline' }}>G</span>
      </div>
    )
  })

  it('should match pseudo-classes', async () => {
    await expectSame(
      `.p > :first-child { color: red }
      .p > :last-child { color: blue }
      .p > :nth-child(2n of .k) { font-size: 20px }
      .p > span:nth-of-type(2) { text-decoration: underline }
      .p > :not(.k, :first-child) { opacity: 0.5 }
      .p > :is(.m, .n):where(span) { color: green }
      .p > :has(> b) { background-color: yellow }
      .p > :empty { padding: 4px; background-color: gray }
      :root { color: purple }
      .p:hover { color: red }`,
      <div className='p' style={{ display: 'flex', gap: 4 }}>
        <span className='k'>1</span>
        <span>2</span>
        <span className='k'>
          <b>3</b>
        </span>
        <span className='m' />
        <span className='k n'>5</span>
      </div>,
      <div style={{ display: 'flex', gap: 4 }}>
        <span style={{ color: 'red' }}>1</span>
        <span style={{ opacity: '0.5', textDecoration: 'underline' }}>2</span>
        <span style={{ fontSize: '20px', backgroundColor: 'yellow' }}>
          <b>3</b>
        </span>
        <span
          style={{
            opacity: '0.5',
            color: 'green',
            padding: '4px',
            backgroundColor: 'gray',
          }}
        />
        <span style={{ color: 'green' }}>5</span>
      </div>,
      { color: 'purple' }
    )
  })

  it('should accept pseudo-classes of shadow trees, which never match', async () => {
    // Design systems declare variables for `:root` and `:host` in one rule.
    await expectSame(
      `:root, :host { --c: red }
      .a, :host(.a), :host-context(.b) .a { color: var(--c) }
      .a:host, .a:state(open) { color: blue }
      a:-webkit-any-link { color: green }
      a:-webkit-autofill { color: blue }`,
      <div style={{ display: 'flex', gap: 4 }}>
        <span className='a'>1</span>
        <a href='#'>2</a>
      </div>,
      <div style={{ display: 'flex', gap: 4 }}>
        <span style={{ color: 'red' }}>1</span>
        <a href='#' style={{ color: 'green' }}>
          2
        </a>
      </div>
    )
  })

  it('should apply the cascade', async () => {
    await expectSame(
      `.a.b { color: red }
      .a { color: blue }
      #i.x { color: blue }
      .x.y.z.w { color: red }
      .o { color: green }
      .o { color: purple }
      .imp { color: red !important }
      .n { color: red }
      :where(.q) { color: red }
      span { color: blue }
      .s { margin-top: 10px }
      .s.t { margin: 0 }
      .u.v { margin-top: 10px }
      .u { margin: 0 }`,
      <>
        <span className='a b'>1</span>
        <span id='i' className='x y z w'>
          2
        </span>
        <span className='o'>3</span>
        <span className='imp' style={{ color: 'blue' }}>
          4
        </span>
        <span className='n' style={{ color: 'blue' }}>
          5
        </span>
        <span className='q'>6</span>
        <div className='s t'>7</div>
        <div className='u v'>8</div>
      </>,
      <>
        <span style={{ color: 'red' }}>1</span>
        <span style={{ color: 'blue' }}>2</span>
        <span style={{ color: 'purple' }}>3</span>
        <span style={{ color: 'red' }}>4</span>
        <span style={{ color: 'blue' }}>5</span>
        <span style={{ color: 'blue' }}>6</span>
        <div style={{ margin: 0 }}>7</div>
        <div style={{ margin: 0, marginTop: 10 }}>8</div>
      </>
    )
  })

  it('should apply nested rules', async () => {
    await expectSame(
      `.card {
        color: red;
        & .t { color: blue }
        > .u { color: green }
        .wrap & { text-decoration: underline }
        &.v { font-size: 20px }
        span:first-child { font-weight: bold }
        @media (width >= 100px) {
          background-color: yellow;
          .t { opacity: 0.5 }
        }
        padding: 4px;
      }`,
      <>
        <div className='wrap'>
          <div className='card'>
            <span className='t'>T</span>
            <span className='u'>U</span>
          </div>
        </div>
        <div className='card v'>V</div>
      </>,
      <>
        <div>
          <div
            style={{
              color: 'red',
              textDecoration: 'underline',
              backgroundColor: 'yellow',
              padding: '4px',
            }}
          >
            <span style={{ color: 'blue', fontWeight: 'bold', opacity: '0.5' }}>
              T
            </span>
            <span style={{ color: 'green' }}>U</span>
          </div>
        </div>
        <div
          style={{
            color: 'red',
            fontSize: '20px',
            backgroundColor: 'yellow',
            padding: '4px',
          }}
        >
          V
        </div>
      </>
    )
  })

  it('should apply @media and @supports', async () => {
    await expectSame(
      `@media (min-width: 100px) { .a { color: red } }
      @media (max-width: 100px) { .a { color: blue } }
      @media screen and (orientation: landscape) { .b { color: red } }
      @media print { .b { color: blue } }
      @media (100px < width <= 200px) and (prefers-color-scheme: light) {
        .c { color: red }
      }
      @media not all and (monochrome) { .d { color: red } }
      @supports (display: grid) or (foo: bar) { .e { color: red } }
      @supports font-tech(color-colrv1) { .e { color: blue } }`,
      <>
        <span className='a'>A</span>
        <span className='b'>B</span>
        <span className='c'>C</span>
        <span className='d'>D</span>
        <span className='e'>E</span>
        <style media='print'>{'.f { color: red }'}</style>
        <span className='f'>F</span>
      </>,
      <>
        <span style={{ color: 'red' }}>A</span>
        <span style={{ color: 'red' }}>B</span>
        <span style={{ color: 'red' }}>C</span>
        <span style={{ color: 'red' }}>D</span>
        <span style={{ color: 'red' }}>E</span>
        <style />
        <span>F</span>
      </>
    )
  })

  it('should order cascade layers', async () => {
    await expectSame(
      `@layer base, theme;
      @layer theme {
        .a { color: red }
        .b { color: red !important }
      }
      @layer base {
        .a.x { color: blue }
        .b { color: blue !important }
      }
      .c { color: green }
      @layer base { .c { color: red } }
      @layer theme.dark { .d { color: blue } }
      @layer theme { .d { color: red } }`,
      <>
        <span className='a x'>A</span>
        <span className='b'>B</span>
        <span className='c'>C</span>
        <span className='d'>D</span>
      </>,
      <>
        <span style={{ color: 'red' }}>A</span>
        <span style={{ color: 'blue' }}>B</span>
        <span style={{ color: 'green' }}>C</span>
        <span style={{ color: 'red' }}>D</span>
      </>
    )
  })

  it('should inherit and resolve CSS-wide keywords', async () => {
    await expectSame(
      `.p { color: red; font-size: 20px }
      .i { color: initial }
      strong { font-weight: inherit }
      .m { margin: initial }`,
      <div className='p'>
        <span>Red</span>
        <span className='i'>Black</span>
        <strong>Regular</strong>
        <p className='m'>No margins</p>
      </div>,
      <div style={{ color: 'red', fontSize: '20px' }}>
        <span>Red</span>
        <span style={{ color: 'black' }}>Black</span>
        <strong style={{ fontWeight: 'normal' }}>Regular</strong>
        <p style={{ margin: 0 }}>No margins</p>
      </div>
    )
  })

  it('should only reset the longhands of shorthands with CSS-wide keywords', async () => {
    await expectSame(
      `.f { display: flex; flex-direction: column; flex-wrap: wrap; flex: initial }
      .b {
        border-radius: 8px;
        background-color: red;
        padding: 4px;
        border: 2px solid blue;
        border: initial;
      }
      .o {
        outline-offset: 4px;
        outline: initial;
        outline-style: solid;
        outline-width: 2px;
        outline-color: red;
      }`,
      <>
        <div className='f'>
          <span>1</span>
          <span>2</span>
        </div>
        <div className='b'>Border</div>
        <div className='o' style={{ margin: 8 }}>
          Outline
        </div>
      </>,
      <>
        <div
          style={{ display: 'flex', flexDirection: 'column', flexWrap: 'wrap' }}
        >
          <span>1</span>
          <span>2</span>
        </div>
        <div style={{ borderRadius: 8, backgroundColor: 'red', padding: 4 }}>
          Border
        </div>
        <div
          style={{
            outlineOffset: 4,
            outlineStyle: 'solid',
            outlineWidth: 2,
            outlineColor: 'red',
            margin: 8,
          }}
        >
          Outline
        </div>
      </>
    )
  })

  it('should drop invalid declarations like browsers', async () => {
    await expectSame(
      `.a { display: flex; display: table; flex-direction: column }
      .b { margin: 4px; margin: foo; transform: banana(1); color: red }
      .c {
        height: 10px;
        background-image: linear-gradient(red, blue);
        background-image: image-set("a.png" 1x);
      }
      .d { cursor: pointer; transition: all 1s }
      .e::before { content: "E"; display: table }
      @supports (display: table) { .f { color: red } }
      @supports not (display: table) { .g { color: green } }`,
      <>
        <div className='a'>
          <span>1</span>
          <span>2</span>
        </div>
        <div className='b'>B</div>
        <div className='c' />
        <div className='d'>D</div>
        <div className='e' />
        <div className='f'>F</div>
        <div className='g'>G</div>
      </>,
      <>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>1</span>
          <span>2</span>
        </div>
        <div style={{ margin: '4px', color: 'red' }}>B</div>
        <div
          style={{
            height: '10px',
            backgroundImage: 'linear-gradient(red, blue)',
          }}
        />
        <div>D</div>
        <div>
          <span>E</span>
        </div>
        <div>F</div>
        <div style={{ color: 'green' }}>G</div>
      </>
    )

    // Dropped declarations are passed to `onStyleError` once each, but not
    // the declarations of feature queries or rules that don't match.
    const queries = `@supports (display: table) or (transform: banana(1)) {
      .x { color: red }
    }
    @supports not (display: table) { .x { color: blue } }`
    const errors: string[] = []
    await satori(
      <div>
        <style>
          {`.x { display: table } .x { display: table }
          .unused { margin: foo } ${queries}`}
        </style>
        <div className='x' />
      </div>,
      {
        width: 10,
        height: 10,
        fonts,
        onStyleError: (e) => errors.push(e.message),
      }
    )
    expect(errors).toEqual([expect.stringContaining('"display"')])
    await satori(
      <div>
        <style>{queries}</style>
        <div className='x' />
      </div>,
      {
        width: 10,
        height: 10,
        fonts,
        onStyleError: (e) => {
          throw e
        },
      }
    )

    // Inline styles still throw.
    await expect(
      satori(<div style={{ display: 'table' }} />, {
        width: 10,
        height: 10,
        fonts,
      })
    ).rejects.toThrow('"display"')
  })

  it('should apply stylesheets of components, inner HTML and SVG', async () => {
    const Card = () => (
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: '.c { color: red } circle { fill: blue }',
          }}
        />
        <span className='c'>Component</span>
      </>
    )
    await expectSame(
      '',
      <>
        <Card />
        <svg width='10' height='10' viewBox='0 0 10 10'>
          <circle cx='5' cy='5' r='5' />
        </svg>
      </>,
      <>
        <style />
        <span style={{ color: 'red' }}>Component</span>
        <svg width='10' height='10' viewBox='0 0 10 10'>
          <circle cx='5' cy='5' r='5' style={{ fill: 'blue' }} />
        </svg>
      </>
    )
  })

  it('should ignore invalid rules and declarations', async () => {
    await expectSame(
      `.a { color: red }
      .b, .c:unknown { color: red }
      .d { color: ; color: red }
      .e::before { color: red }
      @unknown { .f { color: red } }
      *|.g { color: red }`,
      <>
        <span className='a'>A</span>
        <span className='b'>B</span>
        <span className='d'>D</span>
        <span className='e'>E</span>
        <span className='f'>F</span>
        <span className='g'>G</span>
      </>,
      <>
        <span style={{ color: 'red' }}>A</span>
        <span>B</span>
        <span style={{ color: 'red' }}>D</span>
        <span>E</span>
        <span>F</span>
        <span>G</span>
      </>
    )
  })

  it('should generate ::before and ::after', async () => {
    await expectSame(
      `.a::before { content: "\\BB  "; color: red }
      .a::after { content: attr(data-x) "!"; font-weight: bold }
      .b::before {
        content: "";
        display: block;
        width: 20px;
        height: 4px;
        background-color: blue;
      }
      .c::before { content: open-quote }
      .c::after { content: close-quote }
      .d::before { content: none }
      .e::after { color: red }
      .f { &::after { content: "1" } }
      div.g::before { content: "low" }
      .g::before { content: "x" }`,
      <>
        <div className='a' data-x='hi'>
          Text
        </div>
        <div className='b'>Bar</div>
        <div className='c'>Quote</div>
        <div className='d'>None</div>
        <div className='e'>Normal</div>
        <div className='f'>Nested</div>
        <div className='g'>Specificity</div>
      </>,
      <>
        <div>
          <span style={{ color: 'red' }}>{'\u00bb '}</span>
          Text
          <span style={{ fontWeight: 'bold' }}>hi!</span>
        </div>
        <div>
          <span
            style={{
              display: 'block',
              width: '20px',
              height: '4px',
              backgroundColor: 'blue',
            }}
          />
          Bar
        </div>
        <div>
          <span>{'\u201c'}</span>Quote<span>{'\u201d'}</span>
        </div>
        <div>None</div>
        <div>Normal</div>
        <div>
          Nested<span>1</span>
        </div>
        <div>
          <span>low</span>Specificity
        </div>
      </>
    )
  })

  it('should resolve counters in pseudo-elements', async () => {
    await expectSame(
      `.list { counter-reset: item }
      .list > div { counter-increment: item }
      .list > div::before { content: counter(item) ". " }
      .list > div:last-child::before {
        content: counter(item, upper-roman) ". "
      }
      .tree { counter-reset: n }
      .n::before { counter-increment: n; content: counters(n, ".") " " }`,
      <>
        <div className='list'>
          <div>One</div>
          <div>Two</div>
          <div>Three</div>
        </div>
        <div className='tree'>
          <div className='n'>A</div>
          <div className='tree'>
            <div className='n'>B</div>
            <div className='n'>C</div>
          </div>
        </div>
      </>,
      <>
        <div>
          <div>
            <span>1. </span>One
          </div>
          <div>
            <span>2. </span>Two
          </div>
          <div>
            <span>III. </span>Three
          </div>
        </div>
        <div>
          <div>
            <span>1 </span>A
          </div>
          <div>
            <div>
              <span>1.1 </span>B
            </div>
            <div>
              <span>1.2 </span>C
            </div>
          </div>
        </div>
      </>
    )
  })

  it('should generate images with url()', async () => {
    const src =
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='10' height='10' fill='red'/></svg>"
    await expectSame(
      `.i::before { content: url("${src}") " Icon" }`,
      <div className='i'>Text</div>,
      <div>
        <span>
          <img src={src} width={10} height={10} /> Icon
        </span>
        Text
      </div>
    )
  })

  it('should not generate pseudo-elements in other cases', async () => {
    const src =
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'></svg>"
    await expectSame(
      `img::before, svg::before, rect::before { content: "x" }
      :is(::before), .k::before .m, .k::before:hover { content: "x" }
      .k { content: "Ignored" }`,
      <div className='k'>
        <img src={src} width={10} height={10} />
        <svg width='10' height='10'>
          <rect width='10' height='10' />
        </svg>
        <span className='m'>Text</span>
      </div>,
      <div>
        <img src={src} width={10} height={10} />
        <svg width='10' height='10'>
          <rect width='10' height='10' />
        </svg>
        <span>Text</span>
      </div>
    )
  })

  const withBold = async () => [
    ...fonts,
    {
      name: 'Roboto',
      data: await readFile(join(process.cwd(), 'test/assets/Roboto-Bold.ttf')),
      weight: 700,
      style: 'normal',
    },
  ]

  it('should render pseudo-elements in a document', async () => {
    const css = `
      .doc {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
        height: 100%;
        padding: 24px;
        box-sizing: border-box;
        background: white;
        color: #0f172a;
        font-size: 15px;
        counter-reset: section;
      }
      h2 {
        margin: 0;
        font-size: 20px;
        counter-increment: section;
        &::before { content: counter(section, upper-roman) ". "; color: #6366f1 }
        &::after {
          content: "";
          display: block;
          width: 32px;
          height: 3px;
          margin-top: 6px;
          border-radius: 2px;
          background: #6366f1;
        }
      }
      blockquote {
        position: relative;
        margin: 0;
        padding-left: 16px;
        color: #475569;
        &::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          border-radius: 2px;
          background: #cbd5e1;
        }
        & span::before { content: open-quote }
        & span::after { content: close-quote }
      }
      .tags { display: flex; gap: 8px }
      .tag {
        padding: 2px 10px;
        border-radius: 999px;
        background: #eef2ff;
        color: #4338ca;
        &::after { content: " " attr(data-count); color: #818cf8 }
      }
    `
    const svg = await satori(
      <div className='doc'>
        <style>{css}</style>
        <h2>Pseudo-elements</h2>
        <blockquote>
          <span>Generated content is laid out like other content.</span>
        </blockquote>
        <h2>Counters</h2>
        <div className='tags'>
          <span className='tag' data-count='12'>
            before
          </span>
          <span className='tag' data-count='8'>
            after
          </span>
        </div>
      </div>,
      { width: 400, height: 240, fonts: (await withBold()) as any }
    )
    expect(await toImage(svg, 400)).toMatchImageSnapshot()
  })

  it('should render decorative pseudo-elements', async () => {
    const check =
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><circle cx='8' cy='8' r='8' fill='limegreen'/><path d='M4.5 8.5l2.5 2.5 4.5-5' stroke='white' stroke-width='2' fill='none'/></svg>"
    const css = `
      .card {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        height: 100%;
        padding: 24px;
        box-sizing: border-box;
        overflow: hidden;
        background: #0f172a;
        color: white;
        font-size: 16px;
        &::before {
          content: "";
          position: absolute;
          right: -60px;
          top: -60px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, #6366f1, transparent 70%);
        }
        &::after {
          content: "NEW";
          position: absolute;
          right: 20px;
          top: 20px;
          padding: 2px 8px;
          border-radius: 4px;
          background: #f43f5e;
          font-size: 12px;
          font-weight: bold;
          letter-spacing: 1px;
        }
      }
      h3 { margin: 0; font-size: 22px }
      ul { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0 }
      li {
        display: flex;
        align-items: center;
        gap: 8px;
        &::before { content: url("${check}") }
        &:last-child::after { content: "(soon)"; color: #94a3b8 }
      }
    `
    const svg = await satori(
      <div className='card'>
        <style>{css}</style>
        <h3>Pseudo-elements</h3>
        <ul>
          <li>Generated text and boxes</li>
          <li>Counters and attributes</li>
          <li>Images</li>
        </ul>
      </div>,
      { width: 400, height: 200, fonts: (await withBold()) as any }
    )
    expect(await toImage(svg, 400)).toMatchImageSnapshot()
  })

  it('should render a card styled with a stylesheet', async () => {
    const css = `
      .card {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
        height: 100%;
        padding: 24px;
        box-sizing: border-box;
        background: linear-gradient(135deg, #f8fafc, #e2e8f0);
        font-size: 16px;
        color: #0f172a;

        & h1 { margin: 0; font-size: 28px; line-height: 1.2 }
        & ul { display: flex; gap: 8px; margin: 0; padding: 0 }
        & li {
          display: flex;
          padding: 4px 10px;
          border-radius: 999px;
          background: white;
          border: 1px solid #cbd5e1;
          &:nth-child(odd) { background: #0f172a; color: white }
        }
        & p:has(+ footer) { color: #475569; margin: 0 }
        & footer { margin-top: auto; font-size: 14px }
        @media (width < 500px) { & footer { color: #2563eb } }
      }
    `
    const svg = await satori(
      <div className='card'>
        <style>{css}</style>
        <h1>Stylesheets in Satori</h1>
        <ul>
          <li>Selectors</li>
          <li>Nesting</li>
          <li>Cascade</li>
        </ul>
        <p>Parsed by cssparser in WebAssembly.</p>
        <footer>vercel/satori</footer>
      </div>,
      { width: 400, height: 220, fonts }
    )
    expect(await toImage(svg, 400)).toMatchImageSnapshot()
  })
})
