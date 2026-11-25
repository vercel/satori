/**
 * Text shaping with OpenType features. Text is shaped by HarfRust in the
 * layout engine, see `crates/layout/src/shape.rs`.
 */

import type {
  ShapingDirection,
  ShapingFont,
} from '../crates/layout/pkg/layout.js'

export type { ShapingDirection, ShapingFont }

/**
 * A shaped glyph, positioned in font units.
 */
export interface ShapedGlyph {
  g: number // glyph ID
  cl: number // cluster (UTF-16 index)
  ax: number // advance x
  ay: number // advance y, only set for vertical text
  dx: number // offset x
  dy: number // offset y
}

/**
 * Shapes text into glyphs positioned in font units, with the features of a
 * `font-feature-settings` value, e.g. `"liga" off, "smcp"`. The direction is
 * guessed from the text by default.
 */
export function shapeText(
  font: ShapingFont,
  text: string,
  {
    features = '',
    direction,
  }: { features?: string; direction?: ShapingDirection } = {}
): ShapedGlyph[] {
  if (!text) return []
  // Each field is copied out of the module's memory, which is then freed.
  const shaped = font.shape(text, features, direction)
  const { glyphIds, clusters, xAdvances, yAdvances, xOffsets, yOffsets } =
    shaped
  shaped.free()
  const glyphs: ShapedGlyph[] = new Array(glyphIds.length)
  for (let i = 0; i < glyphs.length; i++) {
    glyphs[i] = {
      g: glyphIds[i],
      cl: clusters[i],
      ax: xAdvances[i],
      ay: yAdvances[i],
      dx: xOffsets[i],
      dy: yOffsets[i],
    }
  }
  return glyphs
}
