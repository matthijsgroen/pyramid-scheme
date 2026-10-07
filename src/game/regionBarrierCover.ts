import type { Direction, FloorGrid } from "./siteTypes"

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

const DIR_ORDER: readonly Direction[] = ["n", "e", "s", "w"]

/** One covered cell. `fadeFrom` is set on a first cell in from a way into the region: the sides those ways
 * in are on, where the cover is nothing, thickening across the cell to full at its far edge. Every other
 * covered cell is covered in full. */
export type CoverCell = { at: readonly [number, number]; fadeFrom?: Direction[] }

/** What lies over one shut region barrier's region: the cells drawn there, and on which of them it fades in. */
export type RegionBarrierCover = { region: string; realisation: string; cells: CoverCell[] }

/**
 * The covers a grid shows, one per barred region that still has a shut door. A cell is covered when it
 * is in the region and not fogged — so ground the player cannot see past the blockage (concealment)
 * carries none. The cover fades in across the first cell in from each way into the region, so it starts
 * at the edge the player steps in from, and is full from the second cell in and on the blockage itself.
 * Derived on every draw and stored nowhere; an open barrier has no door and so no cover.
 */
export const regionBarrierCovers = (grid: FloorGrid): RegionBarrierCover[] => {
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
  return [...doors].map(([region, { realisation, at: blockage }]) => {
    const cells: CoverCell[] = []
    grid.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.type === "empty" || cell.region !== region || cell.state === "fogged") return
        const waysIn = DIR_ORDER.filter(dir => {
          if (!cell.dirs.has(dir)) return false
          const next = grid.cells[r + MOVES[dir][0]]?.[c + MOVES[dir][1]]
          return next !== undefined && next.type !== "empty" && next.region !== region
        })
        cells.push(waysIn.length > 0 && !blockage.has(`${r},${c}`) ? { at: [r, c], fadeFrom: waysIn } : { at: [r, c] })
      })
    )
    return { region, realisation, cells }
  })
}
