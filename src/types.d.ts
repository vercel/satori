declare module '@shuding/opentype.js' {
  export = opentype
}

declare module '@fredli74/typr' {
  /**
   *
   * TypeScript class wrapper for Typr.js library
   * Most types are only declared for code completion as the backing library has no idea what it actually parses or creates
   *
   * **/
  export interface Path {
    cmds: string[]
    crds: number[]
  }
  interface headTable {
    tableVersion: number
    fontRevision: number
    checkSumAdjustment: number
    magicNumber: number
    flags: number
    unitsPerEm: number
    created: number
    modified: number
    xMin: number
    yMin: number
    xMax: number
    yMax: number
    macStyle: number
    lowestRecPPEM: number
    fontDirectionHint: number
    indexToLocFormat: number
    glyphDataFormat: number
  }
  interface hheaTable {
    ascender: number
    descender: number
    lineGap: number
    advanceWidthMax: number
    minLeftSideBearing: number
    minRightSideBearing: number
    xMaxExtent: number
    caretSlopeRise: number
    caretSlopeRun: number
    caretOffset: number
    metricDataFormat: number
    numberOfHMetrics: number
  }
  interface hmtxTable {
    aWidth: number[]
    lsBearing: number[]
  }
  interface kernTable {
    glyph1: number[]
    rval: {
      glyph2: number[]
      vals: number[]
    }[]
  }
  interface nameTable {
    copyright: string | undefined
    fontFamily: string | undefined
    fontSubfamily: string | undefined
    ID: string | undefined
    fullName: string | undefined
    version: string | undefined
    postScriptName: string | undefined
    trademark: string | undefined
    manufacturer: string | undefined
    designer: string | undefined
    description: string | undefined
    urlVendor: string | undefined
    urlDesigner: string | undefined
    licence: string | undefined
    licenceURL: string | undefined
    typoFamilyName: string | undefined
    typoSubfamilyName: string | undefined
    compatibleFull: string | undefined
    sampleText: string | undefined
    postScriptCID: string | undefined
    wwsFamilyName: string | undefined
    wwsSubfamilyName: string | undefined
    lightPalette: string | undefined
    darkPalett: string | undefined
  }
  interface cmapTable {
    [key: string]: any
  }
  interface scriptListEntry {
    [lang: string]: {
      features: number[]
      reqFeature: number
    }
  }
  interface featureListEntry {
    tab: number[]
    tag: string
    featureParams?: number
  }
  interface lookupListEntry {
    flag: number
    ltype: number
    tabs: any[]
  }
  interface lctf {
    scriptList: {
      [script: string]: scriptListEntry
    }
    featureList: featureListEntry[]
    lookupList: lookupListEntry[]
  }
  interface GSUBTable extends lctf {}
  interface GPOSTable extends lctf {}
  export class Font {
    _data: any
    cmap?: cmapTable
    head?: headTable
    hhea?: hheaTable
    hmtx?: hmtxTable
    name?: nameTable
    kern?: kernTable
    GSUB?: GSUBTable
    GPOS?: GPOSTable
    constructor(data: ArrayBuffer)
    getFamilyName(): string
    getSubFamilyName(): string
    glyphToPath(gid: number): Path
    getPairAdjustment(gid1: number, gid2: number): number
    stringToGlyphs(str: string): number[]
    glyphsToPath(gls: number[]): Path
    pathToSVG(path: Path, prec?: Number): string
    pathToContext(path: Path, ctx: CanvasRenderingContext2D): void
    /*** Additional features ***/
    lookupFriendlyName(table: string, feature: number): string
    featureFriendlyName(feature: featureListEntry): string
    protected enabledGSUB: {
      [key: number]: number
    }
    enableGSUB(featureNumber: number): void
    disableGSUB(featureNumber: number): void
    codeToGlyph(code: number): number
  }
}
