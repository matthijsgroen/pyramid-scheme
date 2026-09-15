import type { Direction, FloorGrid } from "@/game/siteTypes"
import { cellAt } from "@/game/roomFootprint"

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
const findCorridorRunTarget = (
  grid: FloorGrid,
  startR: number,
  startC: number,
  incomingDir: Direction
): readonly [number, number] | null => {
  let r = startR,
    c = startC,
    fromDir = incomingDir
  for (let steps = 0; steps < grid.rows * grid.cols; steps++) {
    const cell = cellAt(grid, r, c)
    if (cell.type === "empty") return null
    if (cell.type === "room") {
      return cell.state === "reachable" || cell.state === "completed" ? [r, c] : null
    }
    if (isCorridorCorner(cell.dirs)) {
      return cell.state === "reachable" || cell.state === "completed" ? [r, c] : null
    }
    if (cell.state !== "visible" && cell.state !== "reachable" && cell.state !== "completed") return null
    const nextDir = ([...cell.dirs] as Direction[]).find(d => d !== OPPOSITE_DIR[fromDir])
    if (!nextDir) return null
    const [dr, dc] = DIR_MOVES[nextDir]
    r += dr
    c += dc
    fromDir = nextDir
  }
  return null
}

export type CorridorRunTarget = { row: number; col: number; dir: Direction }

export const NO_RUN_TARGETS: ReadonlyMap<string, CorridorRunTarget> = new Map()

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
  if (!explorerPos) return targets
  const [er, ec] = explorerPos
  const startCell = cellAt(grid, er, ec)
  if (startCell.type !== "room" && startCell.type !== "corridor") return targets
  for (const dir of startCell.dirs) {
    const [dr, dc] = DIR_MOVES[dir]
    const nearR = er + dr,
      nearC = ec + dc
    const target = findCorridorRunTarget(grid, nearR, nearC, dir)
    if (target && (target[0] !== nearR || target[1] !== nearC)) {
      targets.set(`${nearR},${nearC}`, { row: target[0], col: target[1], dir })
    }
  }
  return targets
}
