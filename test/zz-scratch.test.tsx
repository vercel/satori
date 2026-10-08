import { it } from 'vitest'
import { initFonts } from './utils.js'
import { sheet } from './zz-compare.js'

let fonts: any
initFonts((f) => (fonts = f))

it('compares', async () => {
  await sheet(
    'lists',
    [
      {
        name: 'l-markers',
        width: 420,
        height: 200,
        element: (
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              'disc',
              'circle',
              'square',
              'decimal',
              'lower-roman',
              'disclosure-closed',
            ].map((t) => (
              <ul
                style={{
                  listStyleType: t,
                  width: 38,
                  paddingLeft: 30,
                  flexShrink: 0,
                }}
              >
                {[12, 16, 20, 27].map((size) => (
                  <li
                    style={{ fontSize: size, counterIncrement: 'list-item 7' }}
                  >
                    <span style={{ color: 'transparent' }}>xx</span>
                  </li>
                ))}
                <li style={{ listStylePosition: 'inside' }}>
                  <span style={{ color: 'transparent' }}>xx</span>
                </li>
              </ul>
            ))}
          </div>
        ),
      },
      {
        name: 'l-basic',
        width: 400,
        height: 260,
        element: (
          <div style={{ display: 'flex', gap: 10 }}>
            <div>
              <ul>
                <li>One</li>
                <li style={{ color: 'red', fontSize: 24 }}>Two</li>
                <li>
                  Three
                  <ul>
                    <li>Nested</li>
                    <li>
                      More
                      <ul>
                        <li>Deep</li>
                      </ul>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
            <div>
              <ol>
                <li>One</li>
                <li>Two</li>
                <li>
                  Three
                  <ol>
                    <li>Nested</li>
                    <li>Nested</li>
                  </ol>
                </li>
              </ol>
              <ol start={9}>
                <li>Nine</li>
                <li>Ten</li>
              </ol>
            </div>
          </div>
        ),
      },
      {
        name: 'l-attrs',
        width: 400,
        height: 230,
        element: (
          <div style={{ display: 'flex', gap: 10 }}>
            <ol reversed>
              <li>A</li>
              <li>B</li>
              <li>C</li>
            </ol>
            <ol reversed start={10}>
              <li>A</li>
              <li>B</li>
            </ol>
            <ol type='a'>
              <li>A</li>
              <li value={5}>B</li>
              <li>C</li>
            </ol>
            <ol type='I'>
              <li>A</li>
              <li>B</li>
              <li>C</li>
              <li>D</li>
            </ol>
            <div style={{ counterReset: 'list-item 3' }}>
              <div
                style={{
                  display: 'list-item',
                  listStyleType: 'decimal',
                  marginLeft: 30,
                }}
              >
                X
              </div>
              <div
                style={{
                  display: 'list-item',
                  listStyleType: 'decimal',
                  marginLeft: 30,
                  counterIncrement: 'list-item 5',
                }}
              >
                Y
              </div>
              <div
                style={{
                  display: 'list-item',
                  listStyleType: 'decimal',
                  marginLeft: 30,
                  counterSet: 'list-item 100',
                }}
              >
                Z
              </div>
            </div>
          </div>
        ),
      },
      {
        name: 'l-types',
        width: 420,
        height: 200,
        element: (
          <div style={{ display: 'flex', flexWrap: 'wrap', paddingLeft: 50 }}>
            {[
              'decimal-leading-zero',
              'lower-roman',
              'upper-alpha',
              'lower-greek',
              'armenian',
              'georgian',
              '"→ "',
              'none',
              'square',
              'circle',
              'disclosure-open',
              'disclosure-closed',
            ].map((t) => (
              <ul
                style={{
                  listStyleType: t,
                  width: 90,
                  margin: 0,
                  padding: 0,
                  marginLeft: 30,
                }}
              >
                <li style={{ counterIncrement: 'list-item 13' }}>
                  {t.slice(0, 7)}
                </li>
              </ul>
            ))}
          </div>
        ),
      },
      {
        name: 'l-inside',
        width: 400,
        height: 230,
        element: (
          <div style={{ display: 'flex', gap: 10 }}>
            <ul style={{ listStylePosition: 'inside', width: 120, padding: 0 }}>
              <li>Inside disc that wraps to a second line</li>
              <li style={{ listStyle: 'decimal inside' }}>Inside decimal</li>
            </ul>
            <ul style={{ width: 140 }}>
              <li>
                <p style={{ margin: 0, color: 'blue', fontSize: 20 }}>
                  Para first
                </p>
                after
              </li>
              <li>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span>flex</span>
                  <span>child</span>
                </div>
              </li>
              <li
                style={{
                  listStyleImage:
                    "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSI2Ij48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNiIgZmlsbD0icmVkIi8+PC9zdmc+')",
                }}
              >
                Image
              </li>
              <li
                style={{
                  listStyle:
                    "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSI2Ij48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNiIgZmlsbD0icmVkIi8+PC9zdmc+') inside",
                }}
              >
                Image in
              </li>
            </ul>
          </div>
        ),
      },
    ],
    { fonts, scale: 2 }
  )
})
