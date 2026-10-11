declare module '@shuding/opentype.js' {
  export = opentype
}

declare module '*.wasm' {
  const bytes: Uint8Array
  export default bytes
}
