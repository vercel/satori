//#region src/diplomat-wasm.d.ts
type InitInput = string | Request | URL | Response | BufferSource | Buffer | WebAssembly.Module | Promise<Response | BufferSource | Buffer | WebAssembly.Module>;
//#endregion
//#region src/index.d.ts
/**
* TextEngine — satori's text processing abstraction layer.
*
* Implemented by icu4satori, injected via satori's options.textEngine.
* Uses pure JS types, no ICU4X dependency in the interface.
*/
interface TextEngine {
  /**
  * Returns line break positions in the text.
  *
  * Each break includes a position (UTF-16 code unit offset) and a required flag.
  * - required=true: mandatory break (BK/CR/LF/NL per UAX#14 LB4/LB5)
  * - required=false: break opportunity
  *
  * Note: The first break at position=0 from ICU4X is skipped.
  */
  getLineBreaks(text: string, options?: {
    locale?: string;
    wordBreak?: "normal" | "break-all" | "keep-all";
    lineBreak?: "normal" | "loose" | "strict" | "anywhere";
  }): Array<{
    position: number;
    required: boolean;
  }>;
  /** Phase 2 (optional): Split text by word boundaries. */
  segmentWords?(text: string, locale?: string): string[];
  /** Phase 2 (optional): Split text by grapheme cluster boundaries. */
  segmentGraphemes?(text: string, locale?: string): string[];
}
/**
* Initialize the ICU4X WASM module.
* Must be called before createTextEngine().
*/
declare function init(input: InitInput): Promise<void>;
/**
* Create a TextEngine backed by ICU4X WASM + a .postcard data blob.
* init() must be called before this function.
*/
declare function createTextEngine(data: Uint8Array): TextEngine;
//#endregion
export { type InitInput, TextEngine, createTextEngine, init };
//# sourceMappingURL=index.d.mts.map