import { useMemo } from "react"
import { assembleFloor } from "@/game/siteAssembler"
import { completeCell } from "@/game/gridNavigation"
import type { Direction, FloorConfig, FloorGrid, GridCell } from "@/game/siteTypes"

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

const applyExplored = (
  grid: FloorGrid,
  floor: number,
  exploredSections: Record<string, string[]>,
  wardKeys?: ReadonlySet<string>
): FloorGrid => {
  let result = grid
  for (const [sectionHash, cellIds] of Object.entries(exploredSections)) {
    for (const cellId of cellIds) {
      const [cellFloor, r, c] = decodeEdge(cellId)
      if (cellFloor !== floor) continue
      if (r >= result.rows || c >= result.cols) continue
      const cell = result.cells[r][c]
      if (cell.type === "empty") continue
      // Skip stale cells whose section was restructured since save
      if (cell.sectionHash !== sectionHash) continue
      result = completeCell(result, r, c, wardKeys)
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
): { masked: FloorGrid; hiddenJunctions: ReadonlySet<string>; hiddenSectionHashes: ReadonlySet<string> } => {
  // Collect positions of hidden, unrevealed cells
  const hiddenPos = new Set<string>()
  const hiddenSectionHashes = new Set<string>()
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if ((cell.type === "room" || cell.type === "corridor") && cell.hidden) {
        const hash = cell.sectionHash ?? ""
        if (!revealedSections.has(hash)) {
          hiddenPos.add(`${r},${c}`)
          if (hash) hiddenSectionHashes.add(hash)
        }
      }
    }
  }

  if (hiddenPos.size === 0) return { masked: grid, hiddenJunctions: new Set(), hiddenSectionHashes: new Set() }

  const junctions = new Set<string>()
  const newCells: GridCell[][] = grid.cells.map((row, r) =>
    row.map((cell, c): GridCell => {
      if (hiddenPos.has(`${r},${c}`)) return { type: "empty" }

      if (cell.type === "room" || cell.type === "corridor") {
        const newDirs = new Set(cell.dirs) as Set<Direction>
        for (const [dir, [dr, dc]] of Object.entries(DIR_MOVES) as [Direction, [number, number]][]) {
          if (newDirs.has(dir) && hiddenPos.has(`${r + dr},${c + dc}`)) newDirs.delete(dir)
        }
        if (newDirs.size !== cell.dirs.size) {
          junctions.add(`${r},${c}`)
          // With detector: keep junction reachable after completion so the player can return
          const state = detectionLevel >= 1 && cell.state === "completed" ? "reachable" : cell.state
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

  return { masked: { ...grid, cells: newCells }, hiddenJunctions: junctions, hiddenSectionHashes }
}

export const useAssembledFloor = (
  journeyId: string,
  floorConfig: FloorConfig,
  seed: number,
  currentFloor: number,
  exploredSections: Record<string, string[]>,
  wardKeys: ReadonlySet<string>,
  position: string | null | undefined,
  detectionLevel = 0,
  revealedSections?: ReadonlySet<string>
): {
  grid: FloorGrid | null
  explorerPos: readonly [number, number]
  hiddenJunctions: ReadonlySet<string>
  hiddenSectionHashes: ReadonlySet<string>
} => {
  const baseGrid = useMemo(() => {
    const result = assembleFloor(journeyId, floorConfig, seed + currentFloor)
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
    () => (baseGrid ? applyExplored(baseGrid, currentFloor, effectiveExplored, wardKeys) : null),
    [baseGrid, currentFloor, effectiveExplored, wardKeys]
  )

  const { grid, hiddenJunctions, hiddenSectionHashes } = useMemo(() => {
    const empty = new Set<string>() as ReadonlySet<string>
    if (!exploredGrid) return { grid: null, hiddenJunctions: empty, hiddenSectionHashes: empty }
    const revealed = revealedSections ?? empty
    const { masked, hiddenJunctions, hiddenSectionHashes } = maskHiddenCells(exploredGrid, detectionLevel, revealed)
    return { grid: masked, hiddenJunctions, hiddenSectionHashes }
  }, [exploredGrid, detectionLevel, revealedSections])

  const explorerPos: readonly [number, number] = useMemo(() => {
    if (!grid) return [0, 0]
    if (!position) return grid.entrancePos
    const [posFloor, r, c] = decodeEdge(position)
    if (posFloor !== currentFloor || r >= grid.rows || c >= grid.cols) return grid.entrancePos
    return [r, c]
  }, [grid, position, currentFloor])

  return { grid, explorerPos, hiddenJunctions, hiddenSectionHashes }
}
