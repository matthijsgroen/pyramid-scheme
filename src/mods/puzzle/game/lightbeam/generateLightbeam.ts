import { mulberry32, shuffle } from "@/game/random"
import {
  allPieceOptions,
  cellKey,
  directionStep,
  DIRECTIONS,
  pieceCells,
  pieceOccupant,
  pieceStateCount,
  insideGrid,
  isHalfStep,
  isLit,
  opposite,
  reflect,
  restingState,
  segmentKey,
  traceBeam,
  SQUARE_DIRECTIONS,
  stepCell,
  TURN_ANGLES,
  type BeamNode,
  type Blocker,
  type CellRef,
  type Direction,
  type FixedPiece,
  type LightbeamPuzzleData,
  type MirrorAngle,
  type MovablePiece,
  type NodeWiring,
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
  trackRuns,
  type Route,
  type RouteCell,
} from "./lightbeamGeometry"

export { resistsGreedyPlay, routeIsUnique } from "./lightbeamGeometry"
import { solveLightbeamByTechniques, TECHNIQUES, type TechniqueId } from "./techniques"
import type { Grade } from "@/game/families/familyMeta"

/** A board an attempt produced, before the modes it was drawn to are recorded on it. */
type GeneratedBoard = Omit<LightbeamPuzzle, "modes">

// Generation, per docs/game-design/puzzles/lightbeam.md: the maze is authored. Lay a golden path from disc
// to shrine, then for every stop a mirror is *not* set to, author the corridor that stop's light runs down
// and make it die — at the frame, in stone, in the disc, or on a trap's own stone. Uniqueness is a property
// of the construction, not a verdict a gate reaches.
//
// Two conditions carry that argument, and both are asserted below: a branch may share no `(cell, direction)`
// pair with the golden path, and a branch entering a cell a tappable piece can occupy is one corridor per
// state of that piece, each of which must die.

/** What kind of board this is, as against how hard it is. */
export const LIGHTBEAM_MODES = ["wallHeavy", "sliderHeavy", "switchHeavy"] as const

export type LightbeamMode = (typeof LIGHTBEAM_MODES)[number]

/** The floor on tappable pieces, whatever `interactive` says: `openingIsHonest` refuses any board under it. */
const MIN_TAPPABLE = 3

/** Every dial that shapes a board. A tier sets these; `LIGHTBEAM_CONFIG` is where. */
export type LightbeamDials = {
  /** How many times the route bends between sun-disc and shrine. */
  turns: number
  /**
   * How many times the winning beam must fold back through its own line. A crossed square is provably
   * empty — anything standing there would have turned the first pass — and it costs no piece.
   */
  crossings: number
  /** How many of the route's bends turn the beam diagonally — the cut mirrors. */
  cutMirrors: number
  /** How long a sliding piece's track is. Two asks "in the way or out of it"; three asks *which* stop. */
  slidingStops: number
  /**
   * How many sliding walls stand on the route's own line: stone in the beam's way that the player slides
   * aside. Always two stops — a third is a second cell off the line, and would be a second winning answer.
   */
  slidingWalls: number
  /** Stone across the route that no tap can shift, opened by the light reaching a socket upstream of it. */
  doors: number
  /** How many sockets a door's wiring names. One is a plain door; two is an and-wiring. */
  doorNodes: number
  /** Refuse boards that a run of getting-warmer taps solves. Off at starter, where fiddling is the point. */
  fiddleProof: boolean
} & AuthoringDials

/** The dials that shape how the maze around the route is authored. */
export type AuthoringDials = {
  /**
   * 0..1, the share of a board's mirrors that are the player's to tap. A given costs a cell and reads as
   * scenery; a tappable mirror adds configuration space and owes every branch that touches it a corridor.
   */
  interactive: number
  /**
   * How many traps to author — a socket the light must be kept *away* from, whose stone lands in front of the
   * beam. Switch-heavy only, and it needs `branchDepth` at least 1 so a trap corridor can turn.
   */
  traps: number
  /** Which modes this board is built to. Combinable, and recorded on the result rather than logged. */
  modes: readonly LightbeamMode[]
  /**
   * How many golden bends slide rather than turn. The cheapest fork in the family: a slider's wrong setting
   * is "as if the piece were not there", so the branch is the beam carrying straight on, with no corridor.
   */
  sliders: number
  /** Whether a board may carry a piece the light can never reach. Off by default — see `dropUnreachable`. */
  decoys: boolean
  /**
   * The most stops a mirror on the route may offer. Only the route's mirrors take it: a bigger fork on a
   * piece the light never reaches buys configuration space and no reasoning.
   */
  forkSize: number
  /**
   * Turns per authored branch; 0 is a straight run to stone or the frame. A branch that turns needs a mirror
   * off the golden path — a decoy, or a shadow where the branch is one a wrong setting takes.
   */
  branchDepth: number
}

export type LightbeamOptions = Partial<LightbeamDials> & {
  /** The strongest deduction a board may demand. */
  techniqueCap?: TechniqueId
  /** The modes this tier may draw, and how many to draw a board. Without a pool, every board is the mean. */
  modePool?: readonly LightbeamMode[]
  modeCount?: number
  /**
   * The dial sets a board may be drawn to, one per board — what `modePool` is for modes, for everything else,
   * so a tier is a range rather than one recipe. Merged over the tier's dials, and drawn off the seed.
   */
  flavours?: readonly Partial<LightbeamDials>[]
  /** Diagnostics: the gate that threw a draft away, once per rejected attempt. */
  reject?: (gate: LightbeamGate) => void
}

/** The gates a draft can die at, in the order `attemptGeneration` applies them. */
export type LightbeamGate =
  | "noRoute"
  | "tooFewCrossings"
  | "noCorridor"
  /** A mode asked for a sliding piece and no track fitted. */
  | "noTrack"
  /** A flavour asked for a sliding wall and no straight stretch could carry one. */
  | "noSlidingWall"
  /** Every piece stood in the winning beam's own line, so following the light would solve the board. */
  | "noShadow"
  /** Switch-heavy could not fit a door and its sockets on the route. */
  | "noDoor"
  /** No wrong setting could be routed to the shrine, so there was nothing to trap. */
  | "noTrap"
  /** The trap was decoration — the board stayed a puzzle without it. */
  | "trapIdle"
  | "piecesTouch"
  | "answerDark"
  | "notUnique"
  | "notSettled"
  | "noHonestOpening"

export type LightbeamPuzzle = LightbeamPuzzleData & {
  /**
   * The state each piece opens in. Drawn per piece rather than derived from the solution, and gated so no
   * uniform number of taps opens the board — see `drawOpening`, and the exploit that made it necessary.
   */
  initial: number[]
  /** A configuration that lights the shrine. Carried for tests and for the mistake check, not for hints. */
  solution: number[]
  /** Carried so hints stay inside the same ladder the board was accepted under. */
  techniqueCap: TechniqueId
  /**
   * The modes this board was built to, in canonical order.
   *
   * Carried as data rather than logged, for the reason §7 gave about its goals: a fallback that fires
   * silently makes the whole pool decorative while every measurement still looks fine. A spec can assert what
   * a tier actually delivered, and the playtest bench can show what a board was meant to be.
   */
  modes: LightbeamMode[]
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
type PartialRoute = {
  cells: RouteCell[]
  bends: Route["bends"]
  /** Which axes the beam has already run through each cell on — a cell repeated on one axis is a retrace. */
  used: Map<string, Set<number>>
  crossings: Set<string>
}

const clonePartial = (state: PartialRoute): PartialRoute => ({
  cells: state.cells.map(cell => ({ ...cell })),
  bends: state.bends.map(bend => ({ ...bend })),
  used: new Map([...state.used].map(([key, axes]) => [key, new Set(axes)])),
  crossings: new Set(state.crossings),
})

/**
 * The cells a leg would cover, or undefined if it cannot be laid — pure, so the search can ask before it
 * commits. A cell already on the route is a crossing on a different axis and a retrace on the same one,
 * which is never allowed; a bend cell may not be crossed at all, as the first pass would have turned there.
 */
const legSteps = (
  size: number,
  state: PartialRoute,
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
const mirrorMayStand = (state: PartialRoute, at: CellRef): boolean => {
  const taken = new Set(state.bends.map(bend => cellKey(bend.at)))
  if (taken.has(cellKey(at))) return false
  return NEIGHBOURS.every(direction => !taken.has(cellKey(stepCell(at, direction))))
}

/** Records a leg on the partial route. */
const commit = (state: PartialRoute, steps: LegStep[], direction: Direction) => {
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
 * Lays the golden path: bends carrying one mirror each, the final leg running to the frame so the shrine
 * sits in the wall. A crossing must be on a different axis, and a diagonal leg can only be closed by a
 * half-step bend.
 *
 * It backtracks rather than guesses — each leg is tested before it is taken and each bend cell checked for
 * room, so a dead end costs one search node instead of a whole draft.
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

  const extend = (state: PartialRoute, at: CellRef, direction: Direction, leg: number): Route | undefined => {
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
 * The pair a bend must offer at minimum: the answer, and the one partner that keeps a quarter turn. A
 * half-step answer brings its aligned partner in with it; a diagonal answer takes the other diagonal.
 */
const stopsFor = (angle: MirrorAngle): readonly MirrorAngle[] | undefined =>
  isHalfStep(angle) ? cutStops(angle) : TURN_ANGLES

/**
 * The authored stop list for a mirror on the route. `stopsFor` gives the two the geometry demands; extras
 * are drawn per piece, so no two mirrors need offer the same fork.
 *
 * Stops that bend nothing are deliberately not excluded: they cannot be the answer, but as wrong settings
 * they are two more sentences the board can say. Every extra stop is one more corridor to author.
 */
const forkFor = (angle: MirrorAngle, forkSize: number, random: () => number): readonly MirrorAngle[] | undefined => {
  const base = stopsFor(angle)
  if (!base || forkSize <= base.length) return base
  // `forkSize` is the **most** a list may hold, not the length every list gets. Drawn per piece, length and
  // contents together, so a board carries a mix of two- and three-stop mirrors rather than one uniform fork —
  // which is what rule 1 asks for, and it is also what keeps the cost affordable: every extra stop is another
  // corridor to author and another factor in the space the exhaustive rungs enumerate.
  const wanted = base.length + Math.floor(random() * (forkSize - base.length + 1))
  const extra = shuffle(
    DIRECTIONS.filter(candidate => !base.includes(candidate)),
    random
  ).slice(0, wanted - base.length)
  return [...base, ...extra].sort((a, b) => a - b)
}

/** The board a branch is authored against: what it may cross, what kills it, and where stone stands. */
type Authoring = {
  size: number
  sun: CellRef
  shrine: CellRef
  /** Every cell the golden beam crosses. A branch may pass through one; stone may never stand on one. */
  goldenCells: Set<string>
  /** `(cell, direction)` pairs the golden beam owns. Sharing one is a join, whatever cell it happens in. */
  goldenSegments: Set<string>
  /** The tappable pieces, in board order. `occupancy` says which of them could be in which cell. */
  movable: MovablePiece[]
  /** Rebuilt whenever a piece is added, because a corridor must be closed against the finished list. */
  occupancy: Occupancy
  /** Mirrors the player cannot touch. A branch passes through one deterministically, and may. */
  givens: Map<string, MirrorAngle>
  walls: Set<string>
  /** Sockets on the board, and the wirings they drive. Empty until switch-heavy places any. */
  nodes: BeamNode[]
  wirings: NodeWiring[]
  /** Pieces those wirings own, rebuilt whenever one is added. */
  wired: Map<number, Wired>
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
 * Which pieces could stand in a cell, and in which of their states. A sliding piece is in a given cell in
 * one state and out of it in the others, so "there is nothing here" is itself a fact about its setting.
 */
type Occupancy = Map<string, { piece: number; here: ReadonlySet<number> }[]>

const occupancyOf = (movable: readonly MovablePiece[]): Occupancy => {
  const map: Occupancy = new Map()
  const add = (key: string, piece: number, here: ReadonlySet<number>) => {
    map.set(key, [...(map.get(key) ?? []), { piece, here }])
  }
  movable.forEach((piece, index) => {
    if (piece.kind === "turnMirror") {
      // Every state puts it in the same cell.
      add(cellKey(piece.at), index, new Set(piece.angles.map((_, state) => state)))
      return
    }
    piece.stops.forEach((at, state) => add(cellKey(at), index, new Set([state])))
  })
  return map
}

/**
 * A piece a socket drives, and the states it can be in.
 *
 * **A driven piece is not the player's**, which is the whole reason a socket is worth reaching (§11.2). So it
 * is never "undecided": it sits at `resting` until one of its wirings fires, and then it is pinned. That makes
 * it invisible to the configuration space and invisible to the tree's fan-out.
 */
type Wired = { resting: number; drivenTo: Map<number, number> }

const wiredPieces = (puzzle: LightbeamPuzzleData): Map<number, Wired> => {
  const map = new Map<number, Wired>()
  ;(puzzle.wirings ?? []).forEach((wiring, index) => {
    const existing = map.get(wiring.piece)
    if (existing) existing.drivenTo.set(index, wiring.to)
    else
      map.set(wiring.piece, {
        resting: restingState(puzzle, wiring.piece) ?? 0,
        drivenTo: new Map([[index, wiring.to]]),
      })
  })
  return map
}

/**
 * Where a driven piece stands, given which wirings have fired.
 *
 * Applied in wiring order so two wirings driving one piece resolve the same way every time — the same rule
 * `firedConfig` follows, and for the same reason: the trace has to be a function rather than a coin toss.
 */
const wiredState = (wired: Wired, fired: ReadonlySet<number>): number => {
  for (const [wiring, to] of wired.drivenTo) if (fired.has(wiring)) return to
  return wired.resting
}

/** What a cell holds, given what the walk has already committed the pieces to. */
type Resolved =
  | { kind: "empty" }
  /** Some piece might be here and the walk has not decided it yet: this is where the tree has to fan out. */
  | { kind: "undecided"; piece: number; states: number[] }
  | { kind: "occupied"; blocks: Blocker }

const resolveCell = (
  occupancy: Occupancy,
  movable: readonly MovablePiece[],
  decided: ReadonlyMap<number, number>,
  key: string,
  /** Pieces a socket owns, and which wirings have fired — a driven piece has no choice to fan out over. */
  wired?: { pieces: Map<number, Wired>; fired: ReadonlySet<number> }
): Resolved => {
  const candidates = occupancy.get(key) ?? []
  const stateFor = (piece: number): number | undefined => {
    const driven = wired?.pieces.get(piece)
    if (driven && wired) return wiredState(driven, wired.fired)
    return decided.get(piece)
  }
  // A piece already committed to standing here settles the cell, whatever else might have.
  for (const candidate of candidates) {
    const state = stateFor(candidate.piece)
    if (state !== undefined && candidate.here.has(state))
      return { kind: "occupied", blocks: pieceOccupant(movable[candidate.piece], state).blocks }
  }
  const open = candidates.find(candidate => stateFor(candidate.piece) === undefined)
  if (open)
    return {
      kind: "undecided",
      piece: open.piece,
      states: Array.from({ length: pieceStateCount(movable[open.piece]) }, (_, state) => state),
    }
  return { kind: "empty" }
}

/**
 * What one state of one piece does to a beam entering `at` travelling `travel`. The state may put the piece
 * somewhere else entirely, which leaves the cell empty and the beam carrying straight on.
 */
const afterState = (
  movable: readonly MovablePiece[],
  piece: number,
  state: number,
  at: CellRef,
  travel: Direction
): { dies: true } | { dies: false; travel: Direction } => {
  const occupant = pieceOccupant(movable[piece], state)
  if (cellKey(occupant.at) !== cellKey(at)) return { dies: false, travel }
  if (occupant.blocks.kind === "wall") return { dies: true }
  return { dies: false, travel: reflect(occupant.blocks.angle, travel) }
}

/**
 * How deep the corridor recursion may go. Each level decides one more piece, so the tree is bounded by the
 * piece count; this is the guard, and exceeding it rejects rather than gives the board the benefit of the
 * doubt.
 */
const MAX_CORRIDOR_DEPTH = 12

/**
 * Walks a corridor and answers the only question that matters: does every continuation of it die?
 *
 * A branch entering a cell a tappable piece can occupy is one corridor per stop of that piece, so it
 * recurses over all of them. Four endings are free — off the frame, into stone, into the disc, and retracing
 * a line this corridor has already travelled. Two are fatal: the shrine, and any `(cell, direction)` pair
 * the golden path owns, which is a join. A fatal ending is cut short with stone at the first cell of the
 * run that can hold it, nearest the mirror, where a wall reads as a dead end.
 *
 * The recursion over-checks and never under-checks: it carries no knowledge of which upstream stops the
 * light must have come through, so it checks every one of them.
 */
const corridorDies = (
  board: Authoring,
  from: CellRef,
  direction: Direction,
  decided: ReadonlyMap<number, number>,
  travelled: ReadonlySet<string>,
  depth: number,
  /** Sockets this corridor has already crossed, and the wirings that has fired. */
  crossed: ReadonlySet<number> = new Set(),
  fired: ReadonlySet<number> = new Set()
): boolean => {
  if (depth > MAX_CORRIDOR_DEPTH) return false
  const stone: CellRef[] = []
  let seen = new Set(travelled)
  let at = stepCell(from, direction)
  let travel = direction
  let met = new Set(crossed)
  let lit = new Set(fired)

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

    // A corridor crossing a socket changes the board under itself, so the loop guard starts again. Firing is
    // monotone, so this terminates — and it is what lets a **trap** work: the wrong setting's own light drops
    // the stone that kills it (§11.1).
    let changed = false
    board.nodes.forEach((socket, index) => {
      if (!met.has(index) && cellKey(socket.at) === key) {
        met = new Set(met).add(index)
        changed = true
      }
    })
    if (changed)
      board.wirings.forEach((wiring, index) => {
        if (!lit.has(index) && wiring.from.every(socket => met.has(socket))) {
          lit = new Set(lit).add(index)
          seen = new Set()
        }
      })

    const segment = segmentKey(at, travel)
    // Retracing a line already travelled reaches nothing this corridor has not already been offered.
    if (seen.has(segment)) return true
    seen.add(segment)
    if (key === cellKey(board.shrine)) return closeHere()
    if (board.goldenSegments.has(segment)) return closeHere()

    const here = resolveCell(board.occupancy, board.movable, decided, key, { pieces: board.wired, fired: lit })
    if (here.kind === "undecided") {
      // The sufficient rule. Every state of the piece, including the ones that take a sliding piece
      // somewhere else entirely and leave this cell empty — that is a future too.
      const everyStateDies = here.states.every(state => {
        const after = afterState(board.movable, here.piece, state, at, travel)
        // A state that stands a wall here has already killed this continuation.
        if (after.dies) return true
        return corridorDies(board, at, after.travel, new Map(decided).set(here.piece, state), seen, depth + 1, met, lit)
      })
      return everyStateDies ? true : closeHere()
    }
    if (here.kind === "occupied") {
      // A wall the player is holding in the way is as good a death as authored stone.
      if (here.blocks.kind === "wall") return true
      travel = reflect(here.blocks.angle, travel)
      at = stepCell(at, travel)
      continue
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
 * Authors one branch off a golden bend. The one thing this knows that `corridorDies` does not: for the light
 * to have reached this bend, every bend upstream is golden — so a stop sending the beam back down its own
 * line needs nothing, since it retraces every leg it flew and the disc swallows it.
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
  /**
   * Every cell some reachable beam enters, under any setting the player can reach.
   *
   * A piece outside this set is one **no play can ever involve**: not a shadow standing in a wrong ray, but a
   * mirror the light cannot arrive at however the board is set. See `dropUnreachable`.
   */
  reached: Set<string>
  /** Walk steps taken, for the comparison against `routeIsUnique`'s walk over the whole product. */
  nodes: number
  /** Times the tree branched — the beam met a piece it had not been through and fanned out over its stops. */
  forks: number
  /**
   * Fan-outs met by a beam that has already deviated — the number the recursion exists for; zero means the
   * pair invariant alone would have sufficed. Counted only when a solution says which stop is the answer.
   */
  reuseForks: number
  /** False when the guard cut the exploration short, in which case nothing may be concluded. */
  complete: boolean
}

/**
 * Walks the reachable deviation tree — every future the light can have, fanning out only where it meets a
 * piece whose state it has not been through. Far cheaper than the product, because once a beam dies the
 * settings downstream of it cannot matter, and it asks how many winning *routes* there are.
 *
 * Undefined for a board it cannot reason about — a sliding piece, whose absence from a cell is itself
 * information, or a socket, which changes the board mid-walk. The caller falls back to `routeIsUnique`.
 */
export const reachableDeviations = (
  puzzle: LightbeamPuzzleData,
  /** The answer, only needed to tell a fan-out on the golden path from one a deviated beam met. */
  solution?: readonly number[]
): Reach | undefined => {
  const occupancy = occupancyOf(puzzle.movable)
  const wired = wiredPieces(puzzle)
  const sockets = puzzle.nodes ?? []
  const wirings = puzzle.wirings ?? []
  const givens = new Map<string, MirrorAngle>()
  const walls = new Set<string>()
  for (const piece of puzzle.fixed) {
    if (piece.kind === "mirror") givens.set(cellKey(piece.at), piece.angle)
    else walls.add(cellKey(piece.at))
  }
  const sunKey = cellKey(puzzle.sun.at)
  const shrineKey = cellKey(puzzle.shrine)

  const found: Reach = {
    winning: new Set(),
    stoneHit: new Set(),
    reached: new Set(),
    nodes: 0,
    forks: 0,
    reuseForks: 0,
    complete: true,
  }

  const explore = (
    from: CellRef,
    direction: Direction,
    decided: ReadonlyMap<number, number>,
    prefix: readonly string[],
    travelled: ReadonlySet<string>,
    deviated: boolean,
    /** Sockets this beam has crossed, and the wirings that has fired. Monotone, so the walk cannot cycle. */
    crossed: ReadonlySet<number>,
    fired: ReadonlySet<number>
  ): void => {
    let seen = new Set(travelled)
    const trail = [...prefix]
    let at = stepCell(from, direction)
    let travel = direction
    let sockets_crossed = new Set(crossed)
    let now_fired = new Set(fired)
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

      // Crossing a socket can move a piece, which makes this a board the walk has not been over — so what it
      // saw before proves nothing about looping. Clearing rather than keying on the fired set costs nothing
      // and stays total, because a wiring fires once and never un-fires (the same argument `walkForward`
      // makes). That monotonicity is what generalises the determinism key from `(cell, direction)` to
      // `(cell, direction, firedSet)` without the walk being able to cycle through door states.
      let changed = false
      sockets.forEach((socket, index) => {
        if (!sockets_crossed.has(index) && cellKey(socket.at) === key) {
          sockets_crossed = new Set(sockets_crossed).add(index)
          changed = true
        }
      })
      if (changed)
        wirings.forEach((wiring, index) => {
          if (!now_fired.has(index) && wiring.from.every(socket => sockets_crossed.has(socket))) {
            now_fired = new Set(now_fired).add(index)
            seen = new Set()
          }
        })

      const segment = segmentKey(at, travel)
      if (seen.has(segment)) return
      seen.add(segment)
      found.reached.add(key)
      trail.push(segment)
      if (key === shrineKey) {
        found.winning.add(trail.join(" "))
        return
      }
      const here = resolveCell(occupancy, puzzle.movable, decided, key, {
        pieces: wired,
        fired: now_fired,
      })
      if (here.kind === "undecided") {
        // The one place the tree branches: a piece the beam has not been through yet has as many futures as
        // it has states, and every one of them is walked — including the states that stand it somewhere else
        // and leave this cell empty.
        found.forks++
        if (deviated) found.reuseForks++
        const answer = solution ? solution[here.piece] : undefined
        for (const state of here.states) {
          const after = afterState(puzzle.movable, here.piece, state, at, travel)
          const wrong = answer !== undefined && state !== answer
          if (after.dies) {
            // The player is holding a wall here. Nothing further to walk, but the stone is spent.
            continue
          }
          explore(
            at,
            after.travel,
            new Map(decided).set(here.piece, state),
            trail,
            seen,
            deviated || wrong,
            sockets_crossed,
            now_fired
          )
        }
        return
      }
      if (here.kind === "occupied") {
        if (here.blocks.kind === "wall") return
        travel = reflect(here.blocks.angle, travel)
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

  explore(puzzle.sun.at, puzzle.sun.facing, new Map(), [], new Set(), false, new Set(), new Set())
  return found
}

/**
 * Drops stone that nothing reaches — scenery, which hides which obstacles the deduction turns on. Safe as a
 * single pass: a wall no beam reaches is on no beam's path. Declines to prune if exploration was cut short.
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
  const reach = reachableDeviations({
    size: board.size,
    sun: route.sun,
    shrine: route.shrine,
    fixed,
    movable,
    ...(board.nodes.length ? { nodes: board.nodes, wirings: board.wirings } : {}),
  })
  if (!reach || !reach.complete) return board.walls
  return new Set([...board.walls].filter(key => reach.stoneHit.has(key)))
}

/**
 * A track for a piece sliding across the beam at a golden bend, or undefined if none fits. Every cell but
 * the bend has to be off the golden path and clear of other tappable pieces' shoulders. Square legs only.
 */
const fittingTrack = (
  board: Authoring,
  at: CellRef,
  across: Direction,
  length: number,
  taken: ReadonlySet<string>,
  tappable: ReadonlySet<string>,
  random: () => number
): CellRef[] | undefined => {
  if (runsDiagonally(across)) return undefined
  // The piece that is about to slide is standing at `at`, so it is not a neighbour to keep clear of — it is
  // the very piece being placed. Leaving it in would reject every cell of every track touching the bend,
  // which is a mode that silently does nothing.
  const others = new Set(tappable)
  others.delete(cellKey(at))
  return shuffle(trackRuns(at, across, length), random).find(run =>
    run.every(cell => {
      const key = cellKey(cell)
      if (!insideGrid(board.size, cell)) return false
      if (key === cellKey(at)) return true
      if (board.goldenCells.has(key) || taken.has(key) || board.walls.has(key) || board.givens.has(key)) return false
      if (others.has(key)) return false
      return NEIGHBOURS.every(direction => !others.has(cellKey(stepCell(cell, direction))))
    })
  )
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
 * Plans the mirrors a branch turns at. Geometry only: whether anything dies cannot be answered until the
 * whole piece list exists, so this lays the shape and `corridorDies` judges it afterwards.
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
 * Stone in both cells a diagonal step squeezes past, so the beam is seen slipping through the gap rather
 * than the player being told it can. It cannot bend the golden beam, so the only check is that the cells are
 * free.
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
        if (board.occupancy.has(key) || board.givens.has(key)) continue
        if (found.some(already => cellKey(already) === key)) continue
        found.push(corner)
      }
    }
    previous = cell.at
  }
  return found
}

/** A corridor authored to reach the shrine: the mirrors it turns at, and the cells it runs through. */
type TrapRoute = { mirrors: BranchMirror[]; cells: { at: CellRef; travel: Direction }[] }

/**
 * Authors a corridor from a wrong setting to the shrine, which is what a trap needs: the trap has to be the
 * only reason that setting fails, so it must otherwise be a genuine second route.
 *
 * From the wrong stop's own ray, try to land on the shrine within `depth` turns, placing a mirror at each,
 * depth-first over shuffled candidates. The mirrors are off the golden path, as `planBranchMirrors`.
 */
const routeToShrine = (
  board: Authoring,
  mirrors: Set<string>,
  tappable: Set<string>,
  from: CellRef,
  direction: Direction,
  depth: number,
  interactive: number,
  random: () => number
): TrapRoute | undefined => {
  const shrineKey = cellKey(board.shrine)

  const walk = (at: CellRef, travel: Direction, turnsLeft: number): TrapRoute | undefined => {
    // Every cell this leg would run through, and whether the leg reaches the shrine along the way.
    const run: { at: CellRef; travel: Direction }[] = []
    let probe = at
    for (let step = 0; step < board.size * 2; step++) {
      probe = stepCell(probe, travel)
      if (!insideGrid(board.size, probe)) break
      const key = cellKey(probe)
      run.push({ at: probe, travel })
      if (key === shrineKey) return { mirrors: [], cells: run }
      // A branch may pass a golden cell travelling differently, but it may not join the golden path — that
      // would be a second route by the front door rather than a trap.
      if (board.goldenSegments.has(segmentKey(probe, travel))) break
      if (board.walls.has(key)) break
      if (board.givens.has(key)) break
      // Another piece's cell ends this leg: the trap corridor has to be the beam's own, or the trap is not
      // the only reason the setting fails.
      if (mirrors.has(key)) break
    }
    if (turnsLeft < 1) return undefined

    // Try turning at each cell this leg reached, far enough out to hold a mirror.
    const live = random() < interactive
    const spots = shuffle(
      run.filter(
        (cell, index) =>
          index + 1 >= MIN_LEG && mirrorFits(board.size, board.goldenCells, mirrors, tappable, cell.at, live)
      ),
      random
    )
    for (const spot of spots) {
      for (const exit of shuffle([...perpendicular(spot.travel), ...halfStepTurns(spot.travel)], random)) {
        const angle = angleFor(spot.travel, exit)
        if (angle === undefined) continue
        const angles = stopsFor(angle)
        if (!angles) continue
        mirrors.add(cellKey(spot.at))
        if (live) tappable.add(cellKey(spot.at))
        const rest = walk(spot.at, exit, turnsLeft - 1)
        if (rest) {
          const upTo = run.slice(0, run.findIndex(cell => cellKey(cell.at) === cellKey(spot.at)) + 1)
          return {
            mirrors: [{ at: spot.at, angle, angles, live }, ...rest.mirrors],
            cells: [...upTo, ...rest.cells],
          }
        }
        mirrors.delete(cellKey(spot.at))
        if (live) tappable.delete(cellKey(spot.at))
      }
    }
    return undefined
  }

  return walk(from, direction, depth)
}

/**
 * Sliding walls the player owns: stone resting in the beam's way on a straight stretch, one cell aside from
 * where it belongs. There is no corridor to author for the wrong stop — the beam is absorbed in the piece
 * itself. Two stops only: a third is a second cell off the beam's line, where stone blocks nothing.
 */
const placeSlidingWalls = (
  board: Authoring,
  route: Route,
  movable: MovablePiece[],
  solution: number[],
  walls: number,
  claimed: Set<string>,
  random: () => number
): boolean => {
  if (walls < 1) return true

  // A straight square stretch: a bend already carries a mirror, a crossed square has to stay empty, and a
  // diagonal leg has no square track to slide along.
  //
  // The shoulders are checked here rather than left to `fittingTrack`, which exempts the cell the piece is
  // already standing in — right for a bend, where route geometry keeps the mirrors apart, and wrong for a cell
  // this picks freely: a straight cell can sit diagonally beside a bend on a parallel leg, and `piecesAreSpaced`
  // then threw the whole draft away (measured: 17 rejections a board).
  const candidates = shuffle(
    route.cells.filter(
      cell =>
        cell.exit === cell.enter &&
        !runsDiagonally(cell.enter) &&
        !route.crossings.has(cellKey(cell.at)) &&
        !claimed.has(cellKey(cell.at)) &&
        cellKey(cell.at) !== cellKey(board.shrine) &&
        NEIGHBOURS.every(direction => !claimed.has(cellKey(stepCell(cell.at, direction))))
    ),
    random
  )

  let placed = 0
  for (const cell of candidates) {
    if (placed >= walls) break
    const track = fittingTrack(board, cell.at, cell.enter, 2, claimed, claimed, random)
    if (!track) continue
    for (const at of track) claimed.add(cellKey(at))
    movable.push({ kind: "slidingWall", stops: track })
    // The answer is the stop **off** the golden line: getting out of the way is the piece's entire move.
    solution.push(track.findIndex(at => !board.goldenCells.has(cellKey(at))))
    placed++
  }
  return placed >= walls
}

/**
 * Doors, and the sockets that open them. The order is structural rather than checked: sockets come from
 * route cells strictly before the earliest door, so the effect always lands ahead of the light.
 *
 * What this buys is a rung nothing else does — order: this door is shut, so the light must reach that
 * socket first.
 */
const placeDoors = (
  board: Authoring,
  route: Route,
  movable: MovablePiece[],
  solution: number[],
  doors: number,
  doorNodes: number,
  claimed: Set<string>,
  random: () => number
): boolean => {
  if (doors < 1) return true

  // Doors sit on straight square stretches in the back half, which leaves room in front for the sockets. A
  // bend already carries a mirror and a reason of its own, and a crossed square has to stay empty.
  const half = Math.floor(route.cells.length / 2)
  const candidates = shuffle(
    route.cells
      .map((cell, index) => ({ cell, index }))
      .filter(
        ({ cell, index }) =>
          index >= half &&
          cell.exit === cell.enter &&
          !runsDiagonally(cell.enter) &&
          !route.crossings.has(cellKey(cell.at)) &&
          !claimed.has(cellKey(cell.at))
      ),
    random
  )

  const placed: { at: CellRef; open: CellRef; index: number }[] = []
  for (const { cell, index } of candidates) {
    if (placed.length >= doors) break
    if (placed.some(door => Math.abs(door.index - index) < MIN_LEG)) continue
    // The open stop is one cell to the side, so it has to be somewhere nothing else is — and off the route,
    // or the door would still be in the way when it opened.
    const open = shuffle(perpendicular(cell.enter), random)
      .map(direction => stepCell(cell.at, direction))
      .find(at => {
        const key = cellKey(at)
        return (
          insideGrid(board.size, at) &&
          !board.goldenCells.has(key) &&
          !claimed.has(key) &&
          !board.walls.has(key) &&
          !board.givens.has(key)
        )
      })
    if (!open) continue
    claimed.add(cellKey(cell.at))
    claimed.add(cellKey(open))
    placed.push({ at: cell.at, open, index })
  }
  if (placed.length < doors) return false

  // Sockets sit ON the route — that is the mechanism — so being a route cell is not a disqualification. What a
  // socket may not share a square with is something that *occupies* one, because it is transparent scenery.
  const earliest = Math.min(...placed.map(door => door.index))
  // And **behind a piece the player can move**: a socket on the route's first leg is crossed under every
  // configuration, so its door stands open from the first frame and the order rung is never there to be read.
  // One movable piece upstream is enough — set that piece wrong and the light never arrives, so the switch has
  // an off.
  const upstream = new Set(movable.flatMap(piece => pieceCells(piece).map(cellKey)))
  const firstMovable = route.cells.findIndex(cell => upstream.has(cellKey(cell.at)))
  if (firstMovable < 0) return false
  const socketCells = shuffle(
    route.cells
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell, index }) => index > firstMovable && index < earliest && !claimed.has(cellKey(cell.at)))
      .map(({ cell }) => cell.at),
    random
  ).slice(0, doorNodes)
  if (socketCells.length < doorNodes) return false
  for (const at of socketCells) claimed.add(cellKey(at))

  board.nodes = socketCells.map(at => ({ at }))
  const from = socketCells.map((_, index) => index)
  for (const door of placed) {
    // Stops in this order every time: resting on the route, open beside it. The resting state is the one no
    // wiring names, so `restingState` reads 0 and the wiring drives to 1.
    movable.push({ kind: "slidingWall", stops: [door.at, door.open] })
    solution.push(0)
    board.wirings.push({ from, piece: movable.length - 1, to: 1 })
  }
  return true
}

/**
 * Places a trap on a corridor that `routeToShrine` left reaching the shrine: a socket on it, and a driven
 * wall further along. The wrong setting's own light drops the stone in front of itself.
 *
 * The socket must be off the golden path, or the player opens the trap by solving; the wall's resting cell
 * must be off both path and corridor, or it blocks something before it ever fires.
 */
const placeTrap = (
  board: Authoring,
  route: TrapRoute,
  movable: MovablePiece[],
  solution: number[],
  claimed: Set<string>,
  random: () => number
): boolean => {
  // The socket goes early on the corridor and the stone later, so the effect lands ahead of the light.
  const usable = route.cells.filter(cell => {
    const key = cellKey(cell.at)
    return !board.goldenCells.has(key) && !claimed.has(key) && key !== cellKey(board.shrine)
  })
  if (usable.length < 2) return false

  for (const socket of shuffle(usable.slice(0, Math.max(1, usable.length - 1)), random)) {
    const socketIndex = route.cells.findIndex(cell => cellKey(cell.at) === cellKey(socket.at))
    // Stone strictly after the socket along the corridor, and never the shrine itself.
    const later = usable.filter(cell => route.cells.findIndex(c => cellKey(c.at) === cellKey(cell.at)) > socketIndex)
    for (const block of shuffle(later, random)) {
      // Where the wall rests when nothing has fired: idle, off the route and off this corridor.
      const rest = shuffle([...SQUARE_DIRECTIONS], random)
        .map(direction => stepCell(block.at, direction))
        .find(at => {
          const key = cellKey(at)
          return (
            insideGrid(board.size, at) &&
            !board.goldenCells.has(key) &&
            !claimed.has(key) &&
            !board.walls.has(key) &&
            !board.givens.has(key) &&
            !route.cells.some(cell => cellKey(cell.at) === key)
          )
        })
      if (!rest) continue

      claimed.add(cellKey(socket.at))
      claimed.add(cellKey(block.at))
      claimed.add(cellKey(rest))
      board.nodes = [...board.nodes, { at: socket.at }]
      // Resting first, driven second, so `restingState` reads 0 and the wiring drives to 1.
      movable.push({ kind: "slidingWall", stops: [rest, block.at] })
      solution.push(0)
      board.wirings = [...board.wirings, { from: [board.nodes.length - 1], piece: movable.length - 1, to: 1 }]
      return true
    }
  }
  return false
}

type Draft = {
  fixed: FixedPiece[]
  movable: MovablePiece[]
  solution: number[]
  nodes: BeamNode[]
  wirings: NodeWiring[]
  /** Which wiring is the trap, if any — the one §11.1 says must be the only reason a wrong setting fails. */
  trapWiring?: number
}

/**
 * Turns a golden path into a board: a tappable mirror at every bend, and a closed corridor for every stop
 * none of them is set to. The uniqueness argument this establishes is stated at the top of this file.
 *
 * Stone is authored rather than pruned to a fixpoint, so `thinWalls` does not run: it re-checks uniqueness
 * and the ladder, and most authored stone is load-bearing for neither — it holds a branch out of territory
 * the recursion would otherwise have to clear. `pruneStone` removes only what nothing reaches.
 */
const authorBranches = (
  size: number,
  route: Route,
  interactive: number,
  branchDepth: number,
  forkSize: number,
  sliders: number,
  slidingStops: number,
  slidingWalls: number,
  doors: number,
  doorNodes: number,
  traps: number,
  modes: readonly LightbeamMode[],
  random: () => number
): Draft | LightbeamGate | undefined => {
  const stops = route.bends.map(bend => forkFor(bend.angle, forkSize, random))
  if (stops.some(list => list === undefined || list.length < 2)) return undefined

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
    movable: [],
    occupancy: new Map(),
    givens: new Map(
      route.bends.flatMap((bend, index) => (live.has(index) ? [] : [[cellKey(bend.at), bend.angle] as const]))
    ),
    walls: new Set(),
    nodes: [],
    wirings: [],
    wired: new Map(),
    preferStone: modes.includes("wallHeavy"),
  }

  // The piece list is settled before a single corridor is authored, because which cells are tappable is a
  // fact about the whole board — a branch closed against a half-built board was checked against the wrong one.
  const movable = board.movable
  const solution: number[] = []
  const liveBends: { at: CellRef; enter: Direction; angle: MirrorAngle; angles: readonly MirrorAngle[] }[] = []
  /** A golden bend whose piece slides: its branch is the beam carrying straight on past the vacated cell. */
  const slidBends: { piece: number; at: CellRef; enter: Direction; states: number[] }[] = []

  // Which live bends slide rather than turn. Square bends only, for the track's sake rather than the beam's.
  const claimed = new Set(route.bends.map(bend => cellKey(bend.at)))
  const liveIndices = route.bends.map((_, index) => index).filter(index => live.has(index))
  const slideable = liveIndices.filter(index => !runsDiagonally(route.bends[index].enter))
  const sliding = new Set(shuffle(slideable, random).slice(0, Math.max(0, sliders)))

  for (const index of liveIndices) {
    const bend = route.bends[index]
    const angles = stops[index] as readonly MirrorAngle[]
    const piece = movable.length
    if (sliding.has(index)) {
      const track = fittingTrack(board, bend.at, bend.enter, slidingStops, claimed, claimed, random)
      if (track) {
        for (const cell of track) claimed.add(cellKey(cell))
        movable.push({ kind: "slidingMirror", angle: bend.angle, stops: track })
        const answer = track.findIndex(cell => cellKey(cell) === cellKey(bend.at))
        solution.push(answer)
        slidBends.push({
          piece,
          at: bend.at,
          enter: bend.enter,
          states: track.map((_, state) => state).filter(state => state !== answer),
        })
        continue
      }
      // No track fitted. **Reject the draft rather than quietly shipping a turn mirror**: a board that records
      // `sliderHeavy` and carries no slider is the failure §7.2 describes — a silent fallback that fires often
      // makes the whole pool decorative while every measurement still looks fine. Drafts are cheap here; a
      // dishonest board is not.
      return "noTrack"
    }
    movable.push({ kind: "turnMirror", at: bend.at, angles })
    solution.push(angles.indexOf(bend.angle))
    liveBends.push({ at: bend.at, enter: bend.enter, angle: bend.angle, angles })
  }
  if (solution.some(state => state < 0)) return undefined

  // Stone the player slides aside, before any corridor is authored: which cells are tappable is a fact about
  // the whole board, and a branch closed against a half-built piece list was closed against the wrong board.
  if (!placeSlidingWalls(board, route, movable, solution, slidingWalls, claimed, random)) return "noSlidingWall"

  // Pass one: lay the shape of every branch, including the mirrors it turns at. Geometry only — nothing is
  // judged yet, because a corridor can only be closed against the finished piece list.
  // Built from the pieces themselves, not from the bends: a slider claims a whole track, and a branch mirror
  // dropped on its shoulder is a board `piecesAreSpaced` throws away after it has been paid for.
  const mirrorCells = new Set([
    ...route.bends.map(bend => cellKey(bend.at)),
    ...movable.flatMap(piece => pieceCells(piece).map(cellKey)),
  ])
  const tappableCells = new Set(movable.flatMap(piece => pieceCells(piece).map(cellKey)))
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
        if (mirror.live) {
          movable.push({ kind: "turnMirror", at: mirror.at, angles: mirror.angles })
          // A decoy's setting is free by construction — the winning beam never reaches it — so the answer
          // records the angle it was authored at and `neverReached` is what frees the player from it.
          solution.push(mirror.angles.indexOf(mirror.angle))
        } else board.givens.set(cellKey(mirror.at), mirror.angle)
      }
    }
  if (movable.length < MIN_TAPPABLE) return undefined
  if (solution.some(state => state < 0)) return undefined

  // Switch-heavy's other half: a **trap** (§11.1). One live bend's wrong setting is routed all the way to the
  // shrine rather than closed, and then a socket on that corridor drops stone in front of it. The wrong setting
  // dies of its own light, and the trap is the only reason it fails — load-bearing by construction.
  let trapped: { corridor: { at: CellRef; enter: Direction; stop: MirrorAngle }; route: TrapRoute } | undefined
  let trapWiring: number | undefined
  if (modes.includes("switchHeavy") && !modes.includes("wallHeavy") && traps > 0 && branchDepth > 0) {
    for (const corridor of shuffle([...corridors], random)) {
      const direction = reflect(corridor.stop, corridor.enter)
      if (direction === opposite(corridor.enter)) continue
      const found = routeToShrine(
        board,
        mirrorCells,
        tappableCells,
        corridor.at,
        direction,
        branchDepth + 1,
        interactive,
        random
      )
      if (!found) continue
      for (const mirror of found.mirrors) {
        if (mirror.live) {
          movable.push({ kind: "turnMirror", at: mirror.at, angles: mirror.angles })
          solution.push(mirror.angles.indexOf(mirror.angle))
        } else board.givens.set(cellKey(mirror.at), mirror.angle)
      }
      trapped = { corridor, route: found }
      break
    }
    if (!trapped) return "noTrap"
  }

  // Switch-heavy: doors across the route, and the sockets that open them.
  if (modes.includes("switchHeavy")) {
    const claimed = new Set([
      ...movable.flatMap(piece => pieceCells(piece).map(cellKey)),
      cellKey(route.sun.at),
      cellKey(route.shrine),
      ...board.givens.keys(),
      ...board.walls,
    ])
    if (!placeDoors(board, route, movable, solution, doors, doorNodes, claimed, random)) return "noDoor"
    if (trapped && !placeTrap(board, trapped.route, movable, solution, claimed, random)) return "noTrap"
    if (trapped) trapWiring = board.wirings.length - 1
  }

  // The piece list is final here, so this is where the occupancy is built. Every corridor below is judged
  // against the whole board, which is the invariant the recursion's soundness rests on.
  board.occupancy = occupancyOf(movable)
  board.wired = wiredPieces({
    size,
    sun: route.sun,
    shrine: route.shrine,
    fixed: [],
    movable,
    nodes: board.nodes,
    wirings: board.wirings,
  })

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
  //
  // The trap's own corridor goes through the same walker as the rest. It has to: the trap is only load-bearing
  // if this is what closes it, and if the walker reaches for stone instead then the trap was decoration and the
  // board should say so. `corridorDies` fires the socket as it crosses it, so the stone the trap drops is what
  // it finds — which is exactly what the `(cell, direction, firedSet)` key was generalised for.
  for (const corridor of corridors)
    if (!closeBranch(board, corridor.at, corridor.enter, corridor.stop)) return undefined

  // A slider's wrong setting takes the mirror out of the beam's way, so the branch is simply the beam's own
  // line continuing through the cell it vacated. Pinning the piece to that state is what tells the walk the
  // cell is empty — which is the whole of why a sliding piece needed the occupancy model.
  for (const slid of slidBends)
    for (const state of slid.states)
      if (
        !corridorDies(
          board,
          slid.at,
          slid.enter,
          new Map([[slid.piece, state]]),
          new Set([segmentKey(slid.at, slid.enter)]),
          0
        )
      )
        return undefined

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
  return { fixed, movable, solution, nodes: board.nodes, wirings: board.wirings, trapWiring }
}

/**
 * Drops the pieces no play can ever involve. A branch mirror is meant to be a shadow — something standing in
 * a wrong ray — and one no beam can reach under any setting is a decoy the dial did not ask for.
 *
 * Safe: a piece no beam reaches is on no beam's path. Done before the opening is drawn, because piece count
 * is what `openingIsHonest` and `resistsGreedyPlay` reason about.
 */
const dropUnreachable = (
  puzzle: LightbeamPuzzleData,
  solution: number[],
  reached: ReadonlySet<string>
): { puzzle: LightbeamPuzzleData; solution: number[] } | undefined => {
  const driven = new Set((puzzle.wirings ?? []).map(wiring => wiring.piece))
  const keep = puzzle.movable
    .map((_, piece) => piece)
    .filter(piece => driven.has(piece) || pieceCells(puzzle.movable[piece]).some(at => reached.has(cellKey(at))))
  if (keep.length === puzzle.movable.length) return undefined

  const moved = new Map(keep.map((piece, index) => [piece, index]))
  return {
    puzzle: {
      ...puzzle,
      movable: keep.map(piece => puzzle.movable[piece]),
      ...(puzzle.wirings
        ? { wirings: puzzle.wirings.map(wiring => ({ ...wiring, piece: moved.get(wiring.piece) as number })) }
        : {}),
    },
    solution: keep.map(piece => solution[piece]),
  }
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
  forkSize: number,
  sliders: number,
  traps: number,
  modes: readonly LightbeamMode[],
  cap: TechniqueId,
  reject?: (gate: LightbeamGate) => void
): GeneratedBoard | undefined => {
  const random = mulberry32(seed * 7919 + attempt)

  const route = buildGoldenPath(size, dials.turns, dials.crossings > 0, dials.crossings, dials.cutMirrors, random)
  if (!route) {
    reject?.("noRoute")
    return undefined
  }
  const authored = authorBranches(
    size,
    route,
    interactive,
    branchDepth,
    forkSize,
    modes.includes("sliderHeavy") ? sliders : 0,
    dials.slidingStops,
    dials.slidingWalls,
    dials.doors,
    dials.doorNodes,
    traps,
    modes,
    random
  )
  if (!authored) {
    reject?.("noCorridor")
    return undefined
  }
  if (typeof authored === "string") {
    reject?.(authored)
    return undefined
  }
  const draft = authored
  // A door has no tap target to protect, so it claims no shoulders — the rule is about a thumb landing on the
  // piece the player meant, and nothing driven can be meant.
  const driven = new Set(draft.wirings.map(wiring => wiring.piece))
  if (!piecesAreSpaced(size, draft.movable, driven)) {
    // `mirrorMayStand` is supposed to have made this unreachable — it is kept as the shipped gate's own
    // verdict on an authored board, which is what phase 1 is measuring.
    reject?.("piecesTouch")
    return undefined
  }

  let puzzle: LightbeamPuzzleData = {
    size,
    sun: route.sun,
    shrine: route.shrine,
    fixed: draft.fixed,
    movable: draft.movable,
    ...(draft.nodes.length ? { nodes: draft.nodes, wirings: draft.wirings } : {}),
  }
  if (!isLit(puzzle, draft.solution)) {
    reject?.("answerDark")
    return undefined
  }

  // The uniqueness gate is the reachable deviation tree rather than the walk over the whole product.
  // It answers the same question — how many winning *routes* are there — and stops
  // exploring a beam the moment it dies, so the settings downstream of a dead beam are never visited.
  // `routeIsUnique` stays the fallback for a board the tree declines to reason about.
  let reach = reachableDeviations(puzzle)

  // Pieces the light can never arrive at, unless this tier wants them (see `dropUnreachable`). Before the
  // gates, so everything below reasons about the board that ships.
  if (!dials.decoys && reach?.complete) {
    const trimmed = dropUnreachable(puzzle, draft.solution, reach.reached)
    if (trimmed) {
      puzzle = trimmed.puzzle
      draft.solution = trimmed.solution
      reach = reachableDeviations(puzzle)
      if (draft.movable.length !== puzzle.movable.length) draft.movable = [...puzzle.movable]
    }
  }

  // **A piece off the winning beam's line, on every board a tier asked branches of** (§6.1). Without one the
  // board is solved by following the light and turning whatever it hits, which is the one thing this family's
  // difficulty rests on not being possible. It used to hold by construction, because a tier had one set of
  // dials; a flavour that turns `interactive` down, or one whose branch mirrors all get pruned as unreachable,
  // can lose it. Only asked of a board with `branchDepth`, since that is what puts a piece in a wrong ray at
  // all — a dial set without one never had a shadow to lose.
  if (branchDepth > 0) {
    const winning = new Set(traceBeam(puzzle, draft.solution).path.map(segment => cellKey(segment.at)))
    if (!draft.movable.some(piece => !pieceCells(piece).some(at => winning.has(cellKey(at))))) {
      reject?.("noShadow")
      return undefined
    }
  }

  const unique = reach?.complete ? reach.winning.size === 1 : routeIsUnique(puzzle, allPieceOptions(puzzle))
  if (!unique) {
    reject?.("notUnique")
    return undefined
  }
  if (!solveLightbeamByTechniques(puzzle, cap).settled) {
    reject?.("notSettled")
    return undefined
  }

  // §11.1's acceptance test, as a gate rather than a hope: **take the trap out and the board must stop being a
  // puzzle.** Its own measurement is why this is checked rather than assumed — a socket placed on a wrong ray
  // the way shadows are placed produced 23 traps across 120 boards and every one of them was decoration,
  // because the setting it was meant to kill was already dead. Removing a wiring leaves its piece resting for
  // ever, so the stone never drops; if the board is still unique without it, the trap was not what closed the
  // second route and this board is a lie about its own mode.
  if (draft.trapWiring !== undefined) {
    // `puzzle.wirings` rather than the draft's, because the prune above renumbers the pieces a wiring names.
    const without = {
      ...puzzle,
      wirings: (puzzle.wirings ?? []).filter((_, index) => index !== draft.trapWiring),
    }
    const spared = reachableDeviations(without, draft.solution)
    const stillAPuzzle = spared?.complete ? spared.winning.size === 1 : routeIsUnique(without, allPieceOptions(without))
    if (stillAPuzzle) {
      reject?.("trapIdle")
      return undefined
    }
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
 * Re-checks the ladder on a finished board and reports what it demanded. Generation throws rather than ship
 * a board it would not stand behind, so a board coming back here is already the acceptance.
 */
export const gradeLightbeam = (board: LightbeamPuzzle, options: LightbeamOptions = {}): Grade | null => {
  const { techniqueCap = "deadEnd" } = options
  const { settled, used, steps } = solveLightbeamByTechniques(board, techniqueCap)
  if (!settled) return null
  return { steps: steps.length, deepest: TECHNIQUES.filter(technique => used.has(technique)).pop() }
}

/**
 * Builds a board. Deterministic in `(size, seed, options)`, which is the whole of what a player's board is
 * derived from. Throws rather than return an undeducible board: the dials can be set past what a grid holds.
 */
export const generateLightbeam = (
  size: number,
  seed: number,
  options: LightbeamOptions = {},
  // Kept out of `options` deliberately: the options are what a seed list keys on, so asking for a
  // single attempt instead of the full search must not file the board under a different bucket.
  attempts: number = MAX_ATTEMPTS
): LightbeamPuzzle => {
  const { flavours = [], ...tier } = options
  // One flavour a board, off the seed for the reason the modes below are: every attempt at a board has to be
  // building the same board, or attempt three ships something the seed does not describe.
  const flavour = flavours.length
    ? flavours[Math.floor(mulberry32(seed * 40961)() * flavours.length)]
    : ({} as Partial<LightbeamDials>)
  const {
    techniqueCap = "deadEnd",
    turns = 2,
    cutMirrors = 0,
    crossings = 0,
    fiddleProof = false,
    interactive = 1,
    branchDepth = 0,
    forkSize = 2,
    decoys = false,
    sliders = 1,
    slidingStops = 3,
    doors = 1,
    doorNodes = 1,
    traps = 0,
    modes = [],
    modePool = [],
    modeCount = 0,
    slidingWalls = 0,
  } = { ...tier, ...flavour }
  // Drawn off the seed rather than the attempt counter, so every attempt at a board is built to the same
  // modes — a board that fell back to a different mode on attempt three would record a mode it was not
  // really the shape of.
  const picked: readonly LightbeamMode[] = modePool.length
    ? shuffle([...modePool], mulberry32(seed * 104729)).slice(0, Math.min(modeCount, modePool.length))
    : modes
  // Recorded in the canonical order rather than the order they were drawn in: a board's modes are a set, and
  // two identical boards reading as different shapes would make every mode-mix measurement noise.
  const drawn = LIGHTBEAM_MODES.filter(mode => picked.includes(mode))
  const dials = {
    turns,
    cutMirrors,
    crossings,
    fiddleProof,
    slidingStops,
    slidingWalls,
    doors,
    doorNodes,
    decoys,
  } as LightbeamDials

  for (let attempt = 0; attempt < attempts; attempt++) {
    const puzzle = attemptAuthored(
      size,
      seed,
      attempt,
      dials,
      interactive,
      branchDepth,
      forkSize,
      sliders,
      traps,
      drawn,
      techniqueCap,
      options.reject
    )
    if (puzzle) return { ...puzzle, modes: [...drawn] }
  }
  throw new Error(`generateLightbeam: no logically solvable board (size=${size}, seed=${seed})`)
}
