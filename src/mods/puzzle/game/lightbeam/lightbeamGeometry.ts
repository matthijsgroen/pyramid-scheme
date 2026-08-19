import { shuffle } from "@/game/random"
import {
  BACKSLASH,
  cellKey,
  DIR,
  DIRECTIONS,
  directionStep,
  eachConfig,
  insideGrid,
  isLit,
  allPieceOptions,
  mod8,
  opposite,
  pieceCells,
  pieceStateCount,
  restingState,
  segmentKey,
  SLASH,
  SQUARE_DIRECTIONS,
  stepCell,
  traceBeam,
  type CellRef,
  type Direction,
  type LightbeamPuzzleData,
  type MirrorAngle,
  type MovablePiece,
} from "./beam"

// What a lightbeam board is made of, as against how one is built: the geometry a mirror obeys, the shape a
// route can take, the spacing two tappable pieces need, and the rules about where a board may open.
//
// It is split from `generateLightbeam.ts` because these are facts about the family rather than decisions of
// the generator — the mirror law, §11.8 rule 2's stop sets, §5.2's crossings, §5's opening rules. The
// generator reads them; nothing here knows how a board gets authored.
// The shortest a route leg may be, which is what stops two consecutive bend mirrors touching. A diagonal
// leg of two puts them two diagonal steps apart, so they do not touch at a corner either — the reason the
// number was chosen for still holds where the geometry has changed, and `piecesAreSpaced` is still what
// catches two non-consecutive bends folding together.
export const MIN_LEG = 2

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
export const angleFor = (enter: Direction, exit: Direction): MirrorAngle | undefined => {
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
export const cutStops = (angle: MirrorAngle): readonly MirrorAngle[] | undefined => {
  const aligned = [mod8(angle + 3), mod8(angle - 3)].find(stop => stop === SLASH || stop === BACKSLASH)
  if (aligned === undefined) return undefined
  return aligned < angle ? [aligned, angle] : [angle, aligned]
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
export const cutBendSlots = (turns: number, cuts: number, random: () => number): Set<number> | undefined => {
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
export const halfStepTurns = (direction: Direction): Direction[] =>
  DIRECTIONS.filter(candidate => candidate % 2 !== direction % 2)

/** Whether a beam is running on a diagonal, where the drawing questions of §9 have not been answered. */
export const runsDiagonally = (direction: Direction): boolean => direction % 2 === 1

/**
 * The two ways a track may run across a beam — the quarter turns either side of it.
 *
 * Named from the **axis** rather than from which way the beam runs along it, which is what the square
 * version did by hand: a leg and its reverse are the same line, so they must offer the same pair in the
 * same order, or a route that folds back gets a different track from the one that came the other way. Taking
 * `direction % 4` is that fact written down, and it reproduces the old three-way conditional exactly on the
 * four square directions while giving a diagonal leg its own two crossings instead of silently `[up, down]`.
 */
export const perpendicular = (direction: Direction): Direction[] => {
  const axis = direction % 4
  return [mod8(axis + 2), mod8(axis + 6)]
}

/** Steps from a cell to the last one still on the grid, travelling in a direction. */
export const stepsToEdge = (size: number, at: CellRef, direction: Direction): number => {
  const step = directionStep(direction)
  const rows = step.row < 0 ? at.row : step.row > 0 ? size - 1 - at.row : Number.POSITIVE_INFINITY
  const cols = step.col < 0 ? at.col : step.col > 0 ? size - 1 - at.col : Number.POSITIVE_INFINITY
  return Math.min(rows, cols)
}

export type RouteCell = { at: CellRef; enter: Direction; exit?: Direction }

export type Route = {
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
export const pickSun = (size: number, random: () => number): { at: CellRef; facing: Direction } => {
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
export const axisOf = (direction: Direction): number => direction % 4

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
export const trackRuns = (at: CellRef, across: Direction, length: number): CellRef[][] => {
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
export const piecesAreSpaced = (size: number, movable: MovablePiece[], driven: ReadonlySet<number>): boolean => {
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
 * "Exactly one winning configuration" would be the wrong test for this family: a decoy has a free setting
 * by definition, so a board with decoys has many winning configurations and only one winning *path*. That
 * is the property the player actually solves for, so that is the one checked.
 *
 * **Generation does not use this as its gate** — `reachableDeviations` answers the same question by walking
 * only the futures the light can actually have, which is 13x to 836x cheaper (§11.17). This stays as the
 * independent second opinion: the two are asserted to agree, and it is the fallback if the tree ever gives
 * up on a board.
 */
export const routeIsUnique = (puzzle: LightbeamPuzzleData, states: number[][]): boolean => {
  const paths = new Set<string>()
  const ran = eachConfig(states, config => {
    if (isLit(puzzle, config)) paths.add(pathSignature(puzzle, config))
  })
  return ran && paths.size === 1
}

/** How likely a piece is to open on a setting the deduction will have to rule out. */
const OPENS_WRONG = 0.8

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
export const drawOpening = (puzzle: LightbeamPuzzleData, solution: readonly number[], random: () => number): number[] =>
  puzzle.movable.map((piece, index) => {
    // A door opens where it rests, always. It is not the player's to be wrong about.
    if (restingState(puzzle, index) !== undefined) return solution[index]
    const total = pieceStateCount(piece)
    if (total < 2 || random() > OPENS_WRONG) return solution[index]
    return (solution[index] + 1 + Math.floor(random() * (total - 1))) % total
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
export const openingIsHonest = (puzzle: LightbeamPuzzleData, initial: readonly number[]): boolean => {
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
