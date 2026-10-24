import { oneWayRuns } from "./gridNavigation"
import { reachableFrom } from "./siteValidator"
import type { Direction, FloorGrid } from "./siteTypes"

type Pos = readonly [number, number]

const STEP: Record<Direction, readonly [number, number, Direction]> = {
  n: [-1, 0, "s"],
  s: [1, 0, "n"],
  e: [0, 1, "w"],
  w: [0, -1, "e"],
}

// Every way on the floor can be walked back: no drop, and every opening is answered by the cell it opens onto.
// Then the floor is one undirected ground, and a room reaches home exactly when the entrance does.
const everyWayWalksBack = (grid: FloorGrid): boolean => {
  if (oneWayRuns(grid).length > 0) return false
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" && cell.type !== "corridor") continue
      for (const d of cell.dirs) {
        const [dr, dc, back] = STEP[d]
        const next = grid.cells[r + dr]?.[c + dc]
        if (next && (next.type === "room" || next.type === "corridor") && !next.dirs.has(back)) return false
      }
    }
  return true
}

const isPortal = (grid: FloorGrid, [r, c]: Pos) => {
  const cell = grid.cells[r]?.[c]
  return cell?.type === "room" && cell.roomType === "portal"
}

/**
 * WHERE THIS FLOOR IS LEFT FOR HOME. A site has one exit, at its main path's end, so a floor that holds it
 * is left there. A floor whose main path goes on down is left by that stair. A floor with neither is off the
 * main path, and its way home is the stair it was entered by.
 */
const homeOf = (grid: FloorGrid): Pos[] => {
  const exits: Pos[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      const isEntrance = r === grid.entrancePos[0] && c === grid.entrancePos[1]
      if (cell.type === "room" && cell.roomType === "portal" && !cell.stairId && !isEntrance) exits.push([r, c])
    }
  if (exits.length > 0) return exits
  if (isPortal(grid, grid.exitPos)) return [grid.exitPos]
  return isPortal(grid, grid.entrancePos) ? [grid.entrancePos] : []
}

/**
 * THE ROOMS A PLAYER CAN WALK INTO AND NOT WALK HOME FROM. Every room reachable from the floor's entrance has
 * to reach the floor's way home again: re-entering a site puts the player back where they stood, so a pocket
 * behind a drop with no way back is a run that cannot be finished. A stair down counts as a room here, since
 * the player comes back up onto it.
 *
 * Every door is taken as open — every key held, every authored key minted — because what is asked is whether
 * the ground leads home, not whether a key is short; a mechanism's own states are the lock walk's question.
 */
export const strandedFromHome = (grid: FloorGrid): Pos[] => {
  const home = homeOf(grid)
  if (home.length === 0) return []
  const allKeys = new Set<string>()
  for (const row of grid.cells)
    for (const cell of row) {
      if (cell.type !== "room") continue
      if (cell.requiredKeyId) allKeys.add(cell.requiredKeyId)
      for (const id of cell.requiredKeyIds ?? []) allKeys.add(id)
      for (const exit of cell.exits ?? []) if (exit.gateKeyId) allKeys.add(exit.gateKeyId)
    }
  const walk = (from: Pos) => reachableFrom(grid, from, allKeys, undefined, undefined, true)
  const homeKeys = home.map(([r, c]) => `${r},${c}`)
  const reached = walk(grid.entrancePos)
  const undirected = everyWayWalksBack(grid)
  const entranceGoesHome = homeKeys.some(h => reached.has(h))
  const stranded: Pos[] = []
  for (const key of reached) {
    const [r, c] = key.split(",").map(Number)
    if (grid.cells[r]?.[c]?.type !== "room") continue
    if (undirected) {
      if (!entranceGoesHome) stranded.push([r, c])
      continue
    }
    const from = walk([r, c])
    if (!homeKeys.some(h => from.has(h))) stranded.push([r, c])
  }
  return stranded
}
