let Resvg: any

export function initResvg(resvg: any) {
  Resvg = resvg
}

export default function getResvg() {
  return Resvg
}
