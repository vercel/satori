export default async function getYoga() {
  const initYoga = await import('yoga-wasm-web/asm')
  const yoga = initYoga()
  return yoga
}
