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
