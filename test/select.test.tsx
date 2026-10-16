import { it, describe, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { toImage } from './utils.js'
import satori from '../src/index.js'

describe('select', () => {
  let fonts
  beforeAll(async () => {
    const asset = (name: string) =>
      readFile(join(process.cwd(), 'test', 'assets', name))
    fonts = [
      { name: 'Roboto', data: await asset('Roboto-Regular.ttf'), weight: 400 },
      { name: 'Roboto', data: await asset('Roboto-Bold.ttf'), weight: 700 },
    ]
  })

  /** The boxes of the selects with an `id`, and the text they show. */
  const render = async (element: JSX.Element, width = 400, height = 200) => {
    const boxes: Record<string, number[]> = {}
    const shown: Record<string, string> = {}
    let select = ''
    const svg = await satori(element, {
      width,
      height,
      fonts,
      onNodeDetected: (node) => {
        if (node.type === 'select') {
          select = node.props.id
          boxes[select] = [node.width, node.height].map(Math.round)
        } else if (node.type === '::option' && node.height > 0) {
          shown[select] = [shown[select], node.textContent]
            .filter(Boolean)
            .join(', ')
        }
      },
    })
    return { svg, boxes, shown }
  }

  it('should render drop-downs and list boxes like Chrome', async () => {
    const { svg, boxes, shown } = await render(
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          gap: 10,
          padding: 10,
          background: 'white',
        }}
      >
        <select id='plain'>
          <option>Apple</option>
          <option>Banana split</option>
        </select>
        <select id='disabled'>
          <option disabled>Choose</option>
          <option>Apple</option>
        </select>
        <select id='none' style={{ appearance: 'none' }}>
          <option>Apple</option>
          <option>Banana split</option>
        </select>
        <select
          id='styled'
          style={{
            fontSize: 20,
            padding: '4px 8px',
            border: '2px solid #333',
            borderRadius: 8,
          }}
        >
          <option>Styled</option>
        </select>
        <select id='multiple' multiple>
          <option>Apple</option>
          <option selected>Banana</option>
          <option>Cherry</option>
        </select>
        <select id='size' size={3}>
          <option>Apple</option>
          <option>Banana</option>
        </select>
        <select id='group' size={5}>
          <optgroup label='Fruit'>
            <option>Cherry</option>
            <option disabled>Date</option>
          </optgroup>
          <option>Elderberry</option>
        </select>
      </div>
    )
    // The widths of Chrome with Roboto, and its heights, which are 1px
    // shorter for drop-downs, as it rounds the line height of the font.
    expect(boxes).toEqual({
      plain: [92, 20],
      disabled: [64, 20],
      none: [76, 18],
      styled: [91, 38],
      multiple: [51, 70],
      size: [51, 53],
      group: [66, 87],
    })
    expect(shown).toEqual({
      plain: 'Apple',
      disabled: 'Apple',
      none: 'Apple',
      styled: 'Styled',
      multiple: 'Apple, Banana, Cherry',
      size: 'Apple, Banana',
      group: 'Fruit, Cherry, Date, Elderberry',
    })
    expect(await toImage(svg, 400)).toMatchImageSnapshot()
  })

  it('should show the selected option', async () => {
    const { shown } = await render(
      <div style={{ display: 'flex' }}>
        <select id='selected'>
          <option selected>Apple</option>
          <option selected>Banana</option>
          <option>Cherry</option>
        </select>
        <select id='value' value='c'>
          <option value='a'>Apple</option>
          <option value='c'>Cherry</option>
        </select>
        <select id='default' defaultValue='Cherry'>
          <option>Apple</option>
          <option> Cherry </option>
        </select>
        <select id='label'>
          <option label='Label'>Text</option>
        </select>
        <select id='fragment'>
          <>
            <option disabled>Apple</option>
            <option>Banana</option>
          </>
        </select>
        <select id='empty' />
      </div>
    )
    expect(shown).toEqual({
      selected: 'Banana',
      value: 'Cherry',
      default: 'Cherry',
      label: 'Label',
      fragment: 'Banana',
      empty: '',
    })
  })

  it('should not draw the arrow without appearance', async () => {
    const page = (style?: Record<string, string>) => (
      <div style={{ display: 'flex' }}>
        <select style={style}>
          <option>Apple</option>
        </select>
      </div>
    )
    expect((await render(page())).svg).toContain('<image')
    expect((await render(page({ appearance: 'none' }))).svg).not.toContain(
      '<image'
    )
    expect(
      (await render(page({ WebkitAppearance: 'none' }))).svg
    ).not.toContain('<image')
  })
})
