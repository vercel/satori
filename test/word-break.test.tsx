import { it, describe, expect } from 'vitest'

import { initFonts, loadDynamicAsset, toImage } from './utils.js'
import satori from '../src/index.js'

describe('word-break', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('normal', () => {
    it('should not break word if possible to wrap', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            fontSize: 24,
            color: 'red',
            wordBreak: 'normal',
          }}
        >
          {'aaaaaa hello'}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )

      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should not break long word', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            fontSize: 24,
            color: 'red',
            wordBreak: 'normal',
          }}
        >
          {'aaaaaaaaaaa hello'}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )

      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  it('should support non-breaking space', async () => {
    const text = `She weighs around blah 50\u00a0kg`
    const svg = await satori(
      <div
        style={{
          color: 'red',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          wordBreak: 'normal',
        }}
      >
        <span>{text}</span>
        <span>{text.replaceAll('\u00A0', ' ')}</span>
      </div>,
      {
        width: 200,
        height: 100,
        fonts,
      }
    )

    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  describe('break-all', () => {
    it('should always break words eagerly', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            fontSize: 24,
            color: 'red',
            wordBreak: 'break-all',
          }}
        >
          {'a fascinating world'}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )

      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('break-word', () => {
    it('should try to wrap words if possible', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            fontSize: 24,
            color: 'red',
            wordBreak: 'break-word',
          }}
        >
          {'aaaaaa world'}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )

      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should break words if cannot fit into one line', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            fontSize: 24,
            color: 'red',
            wordBreak: 'break-word',
          }}
        >
          {'fascinating world'}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )

      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should wrap first and then break long words', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            fontSize: 24,
            color: 'red',
            wordBreak: 'break-word',
          }}
        >
          {'a fascinating world'}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )

      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should not break CJK with word-break: keep-all', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            backgroundColor: '#fff',
            display: 'flex',
          }}
        >
          <div
            style={{
              width: '100%',
              wordBreak: 'keep-all',
            }}
          >
            Hello! 你好! 안녕! こんにちは! Χαίρετε! Hallå!
          </div>
        </div>,
        {
          width: 200,
          height: 200,
          fonts,
          loadAdditionalAsset: (languageCode: string, segment: string) => {
            return loadDynamicAsset(languageCode, segment) as any
          },
        }
      )

      expect(await toImage(svg, 200)).toMatchImageSnapshot()
    })
  })

  describe('overflow-wrap', () => {
    const text =
      'Supercalifragilisticexpialidocious and pneumonoultramicroscopicsilicovolcanoconiosis'
    const box = (
      style: Record<string, string | number>,
      children: any = text
    ) => (
      <div
        style={{
          width: 120,
          background: '#cde',
          fontSize: 13,
          marginBottom: 6,
          ...style,
        }}
      >
        {children}
      </div>
    )

    it('should break words that overflow', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: 4,
            alignItems: 'flex-start',
          }}
        >
          {box({})}
          {box({ overflowWrap: 'break-word' })}
          {box({ overflowWrap: 'anywhere' })}
          {box({ wordWrap: 'break-word' })}
          <div style={{ overflowWrap: 'break-word', width: 120 }}>
            {box({ width: 'auto', background: '#fdc' })}
          </div>
          {box({ overflowWrap: 'break-word' }, [
            'Text ',
            <span style={{ color: 'red' }}>withaspan{text}</span>,
          ])}
        </div>,
        { width: 300, height: 280, fonts }
      )
      expect(await toImage(svg, 300)).toMatchImageSnapshot()
    })

    it('should only break words in min-content sizes with anywhere', async () => {
      const svg = await satori(
        <div style={{ padding: 4 }}>
          {box(
            { width: 'min-content', overflowWrap: 'break-word' },
            'short words and averyverylongword'
          )}
          <div style={{ display: 'flex', width: 80, background: '#eee' }}>
            {box(
              { width: 'auto', overflowWrap: 'break-word' },
              'flexitemwithlongword'
            )}
          </div>
          <div style={{ display: 'flex', width: 80, background: '#eee' }}>
            {box(
              { width: 'auto', overflowWrap: 'anywhere' },
              'flexitemwithlongword'
            )}
          </div>
        </div>,
        { width: 200, height: 120, fonts }
      )
      expect(await toImage(svg, 200)).toMatchImageSnapshot()
    })
  })
})
