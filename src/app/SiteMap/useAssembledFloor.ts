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

const applyEdges = (grid: FloorGrid, floor: number, allEdges: string[], wardKeys?: ReadonlySet<string>): FloorGrid =>
  allEdges
    .filter(e => decodeEdge(e)[0] === floor)
    .reduce((g, edgeId) => {
      const [, r, c] = decodeEdge(edgeId)
      return completeCell(g, r, c, wardKeys)
    }, grid)

export const useAssembledFloor = (
  journeyId: string,
  floorConfig: FloorConfig,
  seed: number,
  currentFloor: number,
  allEdges: string[],
  wardKeys: ReadonlySet<string>,
  position: string | null | undefined
): { grid: FloorGrid | null; explorerPos: readonly [number, number] } => {
  // ponytail: assemble once per floor+seed; edges reconstruct completed state
  // ponytail: assemble once per floor+seed; edges reconstruct completed state
  const baseGrid = useMemo(() => {
    const result = assembleFloor(journeyId, floorConfig, seed + currentFloor)
    return result.success ? result.grid : null
  }, [journeyId, floorConfig, seed, currentFloor])

  const effectiveEdges = useMemo(() => {
    if (!baseGrid) return allEdges
    const entranceEdge = encodeEdge(currentFloor, baseGrid.entrancePos[0], baseGrid.entrancePos[1])
    return allEdges.includes(entranceEdge) ? allEdges : [...allEdges, entranceEdge]
  }, [baseGrid, allEdges, currentFloor])

  const grid = useMemo(
    () => (baseGrid ? applyEdges(baseGrid, currentFloor, effectiveEdges, wardKeys) : null),
    [baseGrid, currentFloor, effectiveEdges, wardKeys]
  )

  const explorerPos: readonly [number, number] = useMemo(() => {
    if (!grid) return [0, 0]
    if (!position) return grid.entrancePos
    const [posFloor, r, c] = decodeEdge(position)
    return posFloor === currentFloor ? [r, c] : grid.entrancePos
  }, [grid, position, currentFloor])

  return { grid, explorerPos }
}
