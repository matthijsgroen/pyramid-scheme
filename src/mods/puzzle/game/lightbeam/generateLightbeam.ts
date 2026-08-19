import { mulberry32, shuffle } from "@/game/random"
import {
  BACKSLASH,
  cellKey,
  DIR,
  DIRECTIONS,
  directionStep,
  eachConfig,
  insideGrid,
  allPieceOptions,
  isHalfStep,
  isLit,
  mod8,
  opposite,
  pieceCells,
  pieceStateCount,
  reflect,
  restingState,
  segmentKey,
  SLASH,
  SQUARE_DIRECTIONS,
  stepCell,
  traceBeam,
  TURN_ANGLES,
  type BeamNode,
  type CellRef,
  type Direction,
  type FixedPiece,
  type LightbeamPuzzleData,
  type MirrorAngle,
  type MovablePiece,
  type NodeWiring,
} from "./beam"
import { applyGoals, drawGoals } from "./goals"
import { solveLightbeamByTechniques, type TechniqueId } from "./techniques"

export const LIGHTBEAM_GOALS = [
  "longChain",
  "sortTheWheat",
  "clearTheWay",
  "blindAlleys",
  "orderOfOperations",
  "crossedBeams",
] as const

/** What kind of problem a board is, as against how hard it is (design doc §7). */
export type LightbeamGoal = (typeof LIGHTBEAM_GOALS)[number]

/** The knobs that shape a board. A goal turns some of these hard; the tier sets the lean baseline. */
export type LightbeamDials = {
  /** How many times the route bends between sun-disc and shrine. */
  turns: number
  /** How many of the route's mirrors are givens rather than movable. */
  setMirrors: number
  /** How many movable route mirrors slide to a stop instead of turning in place. */
  slidingMirrors: number
  /** Sliding walls parked across the route, there to be moved out of the way. */
  slidingWalls: number
  /**
   * How long a sliding piece's track is — how many stops it cycles through.
   *
   * Two stops asks "in the way or out of it"; three asks *which* stop, which is a different question and a
   * harder one. It is also what keeps a board off a single parity: on an all-two-state board every piece is
   * one tap from its answer or none, and a player who spots that never has to look at the board again.
   */
  slidingStops: number
  /**
   * Refuse boards that a run of getting-warmer taps solves (`resistsGreedyPlay`).
   *
   * Off at starter on purpose: a three-piece board is meant to yield to fiddling, and that is what makes it
   * a gentle first board rather than an empty one. From junior up it is on, because a board whose ladder is
   * never needed is a board without a ladder.
   */
  fiddleProof: boolean
  /**
   * How many times the winning beam must fold back through its own line.
   *
   * A crossed square is the one square on the board that is provably empty — anything standing there would
   * have turned the first pass — and it is the only place the beam is drawn arriving from two directions.
   * It costs no piece at all: what it buys is a longer, more folded route on the same grid, which is this
   * family's only way of asking for more without asking for more room.
   */
  crossings: number
  /**
   * Doors: stone across the route that no tap can shift, opened only by the light reaching a socket
   * upstream of it (design doc §11.1). Two doors share one socket, which is fan-out.
   */
  doors: number
  /**
   * How many sockets a door's wiring names. One is a plain door; two is an and-wiring, and the piece does
   * not budge until the light has been through both — a routing demand rather than a setting to rule out,
   * and the first thing in the family that asks the player to plan a beam instead of settling a piece.
   */
  doorNodes: number
  /** Pieces the light can never reach, there to be reasoned irrelevant (technique T5). */
  decoys: number
  /**
   * Decoys placed in the stretch a wrong setting would light, so that setting cannot be ruled out by
   * watching the light die. This is what pushes a board past `deadEnd` into the exhaustive rungs.
   */
  shadows: number
  /**
   * How many of the route's bends turn the beam **diagonally** — the cut mirrors (design doc §11.8).
   *
   * One piece doing more rather than another piece, which is rule 8's way of spending the cost: the bend
   * would have carried an ordinary mirror anyway, and what changes is that its answer is a half-step and
   * its stop set reaches 67.5° the other way. The route is what authors the stop set, so this dial is a
   * fact about the *route* rather than about a piece list — see `cutBendSlots` for the one pattern the
   * geometry allows, and §11.12 for what turning it on cost.
   */
  cutMirrors: number
  /**
   * The most stops a route mirror's authored list may hold — its fork in the maze (§11.8 rule 1).
   *
   * The sibling of `slidingStops`, and the same question one axis over: two stops asks "which of these two",
   * three asks "which of these three", and the piece costs 1.5× rather than 2× because it is the same piece
   * doing more (rule 8). Every list still keeps a quarter turn, which is rule 2 and is what every other piece
   * on the board depends on.
   *
   * Two is what the family shipped for its whole life, and it is not a floor the code needs — it is a
   * baseline, so a tier that leaves this alone generates exactly the boards it did before. The list's
   * **contents** vary with it as well as its length: what is authored is drawn per piece from the angles
   * whose wrong ray the board can actually close, so no two mirrors need offer the same fork (§11.13).
   */
  mirrorStops: number
}

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
   * The goals this board was actually built to, after any fallback. Carried as data rather than logged:
   * a fallback that fires silently makes the whole pool decorative, and this way the playtest bench can
   * show what a board was meant to be and a spec can assert the fallback stays rare.
   */
  goals: LightbeamGoal[]
}

export type LightbeamOptions = Partial<LightbeamDials> & {
  /** The strongest deduction a board may demand (design doc §6). */
  techniqueCap?: TechniqueId
  /** Which goals this tier may draw. Empty leaves the board on its baseline dials. */
  goals?: readonly LightbeamGoal[]
  /** How many of them to draw. */
  goalCount?: number
  /**
   * Diagnostics: called with the name of the gate that threw a draft away, once per rejected attempt.
   *
   * **Generation is reject-heavy and was reject-blind**, which is a bad pair. A master board costs 372
   * attempts and a wizard board 243, so better than 99% of the work is discarded — and nothing recorded
   * *which* gate discarded it, so every tuning decision was made without knowing whether the route builder,
   * the piece placement or one of the two exhaustive gates was doing the rejecting. Any comparison between
   * this generator and another one needs this number first, or it is a comparison of impressions.
   *
   * Off unless asked for, and it costs an optional call per rejection. It reports the gate rather than a
   * diagnosis: `notUnique` means a second route existed, not why the draft allowed one.
   */
  reject?: (gate: LightbeamGate) => void
}

/** The gates a draft can die at, in the order `attemptGeneration` applies them. */
export type LightbeamGate =
  | "noRoute"
  | "tooFewCrossings"
  | "noPieces"
  | "piecesTouch"
  | "answerDark"
  | "notUnique"
  | "notSettled"
  | "noHonestOpening"

// Generation is route-then-obstruct, per docs/game-design/puzzles/lightbeam.md §5: lay a beam from disc
// to shrine, turn some of its mirrors into pieces the player must set, then wall off the ways they could
// be set wrong. The gates at the end are what make it a puzzle rather than a maze — the route must be
// the only route, and the ladder must be able to find it.
const MAX_ATTEMPTS = 2400

// Thinning reaches a fixpoint in two sweeps on every tier measured; the rest is the guard, not the plan.
const MAX_PRUNE_SWEEPS = 4

// The shortest a route leg may be, which is what stops two consecutive bend mirrors touching. A diagonal
// leg of two puts them two diagonal steps apart, so they do not touch at a corner either — the reason the
// number was chosen for still holds where the geometry has changed, and `piecesAreSpaced` is still what
// catches two non-consecutive bends folding together.
const MIN_LEG = 2

/**
 * The mirror that turns a beam from `enter` to `exit`: `reflect` is `angle - travel`, so the angle wanted
 * is simply `enter + exit`. Two of the eight are not turns at all, and two more are forbidden by rule 2.
 *
 * - **`exit === enter`** wants the mirror lying along the beam, which passes it (§11.8 rule 3) rather than
 *   bending it, so it is not a bend.
 * - **`exit === opposite(enter)`** wants the mirror square across the beam, which sends it straight back
 *   the way it came. A route cannot be laid along a retroreflection.
 * - **A flat (0) or upright (4) angle offers square light no quarter turn at all** — it passes a beam
 *   running along it and retroreflects one meeting it head-on — so §11.8 rule 2 forbids any stop set
 *   containing one, and a bend that wants one is a bend this generator may not place.
 *
 * What is left is the quarter turn off a diagonal, which is every square route the family has ever built,
 * and the 45° and 135° turns off a **half-step** angle, which are the diagonal legs step 4 exists for. So a
 * diagonal leg is not a special case here: it is the same subtraction asking for an odd angle, and an odd
 * angle is what makes the piece a cut mirror.
 */
const angleFor = (enter: Direction, exit: Direction): MirrorAngle | undefined => {
  if (exit === enter || exit === opposite(enter)) return undefined
  const angle = mod8(enter + exit)
  return angle === 0 || angle === 4 ? undefined : angle
}

/**
 * The stop set for a cut mirror, read off the half-step angle the route bends at (§11.8 rule 2).
 *
 * **Rule 2's four pairs are one fact, and it is this one.** A stop set has to keep a quarter turn — the
 * constraint that killed three earlier drafts, since every other piece and the route itself depend on a
 * mirror cell being able to turn light 90° — and it has to reach the diagonal. That leaves exactly one
 * partner for a half-step angle: the diagonal three eighth-turns away, which is 67.5° as lines and the
 * only one of `angle ± 3` that is a diagonal at all. Over the four half-steps it gives `{22.5°, 135°}`,
 * `{67.5°, 135°}`, `{45°, 112.5°}` and `{45°, 157.5°}` — §11.11's four pairs, derived rather than
 * tabulated.
 *
 * So the piece asks "gently across, or hard round", and which of the two the route takes is the whole of
 * the difference between the diagonal leg and the quarter turn the board would have had. Undefined for an
 * even angle, which is a bend an ordinary mirror already serves.
 */
const cutStops = (angle: MirrorAngle): readonly MirrorAngle[] | undefined => {
  const aligned = [mod8(angle + 3), mod8(angle - 3)].find(stop => stop === SLASH || stop === BACKSLASH)
  if (aligned === undefined) return undefined
  return aligned < angle ? [aligned, angle] : [angle, aligned]
}

/**
 * The authored stop list for a turn mirror at a bend — the fork the player meets there (§11.8 rule 1).
 *
 * Three constraints, and the order they are applied in is the whole of the function:
 *
 * 1. **The answer is in it**, or the route does not work.
 * 2. **Rule 2: it keeps a quarter turn.** A flat or upright mirror offers square light none — it passes a
 *    beam along its own line and sends one meeting it head-on straight back — so every list has to hold a
 *    diagonal. A half-step answer therefore brings its aligned partner in with it (`cutStops`), and a
 *    diagonal answer already satisfies it alone.
 * 3. **Every extra stop's wrong ray has to be closable**, which is the real budget and the reason this is
 *    not simply "draw `n` angles". A `k`-stop piece has `k − 1` wrong rays, and `blockWrongSettings` can
 *    only close one that leaves the route: off the frame, into stone it is allowed to place, into something
 *    movable, or back down its own line into the disc. A ray whose first cell is the route's own kills the
 *    draft. Checking that here rather than letting the gate reject it is what keeps the yield affordable —
 *    measured in §11.13, it is the difference between a tier that builds and one that does not.
 *
 * Note what is *not* excluded: a stop lying along the beam (rule 3's edge-on stop, which passes the light
 * straight through) and a stop square across it (which retroreflects it home) are both legal extras. Neither
 * can be the answer — `angleFor` refuses them, because neither bends anything — but as wrong settings they
 * are two more sentences the board can say, and the second needs no stone at all.
 */
const mirrorStopSet = (
  bend: Route["bends"][number],
  most: number,
  size: number,
  draft: Draft,
  random: () => number
): readonly MirrorAngle[] | undefined => {
  const base = isHalfStep(bend.angle) ? cutStops(bend.angle) : TURN_ANGLES
  if (!base || most <= base.length) return base
  const held = new Set(base)
  // A wrong ray the board cannot close is a draft thrown away, so the extras are drawn from the angles whose
  // first cell is somewhere stone may stand — or nowhere at all, which the frame closes for free.
  const closable = DIRECTIONS.filter(angle => {
    if (held.has(angle)) return false
    const direction = reflect(angle, bend.enter)
    if (direction === opposite(bend.enter)) return true // retraces to the disc, and needs nothing
    const first = stepCell(bend.at, direction)
    return !insideGrid(size, first) || !draft.taken.has(cellKey(first))
  })
  // Drawn per piece, length and contents together, so two mirrors on one board need not offer the same fork.
  const wanted = base.length + Math.floor(random() * (most - base.length + 1))
  const extra = shuffle(closable, random).slice(0, wanted - base.length)
  return [...base, ...extra].sort((a, b) => a - b)
}

/**
 * Which of the route's bends turn the beam diagonally, and the one pattern the geometry allows.
 *
 * **An ordinary mirror is no use to diagonal light.** A beam arriving at 45° either runs along the
 * mirror's line and is passed straight through, or meets it square on its back and comes home the way it
 * came — `reflect(2, 1)` is `1` and `reflect(6, 1)` is `5`, and the other two diagonals say the same. So
 * only a half-step bend can *close* a diagonal leg, and cut bends come in **consecutive pairs** — one out
 * of the square, one back into it — except for a single one at the very last bend, whose diagonal leg is
 * the run into the frame and needs no closing.
 *
 * That is §11.5's parity invariant arriving as a construction rather than a warning: the number of
 * half-step crossings is even for a shrine entered square and odd for one entered diagonally, so an odd
 * dial spends its odd cut on the final bend and there is nowhere else for it to go.
 */
const cutBendSlots = (turns: number, cuts: number, random: () => number): Set<number> | undefined => {
  if (cuts < 1) return new Set()
  if (cuts > turns) return undefined
  const chosen = new Set<number>()
  let left = cuts
  if (left % 2 === 1) {
    chosen.add(turns - 1)
    left -= 1
  }
  if (left >= 2)
    for (const start of shuffle(
      Array.from({ length: Math.max(0, turns - 1) }, (_, index) => index),
      random
    )) {
      if (left < 2) break
      if (chosen.has(start) || chosen.has(start + 1)) continue
      chosen.add(start)
      chosen.add(start + 1)
      left -= 2
    }
  return left === 0 ? chosen : undefined
}

/**
 * The four ways a half-step mirror can bend this beam: every direction of the other parity.
 *
 * All four are genuine bends, and that falls out of `angleFor` rather than needing a check — the two cases
 * it refuses (the beam passed along the mirror's line, and the beam sent back down it) both keep the
 * beam's parity, so neither can be one of these. A 45° turn and a 135° turn are equally allowed.
 */
const halfStepTurns = (direction: Direction): Direction[] =>
  DIRECTIONS.filter(candidate => candidate % 2 !== direction % 2)

/** Whether a beam is running on a diagonal, where the drawing questions of §9 have not been answered. */
const runsDiagonally = (direction: Direction): boolean => direction % 2 === 1

/**
 * The two ways a track may run across a beam — the quarter turns either side of it.
 *
 * Named from the **axis** rather than from which way the beam runs along it, which is what the square
 * version did by hand: a leg and its reverse are the same line, so they must offer the same pair in the
 * same order, or a route that folds back gets a different track from the one that came the other way. Taking
 * `direction % 4` is that fact written down, and it reproduces the old three-way conditional exactly on the
 * four square directions while giving a diagonal leg its own two crossings instead of silently `[up, down]`.
 */
const perpendicular = (direction: Direction): Direction[] => {
  const axis = direction % 4
  return [mod8(axis + 2), mod8(axis + 6)]
}

/** Steps from a cell to the last one still on the grid, travelling in a direction. */
const stepsToEdge = (size: number, at: CellRef, direction: Direction): number => {
  const step = directionStep(direction)
  const rows = step.row < 0 ? at.row : step.row > 0 ? size - 1 - at.row : Number.POSITIVE_INFINITY
  const cols = step.col < 0 ? at.col : step.col > 0 ? size - 1 - at.col : Number.POSITIVE_INFINITY
  return Math.min(rows, cols)
}

type RouteCell = { at: CellRef; enter: Direction; exit?: Direction }

type Route = {
  sun: { at: CellRef; facing: Direction }
  shrine: CellRef
  /** Every cell the beam crosses, first after the disc through to the shrine. */
  cells: RouteCell[]
  /** The bends, in beam order — one mirror each. */
  bends: { at: CellRef; enter: Direction; exit: Direction; angle: MirrorAngle }[]
  /** Squares the beam passes through twice, once on each axis. Nothing may ever stand on one. */
  crossings: Set<string>
}

/**
 * The disc sits on an edge facing inward, never in a corner: a corner disc gives the first leg only one
 * way to go, which is a turn the player can read off the frame instead of the board.
 */
const pickSun = (size: number, random: () => number): { at: CellRef; facing: Direction } => {
  const along = 1 + Math.floor(random() * (size - 2))
  const side = Math.floor(random() * 4)
  if (side === 0) return { at: { row: 0, col: along }, facing: DIR.down }
  if (side === 1) return { at: { row: size - 1, col: along }, facing: DIR.up }
  if (side === 2) return { at: { row: along, col: 0 }, facing: DIR.right }
  return { at: { row: along, col: size - 1 }, facing: DIR.left }
}

/**
 * Which of the four lines a beam is running along, so a cell entered twice can be told apart from a cell
 * the beam is retracing. Eight directions make four axes, not two: the row, the column, and the two
 * diagonals. `direction % 4` is the whole of it, because a direction and its opposite are the same line.
 */
const axisOf = (direction: Direction): number => direction % 4

/**
 * Lays the winning beam.
 *
 * **The route may cross itself, and that used to be forbidden on a reason that turned out not to hold.**
 * This doc said a crossing "puts two reasons on one square, and every technique points at a square" — but
 * nothing in the family has ever been keyed by square. `forced` is keyed by cell *and direction*, the walk
 * remembers `(cell, direction)` pairs, the uniqueness gate signs paths by segment, and the board draws one
 * polyline per segment. A crossed square was already two things everywhere it mattered; only the route
 * builder disagreed.
 *
 * What a crossing has to be is **two different axes**. A cell entered twice on the same axis is the beam
 * retracing its own line, which is a different and much worse thing; a cell entered on two different ones
 * is a clean cross, and the one fact it forces is worth having: **nothing can stand there**, or the first
 * pass would have turned. So a crossing may never be a bend, a stop, or a door.
 *
 * This used to read "perpendicular", and once legs can run diagonally that is narrower than the fact
 * needs. There are four axes now (`axisOf`), and a row crossed by a diagonal forces exactly what a row
 * crossed by a column does — the beam turned or it did not, and it did not. Every crossing a square board
 * builds is still a right angle, because both its legs are square.
 *
 * The final leg runs all the way to the frame, which sets the shrine in the wall. That is worth the
 * constraint: a shrine on an edge can only be lit from three sides at most, and the frame kills most of
 * those outright, which is what lets the `exitRun` deduction fire at all.
 */
const buildRoute = (
  size: number,
  turns: number,
  random: () => number,
  /** Whether the route is allowed to fold back through itself at all. */
  mayCross: boolean,
  /** How many bends turn the beam diagonally (§11.8 rule 2) — the cut mirrors. */
  cutMirrors: number
): Route | undefined => {
  // The shape of the route before a square of it is laid: which bends are half-steps is forced into one
  // pattern by the geometry (`cutBendSlots`), so it is decided once here rather than bend by bend.
  const cuts = cutBendSlots(turns, cutMirrors, random)
  if (!cuts) return undefined
  const sun = pickSun(size, random)
  const used = new Map<string, Set<number>>([[cellKey(sun.at), new Set([0, 1, 2, 3])]])
  const crossings = new Set<string>()
  const cells: RouteCell[] = []
  const bends: Route["bends"] = []
  let at = sun.at
  let direction = sun.facing

  // Legs share the grid, so their length has to know how many of them there are. Drawing 1..size-2 every
  // time ate the board in three strides and a long route then almost never fitted — which read as the goal
  // pool falling back, not as the route builder being greedy.
  //
  // The floor of MIN_LEG is what keeps two consecutive bends off each other's shoulder: a leg of one cell
  // puts the two mirrors in touching squares, and two tappable pieces in touching squares is a mis-tap
  // waiting to happen (§9). It is a floor, not a guarantee — a route that folds back can still bring two
  // non-consecutive bends together, which `piecesAreSpaced` catches at the end.
  //
  // A crossing route needs legs of DIFFERENT lengths, and that is why it needs its own budget rather than
  // just permission. Dividing the grid by the turn count evenly gives every leg the same length, and a
  // fold of equal legs can never cross itself — it comes back exactly alongside its own line and stops one
  // square short, for ever. Measured with the even budget: not one crossing in twenty boards. A folded
  // route also reuses the space it has already been through, so it can afford the longer legs.
  const spread = mayCross ? Math.ceil((turns + 1) / 2) : turns + 1
  const budget = Math.max(mayCross ? MIN_LEG + 1 : MIN_LEG, Math.floor((size - 1) / Math.max(1, spread)))
  const span = Math.max(1, budget - MIN_LEG + 1)
  for (let leg = 0; leg <= turns; leg++) {
    const last = leg === turns
    const length = last ? stepsToEdge(size, at, direction) : MIN_LEG + Math.floor(random() * span)
    if (length < 1) return undefined
    for (let step = 0; step < length; step++) {
      at = stepCell(at, direction)
      if (!insideGrid(size, at)) return undefined
      const key = cellKey(at)
      const axes = used.get(key)
      if (axes) {
        // Same axis twice is the beam retracing its own line, never a crossing. And a square already
        // carrying a mirror cannot also be crossed — the first pass would have turned there.
        if (!mayCross || axes.has(axisOf(direction))) return undefined
        if (bends.some(bend => cellKey(bend.at) === key)) return undefined
        axes.add(axisOf(direction))
        crossings.add(key)
      } else used.set(key, new Set([axisOf(direction)]))
      cells.push({ at, enter: direction, exit: direction })
    }
    if (last) {
      // The shrine takes the light the first time it arrives, so a beam that reached it earlier would
      // already have ended there.
      if (crossings.has(cellKey(at))) return undefined
      cells[cells.length - 1].exit = undefined
      return { sun, shrine: at, cells, bends, crossings }
    }
    // A bend needs a mirror, and a crossed square has to stay empty.
    if (crossings.has(cellKey(at))) return undefined
    const half = cuts.has(leg)
    // A diagonal leg has no other way out — see `cutBendSlots` — so a pattern that left one open would lay
    // a route no mirror can bend. It cannot happen, and saying so here is cheaper than trusting it.
    if (runsDiagonally(direction) && !half) return undefined
    const exit = shuffle(half ? halfStepTurns(direction) : perpendicular(direction), random)[0]
    const angle = angleFor(direction, exit)
    if (angle === undefined) return undefined
    cells[cells.length - 1].exit = exit
    bends.push({ at, enter: direction, exit, angle })
    direction = exit
  }
  return undefined
}

type Draft = {
  fixed: FixedPiece[]
  movable: MovablePiece[]
  /** The winning state of each movable piece, in the same order. */
  solution: number[]
  /** Cells nothing else may be put on. */
  taken: Set<string>
  /** Cells some movable piece can stand in — what a wrong setting may run into instead of a wall. */
  movableCells: Set<string>
  /** Cells a wrong setting sends light across — kept clear of decoys, which must never be reachable. */
  rays: Set<string>
  nodes: BeamNode[]
  wirings: NodeWiring[]
}

/**
 * Every contiguous run of `length` cells that crosses the beam's line of travel and contains `at` — the
 * tracks a sliding piece could be given, with the cell the route needs it in somewhere along them.
 *
 * Contiguous and collinear, because that is what reads as a track. The stops are drawn as ghosts of the
 * piece, and a gap between them says the thing teleports rather than slides.
 *
 * A track of three is a different question from a track of two, which is the point of allowing it: two
 * stops is on or off, and three is *which* — the player has to work out where the piece belongs, not
 * merely whether it is in the way.
 */
const trackRuns = (at: CellRef, across: Direction, length: number): CellRef[][] => {
  // `across` is always a square direction: everything that asks for a track — a sliding mirror at a bend, a
  // sliding wall on a straight, a door's open stop — is drawn from a square leg on purpose, so the run this
  // builds is a row or a column and the spec that asserts as much stays true (§9, and §11.12).
  const [forward] = perpendicular(across)
  const back = opposite(forward)
  return Array.from({ length }, (_, ahead) => {
    let head = at
    for (let step = 0; step < ahead; step++) head = stepCell(head, forward)
    const run: CellRef[] = []
    for (let step = 0; step < length; step++) {
      run.push(head)
      head = stepCell(head, back)
    }
    return run
  })
}

type Ray = { from: CellRef; direction: Direction }

/**
 * Where the light goes when a mirror is set wrong: one ray per stop that is not the answer.
 *
 * Read off the piece's own stop set, because that is the only place the answer lives. Deriving it from the
 * two diagonals — the other one of `SLASH`/`BACKSLASH` — fails twice over on a cut mirror, and silently
 * both times: the ray points along a turn the piece cannot make, and a three-stop piece (§11.8 rule 3) is
 * wrong in two ways while the count stays at one.
 */
const wrongSettingRays = (
  bend: { at: CellRef; enter: Direction },
  angles: readonly MirrorAngle[],
  answer: MirrorAngle
): Ray[] =>
  angles
    .filter(angle => angle !== answer)
    .map(angle => ({ from: bend.at, direction: reflect(angle, bend.enter) }))
    // A wrong setting that sends the beam back the way it came needs nothing: `reflect` is its own inverse
    // in the direction, so the light retraces every leg it has already flown, off every mirror that carried
    // it, and is swallowed by the disc it came out of. No stone may go there — the cells are the route's own
    // — and none is wanted, which is why this ray is dropped here rather than refused in
    // `blockWrongSettings`. It is a death the player can see and one no other piece in the family has:
    // §11.5's retracing excursion, arriving as the wrong answer instead of a failed idea. Only a 45° bend
    // has one, since the partner stop lies 135° off the answer and that is where the way back is.
    .filter(ray => ray.direction !== opposite(bend.enter))

const ADJACENT: readonly Direction[] = SQUARE_DIRECTIONS

/**
 * Is this cell clear of every piece already placed, and of their shoulders?
 *
 * Checked at placement rather than only by the gate at the end, because a decoy or a shadow that lands on
 * a neighbour's shoulder would throw away the whole draft — and shadows land beside a mirror by their very
 * nature, so the gate alone rejected almost every board that wanted one.
 */
const spacedFrom = (draft: Draft, at: CellRef): boolean =>
  !draft.movableCells.has(cellKey(at)) &&
  ADJACENT.every(direction => !draft.movableCells.has(cellKey(stepCell(at, direction))))

/**
 * The first track that fits: every cell on the grid, unclaimed by anything else, and clear of every other
 * piece's shoulders. `at` itself is exempt from the claim check — the route already owns it, and it is
 * exactly the cell the piece has to be able to stand in.
 */
const fittingTrack = (
  size: number,
  draft: Draft,
  at: CellRef,
  across: Direction,
  length: number,
  random: () => number
): CellRef[] | undefined =>
  shuffle(trackRuns(at, across, length), random).find(run =>
    run.every(
      cell =>
        insideGrid(size, cell) &&
        (cellKey(cell) === cellKey(at) || (!draft.taken.has(cellKey(cell)) && spacedFrom(draft, cell)))
    )
  )

/**
 * Shadow pieces: decoys dropped into the very stretch a wrong setting would light.
 *
 * This is the dial that makes the technique cap mean something. Built plainly, every board is a chain of
 * `deadEnd` eliminations — turn the mirror the wrong way and the light visibly dies — so a wizard board
 * solves exactly like a starter one, only longer. A shadow breaks that: with something movable standing
 * in the wrong setting's way, the light does not visibly die, it disappears into a piece nobody has
 * settled yet. `deadEnd` has nothing to say, and ruling that setting out takes the exhaustive rungs.
 *
 * The shadow is still a genuine decoy — no winning beam ever touches it — so `neverReached` still frees
 * it, and it is still the player's job to work out that it never mattered.
 */
const placeShadows = (size: number, draft: Draft, rays: Ray[], count: number, random: () => number) => {
  for (const ray of shuffle(rays, random).slice(0, count)) {
    // Two cells out, not one. A shadow one cell along the ray sits on the shoulder of the very mirror it
    // shadows, which no spacing rule can allow — and the empty cell between them costs nothing, since the
    // wrong setting's beam still meets the shadow before it meets anything else the player controls. On a
    // diagonal ray that first cell is a corner neighbour, which the spacing rules do allow, but it is also
    // where this very ray's own stone goes, so two cells out is right there too.
    let at = stepCell(stepCell(ray.from, ray.direction), ray.direction)
    for (let step = 0; step < 2 && insideGrid(size, at); step++) {
      if (!draft.taken.has(cellKey(at)) && spacedFrom(draft, at)) {
        draft.taken.add(cellKey(at))
        draft.movableCells.add(cellKey(at))
        draft.movable.push({ kind: "turnMirror", at, angles: TURN_ANGLES })
        draft.solution.push(Math.floor(random() * TURN_ANGLES.length))
        break
      }
      at = stepCell(at, ray.direction)
    }
  }
}

/**
 * Walls off the ways a piece could be set wrong.
 *
 * This is what makes the family deducible rather than fiddled with: for each movable piece, the light
 * under its wrong setting has to run out — off the frame, or into a wall — before it meets anything else
 * the player controls. Then `deadEnd` can rule that setting out with a reason the player can see, and
 * the piece it settles lets the entry run reach the next one. That chain is the whole starter board.
 *
 * A ray that runs into something movable is left alone: that is a shadow doing its job, and walling it
 * off would undo it.
 *
 * **A diagonal wrong ray costs no more stone than a square one, and usually less** (§11.11): `stepsToEdge`
 * takes the minimum over both axes, so a ray leaving at 45° meets the frame in fewer steps than one running
 * along a row, and the frame walls it for free. What is new is only where the stone lands when it is needed
 * — the first cell of a diagonal ray is the mirror's corner neighbour, so stone can stand on a shoulder no
 * square ray has ever put it on.
 */
const hasWall = (draft: Draft, at: CellRef): boolean =>
  draft.fixed.some(piece => piece.kind === "wall" && cellKey(piece.at) === cellKey(at))

const blockWrongSettings = (size: number, draft: Draft, rays: Ray[]): boolean => {
  for (const ray of rays) {
    // Only the first cell the wrong setting reaches is ever considered: a wall right there is the most
    // legible dead end there is, and anything further along is a longer story for the same conclusion.
    const first = stepCell(ray.from, ray.direction)
    const key = cellKey(first)
    // Off the frame, already walled, or facing a shadow that was put there on purpose: nothing to do.
    const settled = !insideGrid(size, first) || hasWall(draft, first) || draft.movableCells.has(key)
    if (!settled) {
      if (draft.taken.has(key)) return false // reaches the route with nowhere to wall it off
      draft.fixed.push({ kind: "wall", at: first })
      draft.taken.add(key)
      draft.rays.add(key)
    }
    // Everything the wrong setting lights up stays clear of decoys, whose whole point is unreachability.
    let scan = stepCell(ray.from, ray.direction)
    while (insideGrid(size, scan)) {
      draft.rays.add(cellKey(scan))
      if (hasWall(draft, scan)) break
      scan = stepCell(scan, ray.direction)
    }
  }
  return true
}

/**
 * Doors, and the sockets that open them (design doc §11.1).
 *
 * A door is stone standing on the route that **no tap can shift** — that is the whole point, because a
 * door the player could open would make the socket decoration. The light is the only thing that opens it,
 * and it does so by crossing a socket further back along its own route.
 *
 * The order is the constraint, and it is structural rather than checked: sockets are drawn from route
 * cells strictly *before* the earliest door, so the effect always lands ahead of the light and the drawn
 * beam is never a picture of something that has stopped being true. It is also what makes the new rung
 * available — the entry run reaches a socket, the socket opens the door, and the run starts growing again
 * from a stretch it had stalled on.
 *
 * Two doors drawn against one socket is fan-out; one door naming two sockets is an and-wiring.
 */
const placeWiredDoors = (
  size: number,
  draft: Draft,
  route: Route,
  options: LightbeamDials,
  random: () => number
): boolean => {
  if (options.doors < 1) return true

  // Doors go on straight stretches in the back half of the route, which leaves room in front of them for
  // the sockets. A bend cell already carries a mirror and a reason of its own.
  const half = Math.floor(route.cells.length / 2)
  const candidates = shuffle(
    route.cells
      .map((cell, index) => ({ cell, index }))
      .filter(
        ({ cell, index }) =>
          index >= half &&
          cell.exit === cell.enter &&
          // A door's open stop is one cell to the side, so the same track question applies: on a diagonal
          // leg the stone would slide diagonally out of the way, which is a drawing rather than a rule.
          !runsDiagonally(cell.enter) &&
          !route.crossings.has(cellKey(cell.at)) &&
          !route.bends.some(bend => cellKey(bend.at) === cellKey(cell.at)) &&
          !draft.movableCells.has(cellKey(cell.at))
      ),
    random
  )

  const doors: { at: CellRef; open: CellRef; index: number }[] = []
  for (const { cell, index } of candidates) {
    if (doors.length >= options.doors) break
    if (doors.some(door => Math.abs(door.index - index) < MIN_LEG)) continue
    const open = perpendicular(cell.enter)
      .map(direction => stepCell(cell.at, direction))
      .find(at => insideGrid(size, at) && !draft.taken.has(cellKey(at)) && spacedFrom(draft, at))
    if (!open) continue
    draft.taken.add(cellKey(open))
    draft.movableCells.add(cellKey(open))
    doors.push({ at: cell.at, open, index })
  }
  if (!doors.length) return false

  // Sockets sit ON the route — that is the whole mechanism — so `taken`, which holds every route cell, is
  // the wrong test. A socket is transparent scenery rather than a piece; what it must not share a square
  // with is something that occupies one.
  const earliest = Math.min(...doors.map(door => door.index))
  const occupied = new Set([
    cellKey(route.sun.at),
    cellKey(route.shrine),
    ...draft.fixed.map(piece => cellKey(piece.at)),
    ...draft.movableCells,
  ])
  const sockets = shuffle(
    route.cells
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell, index }) => index < earliest && !occupied.has(cellKey(cell.at)))
      .map(({ cell }) => cell.at),
    random
  ).slice(0, options.doorNodes)
  if (sockets.length < options.doorNodes) return false
  for (const at of sockets) draft.taken.add(cellKey(at))

  draft.nodes = sockets.map(at => ({ at }))
  const from = sockets.map((_, index) => index)
  for (const door of doors) {
    // Stops in this order every time: resting on the route, open beside it. The resting state is the one
    // no wiring names, so `restingState` reads 0 and the wiring drives to 1.
    draft.movable.push({ kind: "slidingWall", stops: [door.at, door.open] })
    draft.solution.push(0)
    draft.wirings.push({ from, piece: draft.movable.length - 1, to: 1 })
  }
  return true
}

const buildPieces = (size: number, route: Route, options: LightbeamDials, random: () => number): Draft | undefined => {
  const draft: Draft = {
    fixed: [],
    movable: [],
    solution: [],
    taken: new Set(),
    movableCells: new Set(),
    rays: new Set(),
    nodes: [],
    wirings: [],
  }
  draft.taken.add(cellKey(route.sun.at))
  for (const cell of route.cells) draft.taken.add(cellKey(cell.at))

  // A bend the route turns diagonally at is a cut mirror, and it is the player's to turn in place. Neither
  // of the other two things a bend can become will take one: a given has no wrong setting to spend, so the
  // stop set the route just authored would be invisible; and a sliding mirror's question is which cell
  // rather than which angle, so its track would have to run across a diagonal beam — a drawing §9 has not
  // made. So the givens and the sliding pieces are drawn from the **square** bends alone, which is the same
  // draw as before on a board whose route has no diagonal in it.
  const squareBends = route.bends.map((bend, index) => ({ bend, index })).filter(({ bend }) => !isHalfStep(bend.angle))
  const bends = shuffle(squareBends, random)
  const setCount = Math.min(options.setMirrors, Math.max(0, route.bends.length - 1))
  const given = new Set(bends.slice(0, setCount).map(entry => entry.index))
  const movableSquare = squareBends.filter(({ index }) => !given.has(index)).map(({ bend }) => bend)
  const slidingCount = Math.min(options.slidingMirrors, movableSquare.length)
  const sliding = new Set(
    shuffle(
      movableSquare.map(bend => cellKey(bend.at)),
      random
    ).slice(0, slidingCount)
  )

  const wrongRays: Ray[] = []

  route.bends.forEach((bend, index) => {
    if (given.has(index)) {
      draft.fixed.push({ kind: "mirror", at: bend.at, angle: bend.angle })
      return
    }
    if (sliding.has(cellKey(bend.at))) {
      // The track runs across the beam, so a stop off the route takes the mirror clean out of its way and
      // the light sails past — a different sentence from a mirror turned the wrong way, and a clearer one.
      const stops = fittingTrack(size, draft, bend.at, bend.enter, options.slidingStops, random)
      if (!stops) return
      for (const cell of stops) {
        draft.taken.add(cellKey(cell))
        draft.movableCells.add(cellKey(cell))
      }
      draft.movable.push({ kind: "slidingMirror", angle: bend.angle, stops })
      draft.solution.push(stops.findIndex(candidate => cellKey(candidate) === cellKey(bend.at)))
      wrongRays.push({ from: bend.at, direction: bend.enter })
      return
    }
    const angles = mirrorStopSet(bend, options.mirrorStops, size, draft, random)
    if (!angles) return
    draft.movableCells.add(cellKey(bend.at))
    draft.movable.push({ kind: "turnMirror", at: bend.at, angles })
    draft.solution.push(angles.indexOf(bend.angle))
    wrongRays.push(...wrongSettingRays(bend, angles, bend.angle))
  })
  if (draft.movable.length + given.size !== route.bends.length) return undefined

  // Sliding walls sit on a straight stretch of the route, and the player's move is to clear the path
  // rather than bend it — the one piece in the family whose question is "does the light get through".
  const straights = shuffle(
    route.cells.filter(
      cell =>
        cell.exit === cell.enter &&
        // Square stretches only, for the track's sake rather than the beam's: a piece sliding across a
        // diagonal leg would draw its ghosts on a diagonal, and §9 has not settled what that reads as.
        !runsDiagonally(cell.enter) &&
        !route.crossings.has(cellKey(cell.at)) &&
        !route.bends.some(bend => cellKey(bend.at) === cellKey(cell.at))
    ),
    random
  )
  for (const cell of straights.slice(0, options.slidingWalls)) {
    const stops = fittingTrack(size, draft, cell.at, cell.enter, options.slidingStops, random)
    if (!stops) continue
    for (const at of stops) {
      draft.taken.add(cellKey(at))
      draft.movableCells.add(cellKey(at))
    }
    draft.movable.push({ kind: "slidingWall", stops })
    draft.solution.push(stops.findIndex(candidate => cellKey(candidate) !== cellKey(cell.at)))
  }

  if (!draft.movable.length) return undefined
  if (!placeWiredDoors(size, draft, route, options, random)) return undefined
  placeShadows(size, draft, wrongRays, options.shadows, random)
  if (!blockWrongSettings(size, draft, wrongRays)) return undefined

  // Decoys last, on cells no wrong setting can light either — a decoy the light can reach is not a decoy,
  // and the gates below would throw the board out for it.
  const open: CellRef[] = []
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const at = { row, col }
      if (draft.taken.has(cellKey(at)) || draft.rays.has(cellKey(at))) continue
      if (!spacedFrom(draft, at)) continue
      open.push(at)
    }
  for (const at of shuffle(open, random).slice(0, options.decoys)) {
    draft.taken.add(cellKey(at))
    draft.movableCells.add(cellKey(at))
    draft.movable.push({ kind: "turnMirror", at, angles: TURN_ANGLES })
    draft.solution.push(Math.floor(random() * TURN_ANGLES.length))
  }
  return draft
}

const NEIGHBOURS: readonly Direction[] = SQUARE_DIRECTIONS

/**
 * No two pieces the player can tap may touch.
 *
 * This is a tap-accuracy rule, not an aesthetic one, and it is what lets the grid be denser than the tap
 * target: only movable pieces are tappable, so a cell may be smaller than a thumb as long as the piece
 * standing in it can own a hit area reaching into the empty cells around it (§9). Two adjacent movable
 * pieces would have to share that space, and then neither can be reliably hit.
 *
 * Measured before this existed, essentially every board broke it — up to ten touching pairs on one wizard
 * grid — so it is a real gate rather than a formality.
 */
const piecesAreSpaced = (size: number, movable: MovablePiece[], driven: ReadonlySet<number>): boolean => {
  const owner = new Map<string, number>()
  movable.forEach((piece, index) => {
    // A door has no tap target to protect, so it needs no shoulders — this rule is about a thumb landing
    // on the piece the player meant, and nothing here can be meant.
    if (driven.has(index)) return
    for (const at of pieceCells(piece)) owner.set(cellKey(at), index)
  })
  for (const [key, index] of owner) {
    const [row, col] = key.split(",").map(Number)
    for (const direction of NEIGHBOURS) {
      const beside = stepCell({ row, col }, direction)
      if (!insideGrid(size, beside)) continue
      const other = owner.get(cellKey(beside))
      if (other !== undefined && other !== index) return false
    }
  }
  return true
}

const pathSignature = (puzzle: LightbeamPuzzleData, config: readonly number[]): string =>
  traceBeam(puzzle, config)
    .path.map(segment => segmentKey(segment.at, segment.enter))
    .join(" ")

/**
 * The uniqueness gate — the route is the only route (design doc §5, gate 5).
 *
 * "Exactly one winning configuration" would be the wrong test for this family: a decoy has a free
 * setting by definition, so a board with decoys has many winning configurations and only one winning
 * *path*. That is the property the player actually solves for, so that is the one checked.
 */
const routeIsUnique = (puzzle: LightbeamPuzzleData, states: number[][]): boolean => {
  const paths = new Set<string>()
  const ran = eachConfig(states, config => {
    if (isLit(puzzle, config)) paths.add(pathSignature(puzzle, config))
  })
  return ran && paths.size === 1
}

/**
 * Takes away every wall the board turns out not to need, to a fixpoint.
 *
 * A wall the player cannot spend is worse than no wall, for the same reason a redundant sign is worse
 * than none in Futoshiki: it hides which obstacles the deduction actually turns on.
 *
 * In practice this removes nearly all of them — a shipped board carries 0.0 to 0.1 fixed walls, measured
 * over 40 seeds a tier — because `blockWrongSettings` only ever adds one where the wrong ray would
 * otherwise rejoin the route, and a board that size mostly lets a wrong turn run off the frame instead.
 * The stone the player hears about in a hint is therefore almost always a sliding wall they are holding
 * in the way, which is a better board than one dressed with scenery nobody can spend (design doc §5.1).
 *
 * Note what this is NOT: it is not what makes the technique cap bite. Removing a wall usually leaves the
 * wrong setting running off the frame, which `deadEnd` explains just as happily — so thinning alone left
 * every tier solving by "the light visibly dies there". The shadow pieces are what fixed that (§6.1).
 */
const thinWalls = (
  puzzle: LightbeamPuzzleData,
  states: number[][],
  cap: TechniqueId,
  random: () => number
): FixedPiece[] => {
  let fixed = puzzle.fixed
  for (let sweep = 0; sweep < MAX_PRUNE_SWEEPS; sweep++) {
    const before = fixed.length
    for (const wall of shuffle(
      fixed.filter(piece => piece.kind === "wall"),
      random
    )) {
      const trial = fixed.filter(piece => piece !== wall)
      if (trial.length === fixed.length) continue
      const candidate = { ...puzzle, fixed: trial }
      // Both gates again: taking a wall away can open a second route as easily as it can open a
      // deduction, and a board with two routes is not a puzzle whatever the ladder makes of it.
      if (!routeIsUnique(candidate, states)) continue
      if (solveLightbeamByTechniques(candidate, cap).settled) fixed = trial
    }
    if (fixed.length === before) break
  }
  return fixed
}

const BASELINE: LightbeamDials = {
  turns: 2,
  setMirrors: 0,
  slidingMirrors: 0,
  slidingWalls: 0,
  slidingStops: 2,
  fiddleProof: false,
  crossings: 0,
  doors: 0,
  doorNodes: 1,
  decoys: 0,
  shadows: 0,
  cutMirrors: 0,
  mirrorStops: 2,
}

/** How likely a piece is to open on a setting the deduction will have to rule out. */
const OPENS_WRONG = 0.8

/** How many openings to draw before giving up on a board and building another. */
const OPENING_DRAWS = 24

/**
 * Where the board opens.
 *
 * This used to be `solution + 1` for every piece, and it was a hole big enough to drive the family
 * through. Every piece had exactly two states, so "wrong" meant "flipped", and **tapping every piece once
 * solved every board in the game** — five tiers, forty seeds each, two hundred out of two hundred. No
 * deduction, no reading of a single square. Nothing in the gates noticed, because each of those boards
 * genuinely was reachable by the ladder too; it was reachable by this as well, and this is quicker.
 *
 * The fix is not a bigger offset — that just moves the exploit to "tap everything twice". It is that the
 * offset must not be the same for every piece. Each one opens on its own drawn state, weighted heavily
 * towards wrong so the board still has work in it, and `openingIsHonest` refuses any board that a uniform
 * number of taps would open.
 */
const drawOpening = (puzzle: LightbeamPuzzleData, draft: Draft, random: () => number): number[] =>
  draft.movable.map((piece, index) => {
    // A door opens where it rests, always. It is not the player's to be wrong about.
    if (restingState(puzzle, index) !== undefined) return draft.solution[index]
    const total = pieceStateCount(piece)
    if (total < 2 || random() > OPENS_WRONG) return draft.solution[index]
    return (draft.solution[index] + 1 + Math.floor(random() * (total - 1))) % total
  })

// How many configurations the greedy walk below may visit before the board is given the benefit of the
// doubt. Improving walks are short — every step strictly improves a bounded score — so this is a guard.
const MAX_GREEDY_STATES = 400

/** Where `taps` taps land a piece, over the states the player can actually reach. A door never moves. */
const nextOption = (states: readonly number[], from: number, taps: number): number => {
  const at = states.indexOf(from)
  return at < 0 ? from : states[(at + taps) % states.length]
}

/** What a player reads off the board without reasoning: how near the light lands, then how far it gets. */
const nearness = (puzzle: LightbeamPuzzleData, config: readonly number[]): [number, number] => {
  const walk = traceBeam(puzzle, config)
  const last = walk.path[walk.path.length - 1]
  const at = last?.at ?? puzzle.sun.at
  return [-(Math.abs(at.row - puzzle.shrine.row) + Math.abs(at.col - puzzle.shrine.col)), walk.path.length]
}

const nearer = (a: [number, number], b: [number, number]): boolean => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])

/**
 * Would a player who never reasons get there anyway?
 *
 * Modelled as the simplest thing a person actually does in front of this board: tap whichever piece leaves
 * the light nearer the shrine, and keep doing it. The family's premise (§4) is that a beam puzzle's
 * natural solving mode is trial and that trial is not deduction — this is what makes that a property of
 * the boards rather than an aspiration in a document. **A board a strictly-improving walk finishes is a
 * board whose deduction is decorative**, however deep the ladder that accepted it.
 *
 * Every improving walk is searched, not one of them: ties are exactly where a real player picks
 * arbitrarily, so a board is only fiddle-proof when *no* run of getting-warmer taps arrives.
 */
export const resistsGreedyPlay = (puzzle: LightbeamPuzzleData, initial: readonly number[]): boolean => {
  const options = allPieceOptions(puzzle)
  let frontier: (readonly number[])[] = [initial]
  const seen = new Set<string>([initial.join(",")])
  while (frontier.length && seen.size < MAX_GREEDY_STATES) {
    const next: number[][] = []
    for (const config of frontier) {
      const here = nearness(puzzle, config)
      for (let piece = 0; piece < puzzle.movable.length; piece++) {
        const step = [...config]
        step[piece] = nextOption(options[piece], step[piece], 1)
        const key = step.join(",")
        if (seen.has(key) || !nearer(nearness(puzzle, step), here)) continue
        if (isLit(puzzle, step)) return false
        seen.add(key)
        next.push(step)
      }
    }
    frontier = next
  }
  return true
}

/**
 * The board opens dark, no single tap finishes it, and no uniform number of taps does either.
 *
 * The last of those is the gate the family was missing. The first two were claimed by §5 gate 8 and only
 * the first was ever checked — and the one that went unchecked is the one that mattered, because a board
 * where every piece sits the same distance from its answer can be solved by a player who has noticed that
 * and nothing else. Checking it exhaustively is cheap: the longest cycle on the board bounds the search.
 */
const openingIsHonest = (puzzle: LightbeamPuzzleData, initial: readonly number[]): boolean => {
  if (isLit(puzzle, initial)) return false
  const longest = Math.max(...puzzle.movable.map(pieceStateCount))
  for (let taps = 1; taps < longest; taps++)
    if (
      isLit(
        puzzle,
        initial.map((state, index) => (state + taps) % pieceStateCount(puzzle.movable[index]))
      )
    )
      return false
  return !puzzle.movable.some((piece, index) => {
    const config = [...initial]
    config[index] = (config[index] + 1) % pieceStateCount(piece)
    return isLit(puzzle, config)
  })
}

/** One run of the build-and-gate loop, at a fixed set of dials. Undefined when the budget runs out. */
const attemptGeneration = (
  size: number,
  seed: number,
  dials: LightbeamDials,
  cap: TechniqueId,
  reject?: (gate: LightbeamGate) => void
): Omit<LightbeamPuzzle, "goals"> | undefined => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const random = mulberry32(seed * 7919 + attempt)
    const route = buildRoute(size, dials.turns, random, dials.crossings > 0, dials.cutMirrors)
    if (!route) {
      reject?.("noRoute")
      continue
    }
    if (route.crossings.size < dials.crossings) {
      reject?.("tooFewCrossings")
      continue
    }
    const draft = buildPieces(size, route, dials, random)
    if (!draft) {
      reject?.("noPieces")
      continue
    }
    const driven = new Set(draft.wirings.map(wiring => wiring.piece))
    if (!piecesAreSpaced(size, draft.movable, driven)) {
      reject?.("piecesTouch")
      continue
    }

    const puzzle: LightbeamPuzzleData = {
      size,
      sun: route.sun,
      shrine: route.shrine,
      fixed: draft.fixed,
      movable: draft.movable,
      ...(draft.nodes.length ? { nodes: draft.nodes, wirings: draft.wirings } : {}),
    }
    if (!isLit(puzzle, draft.solution)) {
      reject?.("answerDark")
      continue
    }

    // The player's options, not every state a piece has: a door is not theirs to set, so it contributes
    // nothing to the space the gates below enumerate.
    const states = allPieceOptions(puzzle)
    if (!routeIsUnique(puzzle, states)) {
      reject?.("notUnique")
      continue
    }
    if (!solveLightbeamByTechniques(puzzle, cap).settled) {
      reject?.("notSettled")
      continue
    }

    const thinned = { ...puzzle, fixed: thinWalls(puzzle, states, cap, random) }

    // Where the board opens is drawn rather than derived, and re-drawn until it is honest — a board is
    // expensive to build and an opening is cheap to try again.
    let initial: number[] | undefined
    for (let draw = 0; draw < OPENING_DRAWS && !initial; draw++) {
      const candidate = drawOpening(thinned, draft, random)
      if (openingIsHonest(thinned, candidate) && (!dials.fiddleProof || resistsGreedyPlay(thinned, candidate)))
        initial = candidate
    }
    if (!initial) {
      reject?.("noHonestOpening")
      continue
    }

    return { ...thinned, initial, solution: draft.solution, techniqueCap: cap }
  }
  return undefined
}

/**
 * Builds a board at the tier's dials, with one or two goals turned hard on top (design doc §7).
 *
 * The fallback ladder is the part that needs care. A goal is a constraint, and two of them at once can be
 * a pair no board satisfies — so when the budget runs out, a goal is dropped and it tries again, down to
 * the bare baseline. What matters is that the board says which goals it ended up with (`goals` on the
 * result) rather than the fallback happening quietly: a silent fallback that fires often would make the
 * whole pool decorative while every measurement still looked fine.
 */
export const generateLightbeam = (size: number, seed: number, options: LightbeamOptions = {}): LightbeamPuzzle => {
  const { techniqueCap = "deadEnd", goals: pool = [], goalCount = 0, ...overrides } = options
  const baseline: LightbeamDials = { ...BASELINE, ...overrides }
  const drawn = drawGoals(seed, pool, goalCount)

  for (let dropped = 0; dropped <= drawn.length; dropped++) {
    const goals = drawn.slice(0, drawn.length - dropped)
    const puzzle = attemptGeneration(size, seed, applyGoals(baseline, goals), techniqueCap, options.reject)
    if (puzzle) return { ...puzzle, goals }
  }
  throw new Error(`generateLightbeam: no logically solvable board (size=${size}, seed=${seed})`)
}
