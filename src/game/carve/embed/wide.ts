import type { CorridorCell, Direction, GridCell } from "../../siteTypes"
import type { Cell } from "../state"
import { dirBetween, keyOf, step } from "./graph"

/** The right-hand side of each way. */
export const RIGHT: Record<Direction, Direction> = { n: "e", e: "s", s: "w", w: "n" }

/** A cell of a second lane, and the index on its way of the cell that lays it. */
export type Lane = { at: Cell; of: number }

/**
 * THE SECOND LANE OF A WIDE STRING. `way` runs from the string's door place at its `a` end to the one at its `b` end.
 * Each cell between them that `wide` names, but the first and the last (the corridor narrows where it meets a piece),
 * lays its second lane on its right-hand side: beside it on a straight, in the inside corner of a bend that turns
 * right, round the outside of one that turns left. A lane cell is laid by the first cell that lays it, and never on
 * the way itself.
 */
export const secondLane = (way: readonly Cell[], wide: (i: number) => boolean): Lane[] => {
  const onWay = new Set(way.map(keyOf))
  const laid = new Set<string>()
  const lanes: Lane[] = []
  for (let i = 2; i < way.length - 2; i++) {
    if (!wide(i)) continue
    const [into, out] = [dirBetween(way[i - 1], way[i]), dirBetween(way[i], way[i + 1])]
    const beside = step(way[i], RIGHT[into])
    const cells = into === out ? [beside] : [beside, step(way[i], RIGHT[out]), step(beside, RIGHT[out])]
    for (const at of cells) {
      if (onWay.has(keyOf(at)) || laid.has(keyOf(at))) continue
      laid.add(keyOf(at))
      lanes.push({ at, of: i })
    }
  }
  return lanes
}

/** The side a cell of a wide string's way has its second lane on: the right-hand side of the way it is entered by. */
export const shoulderAt = (way: readonly Cell[], i: number): Direction => RIGHT[dirBetween(way[i - 1], way[i])]

/** Whether a corridor narrows to one lane beside this cell: a door, a gate, a drop or zipline's run, or a narrow
 * passage. */
export const narrowsLane = (cell: GridCell | undefined): boolean => {
  if (!cell || cell.type === "empty") return false
  if (cell.type === "corridor") return !!(cell.openGate || cell.obstacle)
  return !!(
    cell.requiredKeyId ||
    cell.requiredKeyIds?.length ||
    cell.regionBarrier ||
    cell.passage ||
    cell.webDoor ||
    cell.tags?.includes("gate")
  )
}

/** A second lane's cell: the labels of the lane cell it widens but its ordinal, no way out, and that cell named. It
 * has no ordinal and no slot, so it has no address of its own: a save never names it. */
export const laneCell = (of: GridCell, shoulderOf: string): CorridorCell => {
  if (of.type === "empty") throw new Error(`[carve] a second lane widens no corridor at ${shoulderOf}`)
  const labels = {
    state: of.state,
    difficulty: of.difficulty,
    tileset: of.tileset,
    sectionAddress: of.sectionAddress,
    region: of.region,
    sectionHash: of.sectionHash,
    legacySectionHash: of.legacySectionHash,
    hidden: of.hidden,
  }
  return {
    type: "corridor",
    dirs: new Set(),
    ...Object.fromEntries(Object.entries(labels).filter(([, value]) => value !== undefined)),
    state: of.state,
    shoulderOf,
  }
}
