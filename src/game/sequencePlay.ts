import { mechanismAddress, mechanismWorkedAt, pressAt } from "./mechanismDoors"
import { tileStatus, type TileStatus } from "./sequence"
import type { FloorGrid } from "./siteTypes"

type Place = readonly [number, number]

/**
 * THE WRITES A WALK MAKES TO SEQUENCES: every tile the walker steps onto, in the order the route reaches
 * them, each worked by `pressAt` against what the walk before it left. The cell the walker starts on is
 * not stepped onto. A tile still in fog registers too: a route crossing it walks over it whether or not it was
 * seen. Only moves that change a state are returned.
 */
export const walkPresses = (
  grid: FloorGrid,
  floor: number,
  path: readonly Place[],
  states: ReadonlyMap<string, string>
): { address: string; state: string }[] => {
  const running = new Map(states)
  const writes: { address: string; state: string }[] = []
  for (const [r, c] of path.slice(1)) {
    const cell = grid.cells[r]?.[c]
    if (cell?.type !== "room" || !cell.sequenceTile) continue
    const press = pressAt(grid, floor, r, c, running)
    if (!press) continue
    const record = mechanismWorkedAt(grid, r, c)!.record
    if ((running.get(press.address) ?? record.initial) === press.state) continue
    running.set(press.address, press.state)
    writes.push(press)
  }
  return writes
}

/** How the sequence tile at a cell stands in its sequence's current state; nothing for any other cell. */
export const tileStatusAt = (
  grid: FloorGrid,
  floor: number,
  row: number,
  col: number,
  states: ReadonlyMap<string, string> | undefined
): TileStatus | undefined => {
  const cell = grid.cells[row]?.[col]
  if (cell?.type !== "room" || !cell.sequenceTile) return undefined
  const worked = mechanismWorkedAt(grid, row, col)
  const address = mechanismAddress(grid, floor, row, col)
  if (!worked || !address) return undefined
  return tileStatus(states?.get(address) ?? worked.record.initial, cell.sequenceTile.step)
}
