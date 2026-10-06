import type { FloorGrid, GridCell } from "../game/siteTypes"
import { regionsOf } from "../game/floorLock"
import { walkLock, type LockSpec } from "../game/lockWalk"

export const authoredRegionOf = (cell: GridCell | undefined): string | undefined =>
  cell && (cell.type === "room" || cell.type === "corridor") ? cell.region : undefined

// The authored regions each compiled region holds ground of, door regions left out: a door is a gate's
// own region and stands on a boundary rather than inside a region.
export const authoredByCompiled = (grid: FloorGrid): Map<string, Set<string>> => {
  const { of } = regionsOf(grid)
  const held = new Map<string, Set<string>>()
  for (const [key, id] of of) {
    if (id.startsWith("door ")) continue
    const [r, c] = key.split(",").map(Number)
    const region = authoredRegionOf(grid.cells[r][c])
    if (region === undefined) continue
    held.set(id, (held.get(id) ?? new Set()).add(region))
  }
  return held
}

export const authoredPairOf = (held: Map<string, Set<string>>, a: string, b: string): string =>
  [...(held.get(a) ?? []), ...(held.get(b) ?? [])].sort().join("|")

// The same floor read as if the author had written no regions: the flood is the one it ran before an
// authored region bounded it.
export const withoutLayout = (grid: FloorGrid): FloorGrid => ({
  ...grid,
  cells: grid.cells.map(row =>
    row.map(cell => {
      if (cell.type !== "room" && cell.type !== "corridor") return cell
      const { region: _region, ...rest } = cell
      return rest as GridCell
    })
  ),
})

export const failureOf = (lock: LockSpec) => {
  const result = walkLock(lock)
  return result.sound ? "sound" : result.failure.type
}
