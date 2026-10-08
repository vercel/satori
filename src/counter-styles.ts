/**
 * The predefined counter styles of CSS Counter Styles, used by list markers.
 *
 * @see https://www.w3.org/TR/css-counter-styles-3/#predefined-counters
 */

interface CounterStyle {
  system: 'cyclic' | 'numeric' | 'alphabetic' | 'additive'
  symbols?: string[]
  additiveSymbols?: [weight: number, symbol: string][]
  range?: [min: number, max: number]
  suffix?: string
  /** The minimum length, padded with the first symbol. */
  pad?: number
}

const chars = (value: string) => Array.from(value)

const numeric = (digits: string, suffix?: string): CounterStyle => ({
  system: 'numeric',
  symbols: chars(digits),
  suffix,
})

const alphabetic = (letters: string, suffix?: string): CounterStyle => ({
  system: 'alphabetic',
  symbols: chars(letters),
  suffix,
})

/** Additive symbols from a list of `weight symbol` pairs. */
const additive = (range: [number, number], pairs: string): CounterStyle => {
  const tokens = pairs.trim().split(/\s+/)
  const additiveSymbols: [number, string][] = []
  for (let i = 0; i < tokens.length; i += 2) {
    additiveSymbols.push([Number(tokens[i]), tokens[i + 1]])
  }
  return { system: 'additive', additiveSymbols, range }
}

const ROMAN =
  '1000 M 900 CM 500 D 400 CD 100 C 90 XC 50 L 40 XL 10 X 9 IX 5 V 4 IV 1 I'

const UPPER_ARMENIAN =
  '9000 Ք 8000 Փ 7000 Ւ 6000 Ց 5000 Ր 4000 Տ 3000 Վ 2000 Ս 1000 Ռ 900 Ջ 800 Պ 700 Չ 600 Ո 500 Շ 400 Ն 300 Յ 200 Մ 100 Ճ 90 Ղ 80 Ձ 70 Հ 60 Կ 50 Ծ 40 Խ 30 Լ 20 Ի 10 Ժ 9 Թ 8 Ը 7 Է 6 Զ 5 Ե 4 Դ 3 Գ 2 Բ 1 Ա'

const LOWER_ARMENIAN =
  '9000 ք 8000 փ 7000 ւ 6000 ց 5000 ր 4000 տ 3000 վ 2000 ս 1000 ռ 900 ջ 800 պ 700 չ 600 ո 500 շ 400 ն 300 յ 200 մ 100 ճ 90 ղ 80 ձ 70 հ 60 կ 50 ծ 40 խ 30 լ 20 ի 10 ժ 9 թ 8 ը 7 է 6 զ 5 ե 4 դ 3 գ 2 բ 1 ա'

const GEORGIAN =
  '10000 ჵ 9000 ჰ 8000 ჯ 7000 ჴ 6000 ხ 5000 ჭ 4000 წ 3000 ძ 2000 ც 1000 ჩ 900 შ 800 ყ 700 ღ 600 ქ 500 ფ 400 ჳ 300 ტ 200 ს 100 რ 90 ჟ 80 პ 70 ო 60 ჲ 50 ნ 40 მ 30 ლ 20 კ 10 ი 9 თ 8 ჱ 7 ზ 6 ვ 5 ე 4 დ 3 გ 2 ბ 1 ა'

const HEBREW =
  '10000 י׳ 9000 ט׳ 8000 ח׳ 7000 ז׳ 6000 ו׳ 5000 ה׳ 4000 ד׳ 3000 ג׳ 2000 ב׳ 1000 א׳ 400 ת 300 ש 200 ר 100 ק 90 צ 80 פ 70 ע 60 ס 50 נ 40 מ 30 ל 20 כ 19 יט 18 יח 17 יז 16 טז 15 טו 10 י 9 ט 8 ח 7 ז 6 ו 5 ה 4 ד 3 ג 2 ב 1 א'

const CJK_SUFFIX = '、'

const COUNTER_STYLES: Record<string, CounterStyle> = {
  disc: { system: 'cyclic', symbols: ['•'], suffix: ' ' },
  circle: { system: 'cyclic', symbols: ['◦'], suffix: ' ' },
  square: { system: 'cyclic', symbols: ['▪'], suffix: ' ' },
  'disclosure-open': { system: 'cyclic', symbols: ['▾'], suffix: ' ' },
  'disclosure-closed': { system: 'cyclic', symbols: ['▸'], suffix: ' ' },

  decimal: numeric('0123456789'),
  'decimal-leading-zero': { ...numeric('0123456789'), pad: 2 },
  'arabic-indic': numeric('٠١٢٣٤٥٦٧٨٩'),
  bengali: numeric('০১২৩৪৫৬৭৮৯'),
  cambodian: numeric('០១២៣៤៥៦៧៨៩'),
  khmer: numeric('០១២៣៤៥៦៧៨៩'),
  'cjk-decimal': numeric('〇一二三四五六七八九', CJK_SUFFIX),
  devanagari: numeric('०१२३४५६७८९'),
  gujarati: numeric('૦૧૨૩૪૫૬૭૮૯'),
  gurmukhi: numeric('੦੧੨੩੪੫੬੭੮੯'),
  kannada: numeric('೦೧೨೩೪೫೬೭೮೯'),
  lao: numeric('໐໑໒໓໔໕໖໗໘໙'),
  malayalam: numeric('൦൧൨൩൪൫൬൭൮൯'),
  mongolian: numeric('᠐᠑᠒᠓᠔᠕᠖᠗᠘᠙'),
  myanmar: numeric('၀၁၂၃၄၅၆၇၈၉'),
  oriya: numeric('୦୧୨୩୪୫୬୭୮୯'),
  persian: numeric('۰۱۲۳۴۵۶۷۸۹'),
  tamil: numeric('௦௧௨௩௪௫௬௭௮௯'),
  telugu: numeric('౦౧౨౩౪౫౬౭౮౯'),
  thai: numeric('๐๑๒๓๔๕๖๗๘๙'),
  tibetan: numeric('༠༡༢༣༤༥༦༧༨༩'),

  'lower-alpha': alphabetic('abcdefghijklmnopqrstuvwxyz'),
  'lower-latin': alphabetic('abcdefghijklmnopqrstuvwxyz'),
  'upper-alpha': alphabetic('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
  'upper-latin': alphabetic('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
  'lower-greek': alphabetic('αβγδεζηθικλμνξοπρστυφχψω'),
  hiragana: alphabetic(
    'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわゐゑをん',
    CJK_SUFFIX
  ),
  'hiragana-iroha': alphabetic(
    'いろはにほへとちりぬるをわかよたれそつねならむうゐのおくやまけふこえてあさきゆめみしゑひもせす',
    CJK_SUFFIX
  ),
  katakana: alphabetic(
    'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヰヱヲン',
    CJK_SUFFIX
  ),
  'katakana-iroha': alphabetic(
    'イロハニホヘトチリヌルヲワカヨタレソツネナラムウヰノオクヤマケフコエテアサキユメミシヱヒモセス',
    CJK_SUFFIX
  ),
  'cjk-earthly-branch': alphabetic('子丑寅卯辰巳午未申酉戌亥', CJK_SUFFIX),
  'cjk-heavenly-stem': alphabetic('甲乙丙丁戊己庚辛壬癸', CJK_SUFFIX),

  'lower-roman': additive([1, 3999], ROMAN.toLowerCase()),
  'upper-roman': additive([1, 3999], ROMAN),
  armenian: additive([1, 9999], UPPER_ARMENIAN),
  'upper-armenian': additive([1, 9999], UPPER_ARMENIAN),
  'lower-armenian': additive([1, 9999], LOWER_ARMENIAN),
  georgian: additive([1, 19999], GEORGIAN),
  hebrew: additive([1, 10999], HEBREW),
}

/** Markers that are drawn as shapes, like in browsers. */
export const SYMBOL_MARKERS = new Set([
  'disc',
  'circle',
  'square',
  'disclosure-open',
  'disclosure-closed',
])

function represent(value: number, style: CounterStyle): string | undefined {
  const { symbols = [], additiveSymbols = [] } = style
  const [min, max] = style.range ?? [-Infinity, Infinity]
  if (value < min || value > max) return
  switch (style.system) {
    case 'cyclic': {
      const n = symbols.length
      return symbols[(((value - 1) % n) + n) % n]
    }
    case 'numeric': {
      const n = symbols.length
      let rest = Math.abs(value)
      let result = rest === 0 ? symbols[0] : ''
      while (rest > 0) {
        result = symbols[rest % n] + result
        rest = Math.floor(rest / n)
      }
      return result
    }
    case 'alphabetic': {
      if (value < 1) return
      const n = symbols.length
      let rest = value
      let result = ''
      while (rest > 0) {
        rest--
        result = symbols[rest % n] + result
        rest = Math.floor(rest / n)
      }
      return result
    }
    case 'additive': {
      if (value < 0) return
      if (value === 0) {
        return additiveSymbols.find(([weight]) => weight === 0)?.[1]
      }
      let rest = value
      let result = ''
      for (const [weight, symbol] of additiveSymbols) {
        if (weight === 0) continue
        while (rest >= weight) {
          result += symbol
          rest -= weight
        }
      }
      return rest === 0 ? result : undefined
    }
  }
}

/**
 * The text of a list marker: the counter value in a counter style with its
 * suffix, or a string. Unknown counter styles are `decimal`.
 */
export function getMarkerText(value: number, listStyleType: string) {
  const string = /^(["'])(.*)\1$/s.exec(listStyleType)
  if (string) return string[2]
  const style =
    COUNTER_STYLES[listStyleType.toLowerCase()] ?? COUNTER_STYLES.decimal
  let text = represent(value, style)
  let { pad = 0 } = style
  let symbols = style.symbols
  if (text === undefined) {
    // Values out of the range of a counter style fall back to `decimal`.
    text = represent(value, COUNTER_STYLES.decimal)
    pad = 0
    symbols = COUNTER_STYLES.decimal.symbols
  }
  if (
    style.system === 'numeric' ||
    symbols === COUNTER_STYLES.decimal.symbols
  ) {
    const length = Array.from(text).length
    if (length < pad) text = symbols[0].repeat(pad - length) + text
    if (value < 0) text = '-' + text
  }
  return text + (style.suffix ?? '. ')
}
