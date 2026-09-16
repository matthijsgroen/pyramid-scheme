import { useMemo } from "react"
import { assembleFloor } from "@/game/siteAssembler"
import { completeCell } from "@/game/gridNavigation"
import type { Direction, FloorConfig, FloorGrid, GridCell } from "@/game/siteTypes"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import type { ResolveKeyRequirements } from "@/game/siteAssembler"
import { boardIndexesForFloor } from "./boardIndexes"
import { cellKey, cellSlot, findByAddress, floorOfAddress, walkPosition } from "./cellIdentity"

// A node's own key requirements, resolved from whichever family declares them (a tableau's
// hieroglyphs, etc.) — the same dispatch world-gen uses, but off the app-side family registry so
// this module names no mod. Populates each room's `requiredKeyIds` at assembly time so runtime
// consumers (the "still stuff to find" marker) can read a node's exposed keys uniformly with a
// gate's key. Inert for play — no other runtime code gates on requiredKeyIds.
const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx)

/**
 * Restore one floor's exploration from the cell keys a save holds, never from the coordinates beside
 * them (docs/instructions/world-reshape-release.md). A coordinate only names a cell on the carve it was
 * written against, so reading one against a re-carved floor marks rooms explored that were never opened
 * — including the ones holding keys.
 *
 * A cell comes back explored for either of two reasons:
 *
 * 1. **The save names it.** Every cell the player walked is written down, so within one carve this
 *    restores the floor exactly, corridor by corridor, the way it always has.
 * 2. **It is behind the high-water mark.** A corridor's key is carve-bound and stops matching once the
 *    floor moves — after a compaction there is a different number of corridors and they are not the
 *    same ones. A ROOM's key is authored and does not move, so the furthest room of each section the
 *    save reached is measured along THIS carve's walk, and everything up to it comes back with it. A
 *    section is a linear chain, so how far along it the player got outlives the carve.
 *
 * A ROOM itself is never restored by the mark, only by rule 1: a looted room is remembered by nothing
 * but its own entry, so a chest must never come back opened because something past it was reached.
 *
 * A section the save no longer matches at all gets no mark and stays fogged, which is the reset it
 * should be.
 */
const applyExplored = (grid: FloorGrid, floor: number, exploredCells: Record<string, string[]>): FloorGrid => {
  // Filed by the section's AUTHORING address, so re-authoring what is inside a section no longer makes
  // it a different section. There is no older address format to fall back to: a save still holding the
  // structural hashes is re-keyed from the coordinate archive before it is ever read (cellKeyVersion).
  const keysFor = (cell: GridCell): string[] | undefined =>
    cell.type === "empty" || cell.sectionAddress === undefined ? undefined : exploredCells[cell.sectionAddress]
  const named = (r: number, c: number): boolean => {
    const key = cellKey(grid, floor, r, c)
    return key !== null && (keysFor(grid.cells[r][c])?.includes(key) ?? false)
  }

  const highWater = new Map<string, number>()
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "empty" || !cell.ordinal || !cellSlot(grid, r, c) || !named(r, c)) continue
      const section = cell.sectionAddress ?? ""
      highWater.set(section, Math.max(highWater.get(section) ?? -Infinity, walkPosition(cell.ordinal)))
    }
  }

  let result = grid
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "empty") continue
      const behindTheMark =
        !cellSlot(grid, r, c) &&
        cell.ordinal !== undefined &&
        walkPosition(cell.ordinal) <= (highWater.get(cell.sectionAddress ?? "") ?? -Infinity)
      if (named(r, c) || behindTheMark) result = completeCell(result, r, c)
    }
  }
  return result
}

const DIR_MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

// Mask hidden cells: map to empty, strip dirs pointing into them from neighbours.
// With detectionLevel >= 1: junction cells that were completed stay reachable so the
// player can always navigate back and trigger the reveal.
// revealedSections: authoring addresses whose hidden sections have been revealed by the player.
const maskHiddenCells = (
  grid: FloorGrid,
  detectionLevel: number,
  revealedSections: ReadonlySet<string>
): {
  masked: FloorGrid
  hiddenJunctions: ReadonlySet<string>
  hiddenSections: ReadonlySet<string>
  junctionSections: ReadonlyMap<string, ReadonlySet<string>>
} => {
  // Collect positions of hidden, unrevealed cells, remembering each one's section so a junction
  // can be tied to the specific corridor it borders (the "found = noticed" mark, §7.2).
  const hiddenPos = new Map<string, string>()
  const hiddenSections = new Set<string>()
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if ((cell.type === "room" || cell.type === "corridor") && cell.hidden) {
        const section = cell.sectionAddress ?? ""
        if (!revealedSections.has(section)) {
          hiddenPos.set(`${r},${c}`, section)
          if (section) hiddenSections.add(section)
        }
      }
    }
  }

  const junctionSections = new Map<string, ReadonlySet<string>>()
  if (hiddenPos.size === 0)
    return { masked: grid, hiddenJunctions: new Set(), hiddenSections: new Set(), junctionSections }

  const junctions = new Set<string>()
  const newCells: GridCell[][] = grid.cells.map((row, r) =>
    row.map((cell, c): GridCell => {
      if (hiddenPos.has(`${r},${c}`)) return { type: "empty" }

      if (cell.type === "room" || cell.type === "corridor") {
        const newDirs = new Set(cell.dirs) as Set<Direction>
        const borderedSections = new Set<string>()
        for (const [dir, [dr, dc]] of Object.entries(DIR_MOVES) as [Direction, [number, number]][]) {
          const neighborSection = newDirs.has(dir) ? hiddenPos.get(`${r + dr},${c + dc}`) : undefined
          if (neighborSection !== undefined) {
            newDirs.delete(dir)
            if (neighborSection) borderedSections.add(neighborSection)
          }
        }
        if (newDirs.size !== cell.dirs.size) {
          junctions.add(`${r},${c}`)
          if (borderedSections.size > 0) junctionSections.set(`${r},${c}`, borderedSections)
          // With detector: force the junction reachable, whether the player is walking up to
          // it for the first time ("visible" — completeCell treated it as a plain passthrough
          // on the unmasked graph, since it had no idea one side led to a hidden dead end) or
          // returning to it later ("completed"). Without a detector, leave the state alone —
          // the player glides straight through the hidden gap, seeing nothing unusual.
          const state =
            detectionLevel >= 1 && (cell.state === "completed" || cell.state === "visible") ? "reachable" : cell.state
          // Downgrade room → corridor if hidden dir removal leaves it as a passthrough corner. It is
          // still the same cell, so everything that NAMES it comes along: without the address and the
          // ordinal, a player standing on a downgraded room has nowhere to be written down.
          if (cell.type === "room" && newDirs.size <= 2) {
            return {
              type: "corridor",
              dirs: newDirs as ReadonlySet<Direction>,
              state,
              sectionAddress: cell.sectionAddress,
              sectionHash: cell.sectionHash,
              legacySectionHash: cell.legacySectionHash,
              ordinal: cell.ordinal,
              difficulty: cell.difficulty,
              hidden: cell.hidden,
            }
          }
          return { ...cell, dirs: newDirs as ReadonlySet<Direction>, state }
        }
      }

      return cell
    })
  )

  return { masked: { ...grid, cells: newCells }, hiddenJunctions: junctions, hiddenSections, junctionSections }
}

export const useAssembledFloor = (
  journeyId: string,
  floorConfig: FloorConfig,
  seed: number,
  currentFloor: number,
  exploredCells: Record<string, string[]>,
  positionKey: string | null | undefined,
  detectionLevel = 0,
  revealedSections?: ReadonlySet<string>,
  // Which level of the journey this floor belongs to, so its rooms can be dealt their boards
  // (src/game/seeds/boardIndex.ts). Unset outside the baked world — stories, specs, the builder.
  levelIndex?: number
): {
  grid: FloorGrid | null
  explorerPos: readonly [number, number]
  hiddenJunctions: ReadonlySet<string>
  hiddenSections: ReadonlySet<string>
  junctionSections: ReadonlyMap<string, ReadonlySet<string>>
} => {
  const baseGrid = useMemo(() => {
    const result = assembleFloor(journeyId, floorConfig, seed + currentFloor, resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId, floorIndex: currentFloor },
      ...(levelIndex !== undefined
        ? { resolveBoardIndex: boardIndexesForFloor(journeyId, levelIndex, currentFloor) }
        : {}),
    })
    return result.success ? result.grid : null
  }, [journeyId, floorConfig, seed, currentFloor, levelIndex])

  // Standing in the doorway is having been there: the entrance reads explored whether or not the save
  // says so, so a floor is never entered onto a fogged cell.
  const effectiveExplored = useMemo(() => {
    if (!baseGrid) return exploredCells
    const [er, ec] = baseGrid.entrancePos
    const entranceCell = baseGrid.cells[er][ec]
    const key = cellKey(baseGrid, currentFloor, er, ec)
    if (entranceCell.type === "empty" || !key) return exploredCells
    const section = entranceCell.sectionAddress ?? ""
    const existing = exploredCells[section] ?? []
    if (existing.includes(key)) return exploredCells
    return { ...exploredCells, [section]: [...existing, key] }
  }, [baseGrid, exploredCells, currentFloor])

  const exploredGrid = useMemo(
    () => (baseGrid ? applyExplored(baseGrid, currentFloor, effectiveExplored) : null),
    [baseGrid, currentFloor, effectiveExplored]
  )

  const { grid, hiddenJunctions, hiddenSections, junctionSections } = useMemo(() => {
    const empty = new Set<string>() as ReadonlySet<string>
    const emptyMap = new Map<string, ReadonlySet<string>>() as ReadonlyMap<string, ReadonlySet<string>>
    if (!exploredGrid) return { grid: null, hiddenJunctions: empty, hiddenSections: empty, junctionSections: emptyMap }
    const revealed = revealedSections ?? empty
    const masked = maskHiddenCells(exploredGrid, detectionLevel, revealed)
    return {
      grid: masked.masked,
      hiddenJunctions: masked.hiddenJunctions,
      hiddenSections: masked.hiddenSections,
      junctionSections: masked.junctionSections,
    }
  }, [exploredGrid, detectionLevel, revealedSections])

  const explorerPos: readonly [number, number] = useMemo(() => {
    if (!grid) return [0, 0]
    if (!positionKey || floorOfAddress(positionKey) !== currentFloor) return grid.entrancePos
    // Somewhere the address still names is not the same as somewhere you can stand. A saved cell turns
    // to void when the floor it belongs to is restructured, and — more often — when a found hidden
    // section goes back to hidden because its section hash moved (the hash covers the section's
    // encounter, so re-authoring an encounter is enough). Standing on void puts the explorer dot
    // outside the drawn map with no way back, so an unstandable saved position sends them to the
    // entrance. Resolving against the MASKED grid is what makes that check see the hidden case.
    const at = findByAddress(grid, currentFloor, positionKey)
    if (!at) return grid.entrancePos
    const cell = grid.cells[at[0]][at[1]]
    if (cell.type === "empty") return grid.entrancePos
    return at
  }, [grid, positionKey, currentFloor])

  return { grid, explorerPos, hiddenJunctions, hiddenSections, junctionSections }
}
