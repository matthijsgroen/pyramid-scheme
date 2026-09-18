import { computeFloorExploration, type FloorExploration } from "./floorExploration"
import { applyExplored } from "./useAssembledFloor"
import type { FloorGrid } from "@/game/siteTypes"
import type { AssembleFor } from "./cellIdentity"

type Rederivable = {
  /** Keyed `${levelNr}:${floorIndex}` — the summaries to re-derive. */
  floorExploration?: Record<string, FloorExploration>
  /** Keyed `${levelNr}:${sectionAddress}` — what the floor is restored from. */
  exploredCells?: Record<string, string[]>
  /** Keyed `${levelNr}:${sectionAddress}` — hidden sections the detector has already turned up. */
  foundHiddenCorridors?: string[]
}

/**
 * Every floor summary a save holds, recomputed from the floor as the player would find it.
 *
 * THE SUMMARY IS A SNAPSHOT, AND A SNAPSHOT CAN OUTLIVE WHAT IT DESCRIBES. It is written when the
 * player arrives on a floor and again when they leave, so a visit that never ends — the app killed,
 * the tab closed — leaves the previous verdict standing. That verdict is what lights a pyramid on the
 * map, and a pyramid lit over a ward door the player has already opened and emptied sends them back
 * for nothing. Healing it on the next visit is no cure: the trip IS the damage.
 *
 * So it is re-derived without going there. `exploredCells` is the record of what the player has
 * actually opened and walked, and it is written as they go, never in one lump at the end — so
 * restoring a floor from it and reading the result gives the same answer a visit would, one launch
 * earlier and with no journey.
 *
 * Only the floors the save already names are assembled; nothing sweeps the world. A floor the save
 * names that no longer assembles (its site is gone, or shorter than it was) drops its entry rather
 * than keeping a claim nothing can check.
 *
 * Hidden sections are not masked out here the way the live map masks them, because they need not be:
 * `computeFloorExploration` skips a hidden cell, and the route walk refuses to pass through one, so an
 * unfound corridor and everything behind it stay the 👁 marker's business either way. A section the
 * detector HAS turned up is a different matter — the map shows it, so it is un-hidden here too, or
 * what the player can already see would go unclaimed.
 */
/** The same floor with the sections the detector has found no longer hidden — what the map draws once
 * the player has uncovered a passage. Untouched when nothing has been found, which is most floors. */
const reveal = (grid: FloorGrid, revealed: ReadonlySet<string>): FloorGrid => {
  if (revealed.size === 0) return grid
  return {
    ...grid,
    cells: grid.cells.map(row =>
      row.map(cell =>
        cell.type !== "empty" && cell.hidden && revealed.has(cell.sectionAddress ?? "")
          ? { ...cell, hidden: false }
          : cell
      )
    ),
  }
}

export const rederiveFloorExploration = (
  stored: Rederivable,
  assembleFor: AssembleFor
): Record<string, FloorExploration> => {
  const result: Record<string, FloorExploration> = {}
  for (const key of Object.keys(stored.floorExploration ?? {})) {
    const [levelNr, floor] = key.split(":").map(Number)
    if (!Number.isFinite(levelNr) || !Number.isFinite(floor)) continue
    const grid = assembleFor(levelNr, floor)
    if (!grid) continue
    const prefix = `${levelNr}:`
    const cells: Record<string, string[]> = {}
    for (const [section, keys] of Object.entries(stored.exploredCells ?? {}))
      if (section.startsWith(prefix)) cells[section.slice(prefix.length)] = keys
    const revealed = new Set(
      (stored.foundHiddenCorridors ?? []).filter(e => e.startsWith(prefix)).map(e => e.slice(prefix.length))
    )
    result[key] = computeFloorExploration(applyExplored(reveal(grid, revealed), floor, cells))
  }
  return result
}
