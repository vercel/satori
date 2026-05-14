# icu4satori

[ICU4X](https://github.com/unicode-org/icu4x)-powered text engine for [satori](https://github.com/vercel/satori).

Replaces satori's `linebreak` dependency with ICU4X's UAX#14 implementation, providing correct line breaking for all languages — including Thai, Burmese, Khmer, and modern Emoji ZWJ sequences.

## Why

satori's current `linebreak` package is based on an old version of UAX#14 and does not support complex-script word segmentation (Thai, Burmese, Khmer, Lao) or modern Emoji ZWJ sequences. icu4satori uses ICU4X's `LineSegmenter` — the same Unicode implementation used in Firefox, Chrome, and Android — compiled to a ~96 KB WASM binary.

## Usage

```bash
npm install icu4satori
```

```ts
import { init, createTextEngine } from 'icu4satori'
import satori from 'satori'

// 1. Initialize the WASM module
//    Accepts the same flexible input as satori's own init():
//    URL, string path, Buffer, ArrayBuffer, Response, or WebAssembly.Module
await init(new URL('icu4satori/wasm', import.meta.url))

// 2. Load the Unicode data blob and create the text engine
const data = await fetch(new URL('icu4satori/data', import.meta.url))
  .then((r) => r.arrayBuffer())
  .then((buf) => new Uint8Array(buf))

const textEngine = createTextEngine(data)

// 3. Pass textEngine to satori — everything else works as before
const svg = await satori(<div>สวัสดีชาวโลก</div>, {
  width: 600,
  height: 400,
  fonts: [...],
  textEngine,
})
```

The `textEngine` option is purely additive: omitting it falls back to the existing `linebreak` behavior with no behavior change.

## Data Blob Size

The `.postcard` data blob ships in two configurations:

| Variant | Size | Complex Script Support |
|---------|------|------------------------|
| `auto` (default) | ~348 KB | ✅ Thai, Burmese, Khmer, Lao (LSTM model) |
| `forNonComplexScripts` | ~29 KB | ❌ CJK, Latin, Emoji, etc. |

The package ships the `auto` blob at `icu4satori/data`. CJK line breaking (UAX#14 rule-based) is included in both variants.

## API

```ts
// Initialize ICU4X WASM. Must be called once before createTextEngine().
function init(input: InitInput): Promise<void>

// Create a TextEngine from a .postcard data blob.
// The returned object implements satori's TextEngine interface.
function createTextEngine(data: Uint8Array): TextEngine

// The TextEngine interface (implemented by this package, consumed by satori)
interface TextEngine {
  getLineBreaks(
    text: string,
    options?: {
      locale?: string
      wordBreak?: 'normal' | 'break-all' | 'keep-all'
      lineBreak?: 'normal' | 'loose' | 'strict' | 'anywhere'
    }
  ): Array<{ position: number; required: boolean }>
}
```

## Package Exports

```
icu4satori        → dist/index.mjs  (main JS bundle)
icu4satori/wasm   → wasm/icu_capi.wasm
icu4satori/data   → wasm/data.postcard
```

## Roadmap

Line breaking (Phase 1) is the first and highest-priority replacement. The `TextEngine` interface is designed to be extended incrementally — future phases will add more ICU4X-backed capabilities as optional methods on the same interface:

| Phase | Feature | Replaces | Status |
|-------|---------|----------|--------|
| 1 | Line Breaking | `linebreak` npm package | ✅ This PR |
| 2 | Word & Grapheme Segmentation | `Intl.Segmenter` | Interface defined, implementation planned |
| 3 | Emoji / Symbol / Word Separator Detection | `emoji-regex-xs`, hardcoded arrays | Planned |
| 4 | Script Detection | Manual regex per script | Planned |
| 5 | Case Mapping | `toLocaleUpperCase/LowerCase` | Planned |
| 7+ | BiDi, Text Normalization, Locale Canonicalization | (new capabilities) | Future |

All replacements are additive and opt-in. Phases 2–5 are drop-in improvements; Phase 7+ enables entirely new capabilities (e.g. RTL text support) that satori does not currently have.

---

## For Maintainers

### Project Structure

```
packages/icu4satori/
├── src/                    # TypeScript source
│   ├── index.ts            # Public API: init(), createTextEngine(), TextEngine
│   └── diplomat-wasm.ts    # Deferred WASM loader
├── vendor/                 # .gitignored — diplomat-generated JS bindings
├── wasm/                   # Tracked in git — pre-built binaries
│   ├── icu_capi.wasm       # Pre-built ICU4X WASM (~96 KB)
│   └── data.postcard       # Pre-built Unicode data blob (~348 KB)
├── build/                  # Rust/WASM build system
│   ├── Makefile
│   ├── Cargo.toml          # icu_capi dependency + feature flags
│   └── ld.py               # Custom linker script for wasm-ld
├── dist/                   # .gitignored — tsdown output
├── package.json
└── tsdown.config.ts
```

### JS/TS Build (daily development)

Prerequisites: Node.js ≥ 18, pnpm, `jq`

```bash
pnpm install    # from satori root
pnpm build      # builds dist/index.mjs + dist/index.d.mts
pnpm dev        # watch mode
```

The `prebuild` script automatically runs `make -C build vendor` to populate `vendor/` if it is missing. The `wasm/` directory is tracked in git, so no Rust toolchain is needed for normal development.

### Rust/WASM Build (for maintainers)

This is only needed when upgrading ICU4X or changing WASM feature flags.

Additional prerequisites:
- Rust (via [rustup](https://rustup.rs)) — the Makefile automatically installs the required nightly toolchain
- `wasm-ld` (macOS: `brew install llvm`)

```bash
# From packages/icu4satori/
make -C build build    # Full rebuild: compile WASM + regenerate vendor bindings
make -C build wasm     # Compile WASM only → wasm/icu_capi.wasm
make -C build vendor   # Regenerate vendor/ JS bindings only (no Rust compilation)
make -C build clean    # Remove build artifacts
```

### Upgrading ICU4X

1. Update the `icu_capi` version in `build/Cargo.toml`
2. Run `make -C build build` to recompile WASM and regenerate vendor bindings
3. Regenerate `data.postcard` if data tables changed (see [ICU4X datagen docs](https://github.com/unicode-org/icu4x/blob/main/tutorials/data-management.md))
4. Run `pnpm build && pnpm test` from the satori root to verify
5. Commit the updated `wasm/icu_capi.wasm`, `wasm/data.postcard`, and `build/Cargo.lock`

### Architecture Notes

**Deferred WASM Loading**: The diplomat-generated `diplomat-wasm.mjs` uses top-level `await` which is incompatible with Next.js webpack. We replace it with a Proxy-based deferred loader (`src/diplomat-wasm.ts`) that delays all WASM access until `init()` is called.

**Runtime Data Only**: ICU4X's `compiled_data` feature (which bakes Unicode tables into the WASM binary) is intentionally disabled. All data is loaded at runtime from an external `.postcard` blob via `DataProvider.fromByteSlice()`. This keeps the WASM binary small (~96 KB) and allows users to choose data precision.
