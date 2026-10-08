/**
 * Inline layout: text, inline boxes and atomic inlines, e.g. images and
 * `inline-block` elements, flow together in lines in a block container.
 * https://www.w3.org/TR/css-inline-3/
 *
 * The inline content of a block container is split into paragraphs at its
 * block-level children. Each paragraph is laid out as a leaf, like an
 * anonymous block box.
 */
import type { LayoutContext } from '../layout.js'
import type { SerializedStyle } from '../handler/expand.js'
import type { FontEngine, GlyphBox } from '../font.js'
import type FontLoader from '../font.js'
import type { Locale } from '../language.js'
import { LayoutNode } from '../layout-engine/index.js'
import {
  buildXMLString,
  lengthToNumber,
  segment as segmentText,
  splitByBreakOpportunities,
} from '../utils.js'
import buildText, {
  container as getContainer,
  getTextFillColor,
  getTextStrokeAttributes,
} from '../builder/text.js'
import buildDecoration, {
  getDecorationLines,
  getDecorationThickness,
  getUnderlineY,
} from '../builder/text-decoration.js'
import { buildDropShadow } from '../builder/shadow.js'
import { genMeasurer } from './measurer.js'
import { preprocess, processTextTransform } from './processor.js'
import buildTextNodes from './index.js'
import cssColorParse from 'parse-css-color'

export interface InlineEnv {
  font: FontLoader
  embedFont: boolean
  debug?: boolean
  graphemeImages?: Record<string, string>
  /** Lays out a tree, used for atomic inlines. */
  computeLayout: (root: LayoutNode, options: { width?: number }) => void
}

/** The box of an inline element, which is split into fragments by lines. */
export interface InlineBox {
  style: SerializedStyle
  /** Set when the paragraphs are finalized. */
  fragments: InlineBoxFragment[]
  /** The paragraphs the box is in, split by block-level elements. */
  paragraphs: Paragraph[]
}

/** A fragment of an inline box, relative to its paragraph. */
export interface InlineBoxFragment {
  paragraph: Paragraph
  left: number
  top: number
  width: number
  height: number
  /** Whether the fragment starts or ends the box, with its edges drawn. */
  first: boolean
  last: boolean
}

export interface TextRun {
  content: string
  /** The style of the element the text is in. */
  style: SerializedStyle
  inheritedStyle: SerializedStyle
  locale?: Locale
  id: string
  /** The inline boxes the text is in, from the outermost. */
  boxes: InlineBox[]
}

/** An `inline-block` element or a replaced element, laid out on its own. */
export interface AtomicInline {
  node: LayoutNode
  style: SerializedStyle
  paragraph?: Paragraph
}

type Item =
  | { kind: 'text'; run: TextRun }
  | { kind: 'open'; box: InlineBox; continuation?: boolean }
  | { kind: 'close'; box: InlineBox; continued?: boolean }
  | { kind: 'atomic'; atomic: AtomicInline }
  | { kind: 'break' }

interface Segment {
  item: Item
  /** The text of a text segment, without forced line breaks. */
  text?: string
  width: number
  /** Set by `flow()`. */
  x: number
}

interface Word {
  segments: Segment[]
  /** A forced line break before the word. */
  forceBreak: boolean
  /** Whether lines can be wrapped after the word. */
  canBreakAfter: boolean
  width: number
  /** The width of collapsible spaces at the end, which hang at a line end. */
  trailing: number
}

interface Line {
  words: Word[]
  width: number
  trailing: number
  top: number
  /** The distance of the baseline from the top. */
  baseline: number
  height: number
}

interface AtomicLayout {
  width: number
  marginBoxWidth: number
  marginBoxHeight: number
  /** The distance of the baseline from the top of the margin box. */
  ascent: number
}

interface RunState {
  engine: FontEngine
  measureText: (text: string) => number
  isImage: (s: string) => boolean
  /** The distance the baseline is raised by `vertical-align`. */
  shift: number
}

const COLLAPSIBLE_WHITE_SPACE = ['normal', 'nowrap', 'pre-line']
const PRESERVED_LINE_BREAKS = ['pre', 'pre-wrap', 'pre-line']
const NO_SOFT_WRAP = ['pre', 'nowrap']
const OBJECT_REPLACEMENT = '\uFFFC'
// Metrics of the first available font are those of a space.
const STRUT = ' '

function toNumber(
  value: unknown,
  style: SerializedStyle,
  percentageBase: number
): number {
  if (typeof value === 'number') return value
  if (typeof value !== 'string' || value === 'auto') return 0
  return (
    lengthToNumber(
      value,
      style.fontSize as number,
      percentageBase,
      style as Record<string, any>,
      true
    ) || 0
  )
}

function isFullyTransparent(color: string): boolean {
  if (color === 'transparent') return true
  const parsed = cssColorParse(color)
  return parsed ? parsed.alpha === 0 : false
}

/**
 * Collects the inline content of a block container into paragraphs, in tree
 * order with its block-level children.
 */
export class InlineFormatting {
  private paragraph: Paragraph | null = null
  /** The inline boxes that are open, from the outermost. */
  private open: InlineBox[] = []

  constructor(
    readonly container: LayoutNode,
    readonly style: SerializedStyle,
    readonly env: InlineEnv
  ) {}

  private current() {
    if (!this.paragraph) {
      this.paragraph = new Paragraph(this.style, this.env)
      this.container.insertChild(this.paragraph.node)
      // Boxes split by a block-level element continue in the paragraph.
      for (const box of this.open) {
        this.paragraph.items.push({ kind: 'open', box, continuation: true })
        box.paragraphs.push(this.paragraph)
      }
    }
    return this.paragraph
  }

  addText(run: TextRun) {
    run.boxes = [...this.open]
    const paragraph = this.current()
    paragraph.items.push({ kind: 'text', run })
    return paragraph
  }

  openBox(box: InlineBox) {
    const paragraph = this.current()
    paragraph.items.push({ kind: 'open', box })
    box.paragraphs.push(paragraph)
    this.open.push(box)
  }

  closeBox(box: InlineBox) {
    this.open.pop()
    this.paragraph?.items.push({ kind: 'close', box })
  }

  addAtomic(atomic: AtomicInline) {
    const paragraph = this.current()
    atomic.paragraph = paragraph
    paragraph.items.push({ kind: 'atomic', atomic })
  }

  addBreak() {
    this.current().items.push({ kind: 'break' })
  }

  /** A block-level element ends the paragraph. */
  breakForBlock() {
    if (!this.paragraph) return
    for (let i = this.open.length - 1; i >= 0; i--) {
      this.paragraph.items.push({
        kind: 'close',
        box: this.open[i],
        continued: true,
      })
    }
    this.paragraph = null
  }
}

export class Paragraph {
  readonly node = new LayoutNode()
  readonly items: Item[] = []
  private words: Word[] | null = null
  private lines: Line[] = []
  private runStates = new Map<TextRun, RunState>()
  private atomicLayouts = new Map<AtomicInline, AtomicLayout>()
  private atomicWidth = NaN
  private finalized = false
  /** The pieces of each run, set by `finalize()`. */
  private pieces = new Map<
    TextRun,
    { text: string; x: number; width: number; line: number; baseline: number }[]
  >()
  /** Set when the paragraph is only text of the container. */
  simple?: {
    first: TextRun
    delegate?: ReturnType<typeof buildTextNodes>
  } | null

  constructor(readonly style: SerializedStyle, readonly env: InlineEnv) {
    this.node.measure = (width) => this.measure(width)
    this.node.lastBaseline = (width) => {
      this.flow(width)
      const last = this.lines[this.lines.length - 1]
      return last ? last.top + last.baseline : undefined
    }
  }

  /** Whether the paragraph is only text directly in the container. */
  isSimple() {
    if (this.simple === undefined) {
      const first = this.items[0]
      this.simple =
        first?.kind === 'text' &&
        this.items.every(
          (item) => item.kind === 'text' && item.run.style === this.style
        )
          ? { first: first.run }
          : null
    }
    return !!this.simple
  }

  /** The text of a simple paragraph. */
  get text() {
    return this.items
      .map((item) => (item.kind === 'text' ? item.run.content : ''))
      .join('')
  }

  private engine(style: SerializedStyle, locale?: Locale) {
    return this.env.font.getEngine(
      style.fontSize as number,
      style.lineHeight as any,
      style as any,
      locale
    )
  }

  private runState(run: TextRun): RunState {
    let state = this.runStates.get(run)
    if (!state) {
      const engine = this.engine(run.style, run.locale)
      const { graphemeImages } = this.env
      const isImage = (s: string) =>
        !!(
          graphemeImages &&
          Object.prototype.hasOwnProperty.call(graphemeImages, s) &&
          graphemeImages[s]
        )
      const { measureText } = genMeasurer(engine, isImage, {
        fontSize: run.style.fontSize as number,
        letterSpacing: run.style.letterSpacing as number,
        fontFeatureSettings: run.style.fontFeatureSettings as string,
      })
      let shift = 0
      let parentStyle = this.style
      for (const box of run.boxes) {
        shift += verticalShift(box.style, parentStyle)
        parentStyle = box.style
      }
      state = { engine, measureText, isImage, shift }
      this.runStates.set(run, state)
    }
    return state
  }

  /**
   * Collapses white space across the text of the paragraph, and splits it
   * into words at line break opportunities.
   */
  private prepare() {
    if (this.words) return this.words

    let content = ''
    // The item of each code unit.
    const owners: number[] = []
    const markers = new Map<number, number[]>()
    const collapsible = (index: number) => {
      const item = this.items[owners[index]]
      return (
        item?.kind === 'text' &&
        COLLAPSIBLE_WHITE_SPACE.includes(item.run.style.whiteSpace as string)
      )
    }
    const removeTrailingSpace = () => {
      const last = content.length - 1
      if (content[last] === ' ' && collapsible(last)) {
        content = content.slice(0, -1)
        owners.pop()
      }
    }

    // Spaces are collapsed across inline boxes, and removed at the start.
    let afterCollapsibleSpace = true
    this.items.forEach((item, index) => {
      if (item.kind === 'text') {
        const { style, locale } = item.run
        const whiteSpace = style.whiteSpace as string
        const collapse = COLLAPSIBLE_WHITE_SPACE.includes(whiteSpace)
        let text = processTextTransform(
          item.run.content,
          style.textTransform as string,
          locale
        )
        if (!PRESERVED_LINE_BREAKS.includes(whiteSpace)) {
          text = text.replace(/\n/g, ' ')
        }
        if (collapse) {
          text = text.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n')
        }
        for (let i = 0; i < text.length; i++) {
          const char = text[i]
          if (collapse && char === ' ' && afterCollapsibleSpace) continue
          if (char === '\n') removeTrailingSpace()
          content += char
          owners.push(index)
          afterCollapsibleSpace = (collapse && char === ' ') || char === '\n'
        }
      } else if (item.kind === 'atomic') {
        content += OBJECT_REPLACEMENT
        owners.push(index)
        afterCollapsibleSpace = false
      } else if (item.kind === 'break') {
        removeTrailingSpace()
        content += '\n'
        owners.push(index)
        afterCollapsibleSpace = true
      } else {
        const offset = content.length
        markers.set(offset, [...(markers.get(offset) || []), index])
      }
    })
    removeTrailingSpace()

    // Markers after the removed spaces are at the end.
    for (const offset of [...markers.keys()]) {
      if (offset > content.length) {
        const moved = markers.get(offset)
        markers.delete(offset)
        markers.set(content.length, [
          ...(markers.get(content.length) || []),
          ...moved,
        ])
      }
    }

    const { words: texts, requiredBreaks } = content
      ? splitByBreakOpportunities(content, this.style.wordBreak as string)
      : { words: [] as string[], requiredBreaks: [] as boolean[] }
    if (!texts.length) {
      // Only empty inline boxes.
      texts.push('')
    }

    let offset = 0
    this.words = texts.map((text, index) => {
      const start = offset
      const end = offset + text.length
      offset = end
      const isFirst = index === 0
      const isLast = index === texts.length - 1
      const segments: Segment[] = []

      for (let p = start; p <= end; p++) {
        for (const markerIndex of markers.get(p) || []) {
          const item = this.items[markerIndex]
          // Boxes end in the word before them, and start in the word after.
          const belongs =
            item.kind === 'close'
              ? p > start || isFirst
              : p < end || (isLast && p === end)
          if (belongs) segments.push({ item, width: 0, x: 0 })
        }
        if (p === end) break

        const char = content[p]
        const item = this.items[owners[p]]
        if (item.kind === 'text') {
          if (char === '\n') continue
          const last = segments[segments.length - 1]
          if (last && last.item === item) {
            last.text += char
          } else {
            segments.push({ item, text: char, width: 0, x: 0 })
          }
        } else if (item.kind === 'atomic') {
          segments.push({ item, width: 0, x: 0 })
        }
      }

      // Whether the text before the break opportunity can wrap.
      const lastItem = this.items[owners[end - 1]]
      const whiteSpace =
        lastItem?.kind === 'text'
          ? (lastItem.run.style.whiteSpace as string)
          : (this.style.whiteSpace as string)

      return {
        segments,
        forceBreak: !!requiredBreaks[index],
        canBreakAfter: !NO_SOFT_WRAP.includes(whiteSpace),
        width: 0,
        trailing: 0,
      }
    })
    return this.words
  }

  /** Lays out an atomic inline, which shrinks to fit the width. */
  private layoutAtomic(atomic: AtomicInline, width: number): AtomicLayout {
    const cached = this.atomicLayouts.get(atomic)
    if (cached && this.atomicWidth === width) return cached

    const { node } = atomic
    const { computeLayout } = this.env
    const marginWidth = () =>
      node.layout.width + node.layout.margin.left + node.layout.margin.right
    // Percentages are of the width of the paragraph.
    const isPercentage = [
      node.style.width,
      node.style.minWidth,
      node.style.maxWidth,
    ].some((value) => typeof value === 'string' && value.endsWith('%'))
    computeLayout(node, isPercentage && Number.isFinite(width) ? { width } : {})
    if (!isPercentage && Number.isFinite(width) && marginWidth() > width) {
      computeLayout(node, {
        width: Math.max(
          0,
          width - node.layout.margin.left - node.layout.margin.right
        ),
      })
    }

    const { layout } = node
    const marginBoxHeight =
      layout.height + layout.margin.top + layout.margin.bottom
    // The baseline of the last line, or the bottom margin edge.
    const baseline =
      atomic.style.overflow === 'hidden' ? undefined : findBaseline(node)
    const result: AtomicLayout = {
      width: layout.width,
      marginBoxWidth: marginWidth(),
      marginBoxHeight,
      ascent:
        baseline === undefined ? marginBoxHeight : layout.margin.top + baseline,
    }
    this.atomicLayouts.set(atomic, result)
    return result
  }

  /** Breaks the paragraph into lines that fit the width. */
  private flow(width: number) {
    const words = this.prepare().slice()
    if (this.atomicWidth !== width) {
      this.atomicLayouts.clear()
      this.atomicWidth = width
    }

    const containerWidth = Number.isFinite(width) ? width : 0
    const measureWord = (word: Word) => {
      word.width = 0
      word.trailing = 0
      for (const segment of word.segments) {
        const { item } = segment
        if (item.kind === 'text') {
          const { measureText } = this.runState(item.run)
          segment.width = measureText(segment.text)
          const collapse = COLLAPSIBLE_WHITE_SPACE.includes(
            item.run.style.whiteSpace as string
          )
          const trimmed = segment.text.trimEnd()
          word.trailing =
            collapse && trimmed !== segment.text
              ? segment.width - measureText(trimmed)
              : 0
        } else if (item.kind === 'open') {
          const { style } = item.box
          segment.width = item.continuation
            ? 0
            : toNumber(style.marginLeft, style, containerWidth) +
              ((style.borderLeftWidth as number) || 0) +
              toNumber(style.paddingLeft, style, containerWidth)
        } else if (item.kind === 'close') {
          const { style } = item.box
          segment.width = item.continued
            ? 0
            : toNumber(style.marginRight, style, containerWidth) +
              ((style.borderRightWidth as number) || 0) +
              toNumber(style.paddingRight, style, containerWidth)
        } else if (item.kind === 'atomic') {
          segment.width = this.layoutAtomic(item.atomic, width).marginBoxWidth
          word.trailing = 0
        }
        word.width += segment.width
      }
    }
    words.forEach(measureWord)

    const wordBreak = this.style.wordBreak as string
    const allowBreakWord = ['break-all', 'break-word'].includes(wordBreak)
    // The first line is shorter by the indent.
    const indent = toNumber(this.style.textIndent, this.style, containerWidth)
    const available = () => (lines.length === 1 ? width - indent : width)

    const lines: Line[] = []
    let line: Line | undefined
    let wrapped = false
    let canBreak = false
    const newLine = (): Line => {
      const created: Line = {
        words: [],
        width: 0,
        trailing: 0,
        top: 0,
        baseline: 0,
        height: 0,
      }
      lines.push(created)
      return created
    }

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      if (!line || (i > 0 && word.forceBreak)) {
        line = newLine()
      } else if (
        line.words.length &&
        canBreak &&
        line.width + word.width - word.trailing > available() + 1e-3
      ) {
        line = newLine()
        wrapped = true
      }

      // Break a word that doesn't fit on a line between its characters.
      if (
        allowBreakWord &&
        !line.words.length &&
        word.width - word.trailing > available() + 1e-3
      ) {
        const parts = splitWord(word)
        if (parts.length > 1) {
          parts.forEach(measureWord)
          words.splice(i, 1, ...parts)
          i--
          continue
        }
      }

      line.words.push(word)
      line.width += word.width
      line.trailing = word.trailing
      canBreak = word.canBreakAfter
    }

    // Line heights include the strut of the container.
    const strut = this.engine(this.style)
    const strutAscent = Math.round(strut.baseline(STRUT))
    const strutDescent = Math.round(strut.height(STRUT)) - strutAscent
    const textAlign = this.style.textAlign as string

    let top = 0
    let maxWidth = 0
    lines.forEach((current, index) => {
      let ascent = strutAscent
      let descent = strutDescent
      // Atomic inlines aligned to the top or bottom of the line box.
      const lineAligned: { ascent: number; height: number; top: boolean }[] = []
      for (const word of current.words) {
        for (const segment of word.segments) {
          const { item } = segment
          if (item.kind === 'text' && segment.text) {
            const { engine, shift } = this.runState(item.run)
            const a = Math.round(engine.baseline(segment.text))
            const d = Math.round(engine.height(segment.text)) - a
            ascent = Math.max(ascent, a + shift)
            descent = Math.max(descent, d - shift)
          } else if (item.kind === 'atomic') {
            const atomic = this.layoutAtomic(item.atomic, width)
            const align = this.atomicAlignment(item.atomic, atomic, strut)
            if (align.lineRelative) {
              lineAligned.push({
                ascent: atomic.ascent,
                height: atomic.marginBoxHeight,
                top: align.lineRelative === 'top',
              })
            } else {
              ascent = Math.max(ascent, align.ascent)
              descent = Math.max(descent, align.descent)
            }
          }
        }
      }
      for (const aligned of lineAligned) {
        if (aligned.height > ascent + descent) {
          if (aligned.top) descent = aligned.height - ascent
          else ascent = aligned.height - descent
        }
      }

      current.top = top
      current.baseline = ascent
      current.height = ascent + descent
      top += current.height

      // Align the line.
      const lineWidth = current.width - current.trailing
      maxWidth = Math.max(maxWidth, lineWidth + (index === 0 ? indent : 0))
      let x = index === 0 ? indent : 0
      let gap = 0
      if (Number.isFinite(width)) {
        const remaining = width - lineWidth - x
        if (textAlign === 'right' || textAlign === 'end') {
          x += remaining
        } else if (textAlign === 'center') {
          x += remaining / 2
        } else if (
          textAlign === 'justify' &&
          index < lines.length - 1 &&
          !lines[index + 1].words[0]?.forceBreak &&
          current.words.length > 1
        ) {
          gap = remaining / (current.words.length - 1)
        }
        if (this.env.embedFont) x = Math.round(x)
      }
      current.words.forEach((word, wordIndex) => {
        for (const segment of word.segments) {
          segment.x = x
          x += segment.width
        }
        if (wordIndex < current.words.length - 1) x += gap
      })
    })

    this.lines = lines
    return {
      width: Math.max(maxWidth, wrapped ? width : 0),
      height: top,
    }
  }

  /** The vertical position of an atomic inline relative to the baseline. */
  private atomicAlignment(
    atomic: AtomicInline,
    layout: AtomicLayout,
    strut: FontEngine
  ): { ascent: number; descent: number; lineRelative?: 'top' | 'bottom' } {
    const { ascent, marginBoxHeight: height } = layout
    const align = atomic.style.verticalAlign
    const fontSize = this.style.fontSize as number
    switch (align) {
      case 'middle': {
        // The middle is aligned to the baseline plus half the x-height.
        const middle = fontSize * 0.25
        return {
          ascent: height / 2 + middle,
          descent: height / 2 - middle,
        }
      }
      case 'text-top': {
        const a = strut.ascent(STRUT)
        return { ascent: a, descent: height - a }
      }
      case 'text-bottom': {
        const d = strut.descent(STRUT)
        return { ascent: height - d, descent: d }
      }
      case 'top':
      case 'bottom':
        return { ascent, descent: height - ascent, lineRelative: align }
      default: {
        const shift = verticalShift(atomic.style, this.style)
        return { ascent: ascent + shift, descent: height - ascent - shift }
      }
    }
  }

  measure(width: number) {
    if (this.simple?.delegate) {
      // Measured by the delegate.
      return { width: 0, height: 0 }
    }
    const { width: measuredWidth, height } = this.flow(width)
    const first = this.lines[0]
    const last = this.lines[this.lines.length - 1]
    return {
      // Round up, so that rounding the layout doesn't make the text wrap.
      width: Math.ceil(measuredWidth - 1e-3),
      height,
      firstBaseline: first ? first.top + first.baseline : undefined,
      lastBaseline: last ? last.top + last.baseline : undefined,
    }
  }

  /**
   * Lays out the paragraph with its final width, and positions its pieces,
   * inline box fragments and atomic inlines.
   */
  finalize() {
    if (this.finalized) return
    this.finalized = true

    const { width } = this.node.layout
    this.flow(width)
    this.pieces.clear()

    const open: InlineBox[] = []
    const fragmentStart = new Map<InlineBox, { x: number; first: boolean }>()
    const containerWidth = width

    const addFragment = (
      box: InlineBox,
      line: Line,
      right: number,
      last: boolean
    ) => {
      const start = fragmentStart.get(box)
      const { style } = box
      const engine = this.engine(style)
      const ascent = engine.ascent(STRUT)
      const descent = engine.descent(STRUT)
      const shift = this.boxShift(box)
      const baseline = line.top + line.baseline - shift
      const paddingTop = toNumber(style.paddingTop, style, containerWidth)
      const paddingBottom = toNumber(style.paddingBottom, style, containerWidth)
      const top =
        baseline - ascent - paddingTop - ((style.borderTopWidth as number) || 0)
      const bottom =
        baseline +
        descent +
        paddingBottom +
        ((style.borderBottomWidth as number) || 0)
      box.fragments.push({
        paragraph: this,
        left: start.x,
        top,
        width: Math.max(0, right - start.x),
        height: bottom - top,
        first: start.first,
        last,
      })
    }

    for (const line of this.lines) {
      const lineStart = line.words[0]?.segments[0]?.x ?? 0
      for (const box of open)
        fragmentStart.set(box, { x: lineStart, first: false })
      let x = lineStart

      for (const word of line.words) {
        for (const segment of word.segments) {
          const { item } = segment
          if (item.kind === 'open') {
            open.push(item.box)
            const { style } = item.box
            fragmentStart.set(item.box, {
              x:
                segment.x +
                (item.continuation
                  ? 0
                  : toNumber(style.marginLeft, style, containerWidth)),
              first: !item.continuation,
            })
          } else if (item.kind === 'close') {
            const { style } = item.box
            addFragment(
              item.box,
              line,
              segment.x +
                segment.width -
                (item.continued
                  ? 0
                  : toNumber(style.marginRight, style, containerWidth)),
              !item.continued
            )
            open.splice(open.lastIndexOf(item.box), 1)
          } else if (item.kind === 'text' && segment.text) {
            const { shift } = this.runState(item.run)
            const pieces = this.pieces.get(item.run) || []
            pieces.push({
              text: segment.text,
              x: segment.x,
              width: segment.width,
              line: this.lines.indexOf(line),
              baseline: line.top + line.baseline - shift,
            })
            this.pieces.set(item.run, pieces)
          } else if (item.kind === 'atomic') {
            const atomic = this.layoutAtomic(item.atomic, width)
            const strut = this.engine(this.style)
            const align = this.atomicAlignment(item.atomic, atomic, strut)
            const marginTop = align.lineRelative
              ? align.lineRelative === 'top'
                ? line.top
                : line.top + line.height - atomic.marginBoxHeight
              : line.top + line.baseline - align.ascent
            const { layout } = item.atomic.node
            layout.left = this.node.layout.left + segment.x + layout.margin.left
            layout.top = this.node.layout.top + marginTop + layout.margin.top
          }
          x = segment.x + segment.width
        }
      }

      // Boxes that continue on the next line.
      for (const box of open) addFragment(box, line, x - line.trailing, false)
    }
  }

  /** The distance the baseline of an inline box is raised. */
  private boxShift(box: InlineBox) {
    let shift = 0
    for (const item of this.items) {
      if (item.kind === 'text' && item.run.boxes.includes(box)) {
        // The shift of the box itself, without the boxes inside it.
        const index = item.run.boxes.indexOf(box)
        let parentStyle = this.style
        for (let i = 0; i <= index; i++) {
          shift += verticalShift(item.run.boxes[i].style, parentStyle)
          parentStyle = item.run.boxes[i].style
        }
        return shift
      }
    }
    return 0
  }

  /** Draws the text of a run, with the offset of the container. */
  renderRun(run: TextRun, x: number, y: number) {
    this.finalize()
    const pieces = this.pieces.get(run)
    // Hidden text takes up space, but isn't drawn.
    if (!pieces?.length || run.style.visibility === 'hidden') return ''

    const { style, inheritedStyle, id } = run
    const { engine, isImage } = this.runState(run)
    const { embedFont, debug, graphemeImages } = this.env
    const left = x + this.node.layout.left
    const top = y + this.node.layout.top
    const fontSize = style.fontSize as number
    const letterSpacing = style.letterSpacing as number
    const fontFeatureSettings = style.fontFeatureSettings as string
    const clipPathId = inheritedStyle._inheritedClipPathId as string | undefined
    const maskId = inheritedStyle._inheritedMaskId as string | undefined
    const fillColor = getTextFillColor(style)
    const { matrix } = getContainer(
      {
        left: this.node.layout.left,
        top: this.node.layout.top,
        width: this.node.layout.width,
        height: this.node.layout.height,
        isInheritingTransform: true,
      },
      style
    )

    let filter = ''
    if (style.textShadowOffset) {
      filter = buildXMLString(
        'defs',
        {},
        buildDropShadow(
          {
            width: this.node.layout.width,
            height: this.node.layout.height,
            id,
          },
          {
            shadowColor: style.textShadowColor,
            shadowOffset: style.textShadowOffset,
            shadowRadius: style.textShadowRadius,
          },
          isFullyTransparent(fillColor)
        )
      )
    }

    const decorationLines = getDecorationLines(style)
    const skipInk =
      decorationLines.includes('underline') &&
      (style.textDecorationSkipInk || 'auto') !== 'none'
    const thickness = getDecorationThickness(style)

    let path = ''
    let elements = ''
    const decorations: {
      left: number
      right: number
      top: number
      ascender: number
      glyphBoxes: GlyphBox[]
    }[] = []

    // Pieces on the same line are drawn together, for kerning.
    const merged: typeof pieces = []
    for (const piece of pieces) {
      const last = merged[merged.length - 1]
      if (
        last &&
        last.line === piece.line &&
        Math.abs(last.x + last.width - piece.x) < 1e-3
      ) {
        merged.push({
          ...last,
          text: last.text + piece.text,
          width: last.width + piece.width,
        })
        merged.splice(merged.length - 2, 1)
      } else {
        merged.push({ ...piece })
      }
    }

    for (const piece of merged) {
      const baseline = top + piece.baseline
      const ascender = engine.baseline(piece.text)
      const glyphTop = baseline - ascender
      const band = skipInk
        ? {
            underlineY: glyphTop + getUnderlineY(style, ascender, thickness),
            strokeWidth: thickness,
          }
        : undefined

      let glyphBoxes: GlyphBox[] = []
      let pieceX = left + piece.x
      // Images of graphemes, e.g. emoji, are drawn as images.
      const parts: string[] = []
      for (const word of segmentText(piece.text, 'word')) {
        if (isImage(word) || !embedFont) {
          parts.push(word)
        } else if (parts.length && !isImage(parts[parts.length - 1])) {
          parts[parts.length - 1] += word
        } else {
          parts.push(word)
        }
      }

      for (const [partIndex, part] of parts.entries()) {
        const partWidth = isImage(part)
          ? fontSize
          : engine.measure(part, {
              fontSize,
              letterSpacing,
              fontFeatureSettings,
            })
        if (isImage(part) || !embedFont) {
          if (part.trim() || isImage(part)) {
            const [element] = buildText(
              {
                content: part,
                filter,
                id,
                left: pieceX,
                top: isImage(part) ? glyphTop : glyphTop + ascender,
                width: partWidth,
                height: engine.height(part),
                matrix,
                image: isImage(part) ? graphemeImages[part] : null,
                clipPathId,
                debug,
                shape: false,
              },
              style as any
            )
            elements += element
          }
        } else {
          const svg = engine.getSVG(
            part,
            {
              fontSize,
              left: pieceX,
              top: baseline,
              letterSpacing,
              fontFeatureSettings,
            },
            band
          )
          path += svg.path + ' '
          if (band && svg.boxes) glyphBoxes = glyphBoxes.concat(svg.boxes)
        }
        // Letter spacing is between graphemes, also across parts.
        pieceX +=
          partWidth + (partIndex < parts.length - 1 ? letterSpacing || 0 : 0)
      }

      if (decorationLines.length) {
        const last = decorations[decorations.length - 1]
        if (
          last &&
          Math.abs(last.right - (left + piece.x)) < 1e-3 &&
          last.top === glyphTop
        ) {
          last.right = left + piece.x + piece.width
          last.glyphBoxes.push(...glyphBoxes)
        } else {
          decorations.push({
            left: left + piece.x,
            right: left + piece.x + piece.width,
            top: glyphTop,
            ascender,
            glyphBoxes,
          })
        }
      }
    }

    const decorationShape = decorations
      .map((decoration) =>
        buildDecoration(
          {
            left: decoration.left,
            top: decoration.top,
            width: decoration.right - decoration.left,
            ascender: decoration.ascender,
            clipPathId,
            matrix,
            glyphBoxes: decoration.glyphBoxes,
          },
          style
        )
      )
      .join('')

    const strokeAttributes = getTextStrokeAttributes(style)
    const shape = path
      ? !isFullyTransparent(fillColor) || strokeAttributes.stroke || filter
        ? buildXMLString('path', {
            fill: filter && isFullyTransparent(fillColor) ? 'black' : fillColor,
            d: path,
            transform: matrix || undefined,
            ...strokeAttributes,
          })
        : ''
      : ''
    let result =
      buildXMLString(
        'g',
        {
          mask: maskId ? `url(#${maskId})` : undefined,
          'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
        },
        shape
      ) +
      elements +
      decorationShape
    if (filter) {
      result =
        filter + buildXMLString('g', { filter: `url(#satori_s-${id})` }, result)
    }

    const textOpacity = (style._textOpacity as number | undefined) ?? 1
    if (textOpacity < 1) {
      result = buildXMLString('g', { opacity: textOpacity }, result)
    }

    // The text clips the background of an element with `background-clip:
    // text`.
    const clipText = style._inheritedBackgroundClipTextPath as unknown as
      | { value: string }
      | undefined
    if (clipText && path) {
      clipText.value += buildXMLString('path', {
        d: path,
        transform: matrix || undefined,
      })
    }
    return result
  }
}

/**
 * The distance `vertical-align` raises the baseline of an inline box, for
 * values relative to the parent's baseline.
 */
function verticalShift(style: SerializedStyle, parentStyle: SerializedStyle) {
  const align = style.verticalAlign
  const parentFontSize = parentStyle.fontSize as number
  if (align === 'sub') return -parentFontSize * 0.2
  if (align === 'super') return parentFontSize * 0.34
  if (typeof align === 'number') return align
  if (typeof align === 'string' && /^-?[\d.]/.test(align)) {
    const lineHeight =
      typeof style.lineHeight === 'number'
        ? (style.lineHeight as number) * (style.fontSize as number)
        : (style.fontSize as number) * 1.2
    return toNumber(align, style, lineHeight)
  }
  return 0
}

/** Splits a word into its graphemes, keeping the inline box boundaries. */
function splitWord(word: Word): Word[] {
  const words: Word[] = []
  let current: Segment[] = []
  const flush = () => {
    if (current.length) {
      words.push({
        segments: current,
        forceBreak: false,
        canBreakAfter: true,
        width: 0,
        trailing: 0,
      })
      current = []
    }
  }
  for (const segment of word.segments) {
    if (segment.item.kind === 'text') {
      for (const grapheme of segmentGraphemes(segment.text)) {
        current.push({ item: segment.item, text: grapheme, width: 0, x: 0 })
        flush()
      }
    } else if (segment.item.kind === 'open') {
      current.push({ ...segment })
    } else {
      // Close markers and atomic inlines stay with the previous grapheme.
      const last = words[words.length - 1]
      if (segment.item.kind === 'close' && last && !current.length) {
        last.segments.push({ ...segment })
      } else {
        current.push({ ...segment })
        if (segment.item.kind === 'atomic') flush()
      }
    }
  }
  flush()
  if (words.length) {
    words[0].forceBreak = word.forceBreak
    words[words.length - 1].canBreakAfter = word.canBreakAfter
  }
  return words
}

function segmentGraphemes(text: string) {
  return segmentText(text, 'grapheme')
}

/**
 * The baseline of the last line box in the normal flow of a node, relative
 * to its top, if it has one.
 */
function findBaseline(node: LayoutNode): number | undefined {
  if (node.lastBaseline) {
    return node.lastBaseline(node.layout.width)
  }
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i]
    if (
      child.style.position === 'absolute' ||
      child.style.display === 'none' ||
      child.style.display === 'contents'
    ) {
      continue
    }
    const baseline = findBaseline(child)
    if (baseline !== undefined) return child.layout.top + baseline
  }
  return undefined
}

/**
 * Text in a block container. It's drawn by its paragraph, or by the text
 * engine for paragraphs of the container's text only.
 */
export async function* buildInlineText(
  content: string,
  context: LayoutContext
): AsyncGenerator<{ word: string; locale?: Locale }[], string, [any, any]> {
  const {
    parentStyle,
    inheritedStyle,
    font,
    locale,
    canLoadAdditionalAssets,
    id,
  } = context
  const run: TextRun = {
    content,
    style: parentStyle,
    inheritedStyle,
    locale,
    id,
    boxes: [],
  }
  const paragraph = context.inline.addText(run)

  // Yield segments that are missing a font.
  const engine = font.getEngine(
    parentStyle.fontSize as number,
    parentStyle.lineHeight as any,
    parentStyle as any,
    locale
  )
  const { processedContent } = preprocess(content, parentStyle, locale)
  yield canLoadAdditionalAssets
    ? segmentText(processedContent, 'grapheme')
        .filter((word) => word !== '\t' && !engine.has(word))
        .map((word) => ({ word, locale }))
    : []

  // A paragraph of the container's text only is laid out by the text engine.
  let delegate: ReturnType<typeof buildTextNodes> | undefined
  if (paragraph.isSimple() && paragraph.simple.first === run) {
    delegate = buildTextNodes(paragraph.text, {
      ...context,
      parent: context.inline.container,
      textNode: paragraph.node,
      blockParagraph: true,
    })
    paragraph.simple.delegate = delegate
    await delegate.next()
    await delegate.next()
  }

  const [x, y] = yield
  if (paragraph.isSimple()) {
    return delegate ? ((await delegate.next([x, y])).value as string) : ''
  }
  return paragraph.renderRun(run, x, y)
}
