import { useMemo } from "react"
import { assembleFloor } from "@/game/siteAssembler"
import { completeCell } from "@/game/gridNavigation"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"

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

export const useAssembledFloor = (
  journeyId: string,
  floorConfig: FloorConfig,
  seed: number,
  currentFloor: number,
  exploredSections: Record<string, string[]>,
  wardKeys: ReadonlySet<string>,
  position: string | null | undefined
): { grid: FloorGrid | null; explorerPos: readonly [number, number] } => {
  // ponytail: assemble once per floor+seed; edges reconstruct completed state
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

  const grid = useMemo(
    () => (baseGrid ? applyExplored(baseGrid, currentFloor, effectiveExplored, wardKeys) : null),
    [baseGrid, currentFloor, effectiveExplored, wardKeys]
  )

  const explorerPos: readonly [number, number] = useMemo(() => {
    if (!grid) return [0, 0]
    if (!position) return grid.entrancePos
    const [posFloor, r, c] = decodeEdge(position)
    if (posFloor !== currentFloor || r >= grid.rows || c >= grid.cols) return grid.entrancePos
    return [r, c]
  }, [grid, position, currentFloor])

  return { grid, explorerPos }
}
