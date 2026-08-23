import { useMemo } from "react"
import { assembleFloor } from "@/game/siteAssembler"
import { completeCell } from "@/game/gridNavigation"
import type { Direction, FloorConfig, FloorGrid, GridCell } from "@/game/siteTypes"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import type { ResolveKeyRequirements } from "@/game/siteAssembler"

// A node's own key requirements, resolved from whichever family declares them (a tableau's
// hieroglyphs, etc.) — the same dispatch world-gen uses, but off the app-side family registry so
// this module names no mod. Populates each room's `requiredKeyIds` at assembly time so runtime
// consumers (the "still stuff to find" marker) can read a node's exposed keys uniformly with a
// gate's key. Inert for play — no other runtime code gates on requiredKeyIds.
const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx)

// Edge IDs are "floorIdx:row,col". Backward compat: no colon prefix = floor 0.
export const encodeEdge = (floor: number, row: number, col: number): string => `${floor}:${row},${col}`
export const decodeEdge = (edgeId: string): [floor: number, row: number, col: number] => {
  if (edgeId.includes(":")) {
    const [f, pos] = edgeId.split(":")
    const [r, c] = pos.split(",").map(Number)
    return [Number(f), r, c]
  }
  const [r, c] = edgeId.split(",").map(Number)
  return [0, r, c]
}

const applyExplored = (grid: FloorGrid, floor: number, exploredSections: Record<string, string[]>): FloorGrid => {
  let result = grid
  for (const [sectionHash, cellIds] of Object.entries(exploredSections)) {
    for (const cellId of cellIds) {
      const [cellFloor, r, c] = decodeEdge(cellId)
      if (cellFloor !== floor) continue
      if (r >= result.rows || c >= result.cols) continue
      const cell = result.cells[r][c]
      if (cell.type === "empty") continue
      // Skip stale cells whose section was restructured since save. A save written before the
      // section hash stopped covering the encounter files its cells under the old hash, so that one
      // counts as a match too — otherwise the whole world would read as unexplored, and since a
      // looted room is remembered only by this entry, every chest would come back unlooted.
      if (cell.sectionHash !== sectionHash && cell.legacySectionHash !== sectionHash) continue
      result = completeCell(result, r, c)
    }
  }
  return result
}

const DIR_MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

// Mask hidden cells: map to empty, strip dirs pointing into them from neighbours.
// With detectionLevel >= 1: junction cells that were completed stay reachable so the
// player can always navigate back and trigger the reveal.
// revealedSections: sectionHashes whose hidden sections have been revealed by the player.
const maskHiddenCells = (
  grid: FloorGrid,
  detectionLevel: number,
  revealedSections: ReadonlySet<string>
): {
  masked: FloorGrid
  hiddenJunctions: ReadonlySet<string>
  hiddenSectionHashes: ReadonlySet<string>
  junctionSections: ReadonlyMap<string, ReadonlySet<string>>
} => {
  // Collect positions of hidden, unrevealed cells, remembering each one's section hash so a junction
  // can be tied to the specific corridor it borders (the "found = noticed" mark, §7.2).
  const hiddenPos = new Map<string, string>()
  const hiddenSectionHashes = new Set<string>()
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if ((cell.type === "room" || cell.type === "corridor") && cell.hidden) {
        const hash = cell.sectionHash ?? ""
        // Found under either hash — an older save recorded this corridor under the pre-0.39 one, and
        // a corridor that forgets it was found masks the player's own cell back to void.
        const wasFound =
          revealedSections.has(hash) ||
          (cell.legacySectionHash !== undefined && revealedSections.has(cell.legacySectionHash))
        if (!wasFound) {
          hiddenPos.set(`${r},${c}`, hash)
          if (hash) hiddenSectionHashes.add(hash)
        }
      }
    }
  }

  const junctionSections = new Map<string, ReadonlySet<string>>()
  if (hiddenPos.size === 0)
    return { masked: grid, hiddenJunctions: new Set(), hiddenSectionHashes: new Set(), junctionSections }

  const junctions = new Set<string>()
  const newCells: GridCell[][] = grid.cells.map((row, r) =>
    row.map((cell, c): GridCell => {
      if (hiddenPos.has(`${r},${c}`)) return { type: "empty" }

      if (cell.type === "room" || cell.type === "corridor") {
        const newDirs = new Set(cell.dirs) as Set<Direction>
        const borderedSections = new Set<string>()
        for (const [dir, [dr, dc]] of Object.entries(DIR_MOVES) as [Direction, [number, number]][]) {
          const neighborHash = newDirs.has(dir) ? hiddenPos.get(`${r + dr},${c + dc}`) : undefined
          if (neighborHash !== undefined) {
            newDirs.delete(dir)
            if (neighborHash) borderedSections.add(neighborHash)
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
          // Downgrade room → corridor if hidden dir removal leaves it as a passthrough corner
          if (cell.type === "room" && newDirs.size <= 2) {
            return { type: "corridor", dirs: newDirs as ReadonlySet<Direction>, state, sectionHash: cell.sectionHash }
          }
          return { ...cell, dirs: newDirs as ReadonlySet<Direction>, state }
        }
      }

      return cell
    })
  )

  return { masked: { ...grid, cells: newCells }, hiddenJunctions: junctions, hiddenSectionHashes, junctionSections }
}

export const useAssembledFloor = (
  journeyId: string,
  floorConfig: FloorConfig,
  seed: number,
  currentFloor: number,
  exploredSections: Record<string, string[]>,
  position: string | null | undefined,
  detectionLevel = 0,
  revealedSections?: ReadonlySet<string>
): {
  grid: FloorGrid | null
  explorerPos: readonly [number, number]
  hiddenJunctions: ReadonlySet<string>
  hiddenSectionHashes: ReadonlySet<string>
  junctionSections: ReadonlyMap<string, ReadonlySet<string>>
} => {
  const baseGrid = useMemo(() => {
    const result = assembleFloor(journeyId, floorConfig, seed + currentFloor, resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId, floorIndex: currentFloor },
    })
    return result.success ? result.grid : null
  }, [journeyId, floorConfig, seed, currentFloor])

  const effectiveExplored = useMemo(() => {
    if (!baseGrid) return exploredSections
    const [er, ec] = baseGrid.entrancePos
    const entranceCell = baseGrid.cells[er][ec]
    if (entranceCell.type === "empty") return exploredSections
    const sHash = entranceCell.sectionHash ?? ""
    const entranceCellId = encodeEdge(currentFloor, er, ec)
    const existing = exploredSections[sHash] ?? []
    if (existing.includes(entranceCellId)) return exploredSections
    return { ...exploredSections, [sHash]: [...existing, entranceCellId] }
  }, [baseGrid, exploredSections, currentFloor])

  const exploredGrid = useMemo(
    () => (baseGrid ? applyExplored(baseGrid, currentFloor, effectiveExplored) : null),
    [baseGrid, currentFloor, effectiveExplored]
  )

  const { grid, hiddenJunctions, hiddenSectionHashes, junctionSections } = useMemo(() => {
    const empty = new Set<string>() as ReadonlySet<string>
    const emptyMap = new Map<string, ReadonlySet<string>>() as ReadonlyMap<string, ReadonlySet<string>>
    if (!exploredGrid)
      return { grid: null, hiddenJunctions: empty, hiddenSectionHashes: empty, junctionSections: emptyMap }
    const revealed = revealedSections ?? empty
    const masked = maskHiddenCells(exploredGrid, detectionLevel, revealed)
    return {
      grid: masked.masked,
      hiddenJunctions: masked.hiddenJunctions,
      hiddenSectionHashes: masked.hiddenSectionHashes,
      junctionSections: masked.junctionSections,
    }
  }, [exploredGrid, detectionLevel, revealedSections])

  const explorerPos: readonly [number, number] = useMemo(() => {
    if (!grid) return [0, 0]
    if (!position) return grid.entrancePos
    const [posFloor, r, c] = decodeEdge(position)
    if (posFloor !== currentFloor) return grid.entrancePos
    // Being in bounds is not the same as being somewhere you can stand. A saved cell turns to void
    // when the floor it belongs to is restructured, and — more often — when a found hidden section
    // goes back to hidden because its section hash moved (the hash covers the section's encounter, so
    // re-authoring an encounter is enough). Standing on void puts the explorer dot outside the drawn
    // map with no way back, so an unstandable saved position sends the player to the entrance.
    const cell = grid.cells[r]?.[c]
    if (!cell || cell.type === "empty") return grid.entrancePos
    return [r, c]
  }, [grid, position, currentFloor])

  return { grid, explorerPos, hiddenJunctions, hiddenSectionHashes, junctionSections }
}
