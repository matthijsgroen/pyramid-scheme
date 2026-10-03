import type { Direction, FloorGrid } from "@/game/siteTypes"
import { cellAt } from "@/game/roomFootprint"
import { isSealedWayOut } from "@/game/gridNavigation"

// Corridor geometry: which cells are corners, and where a straight run of corridor ends. Pure grid
// reading with no React and no drawing in it, so the map's click rules (`clickTargets.ts`) and the
// renderer can share one answer — and so a spec can ask the question without mounting a map.

export const DIR_MOVES: Record<Direction, readonly [number, number]> = {
  n: [-1, 0],
  s: [1, 0],
  e: [0, 1],
  w: [0, -1],
}

export const OPPOSITE_DIR: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }

/** A corridor cell that is anything but a straight through-passage: a corner, a T, a dead end. */
export const isCorridorCorner = (dirs: ReadonlySet<Direction>): boolean =>
  dirs.size !== 2 || !((dirs.has("n") && dirs.has("s")) || (dirs.has("e") && dirs.has("w")))

// A straight run of "visible" corridor only ever has one real click target: the corner
// (or room) that ends it, which can be many cells — and screens — away. Walking that far
// out means the on-screen entrance to the run has nothing to tap. This walks a run
// forward from its near end (right next to the explorer) to find that far target, so the
// caller can render the click affordance where the player already is instead.
//
// A run that ends at a way a switch shut (`isSealedWayOut`) has no far target to enter: that end is a
// wall. The run then offers the last cell before it — ground the player can stand on, right in front
// of the door — and says so with `shut`, because that cell can be the near cell itself. Every other
// unenterable end (ground still in the dark, a room not yet reachable) still withdraws the run.
const findCorridorRunTarget = (
  grid: FloorGrid,
  startR: number,
  startC: number,
  incomingDir: Direction
): { at: readonly [number, number]; shut: boolean } | null => {
  let r = startR,
    c = startC,
    fromDir = incomingDir,
    before: readonly [number, number] | null = null
  for (let steps = 0; steps < grid.rows * grid.cols; steps++) {
    const cell = cellAt(grid, r, c)
    if (cell.type === "empty") return null
    if (cell.type === "room") {
      if (isSealedWayOut(cell) && cell.state !== "fogged") return before && { at: before, shut: true }
      return cell.state === "reachable" || cell.state === "completed" ? { at: [r, c], shut: false } : null
    }
    if (isCorridorCorner(cell.dirs)) {
      return cell.state === "reachable" || cell.state === "completed" ? { at: [r, c], shut: false } : null
    }
    if (cell.state !== "visible" && cell.state !== "reachable" && cell.state !== "completed") return null
    const nextDir = ([...cell.dirs] as Direction[]).find(d => d !== OPPOSITE_DIR[fromDir])
    if (!nextDir) return null
    const [dr, dc] = DIR_MOVES[nextDir]
    before = [r, c]
    r += dr
    c += dc
    fromDir = nextDir
  }
  return null
}

export type CorridorRunTarget = { row: number; col: number; dir: Direction }

export const NO_RUN_TARGETS: ReadonlyMap<string, CorridorRunTarget> = new Map()

/**
 * "Around the player": the explorer's own cell and the cell one step along each way open from it.
 * Corridor run arrows are keyed by exactly these neighbours, and a drop's arrow is drawn only on these.
 */
export const cellsAroundExplorer = (
  grid: FloorGrid,
  explorerPos: readonly [number, number] | undefined
): { row: number; col: number; dir: Direction | null }[] => {
  if (!explorerPos) return []
  const [er, ec] = explorerPos
  const startCell = cellAt(grid, er, ec)
  if (startCell.type !== "room" && startCell.type !== "corridor") return []
  return [
    { row: er, col: ec, dir: null },
    ...[...startCell.dirs].map(dir => ({ row: er + DIR_MOVES[dir][0], col: ec + DIR_MOVES[dir][1], dir })),
  ]
}

/**
 * For each direction open from the explorer's current cell, the corridor run's far click target (if
 * any), keyed by the NEAR cell — the first step of that run — so rendering can put the click
 * affordance right next to the player. `dir` is that first step's direction, unambiguous by
 * construction, so the marker can point the way there.
 */
export const corridorRunTargetsFrom = (
  grid: FloorGrid,
  explorerPos: readonly [number, number] | undefined
): ReadonlyMap<string, CorridorRunTarget> => {
  const targets = new Map<string, CorridorRunTarget>()
  for (const { row: nearR, col: nearC, dir } of cellsAroundExplorer(grid, explorerPos)) {
    if (!dir) continue
    const target = findCorridorRunTarget(grid, nearR, nearC, dir)
    // A run whose far end is the near cell itself has nothing to point at, except in front of a shut
    // door: there the near cell IS the place to walk to.
    if (target && (target.shut || target.at[0] !== nearR || target.at[1] !== nearC)) {
      targets.set(`${nearR},${nearC}`, { row: target.at[0], col: target.at[1], dir })
    }
  }
  return targets
}
