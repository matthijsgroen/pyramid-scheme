import { mulberry32, shuffle } from "@/game/random"
import {
  allPieceOptions,
  cellKey,
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
 * Stops per tappable mirror. Two is the family's lifelong baseline and phase 1's fixed value; the knob it
 * becomes (`forkSize`) is what a later phase turns.
 */
const FORK_SIZE = 2

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
  /** Cells a tappable piece occupies. In phase 1 a branch may not enter one at all — see `NO_REUSE`. */
  tappable: Set<string>
  walls: Set<string>
}

/**
 * Phase 1 forbids **reuse**: a branch may not enter a cell a tappable piece occupies.
 *
 * That is not fastidiousness, it is what makes uniqueness provable here. §11.15's counterexample board is
 * two branches that each die separately and combine into a second route, and the mechanism is exactly this:
 * a branch entering a tappable cell is not one corridor but **one corridor per stop of that piece**, so
 * authoring covers only the stop it was traced against. The sufficient rule is to recurse — author every
 * stop of that piece and require every continuation to die too — and that is phase 2's job.
 *
 * Until then the corridor simply refuses to go there, which costs board density and buys a construction
 * whose uniqueness argument fits in a paragraph (see `authorBranches`).
 */
const NO_REUSE = true

/**
 * Authors one branch: the corridor a wrong stop's light runs down, and the thing that kills it.
 *
 * Walks the ray and takes the first ending it is offered. Three are free — the frame, stone already
 * standing, and the disc — and one is not: reaching the route, the shrine or a tappable cell means the
 * branch has to be cut short, so stone goes at the **first** cell of the corridor that can hold it. First
 * rather than last on purpose: a wall right beside the mirror is the most legible dead end there is, and
 * anything further along is a longer story for the same conclusion.
 *
 * **A golden cell may be crossed but never walled.** Passing through one is genuinely not a join — the
 * walk is keyed on `(cell, direction)`, so two beams sharing a cell while travelling differently have
 * different futures (§11.15) — but stone there would block the winning beam.
 *
 * Returns false when there is nowhere to stand the stone, which is the `noCorridor` rejection.
 */
const closeBranch = (board: Authoring, from: CellRef, enter: Direction, stop: MirrorAngle): boolean => {
  const direction = reflect(stop, enter)
  // A stop that sends the beam back down its own line needs nothing at all. `reflect` is its own inverse in
  // the direction, so the light retraces every leg it has flown, off every mirror that carried it — each
  // still at its golden angle, or the beam would not have got here — and the disc it came out of swallows
  // it. §11.5's retracing excursion, arriving as a wrong answer instead of a failed idea.
  if (direction === opposite(enter)) return true

  const stone: CellRef[] = []
  let at = stepCell(from, direction)
  for (;;) {
    if (!insideGrid(board.size, at)) return true // the frame closes it, and costs nothing
    const key = cellKey(at)
    if (board.walls.has(key)) return true // dies in stone another branch already needed
    if (key === cellKey(board.sun)) return true // swallowed by the disc
    const fatal =
      key === cellKey(board.shrine) ||
      (NO_REUSE && board.tappable.has(key)) ||
      board.goldenSegments.has(segmentKey(at, direction))
    if (fatal) {
      const wall = stone[0]
      if (!wall) return false
      board.walls.add(cellKey(wall))
      return true
    }
    if (!board.goldenCells.has(key)) stone.push(at)
    at = stepCell(at, direction)
  }
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
 * And a branch entering a tappable cell would have as many futures as that piece has stops, which is
 * §11.15's counterexample and why `NO_REUSE` holds here.
 *
 * Stone is authored, so `thinWalls` deliberately does not run: every wall placed here is the only thing
 * closing some branch, and a pruner can only remove load-bearing stone.
 */
const authorBranches = (size: number, route: Route, random: () => number): Draft | undefined => {
  const stops = route.bends.map(bend => stopsFor(bend.angle))
  if (stops.some(list => list === undefined || list.length < FORK_SIZE)) return undefined

  const board: Authoring = {
    size,
    sun: route.sun.at,
    shrine: route.shrine,
    goldenCells: new Set([cellKey(route.sun.at), ...route.cells.map(cell => cellKey(cell.at))]),
    goldenSegments: new Set(route.cells.map(cell => segmentKey(cell.at, cell.enter))),
    tappable: new Set(route.bends.map(bend => cellKey(bend.at))),
    walls: new Set(),
  }

  // Every corridor is closed against the finished piece list, not against a board still being built: which
  // cells are tappable is a fact about the whole board, and a branch authored before the last mirror was
  // placed would have been checked against the wrong one.
  for (const [index, bend] of route.bends.entries()) {
    const list = stops[index]
    if (!list) return undefined
    for (const stop of list) {
      if (stop === bend.angle) continue
      if (!closeBranch(board, bend.at, bend.enter, stop)) return undefined
    }
  }

  const movable: MovablePiece[] = route.bends.map((bend, index) => ({
    kind: "turnMirror",
    at: bend.at,
    angles: stops[index] as readonly MirrorAngle[],
  }))
  const solution = route.bends.map((bend, index) => (stops[index] as readonly MirrorAngle[]).indexOf(bend.angle))
  if (solution.some(state => state < 0)) return undefined

  const fixed: FixedPiece[] = shuffle([...board.walls], random).map(key => {
    const [row, col] = key.split(",").map(Number)
    return { kind: "wall", at: { row, col } }
  })
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
  cap: TechniqueId,
  reject?: (gate: LightbeamGate) => void
): Omit<LightbeamPuzzle, "goals"> | undefined => {
  const random = mulberry32(seed * 7919 + attempt)

  const route = buildGoldenPath(size, dials.turns, dials.crossings > 0, dials.crossings, dials.cutMirrors, random)
  if (!route) {
    reject?.("noRoute")
    return undefined
  }
  const draft = authorBranches(size, route, random)
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

  const states = allPieceOptions(puzzle)
  if (!routeIsUnique(puzzle, states)) {
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
export const generateAuthoredLightbeam = (
  size: number,
  seed: number,
  options: LightbeamOptions = {}
): LightbeamPuzzle => {
  const { techniqueCap = "deadEnd", turns = 2, cutMirrors = 0, crossings = 0, fiddleProof = false } = options
  const dials = { turns, cutMirrors, crossings, fiddleProof } as LightbeamDials

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const puzzle = attemptAuthored(size, seed, attempt, dials, techniqueCap, options.reject)
    if (puzzle) return { ...puzzle, goals: [] }
  }
  throw new Error(`generateAuthoredLightbeam: no logically solvable board (size=${size}, seed=${seed})`)
}
