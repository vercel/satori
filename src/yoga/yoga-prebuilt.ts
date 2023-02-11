export async function getYogaModule() {
  const initYoga = await import('yoga-wasm-web/asm')
  if (initYoga.default) {
    return initYoga.default()
  }
  return initYoga()
}
