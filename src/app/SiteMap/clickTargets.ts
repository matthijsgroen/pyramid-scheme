import type { Direction, FloorGrid } from "@/game/siteTypes"
import { cellAt } from "@/game/roomFootprint"
import { dropEndsOf, walkableFrom } from "@/game/gridNavigation"
import {
  NO_RUN_TARGETS,
  cellsAroundExplorer,
  corridorRunTargetsFrom,
  isCorridorCorner,
  type CorridorRunTarget,
} from "./corridorRuns"
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
  /** A drop's launch and landing, keyed by cell, each with the direction a walker enters it from its own
   * node — see `dropEndsOf`. */
  dropEnds: ReadonlyMap<string, Direction>
  /** The cells around the player — their own (`null`) and one step along each open way (the direction the
   * player steps to reach it), as `row,col` keys (`cellsAroundExplorer`). Arrows are drawn only on these;
   * empty while arrows are suppressed. */
  nearCells: ReadonlyMap<string, Direction | null>
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
  const stoppingPoint = cell.state === "reachable" || cell.state === "completed"
  // A drop's launch and landing are stopping points whatever their shape: the player must be able to walk
  // to either from its own side.
  const dropEnd = ctx.dropEnds.has(`${target[0]},${target[1]}`)
  return ctx.freeWalk || (stoppingPoint && (corner || dropEnd)) || !!runTarget ? target : null
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
  // what it wants. The exception answers itself through `canWalkTo`: a way out a switch shut is a wall
  // the player can see, so it is on no walk of the floor and so on no offer either (`walkableFrom`).
  return (cell.state === "reachable" || cell.state === "completed") && ctx.canWalkTo(r, c) ? target : null
}

/**
 * WHAT THE MAP DRAWS ON A CELL A TAP IS ATTACHED TO — decided from the offer, never beside it.
 *
 * The renderer draws exactly this and attaches the tap exactly when `clickTargetAt` names a target, so
 * a cell with a tap and nothing drawn cannot come from two conditions drifting apart: there is only
 * one. Every offer yields a marker; a new kind of offer lands in the last branch and is drawn as a dot
 * until it is given a shape of its own, rather than becoming an invisible tap.
 *
 * The SHAPE is read off what the offer names:
 * - `node`: a room. Its own node art is the marker, drawn for every lit room whatever the offer.
 * - `arrow`: a way to walk, pointing where the tap leads from here — a corridor run's near end, or a
 *   drop's launch or landing, pointed at in the direction it is entered from its own node. An arrow is
 *   drawn ONLY AROUND THE PLAYER (`nearCells`): his own cell and one step along each way open from it.
 *   Further off, a drop's end is a place like any other and draws a dot, because an arrow standing in a
 *   corridor nobody is in reads as a way the player has this moment, which it is not.
 * - `dot`: a corner or dead end the player can stop on.
 *
 * The one offer with no marker is a corridor corner already walked, not beside the player, and not a drop's launch or landing: `null` there is
 * a decision, and the guard in `movementInvariant.spec.ts` exempts exactly that case by name.
 */
export type OfferMarker = { kind: "node" } | { kind: "dot" } | { kind: "arrow"; dir: Direction }

export const markerAt = (
  grid: FloorGrid,
  claims: RoomClaims,
  r: number,
  c: number,
  ctx: OfferContext,
  offer: readonly [number, number] | null = clickTargetAt(grid, claims, r, c, ctx)
): OfferMarker | null => {
  if (!offer) return null
  const cell = cellAt(grid, r, c)
  if (cell.type !== "corridor") return { kind: "node" }
  const runTarget = ctx.runTargets.get(`${r},${c}`)
  if (runTarget) return { kind: "arrow", dir: runTarget.dir }
  // A launch or landing is a stopping point wherever it is, but an arrow appears only AROUND THE PLAYER:
  // beside it or on it the arrow points the way it is entered from its own node. Further off it answers
  // to the same rule as any other stopping point — a dot while it is somewhere the player has yet to go,
  // and nothing once he has been there, so a walked floor does not fill up with his own history.
  const entered = ctx.dropEnds.get(`${r},${c}`)
  if (entered) {
    if (ctx.nearCells.has(`${r},${c}`)) return { kind: "arrow", dir: entered }
    return cell.state === "completed" ? null : { kind: "dot" }
  }
  if (cell.state === "reachable" && isCorridorCorner(cell.dirs)) return { kind: "dot" }
  // A corner the player has already walked is drawn ground they can see, so it needs no marker to be
  // found; it stays a tap to walk back to. Right beside the player it is the next step of the way he is
  // standing in, so it points there (an arrow is only ever drawn around the player).
  if (cell.state === "completed" && isCorridorCorner(cell.dirs)) {
    const step = ctx.nearCells.get(`${r},${c}`)
    return step ? { kind: "arrow", dir: step } : null
  }
  return { kind: "dot" }
}

/**
 * The one assembly of an `OfferContext`, for the map and for every test alike.
 *
 * Two positions and one switch are inputs because they genuinely vary; the assembly and the walk rule
 * (`canWalkTo`) are not, and live only here.
 * - `walkFrom`: where `canWalkTo` reckons from — the standing cell. Undefined means every cell is walkable.
 * - `runFrom`: where corridor-run arrows and a drop's arrow are reckoned from. Callers may pass a different cell than
 *   `walkFrom`; this builder does not reconcile them.
 * - `runsSuppressed`: no run arrows at all (the explorer is mid-glide).
 */
export const buildOfferContext = (
  grid: FloorGrid,
  opts: {
    walkFrom: readonly [number, number] | undefined
    runFrom: readonly [number, number] | undefined
    runsSuppressed: boolean
    freeWalk: boolean
  }
): OfferContext => {
  const walkable = opts.walkFrom ? walkableFrom(grid, opts.walkFrom) : null
  return {
    runTargets: opts.runsSuppressed ? NO_RUN_TARGETS : corridorRunTargetsFrom(grid, opts.runFrom),
    dropEnds: dropEndsOf(grid),
    nearCells: new Map(
      opts.runsSuppressed
        ? []
        : cellsAroundExplorer(grid, opts.runFrom).map(({ row, col, dir }) => [`${row},${col}`, dir])
    ),
    canWalkTo: (row, col) => !walkable || walkable.has(`${row},${col}`),
    freeWalk: opts.freeWalk,
  }
}

/** The context for a player standing still at `at`: walk and run arrows reckoned from the same cell. */
export const offerContextFrom = (
  grid: FloorGrid,
  at: readonly [number, number] | undefined,
  opts: { freeWalk?: boolean }
): OfferContext =>
  buildOfferContext(grid, { walkFrom: at, runFrom: at, runsSuppressed: false, freeWalk: opts.freeWalk ?? false })

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
  const ctx = offerContextFrom(grid, at, opts)
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
