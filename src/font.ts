/**
 * This class handles everything related to fonts.
 */
import opentype from '@shuding/opentype.js'
import * as typr from '@fredli74/typr'

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
type WeigthName = 'normal' | 'bold'
type Style = 'normal' | 'italic'

export interface FontOptions {
  data: Buffer | ArrayBuffer
  name: string
  weight?: Weight
  style?: Style
}

function measure(font: typr.Font, str) {
  const kern = font['kern']
  const aWidth = font['hmtx'].aWidth

  var getGlyphPosition = function (gls, i1) {
    var g1 = gls[i1],
      g2 = gls[i1 + 1]
    if (kern) {
      var ind1 = kern.glyph1.indexOf(g1)
      if (ind1 != -1) {
        var ind2 = kern.rval[ind1].glyph2.indexOf(g2)
        if (ind2 != -1) return kern.rval[ind1].vals[ind2]
      }
    }
    //console.log("no kern");
    return 0
  }

  var gls = []
  for (var i = 0; i < str.length; i++) {
    var cc = str.codePointAt(i)
    if (cc > 0xffff) i++
    gls.push(font.codeToGlyph(cc))
  }

  var x = 0
  for (var i = 0; i < gls.length; i++) {
    var gid = gls[i]
    var ax = aWidth[gid] + (kern ? getGlyphPosition(gls, i) : 0)
    x += ax
  }
  return x
}

export default class FontLoader {
  defaultFont: opentype.Font
  fonts = new Map<string, [opentype.Font, Weight?, Style?][]>()
  constructor(fontOptions: FontOptions[]) {
    for (const fontOption of fontOptions) {
      const data = fontOption.data
      // const font = opentype.parse(
      //   // Buffer to ArrayBuffer.
      //   'buffer' in data
      //     ? data.buffer.slice(
      //         data.byteOffset,
      //         data.byteOffset + data.byteLength
      //       )
      //     : data,
      //   // @ts-ignore
      //   { lowMemory: true }
      // )
      const font = new typr.Font(
        // Buffer to ArrayBuffer.
        'buffer' in data
          ? data.buffer.slice(
              data.byteOffset,
              data.byteOffset + data.byteLength
            )
          : data,
        // @ts-ignore
        { lowMemory: true }
      ) as any

      // We use the first font as the default font fallback.
      if (!this.defaultFont) this.defaultFont = font

      if (!this.fonts.has(fontOption.name)) {
        this.fonts.set(fontOption.name, [])
      }
      this.fonts
        .get(fontOption.name)
        .push([font, fontOption.weight, fontOption.style])
    }
  }

  // Get font by name and weight.
  private get({
    name,
    weight,
    style,
  }: {
    name: string
    weight: Weight | WeigthName
    style: Style
  }) {
    if (!this.fonts.has(name)) {
      return this.defaultFont
    }

    if (weight === 'normal') weight = 400
    if (weight === 'bold') weight = 700

    // Fallback to the closest weight and style according to the strategy here:
    // https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#fallback_weights
    const fonts = [...this.fonts.get(name)]
    fonts.sort(([_, weight1, style1], [__, weight2, style2]) => {
      if (weight1 !== weight2) {
        // Put the defined weight first.
        if (!weight1) return 1
        if (!weight2) return -1

        // Exact match.
        if (weight1 === weight) return -1
        if (weight2 === weight) return 1

        // 400 and 500.
        if (weight === 400 && weight1 === 500) return -1
        if (weight === 500 && weight1 === 400) return -1
        if (weight === 400 && weight2 === 500) return 1
        if (weight === 500 && weight2 === 400) return 1

        // Less than 400.
        if (weight < 400) {
          if (weight1 < weight && weight2 < weight) return weight2 - weight1
          if (weight1 < weight) return -1
          if (weight2 < weight) return 1
          return weight1 - weight2
        }

        // Greater than 500.
        if (weight < weight1 && weight < weight2) return weight1 - weight2
        if (weight < weight1) return -1
        if (weight < weight2) return 1
        return weight2 - weight1
      }

      if (style1 !== style2) {
        // Exact match.
        if (style1 === style) return -1
        if (style2 === style) return 1
      }

      return -1
    })
    return fonts[0][0]
  }

  public getFont({
    fontFamily,
    fontWeight = 400,
    fontStyle = 'normal',
  }: {
    fontFamily: string
    fontWeight?: Weight | WeigthName
    fontStyle?: Style
  }) {
    return this.get({
      name: fontFamily,
      weight: fontWeight,
      style: fontStyle,
    })
  }

  public measure(
    font: opentype.Font,
    content: string,
    {
      fontSize,
      letterSpacing = 0,
    }: {
      fontSize: number
      letterSpacing: number
    }
  ) {
    // console.log(font.charToGlyphIndex('✅') !== 0)
    return (
      (measure(font as any, content) /
        (font as unknown as typr.Font).head.unitsPerEm) *
      fontSize
    )

    return font.getAdvanceWidth(content, fontSize, {
      letterSpacing: letterSpacing / fontSize,
    })
  }

  public getSVG(
    font: opentype.Font,
    content: string,
    {
      fontSize,
      top,
      left,
      letterSpacing = 0,
    }: {
      fontSize: number
      top: number
      left: number
      letterSpacing: number
    }
  ) {
    const f = font as unknown as typr.Font
    const p = f.glyphsToPath(f.stringToGlyphs(content))
    const r = fontSize / f.head.unitsPerEm
    p.crds = p.crds.map(
      (v, i) => v * r * (i & 1 ? -1 : 1) + (i & 1 ? top : left)
    )
    return f.pathToSVG(p)

    return font
      .getPath(content, left, top, fontSize, {
        letterSpacing: letterSpacing / fontSize,
      })
      .toPathData(1)
  }
}
