import type { Direction, FloorGrid } from "./siteTypes"

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

const DIR_ORDER: readonly Direction[] = ["n", "e", "s", "w"]

/** One covered cell. `fadeFrom` is set on a blockage: the sides the explorer walks up to it from, where the
 * cover is nothing, thickening across the cell to full at its far edge. Every other covered cell is covered
 * in full. */
export type CoverCell = { at: readonly [number, number]; fadeFrom?: Direction[] }

/** What lies over one shut region barrier's region: the cells drawn there, and on which of them it fades in. */
export type RegionBarrierCover = { region: string; realisation: string; cells: CoverCell[] }

/** Every cell reached along the grid's passages from the ground outside `region` without entering one of
 * its doors: the dry ground, the region's own approach to its doors included. Read off the carve, not off
 * what is explored, so the waterline does not move as the player looks around. */
const dryGround = (grid: FloorGrid, region: string, doors: ReadonlySet<string>): Set<string> => {
  const dry = new Set<string>()
  const queue: [number, number][] = []
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type === "empty" || cell.region === region) return
      dry.add(`${r},${c}`)
      queue.push([r, c])
    })
  )
  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    const cell = grid.cells[r][c]
    if (cell.type === "empty") continue
    for (const dir of cell.dirs) {
      const [nr, nc] = [r + MOVES[dir][0], c + MOVES[dir][1]]
      const key = `${nr},${nc}`
      const next = grid.cells[nr]?.[nc]
      if (!next || next.type === "empty" || dry.has(key) || doors.has(key)) continue
      dry.add(key)
      queue.push([nr, nc])
    }
  }
  return dry
}

/**
 * The covers a grid shows, one per barred region that still has a shut door. The cover lies only where the
 * explorer cannot walk: on the region's doors (the blockage) and on the region past them, never on the
 * region's ground before a door. A door fades in from the sides the explorer walks up to it from, clear at
 * that edge and full at its far edge; everything past it is full. Fogged ground (concealment) carries none.
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
    const dry = dryGround(grid, region, blockage)
    const cells: CoverCell[] = []
    grid.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.type === "empty" || cell.region !== region || cell.state === "fogged" || dry.has(`${r},${c}`)) return
        const fadeFrom = DIR_ORDER.filter(
          dir => cell.dirs.has(dir) && dry.has(`${r + MOVES[dir][0]},${c + MOVES[dir][1]}`)
        )
        cells.push(fadeFrom.length > 0 ? { at: [r, c], fadeFrom } : { at: [r, c] })
      })
    )
    return { region, realisation, cells }
  })
}
