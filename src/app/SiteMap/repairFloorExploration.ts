import { computeFloorExploration, type FloorExploration } from "./floorExploration"
import { applyExplored } from "./useAssembledFloor"
import type { FloorGrid } from "@/game/siteTypes"
import { cellKey, cellSlot, walkPosition, type AssembleFor } from "./cellIdentity"

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
 * A save's floor summaries, put right without sending the player to look — the trip is the cost a
 * wrong summary imposes, so healing one on arrival heals nothing.
 *
 * The record is mended before it is read. A corridor is filed under its carve-bound `~ordinal`, so a
 * re-carve unfiles it and only the section's high-water mark brings it back — and that mark reaches
 * no further than the furthest named ROOM. Saves written before the exit was recorded are missing
 * that slot, which is the last along the chain, so every corridor past the last room comes back
 * fogged. A FINISHED level was left through its exit, so the slot is known rather than guessed.
 *
 * Hidden sections need no masking: `computeFloorExploration` skips a hidden cell and the route walk
 * will not pass through one. A section the detector has found is un-hidden, because the map draws it.
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
      const section = exit && `${prefix}${exit.section}`
      const held = (section && exploredCells[section]) || []
      // A finished level was left through AN exit, but most sites carry one on every floor and only
      // one of them was used. What says this is the one: the last room before it was walked. Without
      // that, a floor the player only passed through would have its tail marked walked as well.
      if (exit && section && !held.includes(exit.key) && (!exit.lastRoomKey || held.includes(exit.lastRoomKey)))
        exploredCells[section] = [...held, exit.key]
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

type Exit = { section: string; key: string; lastRoomKey: string | null }

/** The way out of this floor, with the last authored room standing before it on the same chain — the
 * evidence that the player came this way. Null when the floor has no exit of its own. */
const exitOf = (grid: FloorGrid, floor: number): Exit | null => {
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (cellSlot(grid, r, c) !== "exit") continue
      const cell = grid.cells[r][c]
      const key = cellKey(grid, floor, r, c)
      if (cell.type === "empty" || !key || cell.sectionAddress === undefined || !cell.ordinal) continue
      return {
        section: cell.sectionAddress,
        key,
        lastRoomKey: lastRoomBefore(grid, floor, cell.sectionAddress, cell.ordinal),
      }
    }
  }
  return null
}

/** The furthest room along a section's chain that stands before `ordinal`. Corridors are skipped: they
 * carry no authored slot, so a save cannot say whether one was walked once the floor has moved. */
const lastRoomBefore = (grid: FloorGrid, floor: number, section: string, ordinal: string): string | null => {
  const limit = walkPosition(ordinal)
  let bestAt = -Infinity
  let best: string | null = null
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "empty" || cell.sectionAddress !== section || !cell.ordinal) continue
      const slot = cellSlot(grid, r, c)
      if (!slot || slot === "exit" || slot === "entrance" || slot.startsWith("stair:")) continue
      const at = walkPosition(cell.ordinal)
      if (at >= limit || at <= bestAt) continue
      bestAt = at
      best = cellKey(grid, floor, r, c)
    }
  }
  return best
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
