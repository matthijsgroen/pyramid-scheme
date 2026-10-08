import { reachFrom } from "./concealment"
import type { Direction, FloorGrid } from "./siteTypes"

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

const DIR_ORDER: readonly Direction[] = ["n", "e", "s", "w"]

/** One covered cell. `fadeFrom` is set on a blockage: the sides the explorer walks up to it from, where the
 * cover is nothing, thickening across the cell to full at its far edge. Every other covered cell is covered
 * in full. */
export type CoverCell = { at: readonly [number, number]; fadeFrom?: Direction[] }

/** What lies over one shut region barrier's region: the cells drawn there, and on which of them it fades in. */
export type RegionBarrierCover = { region: string; realisation: string; cells: CoverCell[] }

/**
 * The covers a grid shows, one per barred region that still has a shut door. The cover lies exactly where
 * the explorer cannot walk: on the region's doors (the blockage), wherever the carve put them, and on every
 * cell of the region he cannot reach from `from` with the doors shut, walked before or not. The region's
 * ground on his side of a door stays dry. A door fades in from the sides he walks up to it from, clear at
 * that edge and full at its far edge; everything else is full. Fogged ground carries none. Derived on every
 * draw and stored nowhere; an open barrier has no door and so no cover.
 */
export const regionBarrierCovers = (
  grid: FloorGrid,
  from: readonly [number, number] = grid.entrancePos
): RegionBarrierCover[] => {
  const doors = new Map<string, { realisation: string; at: Set<string> }>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "room" || !cell.regionBarrier) return
      const { region, realisation } = cell.regionBarrier
      const found = doors.get(region) ?? { realisation, at: new Set<string>() }
      found.at.add(`${r},${c}`)
      doors.set(region, found)
    })
  )
  if (doors.size === 0) return []
  const isDoor = (key: string) => [...doors.values()].some(({ at }) => at.has(key))
  const dry = new Set(
    [...reachFrom(grid, from, cell => cell.type === "room" && cell.regionBarrier !== undefined)].filter(
      key => !isDoor(key)
    )
  )
  return [...doors].map(([region, { realisation, at: blockage }]) => {
    const cells: CoverCell[] = []
    grid.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        const key = `${r},${c}`
        if (cell.type === "empty" || cell.state === "fogged" || dry.has(key)) return
        if (!blockage.has(key) && cell.region !== region) return
        const fadeFrom = DIR_ORDER.filter(
          dir => cell.dirs.has(dir) && dry.has(`${r + MOVES[dir][0]},${c + MOVES[dir][1]}`)
        )
        cells.push(fadeFrom.length > 0 ? { at: [r, c], fadeFrom } : { at: [r, c] })
      })
    )
    return { region, realisation, cells }
  })
}
