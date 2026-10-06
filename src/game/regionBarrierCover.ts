import type { Direction, FloorGrid } from "./siteTypes"

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

/** How many cells in from a way into the region the cover takes to reach full: nothing at the way in's edge, all of it from here on. */
export const COVER_FADE_CELLS = 2

/** The cover's strength at a cell's centre, `steps` cells in from the nearest way into the region (the first cell in is 1). */
export const coverOpacity = (steps: number): number => Math.min(1, Math.max(0, (steps - 0.5) / COVER_FADE_CELLS))

export type CoverCell = { at: readonly [number, number]; opacity: number }

/** What lies over one shut region barrier's region: the cells drawn there, each with how thick the cover is on it. */
export type RegionBarrierCover = { region: string; realisation: string; cells: CoverCell[] }

/**
 * The covers a grid shows, one per barred region that still has a shut door. A cell is covered when it
 * is in the region and not fogged — so ground the player cannot see past the blockage (concealment)
 * carries none — and the cover thins toward each way into the region and is full at the blockage, which is
 * the door itself. Derived on every draw and stored nowhere; an open barrier has no door and so no cover.
 */
export const regionBarrierCovers = (grid: FloorGrid): RegionBarrierCover[] => {
  const doors = new Map<string, { realisation: string; at: [number, number][] }>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "room" || !cell.regionBarrier) return
      const { region, realisation } = cell.regionBarrier
      const found = doors.get(region) ?? { realisation, at: [] }
      found.at.push([r, c])
      doors.set(region, found)
    })
  )
  return [...doors].map(([region, { realisation, at }]) => {
    const drawn = (r: number, c: number) => {
      const cell = grid.cells[r]?.[c]
      return cell !== undefined && cell.type !== "empty" && cell.region === region && cell.state !== "fogged"
    }
    const steps = new Map<string, number>()
    const queue: [number, number][] = []
    grid.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.type === "empty" || !drawn(r, c)) return
        const wayIn = [...cell.dirs].some(dir => {
          const next = grid.cells[r + MOVES[dir][0]]?.[c + MOVES[dir][1]]
          return next !== undefined && next.type !== "empty" && next.region !== region
        })
        if (!wayIn) return
        steps.set(`${r},${c}`, 1)
        queue.push([r, c])
      })
    )
    for (let i = 0; i < queue.length; i++) {
      const [r, c] = queue[i]
      const cell = grid.cells[r][c]
      if (cell.type === "empty") continue
      for (const dir of cell.dirs) {
        const nr = r + MOVES[dir][0]
        const nc = c + MOVES[dir][1]
        if (!drawn(nr, nc) || steps.has(`${nr},${nc}`)) continue
        steps.set(`${nr},${nc}`, steps.get(`${r},${c}`)! + 1)
        queue.push([nr, nc])
      }
    }
    const blockage = new Set(at.map(([r, c]) => `${r},${c}`))
    const cells: CoverCell[] = []
    grid.cells.forEach((row, r) =>
      row.forEach((_, c) => {
        if (!drawn(r, c)) return
        const key = `${r},${c}`
        // A cell no way in reaches (a drop's landing) is covered in full, as is the blockage itself.
        const opacity = blockage.has(key) || !steps.has(key) ? 1 : coverOpacity(steps.get(key)!)
        cells.push({ at: [r, c], opacity })
      })
    )
    return { region, realisation, cells }
  })
}
