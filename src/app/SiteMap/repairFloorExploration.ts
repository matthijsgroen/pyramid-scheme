import { computeFloorExploration, type FloorExploration } from "./floorExploration"
import { applyExplored } from "./useAssembledFloor"
import type { FloorGrid } from "@/game/siteTypes"
import { cellKey, cellSlot, type AssembleFor } from "./cellIdentity"

type Repairable = {
  /** Keyed `${levelNr}:${floorIndex}` — the summaries to re-derive. */
  floorExploration?: Record<string, FloorExploration>
  /** Keyed `${levelNr}:${sectionAddress}` — what a floor is restored from. */
  exploredCells?: Record<string, string[]>
  /** Keyed `${levelNr}:${sectionAddress}` — hidden sections the detector has already turned up. */
  foundHiddenCorridors?: string[]
  /** Which level the journey stands on. Everything below it has been finished at least once. */
  levelNr: number
  /** Above zero, the whole journey has been finished, so every one of its levels has. */
  completionCount: number
}

export type RepairedExploration = {
  exploredCells: Record<string, string[]>
  floorExploration: Record<string, FloorExploration>
}

/**
 * A save's floor summaries, put right without sending the player to look.
 *
 * THE SUMMARY IS A SNAPSHOT, AND A SNAPSHOT CAN OUTLIVE WHAT IT DESCRIBES. It is written when the
 * player arrives on a floor and again when they leave, so a visit that never ends — the app killed,
 * the tab closed — leaves the previous verdict standing. That verdict is what lights a pyramid on the
 * map, and a pyramid lit over a ward door the player has already opened and emptied sends them back
 * for nothing. Healing it on the next visit is no cure: the trip IS the damage.
 *
 * So the floor is read here instead, from `exploredCells` — the record of what the player has opened
 * and walked, written as they go rather than in one lump at the end.
 *
 * THE RECORD IS MENDED FIRST, because a summary read off a floor that is missing something is just a
 * different wrong answer. One thing is missing from every save written before the way out was recorded
 * (useSiteNavigation): the exit slot. It is the last slot along its chain, and the furthest named ROOM
 * is what sets a section's high-water mark — the only thing that brings a corridor back once a floor
 * is re-carved, since a corridor is filed under its carve-bound `~ordinal`. Without the door, every
 * corridor between the last room and it sits past the mark and comes back fogged, on every floor the
 * player walked to its end.
 *
 * That fact is recoverable rather than lost: a level the player has FINISHED was left through its
 * exit, because finishing the interior is what walking into the exit chamber leads to (useSiteExit,
 * then `interiorComplete`). So the exit is written down for those levels and the mark reaches the door
 * again — which is a repair of the exploration itself, not a correction applied to the summary, so the
 * map draws the same floor the marker is describing.
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
export const repairFloorExploration = (stored: Repairable, assembleFor: AssembleFor): RepairedExploration => {
  const exploredCells: Record<string, string[]> = Object.fromEntries(
    Object.entries(stored.exploredCells ?? {}).map(([section, keys]) => [section, [...keys]])
  )
  const floorExploration: Record<string, FloorExploration> = {}

  for (const key of Object.keys(stored.floorExploration ?? {})) {
    const [levelNr, floor] = key.split(":").map(Number)
    if (!Number.isFinite(levelNr) || !Number.isFinite(floor)) continue
    const grid = assembleFor(levelNr, floor)
    if (!grid) continue
    const prefix = `${levelNr}:`

    if (stored.completionCount > 0 || levelNr < stored.levelNr) {
      const exit = exitOf(grid, floor)
      if (exit) {
        const section = `${prefix}${exit.section}`
        const held = exploredCells[section] ?? []
        if (!held.includes(exit.key)) exploredCells[section] = [...held, exit.key]
      }
    }

    const cells: Record<string, string[]> = {}
    for (const [section, keys] of Object.entries(exploredCells))
      if (section.startsWith(prefix)) cells[section.slice(prefix.length)] = keys
    const revealed = new Set(
      (stored.foundHiddenCorridors ?? []).filter(e => e.startsWith(prefix)).map(e => e.slice(prefix.length))
    )
    floorExploration[key] = computeFloorExploration(applyExplored(reveal(grid, revealed), floor, cells))
  }

  return { exploredCells, floorExploration }
}

/** The way out of this floor, if it has one — a staircase floor does not, and its stairs are recorded
 * as the player uses them, so its mark already reaches the end of the chain. */
const exitOf = (grid: FloorGrid, floor: number): { section: string; key: string } | null => {
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (cellSlot(grid, r, c) !== "exit") continue
      const cell = grid.cells[r][c]
      const key = cellKey(grid, floor, r, c)
      if (cell.type === "empty" || !key || cell.sectionAddress === undefined) continue
      return { section: cell.sectionAddress, key }
    }
  }
  return null
}

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
