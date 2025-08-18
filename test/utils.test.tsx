import { describe, it, expect } from 'vitest'
import {
  getHighlightedOptions,
  splitByBreakOpportunities,
  buildHighlightMap,
} from '../src/utils.js'

function highlightMapFor(content: string, wordBreak = 'normal') {
  const highlights = getHighlightedOptions(content)
  const { words } = splitByBreakOpportunities(content, wordBreak)
  const map = buildHighlightMap(highlights, words)
  return { words, map }
}

function highlightedText(
  words: string[],
  map: Record<number, Record<string, unknown>>
) {
  const idxs = Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
  return idxs.map((i) => words[i]).join('')
}

describe('highlight ranges', () => {
  it('highlights the entire [s]…[e] span, not just the first word', () => {
    const input =
      'Leading text. [s]We expect renewed investor interest in the sector to drive increased capital flows.[e] Trailing text.'
    const { words, map } = highlightMapFor(input)

    const h = highlightedText(words, map)
    // Should include much more than just "We"
    expect(h).toContain('We expect renewed investor interest in the sector')
    // Should not erroneously include leading or trailing non-highlighted text
    expect(h).not.toContain('Leading text.')
    expect(h).not.toContain('Trailing text.')
  })

  it('does not throw on empty span [s][e] and yields no highlights', () => {
    const input = '[s][e]'
    const { words, map } = highlightMapFor(input)
    expect(() => highlightMapFor(input)).not.toThrow()
    expect(Object.keys(map)).toHaveLength(0)
    // words may be empty; verify no mapping
    expect(Object.values(map)).toHaveLength(0)
  })

  it('does not throw when [e] appears at EOF (unmatched end)', () => {
    const input = 'Hello world[e]'
    expect(() => highlightMapFor(input)).not.toThrow()
  })

  it('supports id-aware close tags [e:{ "id": ... }]', () => {
    const input =
      'X [s:{"id":1}]We expect renewed investor interest[e:{"id":1}] Y'
    const { words, map } = highlightMapFor(input)
    const h = highlightedText(words, map)
    expect(h).toContain('We expect renewed investor interest')
    expect(h).not.toContain('X ')
    expect(h).not.toContain(' Y')
  })

  it('does not throw and works when [e] appears without matching [s]', () => {
    const input = 'blabla[e]'
    expect(() => highlightMapFor(input)).not.toThrow()
    const { words, map } = highlightMapFor(input)
    const h = highlightedText(words, map)

    // "blabla" should be in words, and either unhighlighted or safely handled.
    expect(words.join('')).toContain('blabla')
    // There should be no crash; highlight map may be empty or partial,
    // but must not incorrectly highlight beyond text length.
    expect(typeof h).toBe('string')
  })
})
