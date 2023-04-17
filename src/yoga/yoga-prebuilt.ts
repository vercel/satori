export async function getYogaModule() {
  const { default: initYoga } = await import('yoga-wasm-web/asm')
  return initYoga()
}
