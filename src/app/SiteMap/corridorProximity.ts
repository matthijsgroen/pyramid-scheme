import type { Direction, FloorGrid } from "@/game/siteTypes"

// How close the corridor detector calls a hidden passage "nearby", in steps along the walkable
// floor — not straight-line distance, so a corridor on the far side of a wall stays far away.
// Tunable: this is the whole feel of the L1 readout. Too small and it only lights up when you are
// already standing on the corner; too large and it says "nearby" for most of the floor.
export const NEARBY_STEPS = 4

const MOVES: Record<Direction, readonly [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

// Is the player within `maxSteps` of a corner that borders an unnoticed hidden corridor?
//
// `junctionSections` only ever holds junctions bordering corridors that are still hidden — a noticed
// one is revealed and drops out — so any entry here is a live lead.
//
// Deliberately its own bounded search rather than findPath: findPath answers "draw me a route" and
// falls back to a synthetic `[from, to]` when there is no route at all, which reads as exactly one
// step and would call every unreachable corridor "nearby". It also runs a full-floor BFS per call.
// This walks outward once, at most `maxSteps` deep, and stops at the first lead.
//
// Traversal follows the same rules as the player's own movement — through a cell's open directions,
// never into empty or fogged ground — so "nearby" means reachable across floor they have actually
// seen, not close as the crow flies.
export const isCorridorNearby = (
  grid: FloorGrid | null,
  explorerPos: readonly [number, number],
  junctionSections: ReadonlyMap<string, ReadonlySet<string>>,
  maxSteps: number = NEARBY_STEPS
): boolean => {
  if (!grid || junctionSections.size === 0) return false

  const key = (row: number, col: number) => `${row},${col}`
  if (junctionSections.has(key(explorerPos[0], explorerPos[1]))) return true

  const seen = new Set([key(explorerPos[0], explorerPos[1])])
  let frontier: Array<readonly [number, number]> = [explorerPos]

  for (let step = 0; step < maxSteps && frontier.length > 0; step++) {
    const next: Array<readonly [number, number]> = []
    for (const [row, col] of frontier) {
      const cell = grid.cells[row]?.[col]
      if (!cell || cell.type === "empty") continue
      const dirs: ReadonlySet<Direction> = cell.dirs
      for (const dir of dirs) {
        const [dr, dc] = MOVES[dir]
        const nr = row + dr
        const nc = col + dc
        const nk = key(nr, nc)
        if (seen.has(nk)) continue
        const neighbor = grid.cells[nr]?.[nc]
        if (!neighbor || neighbor.type === "empty" || neighbor.state === "fogged") continue
        if (junctionSections.has(nk)) return true
        seen.add(nk)
        next.push([nr, nc])
      }
    }
    frontier = next
  }
  return false
}
