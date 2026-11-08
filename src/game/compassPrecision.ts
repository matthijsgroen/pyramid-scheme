import type { CompassHit } from "./siteTypes"

export const uniqueBy = <T>(items: T[], key: (item: T) => string): T[] => {
  const seen = new Set<string>()
  return items.filter(item => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// Precision narrows inward with level (collection-and-detector-design.md): L1 pyramid, L2 +floor, L3 +exact cell. The key
// collapses hits to the shown precision so lower levels don't list the same pyramid/floor twice —
// L1 keys on the PYRAMID (journey + level), since a journey holds several and naming only the
// journey would be a whole expedition rather than the "which pyramid" the design specifies.
export const compassKey = (r: CompassHit, level: number): string =>
  level <= 1
    ? `${r.journeyId}:${r.levelIdx}`
    : level === 2
      ? `${r.journeyId}:${r.levelIdx}:${r.floorIdx}`
      : `${r.journeyId}:${r.levelIdx}:${r.floorIdx}:${r.cell?.row},${r.cell?.col}`

export const compassLabel = (r: CompassHit, level: number, journeyName: (id: string) => string): string => {
  // L#/F# keeps the shipped notation (# = pyramid, then floor); only the journey id → name changes.
  const pyramid = `${journeyName(r.journeyId)} L${r.levelIdx + 1}`
  if (level <= 1) return pyramid
  const floor = `${pyramid} F${r.floorIdx + 1}`
  return level >= 3 && r.cell ? `${floor} · (${r.cell.row},${r.cell.col})` : floor
}
