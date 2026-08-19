import { mulberry32, shuffle } from "@/game/random"
import {
  allPieceOptions,
  cellKey,
  directionStep,
  insideGrid,
  isHalfStep,
  isLit,
  opposite,
  reflect,
  segmentKey,
  SQUARE_DIRECTIONS,
  stepCell,
  TURN_ANGLES,
  type CellRef,
  type Direction,
  type FixedPiece,
  type LightbeamPuzzleData,
  type MirrorAngle,
  type MovablePiece,
} from "./beam"
import {
  angleFor,
  axisOf,
  cutBendSlots,
  cutStops,
  drawOpening,
  halfStepTurns,
  MIN_LEG,
  openingIsHonest,
  perpendicular,
  pickSun,
  piecesAreSpaced,
  resistsGreedyPlay,
  routeIsUnique,
  runsDiagonally,
  stepsToEdge,
  type LightbeamDials,
  type LightbeamGate,
  type LightbeamOptions,
  type LightbeamPuzzle,
  type Route,
  type RouteCell,
} from "./generateLightbeam"
import { solveLightbeamByTechniques, type TechniqueId } from "./techniques"

// The second generator: it **authors the maze** instead of deriving wrong rays and walling them
// (docs/game-design/puzzles/lightbeam.md §11.16). Lay a golden path from disc to shrine, then for every
// stop a golden mirror is not set to, author the corridor that stop's light runs down and make it die.
//
// It emits the same `LightbeamPuzzleData` as `generateLightbeam`, so the board, the solver, the hints and
// every existing gate read it untouched — and it coexists with route-then-obstruct rather than replacing
// it. Nothing ships from here yet: no tier draws it, and every board the other generator makes is
// unchanged.
//
// **What it buys is uniqueness by construction.** Route-then-obstruct produces uniqueness as a by-product
// and pays 92–97% of its work in a route builder guessing blind (§11.14). Here the two properties are
// swapped: the route builder knows its own constraints and backtracks, so a draft costs about one attempt,
// and uniqueness is an invariant of the construction rather than a gate's verdict.
//
// This is phase 1 of the plan: straight branches, every mirror tappable, two stops a piece, no reuse. The
// three deliberate limits are `NO_REUSE` (a branch may not enter a cell a tappable piece occupies),
// `FORK_SIZE`, and branches that never turn.

/**
 * Stops per tappable mirror. Two is the family's lifelong baseline; the knob it becomes (`forkSize`) is what
 * a later phase turns.
 */
const FORK_SIZE = 2

/**
 * What kind of board this is, as against how hard it is — the modes that replace §7's goal pool.
 *
 * - **wall-heavy** — stone rather than the frame closes a branch, and a diagonal golden leg gets a *pair* of
 *   walls the beam visibly passes between: §11.8 rule 4's corner slip used as a feature rather than a rule to
 *   learn.
 * - **slider-heavy** — golden bends that slide rather than turn.
 * - **switch-heavy** — doors, sockets, and §11.1's traps.
 */
export const LIGHTBEAM_MODES = ["wallHeavy", "sliderHeavy", "switchHeavy"] as const

export type LightbeamMode = (typeof LIGHTBEAM_MODES)[number]

/**
 * The floor on tappable pieces, whatever `interactive` says.
 *
 * Three, which is where §5's opening rules already put the family: two binary pieces make four
 * configurations and every dark one is a tap from done or solved by tapping both, so `openingIsHonest`
 * refuses the lot. It is also why a starter board carries three bends rather than two.
 */
const MIN_TAPPABLE = 3

/** The knobs phase 2 adds. They ride here rather than growing the shipped `LightbeamDials`. */
export type AuthoredOptions = LightbeamOptions & {
  /**
   * **0..1, the share of a board's mirrors that are the player's to tap** (§11.15's closing note).
   *
   * The load-bearing one, because it chooses the architecture rather than a quantity. A **given** costs a
   * cell and reads as scenery: it contributes nothing to the configuration space, and a branch may pass
   * through it freely, because a fixed face keeps `(cell, direction)` determining the future. A **tappable**
   * mirror is the opposite on all three counts, and every branch touching one owes the recursion.
   *
   * So it is a continuous dial between the two designs §11.15 weighs — low and the board fills with scenery
   * while uniqueness is nearly free, high and the board stays dense and the recursion does real work. The
   * floor of `MIN_TAPPABLE` holds whatever the weight says.
   */
  interactive?: number
  /**
   * **Which modes this board is built to** (design doc §11.18). Combinable, and they replace the goal pool:
   * a mode is what gives a board its flavour, which is the job §7's goals were doing.
   *
   * Recorded on the result rather than logged, for the reason §7.2 gives about goals — a fallback that fires
   * silently would make the whole pool decorative while every measurement still looked fine.
   */
  modes?: readonly LightbeamMode[]
  /**
   * **Turns per authored branch.** 0 is a straight run to stone or the frame.
   *
   * A branch that turns needs a mirror at the bend, and that mirror is off the golden path by construction —
   * so the winning beam never touches it, and it is a **decoy** in §6's vocabulary. Where the branch it turns
   * is one the light takes under a wrong setting, it is a **shadow**: something movable standing in the wrong
   * ray, so the light does not visibly die there, it disappears into a piece nobody has settled. That is what
   * §6.1 measured as the only thing that makes the technique cap bite, and here it falls out of the
   * construction rather than being scattered on top of it.
   */
  branchDepth?: number
}

/**
 * How many partial routes the golden-path search may open before giving up on this seed.
 *
 * It is a guard, not a plan: the search is depth-`turns` over a handful of lengths and exits, and it finds
 * a route on the first descent on nearly every seed. A budget rather than an unbounded search because a
 * grid too small for the turns asked of it has no route at all, and that has to fail rather than hang.
 */
const NODE_BUDGET = 600

/** How many openings to draw before giving up on a board — the same allowance the other generator has. */
const OPENING_DRAWS = 24

/** Attempts a seed gets. Measured at ~1, so this is the guard on a dial set past what the grid can hold. */
const MAX_ATTEMPTS = 400

/** The four neighbours two tappable pieces may not share, matching `piecesAreSpaced`'s own rule. */
const NEIGHBOURS: readonly Direction[] = SQUARE_DIRECTIONS

/** One cell of a leg being considered, and whether the beam has been through it before on another axis. */
type LegStep = { at: CellRef; crossing: boolean }

/** A golden path under construction. Copied per search node, which is what makes backtracking honest. */
type Partial = {
  cells: RouteCell[]
  bends: Route["bends"]
  /** Which axes the beam has already run through each cell on — a cell repeated on one axis is a retrace. */
  used: Map<string, Set<number>>
  crossings: Set<string>
}

const clonePartial = (state: Partial): Partial => ({
  cells: state.cells.map(cell => ({ ...cell })),
  bends: state.bends.map(bend => ({ ...bend })),
  used: new Map([...state.used].map(([key, axes]) => [key, new Set(axes)])),
  crossings: new Set(state.crossings),
})

/**
 * The cells a leg would cover, or undefined if it cannot be laid.
 *
 * Pure, and that is the point: the search has to ask whether a leg fits before committing to it, which is
 * the whole difference between this builder and the one §11.14 measured. A cell already on the route is a
 * **crossing** when the beam runs through it on a different axis and a **retrace** when it runs through it
 * on the same one — `axisOf` is that distinction, and a retrace is never allowed. A bend cell may not be
 * crossed at all, because the first pass would have turned there.
 */
const legSteps = (
  size: number,
  state: Partial,
  from: CellRef,
  direction: Direction,
  length: number,
  mayCross: boolean
): LegStep[] | undefined => {
  const bendKeys = new Set(state.bends.map(bend => cellKey(bend.at)))
  const steps: LegStep[] = []
  let at = from
  for (let step = 0; step < length; step++) {
    at = stepCell(at, direction)
    if (!insideGrid(size, at)) return undefined
    const key = cellKey(at)
    const axes = state.used.get(key)
    if (!axes) {
      steps.push({ at, crossing: false })
      continue
    }
    if (!mayCross || axes.has(axisOf(direction))) return undefined
    if (bendKeys.has(key)) return undefined
    steps.push({ at, crossing: true })
  }
  return steps
}

/**
 * Whether a mirror may stand here: clear of every bend already placed, and of their shoulders.
 *
 * **A placement constraint rather than a gate at the end** — the plan's decision, and the reason a draft
 * costs one attempt. `piecesAreSpaced` rejects a finished board for this, which on the other generator is a
 * rejection that has already paid for a whole draft. Asked here, the search simply picks a different leg.
 */
const mirrorMayStand = (state: Partial, at: CellRef): boolean => {
  const taken = new Set(state.bends.map(bend => cellKey(bend.at)))
  if (taken.has(cellKey(at))) return false
  return NEIGHBOURS.every(direction => !taken.has(cellKey(stepCell(at, direction))))
}

/** Records a leg on the partial route. */
const commit = (state: Partial, steps: LegStep[], direction: Direction) => {
  for (const step of steps) {
    const key = cellKey(step.at)
    const axes = state.used.get(key)
    if (axes) {
      axes.add(axisOf(direction))
      state.crossings.add(key)
    } else state.used.set(key, new Set([axisOf(direction)]))
    state.cells.push({ at: step.at, enter: direction, exit: direction })
  }
}

/**
 * Lays the golden path, by searching rather than by guessing.
 *
 * Same shape of route as §5 step 1 — bends carrying one mirror each, the final leg running to the frame so
 * the shrine sits in the wall — and the same two facts about it: a crossing must be a different axis
 * (§5.2), and a diagonal leg can only be closed by a half-step bend, which is why cut bends come in
 * consecutive pairs (`cutBendSlots`).
 *
 * What is new is that it **backtracks**. §11.14 measured 92–97% of all generation work as a route builder
 * being asked blind for a path it cannot lay, and named it the honest optimisation target. So each leg is
 * tested before it is taken (`legSteps`), each bend cell is checked for room (`mirrorMayStand`), and a dead
 * end costs one search node instead of one whole draft.
 */
const buildGoldenPath = (
  size: number,
  turns: number,
  mayCross: boolean,
  wantedCrossings: number,
  cutMirrors: number,
  random: () => number
): Route | undefined => {
  const cuts = cutBendSlots(turns, cutMirrors, random)
  if (!cuts) return undefined
  const sun = pickSun(size, random)

  // Legs share the grid, so their length has to know how many of them there are — and a crossing route
  // needs legs of DIFFERENT lengths, since a fold of equal legs comes back alongside its own line and
  // stops one square short for ever (§5.2). Both derivations are the other generator's, unchanged.
  const spread = mayCross ? Math.ceil((turns + 1) / 2) : turns + 1
  const budget = Math.max(mayCross ? MIN_LEG + 1 : MIN_LEG, Math.floor((size - 1) / Math.max(1, spread)))
  const lengths = Array.from({ length: Math.max(1, budget - MIN_LEG + 1) }, (_, index) => MIN_LEG + index)

  let nodes = 0

  const extend = (state: Partial, at: CellRef, direction: Direction, leg: number): Route | undefined => {
    if (nodes++ > NODE_BUDGET) return undefined

    if (leg === turns) {
      // The final leg runs all the way to the frame, which is what sets the shrine in the wall: an edge
      // shrine has few approaches and the frame kills most of them, which is what lets `exitRun` fire.
      const length = stepsToEdge(size, at, direction)
      if (length < 1) return undefined
      const steps = legSteps(size, state, at, direction, length, mayCross)
      if (!steps) return undefined
      // The shrine takes the light the first time it arrives, so it can never be a cell the beam has
      // already been through.
      if (steps[steps.length - 1].crossing) return undefined
      const done = clonePartial(state)
      commit(done, steps, direction)
      done.cells[done.cells.length - 1].exit = undefined
      if (done.crossings.size < wantedCrossings) return undefined
      return {
        sun,
        shrine: steps[steps.length - 1].at,
        cells: done.cells,
        bends: done.bends,
        crossings: done.crossings,
      }
    }

    const half = cuts.has(leg)
    // A diagonal leg has no other way out — an ordinary mirror passes diagonal light or sends it straight
    // home — so `cutBendSlots` places cut bends in consecutive pairs and this can only be a leftover.
    if (runsDiagonally(direction) && !half) return undefined
    const exits = (half ? halfStepTurns(direction) : perpendicular(direction)).filter(
      exit => angleFor(direction, exit) !== undefined
    )

    for (const length of shuffle(lengths, random)) {
      const steps = legSteps(size, state, at, direction, length, mayCross)
      if (!steps) continue
      const bendAt = steps[steps.length - 1].at
      // A bend needs a mirror, so the cell has to be able to hold one: never a crossed square, and never
      // on another mirror's shoulder.
      if (steps[steps.length - 1].crossing) continue
      if (!mirrorMayStand(state, bendAt)) continue
      for (const exit of shuffle(exits, random)) {
        const angle = angleFor(direction, exit)
        if (angle === undefined) continue
        const next = clonePartial(state)
        commit(next, steps, direction)
        next.cells[next.cells.length - 1].exit = exit
        next.bends.push({ at: bendAt, enter: direction, exit, angle })
        const route = extend(next, bendAt, exit, leg + 1)
        if (route) return route
      }
    }
    return undefined
  }

  return extend(
    { cells: [], bends: [], used: new Map([[cellKey(sun.at), new Set([0, 1, 2, 3])]]), crossings: new Set() },
    sun.at,
    sun.facing,
    0
  )
}

/**
 * The stop list a golden bend offers: the answer, and the one partner that keeps a quarter turn.
 *
 * §11.8 rule 2, and `cutStops` is where the four pairs are derived. A diagonal answer satisfies the rule
 * on its own, so it takes the other diagonal. At `FORK_SIZE` 2 this is the whole list.
 */
const stopsFor = (angle: MirrorAngle): readonly MirrorAngle[] | undefined =>
  isHalfStep(angle) ? cutStops(angle) : TURN_ANGLES

/** The board a branch is authored against: what it may cross, what kills it, and where stone stands. */
type Authoring = {
  size: number
  sun: CellRef
  shrine: CellRef
  /** Every cell the golden beam crosses. A branch may pass through one; stone may never stand on one. */
  goldenCells: Set<string>
  /** `(cell, direction)` pairs the golden beam owns. Sharing one is a join, whatever cell it happens in. */
  goldenSegments: Set<string>
  /** Which tappable piece stands in a cell, and what it can be set to — the fan-out the recursion walks. */
  tappable: Map<string, { piece: number; angles: readonly MirrorAngle[] }>
  /** Mirrors the player cannot touch. A branch passes through one deterministically, and may. */
  givens: Map<string, MirrorAngle>
  walls: Set<string>
  /**
   * Wall-heavy: close a branch in stone even where the frame would have done it for nothing.
   *
   * The frame is the cheapest terminator there is, which is why §5.1 measures a shipped board at 0.0–0.1 fixed
   * walls — and it is also the least legible, because "it left the board" is a weaker sentence than "it hit
   * that". This turns the preference round.
   */
  preferStone: boolean
}

/**
 * How deep the corridor recursion may go. Each level decides one more piece, so the tree is bounded by the
 * piece count; this is the guard, and exceeding it rejects rather than gives the board the benefit of the
 * doubt.
 */
const MAX_CORRIDOR_DEPTH = 12

/**
 * Walks a corridor and answers the only question that matters: **does every continuation of it die?**
 *
 * This is §11.15's sufficient rule, and it replaces phase 1's blanket refusal to enter a tappable cell.
 * The rule and the reason:
 *
 * > While authoring a branch, if it enters a cell any tappable piece can occupy, **recurse**: author every
 * > stop of that piece and require every continuation to die as well.
 *
 * Because a branch entering a tappable cell is **one corridor per stop of that piece** — `(cell, direction)`
 * determines the future only where the cell's content is fixed. §11.15's counterexample board is two
 * branches that each die on their own and combine into a second, shorter route, and it is exactly this that
 * catches it: authoring A's wrong stop walks into B's cell, fans out over B's two stops, and finds that one
 * of them reaches the shrine.
 *
 * Four endings are free — off the frame, into stone, into the disc, and retracing a line this corridor has
 * already travelled, which can reach nothing new. Two are fatal: the shrine, and any `(cell, direction)`
 * pair the golden path owns (a join, including one *upstream* of where the branch left). A fatal ending is
 * cut short with stone at the first cell of the current run that can hold it — nearest the mirror, because a
 * wall right there is the most legible dead end and anything further along is a longer story for the same
 * conclusion.
 *
 * **The recursion is deliberately conservative.** It carries no knowledge that the bends upstream of the
 * branch must be at their golden angles for the light to have arrived at all, so a corridor that re-enters an
 * upstream mirror is checked against *every* stop of it rather than the one that is actually possible. That
 * over-checks and never under-checks, which is the right direction for a proof.
 *
 * Stone is placed as it goes rather than after a dry run. A wall only ever kills a beam *earlier*, so adding
 * one can never revive a continuation that had already died — and `pruneStone` afterwards removes any that
 * a sibling's stone later made unreachable.
 */
const corridorDies = (
  board: Authoring,
  from: CellRef,
  direction: Direction,
  decided: ReadonlyMap<number, MirrorAngle>,
  travelled: ReadonlySet<string>,
  depth: number
): boolean => {
  if (depth > MAX_CORRIDOR_DEPTH) return false
  const stone: CellRef[] = []
  const seen = new Set(travelled)
  let at = stepCell(from, direction)
  let travel = direction

  // Cut the corridor short. Nearest stone first; false when there is nowhere to stand any.
  const closeHere = (): boolean => {
    const wall = stone[0]
    if (!wall) return false
    board.walls.add(cellKey(wall))
    return true
  }

  for (;;) {
    if (!insideGrid(board.size, at)) {
      // The frame closes it for nothing. Wall-heavy would rather it died somewhere the player can point at,
      // so it spends stone here if the corridor offered anywhere to stand it.
      if (board.preferStone && stone.length) return closeHere()
      return true
    }
    const key = cellKey(at)
    if (board.walls.has(key)) return true // dies in stone this or another branch needed
    if (key === cellKey(board.sun)) return true // swallowed by the disc
    const segment = segmentKey(at, travel)
    // Retracing a line already travelled reaches nothing this corridor has not already been offered.
    if (seen.has(segment)) return true
    seen.add(segment)
    if (key === cellKey(board.shrine)) return closeHere()
    if (board.goldenSegments.has(segment)) return closeHere()

    const met = board.tappable.get(key)
    if (met) {
      const already = decided.get(met.piece)
      if (already !== undefined) {
        // The corridor has been through this piece before, so its state is pinned and the future is again
        // determined — the branch simply bends.
        travel = reflect(already, travel)
        at = stepCell(at, travel)
        continue
      }
      const everyStopDies = met.angles.every(angle =>
        corridorDies(board, at, reflect(angle, travel), new Map(decided).set(met.piece, angle), seen, depth + 1)
      )
      return everyStopDies ? true : closeHere()
    }

    const given = board.givens.get(key)
    if (given !== undefined) {
      // A given costs a cell and contributes nothing to the configuration space, so a branch may pass
      // through it freely: its face is fixed, so `(cell, direction)` still determines the future.
      travel = reflect(given, travel)
      at = stepCell(at, travel)
      continue
    }

    if (!board.goldenCells.has(key)) stone.push(at)
    at = stepCell(at, travel)
  }
}

/**
 * Authors one branch off a golden bend.
 *
 * The one thing this knows that `corridorDies` deliberately does not: for the light to have reached this
 * bend at all, every bend upstream is at its golden angle. So a stop that sends the beam **back down its own
 * line** needs nothing — `reflect` is its own inverse in the direction, so the light retraces every leg it
 * has flown, off mirrors that must each still be golden, and the disc swallows it. §11.5's retracing
 * excursion, arriving as a wrong answer instead of a failed idea. The recursion cannot use that argument
 * (it has no notion of "upstream"), which is why it lives here and not there.
 */
const closeBranch = (board: Authoring, from: CellRef, enter: Direction, stop: MirrorAngle): boolean => {
  const direction = reflect(stop, enter)
  if (direction === opposite(enter)) return true
  return corridorDies(board, from, direction, new Map(), new Set([segmentKey(from, enter)]), 0)
}

/**
 * How many walk steps the deviation tree may take before it gives up. A guard: the tree is bounded by the
 * pieces a beam can actually reach, which is a few hundred steps on these grids.
 */
const REACH_CAP = 200_000

/** What walking the reachable deviation tree found. */
export type Reach = {
  /** Distinct paths that reach the shrine. Uniqueness is exactly one. */
  winning: Set<string>
  /** Wall cells some reachable beam ends on — the stone that is doing something. */
  stoneHit: Set<string>
  /** Walk steps taken, for the comparison against `routeIsUnique`'s walk over the whole product. */
  nodes: number
  /** Times the tree branched — the beam met a piece it had not been through and fanned out over its stops. */
  forks: number
  /**
   * Fan-outs met by a beam that has **already deviated** — a branch walking into a piece it has not been
   * through. This is reuse in §11.15's sense, and the number the recursion exists for: zero means the pair
   * invariant would have been sufficient and the recursion had no work to do.
   *
   * Counted only when a solution is supplied, because "has deviated" means "has taken a stop that is not the
   * answer", and nothing else on the board knows which stop that is. A fan-out on the golden path itself is
   * not reuse, however many pieces the route carries — an easy thing to measure by accident.
   */
  reuseForks: number
  /** False when the guard cut the exploration short, in which case nothing may be concluded. */
  complete: boolean
}

/**
 * Walks the **reachable deviation tree** — every future the light can have, fanning out only where it meets
 * a piece whose state it has not already been through.
 *
 * This is §11.15's proposed replacement for `routeIsUnique`, and the claim phase 2 exists to test: that the
 * tree is cheaper than the product. `routeIsUnique` enumerates every configuration and traces each one,
 * which is 37 350 walks on a wizard board; here, **once a beam dies the settings downstream of it cannot
 * matter**, so they are never enumerated. What is walked is the set of *distinguishable* futures.
 *
 * It is a different question from "how many configurations light the shrine" and the same question as "how
 * many winning routes are there", which is the property §5 gate 5 actually wants: a decoy's free setting
 * multiplies configurations without adding a route, and this never asks about it.
 *
 * Returns undefined for a board this cannot reason about — a sliding piece, whose absence from a cell is
 * itself information, or a socket, which changes the board mid-walk. Both arrive in later phases, and
 * pretending to handle them would be worse than declining: the caller falls back to `routeIsUnique`.
 */
export const reachableDeviations = (
  puzzle: LightbeamPuzzleData,
  /** The answer, only needed to tell a fan-out on the golden path from one a deviated beam met. */
  solution?: readonly number[]
): Reach | undefined => {
  if (puzzle.movable.some(piece => piece.kind !== "turnMirror")) return undefined
  if (puzzle.nodes?.length || puzzle.wirings?.length) return undefined

  const byCell = new Map<string, { piece: number; angles: readonly MirrorAngle[] }>()
  puzzle.movable.forEach((piece, index) => {
    if (piece.kind === "turnMirror") byCell.set(cellKey(piece.at), { piece: index, angles: piece.angles })
  })
  const givens = new Map<string, MirrorAngle>()
  const walls = new Set<string>()
  for (const piece of puzzle.fixed) {
    if (piece.kind === "mirror") givens.set(cellKey(piece.at), piece.angle)
    else walls.add(cellKey(piece.at))
  }
  const sunKey = cellKey(puzzle.sun.at)
  const shrineKey = cellKey(puzzle.shrine)

  const found: Reach = { winning: new Set(), stoneHit: new Set(), nodes: 0, forks: 0, reuseForks: 0, complete: true }

  const explore = (
    from: CellRef,
    direction: Direction,
    decided: ReadonlyMap<number, MirrorAngle>,
    prefix: readonly string[],
    travelled: ReadonlySet<string>,
    deviated: boolean
  ): void => {
    const seen = new Set(travelled)
    const trail = [...prefix]
    let at = stepCell(from, direction)
    let travel = direction
    for (;;) {
      if (found.nodes++ > REACH_CAP) {
        found.complete = false
        return
      }
      if (!insideGrid(puzzle.size, at)) return
      const key = cellKey(at)
      if (walls.has(key)) {
        found.stoneHit.add(key)
        return
      }
      if (key === sunKey) return
      const segment = segmentKey(at, travel)
      if (seen.has(segment)) return
      seen.add(segment)
      trail.push(segment)
      if (key === shrineKey) {
        found.winning.add(trail.join(" "))
        return
      }
      const met = byCell.get(key)
      if (met) {
        const already = decided.get(met.piece)
        if (already === undefined) {
          // The one place the tree branches: a piece the beam has not been through yet has as many futures
          // as it has stops, and every one of them is walked.
          found.forks++
          if (deviated) found.reuseForks++
          const answer = solution ? met.angles[solution[met.piece]] : undefined
          for (const angle of met.angles)
            explore(
              at,
              reflect(angle, travel),
              new Map(decided).set(met.piece, angle),
              trail,
              seen,
              deviated || (answer !== undefined && angle !== answer)
            )
          return
        }
        travel = reflect(already, travel)
        at = stepCell(at, travel)
        continue
      }
      const given = givens.get(key)
      if (given !== undefined) {
        travel = reflect(given, travel)
        at = stepCell(at, travel)
        continue
      }
      at = stepCell(at, travel)
    }
  }

  explore(puzzle.sun.at, puzzle.sun.facing, new Map(), [], new Set(), false)
  return found
}

/**
 * Drops stone that nothing reaches.
 *
 * `corridorDies` places stone as it walks, and a sibling continuation forced to close earlier can leave a
 * wall further along that no beam will ever arrive at. That is scenery, and §5.1 rules it out: a wall the
 * player cannot spend hides which obstacles the deduction turns on.
 *
 * Safe as a single pass, because a wall no beam reaches cannot be on any beam's path — so removing it changes
 * no path, and the set of reachable beams is the same before and after. Declines to prune at all if the
 * exploration was cut short, rather than guessing.
 */
const pruneStone = (board: Authoring, route: Route, movable: MovablePiece[]): Set<string> => {
  const fixed: FixedPiece[] = [
    ...[...board.walls].map((key): FixedPiece => {
      const [row, col] = key.split(",").map(Number)
      return { kind: "wall", at: { row, col } }
    }),
    ...[...board.givens].map(([key, angle]): FixedPiece => {
      const [row, col] = key.split(",").map(Number)
      return { kind: "mirror", at: { row, col }, angle }
    }),
  ]
  const reach = reachableDeviations({ size: board.size, sun: route.sun, shrine: route.shrine, fixed, movable })
  if (!reach || !reach.complete) return board.walls
  return new Set([...board.walls].filter(key => reach.stoneHit.has(key)))
}

/** A mirror a branch turns at. Off the golden path by construction, so the winning beam never meets it. */
type BranchMirror = { at: CellRef; angle: MirrorAngle; angles: readonly MirrorAngle[]; live: boolean }

/** Where a mirror may be dropped: on the grid, off the golden beam's line, and not on top of another piece. */
const mirrorFits = (
  size: number,
  goldenCells: ReadonlySet<string>,
  mirrors: ReadonlySet<string>,
  tappable: ReadonlySet<string>,
  at: CellRef,
  live: boolean
): boolean => {
  if (!insideGrid(size, at)) return false
  const key = cellKey(at)
  // A mirror on the winning beam's line would bend it, and the golden path is already laid.
  if (goldenCells.has(key) || mirrors.has(key)) return false
  // Shoulders are a tap-accuracy rule, so only tappable pieces claim them (`piecesAreSpaced`).
  if (!live) return true
  if (tappable.has(key)) return false
  return NEIGHBOURS.every(direction => !tappable.has(cellKey(stepCell(at, direction))))
}

/**
 * Plans the mirrors a branch turns at, before any branch is closed.
 *
 * **Geometry only — it does not ask whether anything dies.** That question cannot be answered until the whole
 * piece list exists, because a corridor closed against a half-built board was checked against the wrong set of
 * tappable cells, and a branch mirror placed for one branch is a cell every other branch may now meet. So this
 * lays the shape and `corridorDies` passes judgement afterwards.
 *
 * A turn is only offered `MIN_LEG` cells out or further, which keeps the branch mirror off the shoulder of the
 * very piece whose wrong setting aimed the light at it.
 */
const planBranchMirrors = (
  size: number,
  goldenCells: ReadonlySet<string>,
  mirrors: Set<string>,
  tappable: Set<string>,
  from: CellRef,
  direction: Direction,
  depth: number,
  interactive: number,
  random: () => number
): BranchMirror[] => {
  const planned: BranchMirror[] = []
  let at = from
  let travel = direction
  for (let turn = 0; turn < depth; turn++) {
    const live = random() < interactive
    // Every cell the branch would run through, far enough out to hold a mirror.
    const candidates: CellRef[] = []
    let probe = at
    for (let step = 0; step < size * 2; step++) {
      probe = stepCell(probe, travel)
      if (!insideGrid(size, probe)) break
      if (step + 1 >= MIN_LEG && mirrorFits(size, goldenCells, mirrors, tappable, probe, live)) candidates.push(probe)
    }
    if (!candidates.length) break

    const spot = shuffle(candidates, random)[0]
    // Any genuine turn will do; a diagonal exit needs a half-step angle and `angleFor` refuses the rest.
    const exits = shuffle([...perpendicular(travel), ...halfStepTurns(travel)], random)
    const exit = exits.find(candidate => {
      const angle = angleFor(travel, candidate)
      return angle !== undefined && stopsFor(angle) !== undefined
    })
    if (exit === undefined) break
    const angle = angleFor(travel, exit) as MirrorAngle
    const angles = stopsFor(angle) as readonly MirrorAngle[]

    mirrors.add(cellKey(spot))
    if (live) tappable.add(cellKey(spot))
    planned.push({ at: spot, angle, angles, live })
    at = spot
    travel = exit
  }
  return planned
}

/**
 * Wall-heavy's own sentence: the two cells a diagonal step squeezes past.
 *
 * §11.8 rule 4 says a diagonal step resolves only the cell it lands in, never the two it slips between — and
 * the design doc's answer to "how does the player learn that" was to draw walls with rounded corners and add
 * no rules text. This makes the fact **visible on the board it matters on**: stone in both corners, with the
 * winning beam going straight through the gap. Nothing is asked of the player; the beam simply does it in
 * front of them.
 *
 * It cannot bend the golden beam — that is exactly what rule 4 guarantees — so the only thing to check is that
 * the stone is not standing where something else already is.
 */
const cornerSlipWalls = (board: Authoring, route: Route): CellRef[] => {
  const found: CellRef[] = []
  let previous: CellRef | undefined
  for (const cell of route.cells) {
    if (previous && cell.enter % 2 === 1) {
      // The two orthogonal neighbours shared by the step's start and end.
      const step = directionStep(cell.enter)
      for (const corner of [
        { row: previous.row + step.row, col: previous.col },
        { row: previous.row, col: previous.col + step.col },
      ]) {
        const key = cellKey(corner)
        if (!insideGrid(board.size, corner)) continue
        if (board.goldenCells.has(key) || board.walls.has(key)) continue
        if (board.tappable.has(key) || board.givens.has(key)) continue
        if (found.some(already => cellKey(already) === key)) continue
        found.push(corner)
      }
    }
    previous = cell.at
  }
  return found
}

type Draft = { fixed: FixedPiece[]; movable: MovablePiece[]; solution: number[] }

/**
 * Turns a golden path into a board: a tappable mirror at every bend, and a closed corridor for every stop
 * none of them is set to.
 *
 * **Why the result is unique, which is the property phase 1 exists to test.** Take any configuration and
 * let `k` be the first bend, in beam order, not standing at its golden angle. Every bend before `k` is
 * golden and every golden cell between them is empty, so the beam reaches `k` along the golden path
 * travelling `bends[k].enter` — exactly the direction the corridors at `k` were authored against. It
 * therefore leaves down one of them and dies: at the frame, in stone, or in the disc. So no configuration
 * with a wrong bend lights the shrine, the all-golden one does, and the winning path is the golden path.
 *
 * The argument needs both halves of the corridor rule to hold. A branch sharing a `(cell, direction)` pair
 * with the golden path would have the golden path's own future and deliver the light — including from
 * *upstream* of where it left, which is why the test is the pair rather than "does it reach the shrine".
 * And a branch entering a tappable cell has as many futures as that piece has stops, so `corridorDies`
 * recurses over every one of them and requires each to die — §11.15's sufficient rule, and what makes
 * "the future is determined" true again everywhere.
 *
 * Stone is authored rather than pruned to a fixpoint, so `thinWalls` does not run. Note the reason, because
 * measuring it corrected the plan: `thinWalls` re-checks uniqueness and the ladder, and most authored stone
 * is load-bearing for neither — it is holding a branch out of territory the recursion would otherwise have to
 * clear. `pruneStone` is the only trimming that happens, and it removes what nothing reaches.
 */
const authorBranches = (
  size: number,
  route: Route,
  interactive: number,
  branchDepth: number,
  modes: readonly LightbeamMode[],
  random: () => number
): Draft | undefined => {
  const stops = route.bends.map(bend => stopsFor(bend.angle))
  if (stops.some(list => list === undefined || list.length < FORK_SIZE)) return undefined

  // Which bends are the player's. A share rather than a count, with a floor — and drawn at random rather
  // than taken off the front, so a low share does not always leave the same bends live.
  const wanted = Math.max(MIN_TAPPABLE, Math.round(interactive * route.bends.length))
  if (wanted > route.bends.length) return undefined
  const live = new Set(
    shuffle(
      route.bends.map((_, index) => index),
      random
    ).slice(0, wanted)
  )

  const board: Authoring = {
    size,
    sun: route.sun.at,
    shrine: route.shrine,
    goldenCells: new Set([cellKey(route.sun.at), ...route.cells.map(cell => cellKey(cell.at))]),
    goldenSegments: new Set(route.cells.map(cell => segmentKey(cell.at, cell.enter))),
    tappable: new Map(),
    givens: new Map(
      route.bends.flatMap((bend, index) => (live.has(index) ? [] : [[cellKey(bend.at), bend.angle] as const]))
    ),
    walls: new Set(),
    preferStone: modes.includes("wallHeavy"),
  }

  // The piece list is settled before a single corridor is authored, because which cells are tappable is a
  // fact about the whole board — a branch closed against a half-built board was checked against the wrong one.
  const movable: MovablePiece[] = []
  const solution: number[] = []
  const liveBends: { at: CellRef; enter: Direction; angle: MirrorAngle; angles: readonly MirrorAngle[] }[] = []
  route.bends.forEach((bend, index) => {
    if (!live.has(index)) return
    const angles = stops[index] as readonly MirrorAngle[]
    const piece = movable.length
    board.tappable.set(cellKey(bend.at), { piece, angles })
    movable.push({ kind: "turnMirror", at: bend.at, angles })
    solution.push(angles.indexOf(bend.angle))
    liveBends.push({ at: bend.at, enter: bend.enter, angle: bend.angle, angles })
  })
  if (solution.some(state => state < 0)) return undefined

  // Pass one: lay the shape of every branch, including the mirrors it turns at. Geometry only — nothing is
  // judged yet, because a corridor can only be closed against the finished piece list.
  const mirrorCells = new Set(route.bends.map(bend => cellKey(bend.at)))
  const tappableCells = new Set(liveBends.map(bend => cellKey(bend.at)))
  const corridors: { at: CellRef; enter: Direction; stop: MirrorAngle }[] = []
  for (const bend of liveBends)
    for (const stop of bend.angles) {
      if (stop === bend.angle) continue
      corridors.push({ at: bend.at, enter: bend.enter, stop })
      if (branchDepth < 1) continue
      const direction = reflect(stop, bend.enter)
      // A stop that retraces its own line is already closed and has nowhere to turn.
      if (direction === opposite(bend.enter)) continue
      for (const mirror of planBranchMirrors(
        size,
        board.goldenCells,
        mirrorCells,
        tappableCells,
        bend.at,
        direction,
        branchDepth,
        interactive,
        random
      )) {
        const piece = movable.length
        if (mirror.live) {
          board.tappable.set(cellKey(mirror.at), { piece, angles: mirror.angles })
          movable.push({ kind: "turnMirror", at: mirror.at, angles: mirror.angles })
          // A decoy's setting is free by construction — the winning beam never reaches it — so the answer
          // records the angle it was authored at and `neverReached` is what frees the player from it.
          solution.push(mirror.angles.indexOf(mirror.angle))
        } else board.givens.set(cellKey(mirror.at), mirror.angle)
      }
    }
  if (movable.length < MIN_TAPPABLE) return undefined
  if (solution.some(state => state < 0)) return undefined

  // Wall-heavy's corner pairs go down before any corridor is closed, so a branch may legitimately die in one
  // and `pruneStone` can tell which of them earned their place.
  const decorative = new Set<string>()
  if (modes.includes("wallHeavy"))
    for (const corner of cornerSlipWalls(board, route)) {
      board.walls.add(cellKey(corner))
      decorative.add(cellKey(corner))
    }

  // Pass two: close every corridor against the finished board. A given has no wrong stop to spend, so it
  // authors no corridor at all — which is what makes a low share cheap and a high one expensive.
  for (const corridor of corridors)
    if (!closeBranch(board, corridor.at, corridor.enter, corridor.stop)) return undefined

  // A corner pair is kept whether or not a beam ends on it: it is there to be *read*, which is the one
  // exception to §5.1's rule against stone the player cannot spend — the beam spends it, by going through.
  // Kept as a pair or not at all, so a lone wall never reads as an ordinary dead end.
  const kept = new Set([...pruneStone(board, route, movable), ...(decorative.size > 1 ? decorative : [])])
  const fixed: FixedPiece[] = [
    ...shuffle([...kept], random).map((key): FixedPiece => {
      const [row, col] = key.split(",").map(Number)
      return { kind: "wall", at: { row, col } }
    }),
    ...[...board.givens].map(([key, angle]): FixedPiece => {
      const [row, col] = key.split(",").map(Number)
      return { kind: "mirror", at: { row, col }, angle }
    }),
  ]
  return { fixed, movable, solution }
}

/**
 * One build-and-gate attempt on the authored construction.
 *
 * The gates are the shipped ones, unchanged and in the same order, because the point of phase 1 is what
 * **they** say about an authored board. `thinWalls` is the one step deliberately skipped, per the plan.
 */
const attemptAuthored = (
  size: number,
  seed: number,
  attempt: number,
  dials: LightbeamDials,
  interactive: number,
  branchDepth: number,
  modes: readonly LightbeamMode[],
  cap: TechniqueId,
  reject?: (gate: LightbeamGate) => void
): Omit<LightbeamPuzzle, "goals"> | undefined => {
  const random = mulberry32(seed * 7919 + attempt)

  const route = buildGoldenPath(size, dials.turns, dials.crossings > 0, dials.crossings, dials.cutMirrors, random)
  if (!route) {
    reject?.("noRoute")
    return undefined
  }
  const draft = authorBranches(size, route, interactive, branchDepth, modes, random)
  if (!draft) {
    reject?.("noCorridor")
    return undefined
  }
  if (!piecesAreSpaced(size, draft.movable, new Set())) {
    // `mirrorMayStand` is supposed to have made this unreachable — it is kept as the shipped gate's own
    // verdict on an authored board, which is what phase 1 is measuring.
    reject?.("piecesTouch")
    return undefined
  }

  const puzzle: LightbeamPuzzleData = {
    size,
    sun: route.sun,
    shrine: route.shrine,
    fixed: draft.fixed,
    movable: draft.movable,
  }
  if (!isLit(puzzle, draft.solution)) {
    reject?.("answerDark")
    return undefined
  }

  // The uniqueness gate is now the reachable deviation tree rather than the walk over the whole product
  // (§11.15, measured in §11.17). It answers the same question — how many winning *routes* are there — and
  // stops exploring a beam the moment it dies, so the settings downstream of a dead beam are never visited.
  // `routeIsUnique` stays the fallback for a board the tree declines to reason about.
  const reach = reachableDeviations(puzzle)
  const unique = reach?.complete ? reach.winning.size === 1 : routeIsUnique(puzzle, allPieceOptions(puzzle))
  if (!unique) {
    reject?.("notUnique")
    return undefined
  }
  if (!solveLightbeamByTechniques(puzzle, cap).settled) {
    reject?.("notSettled")
    return undefined
  }

  // The opening machinery is reused exactly as it stands: how a board was built is orthogonal to where it
  // starts, and this is the logic that stops "tap every piece once" solving the game.
  for (let draw = 0; draw < OPENING_DRAWS; draw++) {
    const initial = drawOpening(puzzle, draft.solution, random)
    if (!openingIsHonest(puzzle, initial)) continue
    if (dials.fiddleProof && !resistsGreedyPlay(puzzle, initial)) continue
    return { ...puzzle, initial, solution: draft.solution, techniqueCap: cap }
  }
  reject?.("noHonestOpening")
  return undefined
}

/**
 * Builds a board by authoring its maze (§11.16).
 *
 * Takes the same `LightbeamOptions` as `generateLightbeam` and reads the dials phase 1 implements —
 * `turns`, `cutMirrors`, `crossings`, `fiddleProof` and `techniqueCap`. The rest describe pieces
 * route-then-obstruct places and this construction does not have yet, so they are ignored rather than
 * approximated: a board that silently dropped `shadows` would measure as a comparison it is not.
 *
 * Goals are absent by design — the plan settles that the three modes replace the goal pool, and they are
 * phase 3.
 */
/** An authored board, which records the modes it was built to the way a shipped board records its goals. */
export type AuthoredLightbeamPuzzle = LightbeamPuzzle & { modes: LightbeamMode[] }

export const generateAuthoredLightbeam = (
  size: number,
  seed: number,
  options: AuthoredOptions = {}
): AuthoredLightbeamPuzzle => {
  const {
    techniqueCap = "deadEnd",
    turns = 2,
    cutMirrors = 0,
    crossings = 0,
    fiddleProof = false,
    interactive = 1,
    branchDepth = 0,
    modes = [],
  } = options
  const dials = { turns, cutMirrors, crossings, fiddleProof } as LightbeamDials

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const puzzle = attemptAuthored(
      size,
      seed,
      attempt,
      dials,
      interactive,
      branchDepth,
      modes,
      techniqueCap,
      options.reject
    )
    if (puzzle) return { ...puzzle, goals: [], modes: [...modes] }
  }
  throw new Error(`generateAuthoredLightbeam: no logically solvable board (size=${size}, seed=${seed})`)
}
