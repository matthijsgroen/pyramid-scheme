import type { FloorGrid } from "@/game/siteTypes"
import { cellAt } from "@/game/roomFootprint"
import { walkableFrom } from "@/game/gridNavigation"
import { corridorRunTargetsFrom, isCorridorCorner, type CorridorRunTarget } from "./corridorRuns"
import { litClaimOwner, type RoomClaims } from "./roomClaims"

/**
 * WHAT A TAP ON A CELL DOES — the one rule, in one place.
 *
 * It used to be written three times inside the marker loop's JSX (the claimed-corridor branch, the
 * corridor branch, the room branch), in two different spellings of the same condition. That is the
 * shape the original defect had: markers were gated on standable while the click was not gated on
 * walkable, so `findPath` handed back a straight line and the explorer crossed solid stone. A rule
 * repeated three times is a rule that can be changed twice.
 *
 * Pure, and deliberately nothing to do with drawing: what a marker LOOKS like (arrow, dot, or nothing)
 * is the renderer's business and differs from this — a cell can be clickable with no marker on it. This
 * answers only "where does a tap here take the player, if anywhere".
 */
export type OfferContext = {
  /** The far end of each corridor run, keyed by the run's near cell — see `corridorRuns.ts`. */
  runTargets: ReadonlyMap<string, CorridorRunTarget>
  /** Whether the player can actually walk there from where they stand. */
  canWalkTo: (row: number, col: number) => boolean
  /** The builder's free-roam mode: every cell is a target, walkability aside. */
  freeWalk: boolean
}

/** A corridor's own rule, shared by the claimed and unclaimed branches — the same condition either way. */
const corridorOffer = (
  cell: { state: string; dirs: ReadonlySet<never> | ReadonlySet<string> },
  target: readonly [number, number],
  runTarget: CorridorRunTarget | undefined,
  ctx: OfferContext
): readonly [number, number] | null => {
  if (!ctx.canWalkTo(target[0], target[1])) return null
  const corner = isCorridorCorner(cell.dirs as Parameters<typeof isCorridorCorner>[0])
  const reachedOrDone = cell.state === "reachable" || cell.state === "completed"
  return ctx.freeWalk || (reachedOrDone && corner) || !!runTarget ? target : null
}

export const clickTargetAt = (
  grid: FloorGrid,
  claims: RoomClaims,
  r: number,
  c: number,
  ctx: OfferContext
): readonly [number, number] | null => {
  const cell = cellAt(grid, r, c)
  const runTarget = cell.type === "corridor" ? ctx.runTargets.get(`${r},${c}`) : undefined
  const target = runTarget ? ([runTarget.row, runTarget.col] as const) : ([r, c] as const)

  // A cell a neighbouring room has claimed draws as part of that room, but interacts as ITSELF: a
  // claimed corridor is a real passage the player may have lit from the far end. Claimed void is not
  // walkable and offers nothing. Checked first, exactly as the renderer does — a claimed cell never
  // reaches the fogged guard below.
  if (litClaimOwner(grid, claims, r, c)) {
    return cell.type === "corridor" ? corridorOffer(cell, target, runTarget, ctx) : null
  }

  if (cell.type === "empty" || cell.state === "fogged") return null
  if (cell.type === "corridor") return corridorOffer(cell, target, runTarget, ctx)

  // A room: soft-gated, so a locked gate is still a target — walking to it is how the player is told
  // what it wants.
  return (cell.state === "reachable" || cell.state === "completed") && ctx.canWalkTo(r, c) ? target : null
}

/**
 * Everything the map offers from where the player stands, as `cell key → the cell a tap leads to`.
 *
 * The shape a test wants: the same question the renderer asks per cell, asked of the whole floor
 * without mounting one. The walk in `clickTargets.spec.tsx` used to render the entire map at every one
 * of 320 steps to read this back out of the DOM — a second's worth of graph work bought for forty.
 */
export const offeredTargets = (
  grid: FloorGrid,
  claims: RoomClaims,
  at: readonly [number, number] | undefined,
  opts: { freeWalk?: boolean } = {}
): Map<string, readonly [number, number]> => {
  const walkable = at ? walkableFrom(grid, at) : null
  const ctx: OfferContext = {
    runTargets: corridorRunTargetsFrom(grid, at),
    canWalkTo: (row, col) => !walkable || walkable.has(`${row},${col}`),
    freeWalk: opts.freeWalk ?? false,
  }
  const offers = new Map<string, readonly [number, number]>()
  // The renderer's own range: a ring of one cell outside the grid, where claimed void lives.
  for (let r = -1; r <= grid.rows; r++) {
    for (let c = -1; c <= grid.cols; c++) {
      const target = clickTargetAt(grid, claims, r, c, ctx)
      if (target) offers.set(`${r},${c}`, target)
    }
  }
  return offers
}
