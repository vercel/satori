export type Tabs = {
  [x: string]: string
}

const playgroundTabs: Tabs = {
  helloworld: `<div
  style={{
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    fontSize: 32,
    fontWeight: 600,
  }}
>
  <svg
    width="75"
    viewBox="0 0 75 65"
    fill="#000"
    style={{ margin: '0 75px' }}
  >
    <path d="M37.59.25l36.95 64H.64l36.95-64z"></path>
  </svg>
  <div style={{ marginTop: 40 }}>Hello, World</div>
</div>
`,
  Vercel: `<div
  style={{
    height: '100%',
    width: '100%',
    display: 'flex',
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    flexWrap: 'nowrap',
    backgroundColor: 'white',
    backgroundImage: 'radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%)',
    backgroundSize: '100px 100px',
  }}
>
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <svg
      height={80}
      viewBox="0 0 75 65"
      fill="black"
      style={{ margin: '0 75px' }}
    >
      <path d="M37.59.25l36.95 64H.64l36.95-64z"></path>
    </svg>
  </div>
  <div
    style={{
      display: 'flex',
      fontSize: 40,
      fontStyle: 'normal',
      color: 'black',
      marginTop: 30,
      lineHeight: 1.8,
      whiteSpace: 'pre-wrap',
    }}
  >
    <b>Vercel Edge Network</b>
  </div>
</div>
`,
  rauchg: `<div
  style={{
    display: 'flex',
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '-.02em',
    fontWeight: 700,
    background: 'white',
  }}
>
  <div
    style={{
      left: 42,
      top: 42,
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
    }}
  >
    <span
      style={{
        width: 24,
        height: 24,
        background: 'black',
      }}
    />
    <span
      style={{
        marginLeft: 8,
        fontSize: 20,
      }}
    >
      rauchg.com
    </span>
  </div>
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      padding: '20px 50px',
      margin: '0 42px',
      fontSize: 40,
      width: 'auto',
      maxWidth: 550,
      textAlign: 'center',
      backgroundColor: 'black',
      color: 'white',
      lineHeight: 1.4,
    }}
  >
    Making the Web. Faster.
  </div>
</div>
`,
  'Tailwind (experimental)': `// Modified based on https://tailwindui.com/components/marketing/sections/cta-sections

<div tw="flex flex-col w-full h-full items-center justify-center bg-white">
  <div tw="bg-gray-50 flex w-full">
    <div tw="flex flex-col md:flex-row w-full py-12 px-4 md:items-center justify-between p-8">
      <h2 tw="flex flex-col text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 text-left">
        <span>Ready to dive in?</span>
        <span tw="text-indigo-600">Start your free trial today.</span>
      </h2>
      <div tw="mt-8 flex md:mt-0">
        <div tw="flex rounded-md shadow">
          <a tw="flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-5 py-3 text-base font-medium text-white">Get started</a>
        </div>
        <div tw="ml-3 flex rounded-md shadow">
          <a tw="flex items-center justify-center rounded-md border border-transparent bg-white px-5 py-3 text-base font-medium text-indigo-600">Learn more</a>
        </div>
      </div>
    </div>
  </div>
</div>`,
  Gradients: `<div
  style={{
    display: 'flex',
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    backgroundImage: 'linear-gradient(to bottom, #dbf4ff, #fff1f1)',
    fontSize: 60,
    letterSpacing: -2,
    fontWeight: 700,
    textAlign: 'center',
  }}
  >
  <div
    style={{
      backgroundImage: 'linear-gradient(90deg, rgb(0, 124, 240), rgb(0, 223, 216))',
      backgroundClip: 'text',
      '-webkit-background-clip': 'text',
      color: 'transparent',
    }}
  >
    Develop
  </div>
  <div
    style={{
      backgroundImage: 'linear-gradient(90deg, rgb(121, 40, 202), rgb(255, 0, 128))',
      backgroundClip: 'text',
      '-webkit-background-clip': 'text',
      color: 'transparent',
    }}
  >
    Preview
  </div>
  <div
    style={{
      backgroundImage: 'linear-gradient(90deg, rgb(255, 77, 77), rgb(249, 203, 40))',
      backgroundClip: 'text',
      '-webkit-background-clip': 'text',
      color: 'transparent',
    }}
  >
    Ship
  </div>
</div>
`,
  'Color Models': `<div
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    fontSize: 24,
    fontWeight: 600,
    textAlign: 'left',
    padding: 70,
    color: 'red',
    backgroundImage: 'linear-gradient(to right, #334d50, #cbcaa5)',
    height: '100%',
    width: '100%'
  }}
>

  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '15px', color: '#fff' }}>
      #fff
      <div style={{ fontWeight: 100 }}>hexadecimal</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '15px', color: '#ffffff70' }}>
      #ffffff70
      <div style={{ fontWeight: 100 }}>hexadecimal + transparency</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '15px', color: 'rgb(45, 45, 45)' }}>
      rgb(45, 45, 45)
      <div style={{ fontWeight: 100 }}>rgb</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '15px', color: 'rgb(45, 45, 45, 0.3)' }}>
      rgb(45, 45, 45, 0.3)
      <div style={{ fontWeight: 100 }}>rgba</div>
    </div>
  </div>

  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '15px', color: 'hsl(186, 22%, 26%)' }}>
      hsl(186, 22%, 26%)
      <div style={{ fontWeight: 100 }}>hsl</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '15px', color: 'hsla(186, 22%, 26%, 40%)' }}>
      hsla(186, 22%, 26%, 40%)
      <div style={{ fontWeight: 100 }}>hsla</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '15px', color: 'white' }}>
      "white"
      <div style={{ fontWeight: 100 }}>predefined color names</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '15px', color: 'currentcolor' }}>
      should be red
      <div style={{ fontWeight: 100 }}>"currentcolor"</div>
    </div>
  </div>
</div>`,
  Advanced: `// Fallback fonts and Emoji are dynamically loaded
// from Google Fonts and CDNs in this demo.

// You can also return a function component in the playground.
() => {
  function Label({ children }) {
    return <label style={{
      fontSize: 15,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: 1,
      margin: '25px 0 10px',
      color: 'gray',
    }}>
      {children}
    </label>
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        padding: '10px 20px',
        justifyContent: 'center',
        fontFamily: 'Inter, "Material Icons"',
        fontSize: 28,
        backgroundColor: 'white',
      }}
      >
      <Label>Language & Font subsets</Label>
      <div>
        Hello! 你好! 안녕! こんにちは! Χαίρετε! Hallå!
      </div>
      <Label>Emoji</Label>
      <div>
        👋 😄 🎉 🎄 🦋
      </div>
      <Label>Icon font</Label>
      <div>
          &#xe766; &#xeb9b; &#xf089;
      </div>
      <Label>Lang attribute</Label>
      <div style={{ display: 'flex' }}>
        <span lang="ja-JP">
          骨茶
        </span>/
        <span lang="zh-CN">
          骨茶
        </span>/
        <span lang="zh-TW">
          骨茶
        </span>/
        <span lang="zh-HK">
          骨茶
        </span>
      </div>
    </div>
  )
}  
`,
  '§1.1 normal: SA Scripts': `// §1.1 — LAYOUT-IMPACT.md: normal mode, SA scripts (Thai)
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// linebreak@1.1.0 has no LSTM/dictionary model for SA-class scripts,
// so it falls back to per-character breaking.
// ICU4X uses LSTM model → proper word-level breaks.

() => {
  const box = {
    padding: '8px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
    fontWeight: 400,
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§1.1 normal — SA Scripts (Thai)</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 10 }}>🔴 HIGH: linebreak does per-char break, ICU4X does per-word break via LSTM</div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>Thai — with spaces, constrained width (280px)</div>
      <div lang="th" style={{ ...box, width: 280, fontSize: 14, fontFamily: 'Noto Sans Thai' }}>
        สวัสดีครับนี่คือการทดสอบการตัดคำภาษาไทยที่ต้องใช้พจนานุกรมหรือโมเดล LSTM ในการตัดคำอย่างถูกต้อง
      </div>
      <div style={{ fontSize: 9, color: '#999', marginTop: 2 }}>linebreak: 3 words (break at spaces only, Thai runs unbreakable) · ICU4X: LSTM splits Thai runs into words</div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '12px 0 4px' }}>Thai — no spaces (200px)</div>
      <div lang="th" style={{ ...box, width: 200, fontSize: 14, fontFamily: 'Noto Sans Thai' }}>
        ภาษาไทยไม่มีช่องว่างระหว่างคำทำให้การตัดบรรทัดยากมาก
      </div>
      <div style={{ fontSize: 9, color: '#999', marginTop: 2 }}>linebreak: 1 word (entire string, SA-&gt;AL) · ICU4X: LSTM word segmentation</div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '12px 0 4px' }}>Thai — mixed with English, narrow (150px)</div>
      <div lang="th" style={{ ...box, width: 150, fontSize: 14, fontFamily: 'Noto Sans Thai' }}>
        การพัฒนาซอฟต์แวร์ด้วยภาษา TypeScript และ React ในปัจจุบัน
      </div>
      <div style={{ fontSize: 9, color: '#999', marginTop: 2 }}>150px forces Thai runs to break internally: linebreak can't (SA-&gt;AL), ICU4X can (LSTM)</div>
    </div>
  )
}
`,
  '§1.2 break-all': `// §1.2 — LAYOUT-IMPACT.md: word-break: break-all
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// Original: Intl.Segmenter('grapheme') → each grapheme cluster = 1 word.
// ICU4X: getLineBreaks({ wordBreak: 'break-all' }) → UAX#14 line-break segments.
// The granularity is fundamentally different.

() => {
  const box = {
    padding: '8px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
    wordBreak: 'break-all',
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§1.2 break-all</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 10 }}>🔴 HIGH: grapheme-level (original) vs UAX#14 line-break-level (ICU4X)</div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>CJK + punctuation -- punctuation attachment (65px)</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 4 }}>Original: breaks after "." (punctuation starts new line). ICU4X/browser: breaks after the char before punctuation.</div>
      <div style={{ ...box, width: 65, fontSize: 13 }}>
        テスト。句点、
      </div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>English with punctuation (80px)</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 4 }}>Original: breaks after "2". ICU4X/browser: breaks after "v" ("2.1)" stays together).</div>
      <div style={{ ...box, width: 80, fontSize: 13 }}>
        hello-world_test.file (v2.1)
      </div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>Pure English (80px) \u2705 identical</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 4 }}>No punctuation -- both engines break at same letter boundaries.</div>
      <div style={{ ...box, width: 80, fontSize: 13 }}>
        Thequickbrownfox
      </div>
    </div>
  )
}
`,
  '§1.3 keep-all': `// §1.3 — LAYOUT-IMPACT.md: word-break: keep-all
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// Original: Intl.Segmenter('word') → UAX#29 word boundaries + NBSP merge.
// ICU4X: getLineBreaks({ wordBreak: 'keep-all' }) → UAX#14 keep-all rules.
// These are two different standards applied to CJK text.

() => {
  const box = {
    padding: '8px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
    wordBreak: 'keep-all',
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§1.3 keep-all</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 10 }}>🟠 MED: UAX#29 word boundary vs UAX#14 keep-all line-break rules</div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>CJK — Japanese mixed (250px)</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 4 }}>Original: word segmenter finds break opportunities within CJK runs. ICU4X/browser: keep-all treats CJK as unbreakable, text overflows.</div>
      <div lang="ja" style={{ ...box, width: 250, fontSize: 13 }}>
        東京タワーと東京スカイツリーは有名な観光地です。毎年多くの人が訪れます。
      </div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>CJK + Latin mixed (260px)</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 4 }}>Original: word segmenter breaks between CJK characters. ICU4X/browser: CJK runs are unbreakable, text overflows.</div>
      <div style={{ ...box, width: 260, fontSize: 13 }}>
        React框架和Vue框架都是很好的JavaScript前端工具，Next.js也很受欢迎。
      </div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>English keep-all (200px) \u2705 identical</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 4 }}>English text with spaces: both engines break at spaces. keep-all only affects CJK.</div>
      <div style={{ ...box, width: 200, fontSize: 13 }}>
        The quick brown fox jumps over the lazy dog near the river.
      </div>
    </div>
  )
}
`,
  '§1.4 break-word': `// §1.4 — LAYOUT-IMPACT.md: word-break: break-word (overflow-wrap)
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// Both paths: normal segmentation + allowBreakWord=true.
// When a word overflows, flow() splits it into graphemes.
// Difference: initial words[] differ → different trigger points for grapheme split.

() => {
  const box = {
    padding: '8px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§1.4 break-word</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 10 }}>🟡 LOW-MED: same grapheme fallback, but different initial word boundaries</div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>Thai with break-word (100px)</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 4 }}>Original: entire Thai string = 1 word (SA-&gt;AL), overflows, grapheme split (char-by-char). ICU4X: LSTM finds word boundaries, wraps at Thai words, only splits if a single word overflows.</div>
      <div lang="th" style={{ ...box, width: 100, fontSize: 14, fontFamily: 'Noto Sans Thai' }}>
        สวัสดีครับนี่คือการทดสอบคำที่ยาวมากจนต้องตัดคำ
      </div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>Thai with break-word (140px)</div>
      <div lang="th" style={{ ...box, width: 140, fontSize: 14, fontFamily: 'Noto Sans Thai' }}>
        สวัสดีครับนี่คือการทดสอบคำที่ยาวมากจนต้องตัดคำ
      </div>
    </div>
  )
}
`,
  '§2 requiredBreaks': `// §2 — LAYOUT-IMPACT.md: requiredBreaks[] semantic difference
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// Original: break-all/keep-all return requiredBreaks=[] → \\n ignored
// ICU4X: always fills requiredBreaks[] → \\n correctly triggers forced break
// Visible only with whiteSpace: pre/pre-wrap/pre-line

() => {
  const box = {
    padding: '8px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§2 requiredBreaks[]</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 10 }}>🟡 LOW: Original ignores \\n in break-all/keep-all; ICU4X handles it correctly</div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>pre-wrap + break-all</div>
          <div style={{ ...box, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {"Line1: break-all mode\\nLine2: does \\\\n work?\\nLine3: ICU4X says yes"}
          </div>

          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>pre-wrap + keep-all (Chinese)</div>
          <div style={{ ...box, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>
            {"第一行：keep-all模式\\n第二行：换行符应生效\\n第三行：ICU4X正确处理"}
          </div>

          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>pre-line + break-all</div>
          <div style={{ ...box, fontSize: 13, whiteSpace: 'pre-line', wordBreak: 'break-all' }}>
            {"First line of text\\nSecond line after newline\\nThird line here"}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>pre + keep-all (reference)</div>
          <div style={{ ...box, fontSize: 13, whiteSpace: 'pre', wordBreak: 'keep-all' }}>
            {"行一：pre模式\\n行二：換行應生效\\n行三：此為對照組"}
          </div>

          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>normal + break-all (no effect)</div>
          <div style={{ ...box, fontSize: 13, whiteSpace: 'normal', wordBreak: 'break-all', width: 200 }}>
            {"whiteSpace:normal collapses \\n to space, so no difference here regardless of engine."}
          </div>
          <div style={{ fontSize: 9, color: '#999', marginTop: 2 }}>whiteSpace: normal -- \\n replaced with space before segmentation</div>
        </div>
      </div>
    </div>
  )
}
`,
  '§3 locale': `// §3 — LAYOUT-IMPACT.md: locale pass-through
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// ICU4X uses locale for locale-sensitive line breaking rules (kinsoku shori).
// The original linebreak package ignores locale entirely.

() => {
  const box = {
    padding: '8px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§3 locale pass-through</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 10 }}>lang attr passes locale to ICU4X. For Thai: triggers LSTM segmentation. Kinsoku strictness is in §4.</div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>Thai — ICU4X LSTM vs fallback (180px)</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 4 }}>ICU4X: LSTM word segmentation, wraps at word boundaries. Fallback: SA-&gt;AL, entire string = 1 word, no wrap.</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div lang="th" style={{ ...box, width: 180, fontSize: 14, fontFamily: 'Noto Sans Thai' }}>
            กรุงเทพมหานครเป็นเมืองหลวงของประเทศไทย
          </div>
          <div style={{ fontSize: 9, color: '#999', textAlign: 'center', marginTop: 2 }}>lang="th" (font + locale)</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ ...box, width: 180, fontSize: 14, fontFamily: 'Noto Sans Thai' }}>
            กรุงเทพมหานครเป็นเมืองหลวงของประเทศไทย
          </div>
          <div style={{ fontSize: 9, color: '#999', textAlign: 'center', marginTop: 2 }}>no lang (font only)</div>
        </div>
      </div>
      <div style={{ fontSize: 9, color: '#999', marginTop: 4 }}>Note: lang="th" affects font loading in satori; ICU4X auto-detects Thai script for LSTM regardless of lang. Both columns should look the same with ICU4X enabled.</div>
    </div>
  )
}
`,
  '§4 lineBreak CSS': `// §4 — LAYOUT-IMPACT.md: lineBreak CSS property (loose / normal / strict / anywhere)
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// linebreak package ≈ ICU4X strict (identical segmentation).
// So "strict" shows NO difference, but "normal" and "loose" DO:
//   normal: ー and small kana (っゃぁュ) CAN start a line (fallback/strict: can't)
//   loose:  additionally ！ CAN start a line
//   anywhere: breaks at every char boundary including inside 。 pairs

() => {
  const box = {
    padding: '8px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§4 lineBreak CSS property</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>line-break -- ICU4X LineBreakStrictness (fallback ignores this)</div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 2 }}>normal — "ー" freed</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>ICU4X: "ー" can start line. Fallback: sticks to prev.</div>
          <div lang="ja" style={{ ...box, width: 64, fontSize: 12, lineBreak: 'normal' }}>
            データーベースの接続確認
          </div>
          <div style={{ fontSize: 8, color: '#999', textAlign: 'center', marginTop: 2 }}>normal (64px)</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 2 }}>loose — "!" freed</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>ICU4X: "!" can start line. Fallback: sticks to prev.</div>
          <div lang="ja" style={{ ...box, width: 100, fontSize: 12, lineBreak: 'loose' }}>
            あいう。えお！かきくけこさしす
          </div>
          <div style={{ fontSize: 8, color: '#999', textAlign: 'center', marginTop: 2 }}>loose (100px)</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 2 }}>strict = fallback \u2705 identical</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>linebreak pkg default = ICU4X strict. No diff.</div>
          <div lang="ja" style={{ ...box, width: 64, fontSize: 12, lineBreak: 'strict' }}>
            データーベースの接続確認
          </div>
          <div style={{ fontSize: 8, color: '#999', textAlign: 'center', marginTop: 2 }}>strict (64px)</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 2 }}>anywhere — max breaks</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>Every char boundary, even inside "。" pairs.</div>
          <div lang="ja" style={{ ...box, width: 100, fontSize: 12, lineBreak: 'anywhere' }}>
            あいう。えお！かきくけこさしす
          </div>
          <div style={{ fontSize: 8, color: '#999', textAlign: 'center', marginTop: 2 }}>anywhere (100px)</div>
        </div>
      </div>
    </div>
  )
}
`,
  '§5 Tab Alignment': `// §5 — LAYOUT-IMPACT.md: Tab alignment difference (whiteSpace: pre)
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// When text contains tabs, calc() computes tab-stop distance using currentWidth.
// linebreak: "ThaiText\\t" is one word → calc() handles tab internally.
// ICU4X: ["Thai","Text","\\t"] separate words → currentWidth accumulates
// Thai text width BEFORE calc("\\t") runs → different tab alignment.
//
// This matters for code display with whiteSpace: pre.

() => {
  const box = {
    padding: '8px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
    whiteSpace: 'pre',
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§5 Tab Alignment (whiteSpace: pre)</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 10 }}>🟠 MED: ICU4X splits "text\\t" into separate words -- different tab stop position</div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>Thai + tab (code-like)</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>linebreak: "การพัฒนา\\t" = 1 word. ICU4X: ["การ","พัฒนา","\\t"] = 3 words.</div>
          <div lang="th" style={{ ...box, fontSize: 13, fontFamily: 'Noto Sans Thai' }}>
            {"การพัฒนา\\t= dev\\nซอฟต์แวร์\\t= software\\nทดสอบ\\t= test"}
          </div>
          <div style={{ fontSize: 8, color: '#999', marginTop: 2 }}>Tab alignment after Thai text differs between engines</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>Thai comment style</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>Tab stops shift because ICU4X accumulates Thai word widths before seeing \\t.</div>
          <div lang="th" style={{ ...box, fontSize: 13, fontFamily: 'Noto Sans Thai' }}>
            {"ฟังก์ชัน\\tfunction\\nตัวแปร\\tvariable\\nข้อมูล\\tdata"}
          </div>
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '12px 0 4px' }}>Latin + tab (control group) \u2705 identical</div>
      <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>Both engines split identically for Latin+tab -- no difference expected.</div>
      <div style={{ ...box, fontSize: 13, width: 300 }}>
        {"name\\tvalue\\nfoo\\tbar\\nhello\\tworld"}
      </div>
    </div>
  )
}
`,
  '§6 text-wrap': `// §6 — LAYOUT-IMPACT.md: text-wrap: balance / pretty
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// balance: binary-search on flow() → different convergence width.
// pretty: checks if last line is too short → different reflow decision.
// Algorithms unchanged, but words[] differ → different results.

() => {
  const box = {
    padding: '8px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§6 text-wrap: balance / pretty</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 10 }}>🟡 LOW: Same algorithm, different words[] -- different convergence / reflow. Needs SA-script (Thai) to differ.</div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>balance — Thai (240px)</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>ICU4X: LSTM words -- balance finds optimal width across 3 lines. Fallback: 1 word, no balance.</div>
          <div lang="th" style={{ ...box, width: 240, fontSize: 14, textWrap: 'balance', fontFamily: 'Noto Sans Thai' }}>
            สวัสดีครับนี่คือการทดสอบการจัดข้อความแบบสมดุลในภาษาไทยที่ต้องใช้การตัดคำ
          </div>
          <div style={{ fontSize: 8, color: '#999', marginTop: 2 }}>ICU4X matches browser. Fallback: entire string on one line (no break points).</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>pretty — Thai (240px)</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>ICU4X: LSTM words -- orphan detection works. Fallback: 1 word, no reflow.</div>
          <div lang="th" style={{ ...box, width: 240, fontSize: 14, textWrap: 'pretty', fontFamily: 'Noto Sans Thai' }}>
            ข้อความภาษาไทยนี้ถูกออกแบบมาเพื่อทดสอบการจัดบรรทัดสุดท้ายไม่ให้สั้นเกินไป
          </div>
          <div style={{ fontSize: 8, color: '#999', marginTop: 2 }}>ICU4X line breaks may differ slightly from browser (different LSTM model).</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>balance -- English (240px) ✅ identical</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>Same word boundaries for English -- balance converges to same width.</div>
          <div style={{ ...box, width: 240, fontSize: 13, textWrap: 'balance' }}>
            The quick brown fox jumps over the lazy dog near the riverbank on a sunny afternoon.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>pretty -- English (240px) ✅ identical</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>Same word boundaries -- orphan detection produces same result.</div>
          <div style={{ ...box, width: 240, fontSize: 13, textWrap: 'pretty' }}>
            This is a longer paragraph designed to test pretty text wrapping and orphan control behavior end.
          </div>
        </div>
      </div>
    </div>
  )
}
`,
  '§7 justify': `// §7 — LAYOUT-IMPACT.md: text-align: justify
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// justify relies on lineSegmentNumber to compute inter-word gaps.
// Different word boundaries → different segment counts → different spacing.

() => {
  const box = {
    padding: '8px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
    textAlign: 'justify',
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§7 text-align: justify</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 10 }}>🟡 LOW: Different segment counts -- different inter-word gap sizes. Needs SA-script to differ.</div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>English (300px) ✅ identical</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>Both engines split English at spaces — same segments, same justify gaps.</div>
          <div style={{ ...box, width: 300, fontSize: 13 }}>
            The quick brown fox jumps over the lazy dog near the riverbank on a sunny afternoon.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>CJK + Latin (280px) ✅ identical</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>CJK per-char split + space-based word split — both engines produce the same segments.</div>
          <div style={{ ...box, width: 280, fontSize: 13 }}>
            React框架和Vue框架都是很好的前端工具，Next.js也很受欢迎。
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>Short words (260px) ✅ identical</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>Many short words with spaces — both engines agree on segment count and gap size.</div>
          <div style={{ ...box, width: 260, fontSize: 13 }}>
            a be cat do eat fig go hi it jam kit log me no ox pi qi red so to up vim we ax ye zip
          </div>
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>Thai justified (260px)</div>
      <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>ICU4X: LSTM splits Thai into words -- more segments -- smaller, even gaps. Fallback: Thai = 1 word -- only 1 gap before "justify" -- large spacing.</div>
      <div lang="th" style={{ ...box, width: 260, fontSize: 14, fontFamily: 'Noto Sans Thai' }}>
        ข้อความนี้ใช้การจัดเรียงแบบ justify เพื่อทดสอบช่องว่างระหว่างคำ
      </div>
      <div style={{ fontSize: 8, color: '#999', marginTop: 2 }}>ICU4X matches browser. Fallback: large gap before "justify" (only 1 break point in Thai run).</div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '12px 0 4px' }}>Thai-only justified (240px)</div>
      <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>Pure Thai: ICU4X distributes gaps across LSTM word boundaries. Fallback: no gaps (1 word per line).</div>
      <div lang="th" style={{ ...box, width: 240, fontSize: 14, fontFamily: 'Noto Sans Thai' }}>
        สวัสดีครับนี่คือการทดสอบการจัดเรียงข้อความแบบชิดขอบในภาษาไทย
      </div>
    </div>
  )
}
`,
  '§8 Grapheme Split': `// §8 — LAYOUT-IMPACT.md: Secondary grapheme split (needToBreakWord)
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// When allowBreakWord=true and a word overflows, flow() splits it
// into graphemes via segment(word, 'grapheme').
// ICU4X break-all words are larger → triggers this more often.
// Original break-all words are already single graphemes → almost never triggers.

() => {
  const box = {
    padding: '8px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§8 Secondary Grapheme Split</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 10 }}>🟡 LOW: needToBreakWord triggers at different points due to different word sizes</div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>break-all — with punctuation (80px)</div>
      <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>Fallback: 3 lines "$1,234." / "56-test" / "@email". ICU4X: 4 lines "$1,23" / "4.56-te" / "st@emai" / "l". Browser: 3 lines "$1,234.5" / "6-test@" / "email". All three differ!</div>
      <div style={{ ...box, width: 80, fontSize: 13, wordBreak: 'break-all' }}>
        $1,234.56-test@email
      </div>
      <div style={{ fontSize: 8, color: '#999', marginTop: 2 }}>ICU4X break-all segments keep punctuation attached differently, triggering grapheme split at different points.</div>

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>break-all — narrow (80px) ✅ identical</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>Pure alphanumeric: both engines break at same positions.</div>
          <div style={{ ...box, width: 80, fontSize: 13, wordBreak: 'break-all' }}>
            Testing1234567890
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>break-word — narrow (60px) ✅ identical</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>Single long word: both overflow then grapheme-split the same way.</div>
          <div style={{ ...box, width: 60, fontSize: 13, wordBreak: 'break-word' }}>
            Verylongword
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>break-word — CJK+Latin (100px) ✅ identical</div>
          <div style={{ fontSize: 8, color: '#999', marginBottom: 3 }}>CJK chars break per-char in both engines, same grapheme split points.</div>
          <div style={{ ...box, width: 100, fontSize: 13, wordBreak: 'break-word' }}>
            超長い英単語Internationalization国際化
          </div>
        </div>
      </div>
    </div>
  )
}
`,
  '§9 Kerning': `// §9 — LAYOUT-IMPACT.md: Kerning merge path differences
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// During rendering, each word is split by segment(word, 'word') into _texts[].
// Adjacent same-line words are merged into a single SVG <text> (wordBuffer).
// Different word boundaries → different _texts → different SVG structure.
// Doesn't affect layout size, only SVG output structure.

() => {
  const box = {
    padding: '8px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§9 Kerning Merge</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 10 }}>⚪ VERY LOW: Same layout, different SVG text element grouping. All tests below are visually identical ✅.</div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>Kerning pairs (AV, To, We) ✅ identical</div>
          <div style={{ ...box, fontSize: 20 }}>
            AV To We LT VA
          </div>

          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>Mixed script ✅ identical</div>
          <div style={{ ...box, fontSize: 16 }}>
            Hello你好World世界Testing
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>With word separators ✅ identical</div>
          <div style={{ ...box, fontSize: 14 }}>
            word1 word2 word3 word4 word5
          </div>

          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>Compact — no spaces ✅ identical</div>
          <div style={{ ...box, fontSize: 14 }}>
            ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz
          </div>
          <div style={{ fontSize: 9, color: '#999', marginTop: 2 }}>Layout identical. Only SVG internal text element grouping differs (inspect SVG source).</div>
        </div>
      </div>
    </div>
  )
}
`,
  '§10 Emoji': `// §10 — LAYOUT-IMPACT.md: Emoji sequences (ZWJ, skin tone, flags)
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// linebreak@1.1.0 = Unicode 13 data.
// ICU4X (icu4x-datagen 2.1.1, CLDR 48.1) = Unicode 17 data.
//
// KEY FINDING: Only U15 new Emoji_Modifier_Base chars (🫷 🫸) + skin tone
// modifier show a real difference — linebreak splits 🫷|🏻 into 2 words,
// ICU4X correctly keeps 🫷🏻 bonded.
// All other emoji (ZWJ, flags, U14/U15.1/U16/U17) are identical.

() => {
  const box = {
    padding: '8px 10px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§10 Emoji Sequences</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>⚠️ linebreak@1.1.0 = Unicode 13 · ICU4X (CLDR 48.1) = Unicode 17 — gap of 4 major versions</div>

      {/* KEY DIFFERENCE: U15 skin tone */}
      <div style={{ fontWeight: 700, fontSize: 11, color: '#c33', marginBottom: 4 }}>❌ U15 Emoji_Modifier_Base + skin tone — ONLY REAL DIFFERENCE</div>
      <div style={{ fontSize: 9, color: '#999', marginBottom: 4 }}>linebreak (U13) classifies 🫷🫸 (U+1FAF7/8) as AL, not EB -> LB30a EB×EM fails -> skin tone modifier splits off</div>
      <div style={{ ...box, width: 340 }}>
        Push 🫷🏻 left and 🫸🏽 right to scroll 🫷🏿
      </div>
      <div style={{ fontSize: 9, color: '#c33', marginTop: 2, marginBottom: 8 }}>linebreak: "🫷" | "🏻 " (split) · ICU4X: "🫷🏻 " (bonded) · Browser: bonded ✅</div>

      {/* U14 skin tone — identical */}
      <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>U14 (2021) Skin tone ✅ identical</div>
      <div style={{ ...box, fontSize: 22, display: 'flex', gap: 12 }}>
        <span>🫰🏻</span>
        <span>🫶🏽</span>
        <span>🫱🏻‍🫲🏿</span>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {/* U15 emoji (no skin) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>U15 (2022) no skin ✅ identical</div>
          <div style={{ ...box, fontSize: 22, display: 'flex', gap: 10 }}>
            <span>🫨</span><span>🩷</span><span>🩵</span><span>🪽</span><span>🐦‍⬛</span>
          </div>
        </div>
        {/* U15.1 directional */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>U15.1 (2023) direction ✅ identical</div>
          <div style={{ ...box, fontSize: 22, display: 'flex', gap: 10 }}>
            <span>🙂‍↔️</span><span>🚶‍➡️</span><span>🏃‍♀️‍➡️</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {/* U16 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>U16 (2024) ✅ identical</div>
          <div style={{ ...box, fontSize: 22, display: 'flex', gap: 10 }}>
            <span>🫩</span><span>🫆</span><span>🪾</span><span>🫜</span>
          </div>
        </div>
        {/* U17 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>U17 (2025) ✅ identical</div>
          <div style={{ ...box, fontSize: 22, display: 'flex', gap: 10 }}>
            <span>🫪</span><span>🫯</span><span>🫈</span><span>🧑‍🩰</span><span>🫍</span>
          </div>
        </div>
      </div>
    </div>
  )
}
`,
  '§11 NBSP': `// §11 — LAYOUT-IMPACT.md: Non-Breaking Space (U+00A0)
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// Original keep-all: segment('word') + NBSP merge post-processing.
// ICU4X keep-all: UAX#14 GL (Glue) class prevents break at NBSP.
// Both aim to keep NBSP-joined words together.
// CJK + NBSP differs: Intl.Segmenter splits compound words, breaking NBSP merge.

() => {
  const box = {
    padding: '8px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§11 Non-Breaking Space (NBSP)</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 10 }}>⚠️ CJK + NBSP: Fallback wraps (Intl.Segmenter splits compound words), ICU4X doesn’t (GL class, matches browser). Other cases: ✅ identical</div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>keep-all + NBSP (180px) ✅ identical</div>
          <div style={{ ...box, width: 180, fontSize: 13, wordBreak: 'keep-all' }}>
            {"100\u00a0km/h speed\u00a0limit on\u00a0highway"}
          </div>

          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>Multiple consecutive NBSP ✅ identical</div>
          <div style={{ ...box, width: 180, fontSize: 13, wordBreak: 'keep-all' }}>
            {"word1\u00a0\u00a0\u00a0word2\u00a0\u00a0word3 normal space word4"}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>normal mode + NBSP (180px) ✅ identical</div>
          <div style={{ ...box, width: 180, fontSize: 13 }}>
            {"Mr.\u00a0Smith went to\u00a0Washington D.C.\u00a0today"}
          </div>
          <div style={{ fontSize: 9, color: '#999', marginTop: 2 }}>normal mode: NBSP handled by LineBreaker (not segment merge)</div>

          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>NBSP with CJK (180px) ⚠️ differs</div>
          <div style={{ ...box, width: 180, fontSize: 13, wordBreak: 'keep-all' }}>
            {"東京\u00a0タワー\u00a0スカイツリー\u00a0東京駅"}
          </div>
          <div style={{ fontSize: 9, color: '#c05', marginTop: 2 }}>Fallback: Intl.Segmenter splits CJK compound words ("スカイ"/"ツリー") -> NBSP merge leaves break opportunities -> wraps. ICU4X: GL class prevents break at NBSP -> no wrap (matches browser).</div>
        </div>
      </div>
    </div>
  )
}
`,
  '§12 Edge Cases': `// §12 — LAYOUT-IMPACT.md: Empty text and boundary conditions
// Toggle "ICU4X TextEngine" checkbox to compare!
//
// Empty string: both return empty words.
// Single char: both return one word.
// Pure whitespace: processWhiteSpace collapses first.
// ICU4X skips position===0 sentinel.

() => {
  const box = {
    padding: '8px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    lineHeight: 1.5,
    minHeight: 30,
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      fontFamily: 'Inter',
      padding: '16px 24px',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 2 }}>§12 Edge Cases</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 10 }}>⚪ VERY LOW: All cases ✅ identical across both paths</div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>§12.1 Empty string ✅ identical</div>
          <div style={{ ...box }}>{""}</div>

          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>§12.2 Single character ✅ identical</div>
          <div style={{ ...box }}>{"A"}</div>

          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>§12.3 Pure whitespace ✅ identical</div>
          <div style={{ ...box }}>{"   "}</div>

          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>Single CJK character ✅ identical</div>
          <div style={{ ...box }}>{"你"}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', marginBottom: 4 }}>Single emoji ✅ identical</div>
          <div style={{ ...box, fontSize: 24 }}>{"👋"}</div>

          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>Single newline (pre-wrap) ✅ identical</div>
          <div style={{ ...box, whiteSpace: 'pre-wrap' }}>{"\\n"}</div>

          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>Only NBSP ✅ identical</div>
          <div style={{ ...box }}>{"\u00a0"}</div>

          <div style={{ fontWeight: 700, fontSize: 11, color: '#555', margin: '10px 0 4px' }}>Very long single word (100px) ✅ identical</div>
          <div style={{ ...box, width: 100, fontSize: 12 }}>
            abcdefghijklmnopqrstuvwxyz0123456789
          </div>
        </div>
      </div>
    </div>
  )
}
`,
}

export default playgroundTabs
