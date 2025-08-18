import {
  buildHighlightMap,
  getHighlightedOptions,
  splitByBreakOpportunities,
} from '../src/utils.js'
import { describe, expect, it } from 'vitest'

function buildHighlightIndices(content: string) {
  const highlights = getHighlightedOptions(content)
  const { words } = splitByBreakOpportunities(content, 'normal')
  return buildHighlightMap(highlights, words)
}

describe('highlight tag handling', () => {
  it('should not throw on dangling [s] without [e]', () => {
    const input = 'Hello [s]world'
    expect(() => buildHighlightIndices(input)).not.toThrow()
  })

  it('should not throw on trailing [e]', () => {
    const input = 'Hello world[e]'
    expect(() => buildHighlightIndices(input)).not.toThrow()
  })

  it('should not throw on blank styled span', () => {
    const input = '[s][e]'
    expect(() => buildHighlightIndices(input)).not.toThrow()
  })

  it('should produce balanced highlight map', () => {
    const input = 'foo [s]bar[e] baz'
    const map = buildHighlightIndices(input)
    expect(Object.keys(map).length).toBeGreaterThan(0)
  })
})
