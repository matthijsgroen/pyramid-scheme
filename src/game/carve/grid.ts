import type { Direction } from "../siteTypes"

export const DIRS: Array<[number, number]> = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
]

// Real path nodes live only on even/even grid coordinates, two cells apart in any
// direction — the cell directly between two connected nodes is a plain corridor
// connector. This guarantees a genuine empty gap wherever the maze winds back near
// itself (a switchback's two strands are never directly adjacent, only ever
// diagonally so), instead of a dense maze where every single cell is real path and
// parallel strands can end up touching with nothing but a thin wall between them.
export const NODE_STEP = 2
export const DIRS2: Array<[number, number]> = [
  [-NODE_STEP, 0],
  [0, NODE_STEP],
  [NODE_STEP, 0],
  [0, -NODE_STEP],
]
export const CONNECTOR_DIRS: Array<[number, number, Direction]> = [
  [-NODE_STEP, 0, "n"],
  [0, NODE_STEP, "e"],
  [NODE_STEP, 0, "s"],
  [0, -NODE_STEP, "w"],
]
export const OPPOSITE: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }

/** The key of the passage between two nodes on an `n`-wide grid, the same whichever end it is read from. */
export const makePkey = (n: number) => (r1: number, c1: number, r2: number, c2: number) => {
  const a = r1 * n + c1,
    b = r2 * n + c2
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

// Spreads `count` content items evenly across [startIdx, totalLen-2], reserving the final
// index for the chain's own terminal room (the main path's goal+exit; a section's end room)
// and everything before `startIdx` for whatever already occupies the head (the entrance;
// a section's gate room, if any). Same technique for the main path and every section/
// sub-section chain, so a padded (packing-scaled) chain gets its content interleaved with
// the extra room instead of packed at the front with all the padding trailing behind it.
export const spreadContentIndices = (count: number, startIdx: number, totalLen: number): number[] => {
  const indices: number[] = []
  if (count === 0) return indices
  const used = new Set<number>()
  const lastIdx = totalLen - 2 // reserve the final index for the terminal room
  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1)
    let idx = Math.round(startIdx + t * (lastIdx - startIdx))
    idx = Math.max(startIdx, Math.min(lastIdx, idx))
    while (used.has(idx) && idx < lastIdx) idx++
    while (used.has(idx) && idx > startIdx) idx--
    used.add(idx)
    indices.push(idx)
  }
  indices.sort((a, b) => a - b)
  return indices
}
