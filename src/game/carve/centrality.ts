import { distancesFrom } from "../gridNavigation"
import type { FloorGrid } from "../siteTypes"

type Cell = readonly [number, number]

/** How central each room sits on the floor, keyed "r,c": 1 in the middle, 0 at the ends. A room's
 * eccentricity is its greatest walking distance to any dead end (a cell with one exit); the floor's
 * smallest eccentricity scores 1 and its largest 0. A floor without dead ends, or rooms all equally
 * far, score 1 throughout. */
export const centrality = (grid: FloorGrid, rooms: readonly Cell[]): ReadonlyMap<string, number> => {
  const deadEnds: Cell[] = []
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "empty" && cell.dirs.size === 1) deadEnds.push([r, c])
    })
  )
  const fromEnds = deadEnds.map(end => distancesFrom(grid, end))
  const ecc = rooms.map(([r, c]) => Math.max(0, ...fromEnds.map(d => d.get(`${r},${c}`) ?? 0)))
  const lo = Math.min(...ecc)
  const hi = Math.max(...ecc)
  return new Map(rooms.map(([r, c], i) => [`${r},${c}`, hi === lo ? 1 : 1 - (ecc[i] - lo) / (hi - lo)]))
}
