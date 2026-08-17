// The deduction system behind both generation and hints, per docs/game-design/puzzles/lightbeam.md §4.
//
// A beam puzzle's natural solving mode is trial — flip a mirror, look, flip another — and that is not
// deduction. This ladder is what makes the family admissible: every board that ships was settled by it,
// so every board can be reasoned to the end, and every hint is one of these reasons rather than a peek
// at the answer.
//
// Ordered by how well a reason explains itself, not by strength. `onlySurvivor` subsumes `deadEnd` and
// `feedsExit` outright — a solver could be the runs plus that one technique — and it is ranked last
// anyway, because its reason is "I tried the alternatives and they all failed", which teaches nothing.
// `deadEnd`'s reason is a sentence a child repeats back and checks by eye: face it that way and the
// light dies in the wall.
import {
  DIRECTIONS,
  cellKey,
  eachConfig,
  gridResolver,
  insideGrid,
  pieceOccupant,
  pieceStateCount,
  sameCell,
  segmentKey,
  traceBeam,
  walkBackward,
  walkForward,
  type BeamSegment,
  type BeamWalk,
  type Blocker,
  type CellContent,
  type CellRef,
  type Direction,
  type LightbeamPuzzleData,
} from "./beam"

export const TECHNIQUES = ["entryRun", "exitRun", "deadEnd", "feedsExit", "neverReached", "onlySurvivor"] as const

export type TechniqueId = (typeof TECHNIQUES)[number]

export type LightbeamDecision =
  | { kind: "carries"; segments: BeamSegment[] }
  | { kind: "shrineEntry"; direction: Direction }
  | { kind: "eliminate"; piece: number; states: number[] }
  | { kind: "free"; piece: number }

export type LightbeamStep = {
  technique: TechniqueId
  /** Which reading of the technique fired — each one is a different sentence to the player. */
  variant?: string
  /** The piece the reason is about, where it is about one. */
  piece?: number
  /** The beam the reason talks about, so "the light dies here" has something to point at. */
  beam: BeamSegment[]
  decisions: LightbeamDecision[]
}

/**
 * A board mid-deduction: which state each movable piece could still be in, which stretches of beam are
 * settled whatever the player does, which side the shrine can be lit from, and which pieces have been
 * shown not to matter.
 */
export type LightbeamBoard = {
  puzzle: LightbeamPuzzleData
  candidates: Set<number>[]
  /** Beam segments proven to happen. Keyed so a stretch that gains a known exit reads as new. */
  forced: Map<string, BeamSegment>
  shrineEntry?: Direction
  /** Pieces the light provably never touches — the decoys (§4.2). */
  free: Set<number>
}

const forcedKey = (segment: BeamSegment): string => `${segmentKey(segment.at, segment.enter)}>${segment.exit ?? "-"}`

export const createLightbeamBoard = (puzzle: LightbeamPuzzleData): LightbeamBoard => ({
  puzzle,
  candidates: puzzle.movable.map(piece => new Set(Array.from({ length: pieceStateCount(piece) }, (_, i) => i))),
  forced: new Map(),
  free: new Set(),
})

const sameBlocker = (a: Blocker, b: Blocker): boolean =>
  a.kind === b.kind && (a.kind !== "mirror" || b.kind !== "mirror" || a.face === b.face)

/**
 * The board as the deduction currently knows it. A cell is `unknown` whenever a movable piece could be
 * standing there and could also not be, or could be there facing either way — and that is the whole
 * engine: every walk stops at the first unknown, and each technique below asks a different question
 * about what it stopped on.
 *
 * A piece is only resolved when every state it could still be in puts the same thing in the same cell,
 * which for a settled piece is always, and for a two-faced mirror is never.
 */
const knownGrid = (board: LightbeamBoard, pin?: { piece: number; state: number }): CellContent[][] => {
  const { puzzle } = board
  const grid: CellContent[][] = Array.from({ length: puzzle.size }, () =>
    Array.from({ length: puzzle.size }, (): CellContent => ({ kind: "empty" }))
  )
  for (const piece of puzzle.fixed)
    grid[piece.at.row][piece.at.col] = piece.kind === "mirror" ? { kind: "mirror", face: piece.face } : { kind: "wall" }

  const certain = new Map<string, Blocker>()
  const uncertain = new Set<string>()
  puzzle.movable.forEach((piece, index) => {
    const options = pin?.piece === index ? [pin.state] : [...board.candidates[index]]
    if (!options.length) return
    const occupants = options.map(state => pieceOccupant(piece, state))
    const [first] = occupants
    if (occupants.every(other => sameCell(other.at, first.at) && sameBlocker(other.blocks, first.blocks)))
      certain.set(cellKey(first.at), first.blocks)
    else for (const occupant of occupants) uncertain.add(cellKey(occupant.at))
  })
  for (const [key, blocker] of certain) {
    if (uncertain.has(key)) continue
    const [row, col] = key.split(",").map(Number)
    grid[row][col] = blocker
  }
  for (const key of uncertain) {
    const [row, col] = key.split(",").map(Number)
    grid[row][col] = { kind: "unknown" }
  }

  grid[puzzle.shrine.row][puzzle.shrine.col] = { kind: "shrine" }
  grid[puzzle.sun.at.row][puzzle.sun.at.col] = { kind: "sun", facing: puzzle.sun.facing }
  return grid
}

const knownForward = (board: LightbeamBoard, pin?: { piece: number; state: number }): BeamWalk =>
  walkForward(board.puzzle.size, board.puzzle.sun.at, board.puzzle.sun.facing, gridResolver(knownGrid(board, pin)))

const knownBackward = (board: LightbeamBoard, enter: Direction, pin?: { piece: number; state: number }): BeamWalk =>
  walkBackward(board.puzzle.size, board.puzzle.shrine, enter, gridResolver(knownGrid(board, pin)))

/** The board is done when the light reaches the shrine without any unsettled piece left on its way. */
export const lightbeamSettled = (board: LightbeamBoard): boolean => knownForward(board).end === "lit"

const DEATHS: ReadonlySet<BeamWalk["end"]> = new Set(["absorbed", "escapes", "loops"] as const)

/** How a state died, which is the difference between three quite different sentences to the player. */
const DEATH_VARIANT: Record<string, string> = { absorbed: "wall", escapes: "edge", loops: "loop" }

const freshSegments = (board: LightbeamBoard, walk: BeamWalk): BeamSegment[] =>
  walk.path.filter(segment => !board.forced.has(forcedKey(segment)))

// ---------------------------------------------------------------------------------------------------
// T0 / T1 — the facts. Neither rules anything out; both hand the eliminations below something to work
// against, and both are worth saying out loud to a player staring at a fresh board.
// ---------------------------------------------------------------------------------------------------

/** Where the light must go before it meets anything the player can change. */
const entryRun = (board: LightbeamBoard): LightbeamStep[] => {
  const walk = knownForward(board)
  if (DEATHS.has(walk.end)) return []
  const fresh = freshSegments(board, walk)
  if (!fresh.length) return []
  return [{ technique: "entryRun", beam: walk.path, decisions: [{ kind: "carries", segments: fresh }] }]
}

/**
 * Which side the shrine can be lit from, traced backwards. A direction whose backward run leaves the
 * grid or dies in a wall is a direction nothing could have delivered the light from; when only one is
 * left, the stretch behind the shrine is settled too.
 */
const exitRun = (board: LightbeamBoard): LightbeamStep[] => {
  const feasible = DIRECTIONS.map(direction => ({ direction, walk: knownBackward(board, direction) })).filter(
    ({ walk }) => !DEATHS.has(walk.end)
  )
  if (feasible.length !== 1) return []
  const [{ direction, walk }] = feasible
  const decisions: LightbeamDecision[] = []
  if (board.shrineEntry !== direction) decisions.push({ kind: "shrineEntry", direction })
  const fresh = freshSegments(board, walk)
  if (fresh.length) decisions.push({ kind: "carries", segments: fresh })
  if (!decisions.length) return []
  return [{ technique: "exitRun", beam: walk.path, decisions }]
}

// ---------------------------------------------------------------------------------------------------
// T2 / T3 — the local eliminations. Both pin one piece to one state and walk, from the sun for T2 and
// from the shrine for T3. A state whose walk dies is a state the puzzle cannot be in.
//
// Both only speak when at least one state survives: if every state of a piece dies the board is broken,
// and blaming the piece would be a nonsense reason rather than a deduction.
// ---------------------------------------------------------------------------------------------------

const pinnedEliminations = (
  board: LightbeamBoard,
  technique: "deadEnd" | "feedsExit",
  walkWith: (pin: { piece: number; state: number }) => BeamWalk
): LightbeamStep[] => {
  const steps: LightbeamStep[] = []
  board.puzzle.movable.forEach((_, piece) => {
    const states = [...board.candidates[piece]]
    if (states.length < 2) return
    const walks = states.map(state => walkWith({ piece, state }))
    const dying = states.filter((_, index) => DEATHS.has(walks[index].end))
    if (!dying.length || dying.length === states.length) return
    for (const state of dying) {
      const walk = walks[states.indexOf(state)]
      steps.push({
        technique,
        variant: DEATH_VARIANT[walk.end],
        piece,
        beam: walk.path,
        decisions: [{ kind: "eliminate", piece, states: [state] }],
      })
    }
  })
  return steps
}

const deadEnd = (board: LightbeamBoard): LightbeamStep[] =>
  pinnedEliminations(board, "deadEnd", pin => knownForward(board, pin))

const feedsExit = (board: LightbeamBoard): LightbeamStep[] => {
  const entry = board.shrineEntry
  if (entry === undefined) return []
  return pinnedEliminations(board, "feedsExit", pin => knownBackward(board, entry, pin))
}

// ---------------------------------------------------------------------------------------------------
// T4 / T5 — the exhaustive pair. The configuration space is the product of the pieces' state counts, so
// at nine pieces it is under 20 000 walks of at most 49 cells: this family can afford to enumerate,
// which none of the arithmetic families can (§5).
//
// Both reason over the winning configurations only. That is not peeking: "the shrine can be lit" is the
// premise of the puzzle, and the player has it too.
// ---------------------------------------------------------------------------------------------------

// Far above any tier's real space (a 7x7 wizard board tops out near 20 000); the cap is the guard
// against a malformed board, not a budget.
const MAX_ENUMERATION = 200_000

type Survey = {
  /** Per piece, the states that appear in some winning configuration. */
  states: Set<number>[]
  /** Per piece, whether any state of it could stand in a winning beam's way. */
  blocking: boolean[]
  winners: number
}

const surveyWinners = (board: LightbeamBoard): Survey | undefined => {
  const { puzzle } = board
  const options = board.candidates.map(set => [...set])
  const states = puzzle.movable.map(() => new Set<number>())
  const blocking = puzzle.movable.map(() => false)
  let winners = 0
  const ran = eachConfig(
    options,
    config => {
      const walk = traceBeam(puzzle, config)
      if (walk.end !== "lit") return
      winners++
      const onPath = new Set(walk.path.map(segment => cellKey(segment.at)))
      puzzle.movable.forEach((piece, index) => {
        states[index].add(config[index])
        if (blocking[index]) return
        // A piece only matters if one of the states it could still be in could stand in this beam's
        // way. Otherwise no tap on it can change where the light goes, whatever the player does.
        blocking[index] = options[index].some(state => onPath.has(cellKey(pieceOccupant(piece, state).at)))
      })
    },
    MAX_ENUMERATION
  )
  return ran && winners > 0 ? { states, blocking, winners } : undefined
}

/**
 * The decoys. This is the family's own skill — the catalogue names "elimination of irrelevant pieces"
 * — and the only conclusion in any family that reads "this piece does not matter".
 */
const neverReached = (board: LightbeamBoard): LightbeamStep[] => {
  const survey = surveyWinners(board)
  if (!survey) return []
  const steps: LightbeamStep[] = []
  board.puzzle.movable.forEach((_, piece) => {
    if (board.free.has(piece) || survey.blocking[piece]) return
    steps.push({ technique: "neverReached", piece, beam: [], decisions: [{ kind: "free", piece }] })
  })
  return steps
}

const onlySurvivor = (board: LightbeamBoard): LightbeamStep[] => {
  const survey = surveyWinners(board)
  if (!survey) return []
  const steps: LightbeamStep[] = []
  board.puzzle.movable.forEach((_, piece) => {
    const dying = [...board.candidates[piece]].filter(state => !survey.states[piece].has(state))
    if (!dying.length || dying.length === board.candidates[piece].size) return
    steps.push({ technique: "onlySurvivor", piece, beam: [], decisions: [{ kind: "eliminate", piece, states: dying }] })
  })
  return steps
}

const IMPLEMENTATIONS: Record<TechniqueId, (board: LightbeamBoard) => LightbeamStep[]> = {
  entryRun,
  exitRun,
  deadEnd,
  feedsExit,
  neverReached,
  onlySurvivor,
}

export const techniquesUpTo = (cap: TechniqueId): TechniqueId[] => TECHNIQUES.slice(0, TECHNIQUES.indexOf(cap) + 1)

const applyDecision = (board: LightbeamBoard, decision: LightbeamDecision) => {
  if (decision.kind === "carries") {
    for (const segment of decision.segments) board.forced.set(forcedKey(segment), segment)
    return
  }
  if (decision.kind === "shrineEntry") {
    board.shrineEntry = decision.direction
    return
  }
  if (decision.kind === "free") {
    board.free.add(decision.piece)
    return
  }
  // Never down to nothing: a piece with no state left is a broken board, and the honest outcome is a
  // board that fails to settle rather than one that quietly contradicts itself.
  const candidates = board.candidates[decision.piece]
  for (const state of decision.states) if (candidates.size > 1) candidates.delete(state)
}

export const applyLightbeamDecisions = (board: LightbeamBoard, decisions: LightbeamDecision[]) => {
  for (const decision of decisions) applyDecision(board, decision)
}

/**
 * The cheapest technique that has something to say, and everything it found in one go. Short-circuiting
 * matters: running the whole ladder on every pass would spend two enumerations per step for a
 * conclusion the first rung had already reached.
 */
export const applyLightbeamTechniques = (
  board: LightbeamBoard,
  allowed: readonly TechniqueId[]
): LightbeamStep[] | undefined => {
  for (const technique of allowed) {
    const found = IMPLEMENTATIONS[technique](board)
    if (found.length) return found
  }
  return undefined
}

export const nextLightbeamStep = (board: LightbeamBoard, cap: TechniqueId): LightbeamStep | undefined =>
  applyLightbeamTechniques(board, techniquesUpTo(cap))?.[0]

// What the board knows, boiled down. Compared before and after a harvest so a technique that reports a
// conclusion the board already held ends the solve instead of looping on it forever.
const signature = (board: LightbeamBoard): string =>
  [
    board.candidates.map(set => [...set].sort().join("")).join("|"),
    board.forced.size,
    board.shrineEntry ?? "-",
    board.free.size,
  ].join("/")

export type LightbeamSolve = {
  settled: boolean
  board: LightbeamBoard
  /** Which techniques the board actually demanded — the difficulty signal generation reads. */
  used: Set<TechniqueId>
  /** The reasons in the order they fired, which is the order hints walk. */
  steps: LightbeamStep[]
}

export const solveLightbeamByTechniques = (puzzle: LightbeamPuzzleData, cap: TechniqueId): LightbeamSolve => {
  const board = createLightbeamBoard(puzzle)
  const allowed = techniquesUpTo(cap)
  const used = new Set<TechniqueId>()
  const steps: LightbeamStep[] = []
  while (!lightbeamSettled(board)) {
    const harvest = applyLightbeamTechniques(board, allowed)
    if (!harvest) break
    const before = signature(board)
    for (const step of harvest) {
      used.add(step.technique)
      steps.push(step)
      applyLightbeamDecisions(board, step.decisions)
    }
    if (signature(board) === before) break
  }

  // `neverReached` is the one rung whose conclusion the answer does not need: a decoy is free precisely
  // because the light never touches it, so settling the board never required settling it. Left inside the
  // loop above it would therefore never fire at all — the board is already done by the time it is asked.
  // It runs here instead, once, so the family's own skill has something to say to the player even though
  // it had nothing to contribute to the route.
  if (allowed.includes("neverReached") && lightbeamSettled(board))
    for (const step of IMPLEMENTATIONS.neverReached(board)) {
      used.add(step.technique)
      steps.push(step)
      applyLightbeamDecisions(board, step.decisions)
    }

  return { settled: lightbeamSettled(board), board, used, steps }
}

/** The one state each piece is left in once the deduction has run, where it was pinned down at all. */
export const settledStates = (board: LightbeamBoard): (number | undefined)[] =>
  board.candidates.map(set => (set.size === 1 ? [...set][0] : undefined))

/** Cells a piece could ever stand in that lie inside the grid — the track a sliding piece draws. */
export const trackCells = (puzzle: LightbeamPuzzleData, piece: number): CellRef[] => {
  const movable = puzzle.movable[piece]
  const cells = movable.kind === "turnMirror" ? [movable.at] : movable.stops
  return cells.filter(at => insideGrid(puzzle.size, at))
}
