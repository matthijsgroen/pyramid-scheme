// The board and the beam, per docs/game-design/puzzles/lightbeam.md §3. Everything else in the family
// — the solver, generation, the drawn board — is written against these types and this one walk.
//
// A configuration is a flat array of integers, one per movable piece: the state that piece is in. That
// is the whole of the player's answer, which is what makes the configuration space enumerable and reset
// a one-liner.

export const DIRECTIONS = ["up", "right", "down", "left"] as const

export type Direction = (typeof DIRECTIONS)[number]

export type CellRef = { row: number; col: number }

/** The two diagonals a mirror can sit on, written as they are drawn. */
export type MirrorFace = "/" | "\\"

/** What a piece does to the beam when it stands in its way. */
export type Blocker = { kind: "mirror"; face: MirrorFace } | { kind: "wall" }

/** Part of the puzzle, like a Sudoku given: the player cannot change it. */
export type FixedPiece = { kind: "mirror"; at: CellRef; face: MirrorFace } | { kind: "wall"; at: CellRef }

/**
 * A piece the player cycles with a tap. Its states are listed out, and a configuration names one of
 * them by index — a turn mirror by which face, a sliding piece by which stop.
 */
export type MovablePiece =
  | { kind: "turnMirror"; at: CellRef; faces: MirrorFace[] }
  | { kind: "slidingMirror"; face: MirrorFace; stops: CellRef[] }
  | { kind: "slidingWall"; stops: CellRef[] }

/**
 * A socket sunk in the floor (design doc §12.1): a fixed, transparent cell that the light can cross.
 * Crossing it lights every wire leading out of it. There is nothing to tap, so the control scheme stays
 * at exactly one gesture.
 */
export type BeamNode = { at: CellRef }

/**
 * What the wires actually do: a piece goes to `to` once the light has crossed **every** socket in `from`.
 *
 * Splitting the socket from its effect is what makes both shapes the same mechanic rather than two:
 *
 * - **Fan-out** — one socket named by several wirings. Crossing it moves several pieces at once, which the
 *   board draws as several wires leaving the same socket in the same colour.
 * - **Fan-in** — one wiring naming several sockets. The piece does not budge until the light has been
 *   through all of them, which is a genuinely different puzzle: not "reach this square" but "reach these
 *   squares, and there is only one beam to do it with".
 *
 * A single-socket wiring is the plain door, and it needs no special case.
 */
export type NodeWiring = {
  /** Indices into `nodes`. All of them must be crossed — one socket for a door, more for an and. */
  from: number[]
  /** Index into `movable`. */
  piece: number
  /** The state that piece is forced into once the wiring fires. */
  to: number
}

export type LightbeamPuzzleData = {
  size: number
  /** Where the light comes from, and which way it leaves. The disc itself absorbs anything hitting it. */
  sun: { at: CellRef; facing: Direction }
  shrine: CellRef
  fixed: FixedPiece[]
  movable: MovablePiece[]
  /**
   * **Nothing traces these yet.** They are the shape the board is being drawn against, and only that. An
   * unfired socket is transparent, which is what an empty cell already is, so `configGrid` and the whole
   * solver stay correct for every board that ships today — and no board generates one. Firing lands with
   * §12.1's logic, once the drawing has been shown to survive.
   */
  nodes?: BeamNode[]
  wirings?: NodeWiring[]
}

/** Which sockets drive a piece, if any. Empty means the piece belongs to the player. */
export const wiringsDriving = (puzzle: LightbeamPuzzleData, piece: number): NodeWiring[] =>
  (puzzle.wirings ?? []).filter(wiring => wiring.piece === piece)

/**
 * Where a driven piece sits until its wiring fires: the state no wiring drives it to.
 *
 * **A driven piece is not tappable**, and that is the whole reason a socket is worth reaching. A door the
 * player could simply open makes the socket decoration — the light has to be the only thing that opens it.
 * So a driven piece has one resting state and one driven state, it contributes nothing to the
 * configuration space, and `pieceOptions` is what every enumeration in the family goes through to say so.
 */
export const restingState = (puzzle: LightbeamPuzzleData, piece: number): number | undefined => {
  const driven = wiringsDriving(puzzle, piece)
  if (!driven.length) return undefined
  const driveable = new Set(driven.map(wiring => wiring.to))
  const total = pieceStateCount(puzzle.movable[piece])
  for (let state = 0; state < total; state++) if (!driveable.has(state)) return state
  return 0
}

/** The states a piece can be in by the player's doing — one, and unchosen, if a socket owns it. */
export const pieceOptions = (puzzle: LightbeamPuzzleData, piece: number): number[] => {
  const resting = restingState(puzzle, piece)
  if (resting !== undefined) return [resting]
  return Array.from({ length: pieceStateCount(puzzle.movable[piece]) }, (_, state) => state)
}

/** Every piece's options, in board order — the domain every enumeration in this family runs over. */
export const allPieceOptions = (puzzle: LightbeamPuzzleData): number[][] =>
  puzzle.movable.map((_, piece) => pieceOptions(puzzle, piece))

export type LightbeamConfig = readonly number[]

export const cellKey = (at: CellRef): string => `${at.row},${at.col}`

export const segmentKey = (at: CellRef, direction: Direction): string => `${at.row},${at.col},${direction}`

export const sameCell = (a: CellRef, b: CellRef): boolean => a.row === b.row && a.col === b.col

const STEPS: Record<Direction, CellRef> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
}

const OPPOSITES: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" }

// Reflection off either diagonal. Both are involutions — bouncing the same face twice gives the
// direction back — which is why the backward walk below can reuse this untouched.
const FACES: Record<MirrorFace, Record<Direction, Direction>> = {
  "/": { right: "up", up: "right", left: "down", down: "left" },
  "\\": { right: "down", down: "right", left: "up", up: "left" },
}

export const stepCell = (at: CellRef, direction: Direction): CellRef => ({
  row: at.row + STEPS[direction].row,
  col: at.col + STEPS[direction].col,
})

export const opposite = (direction: Direction): Direction => OPPOSITES[direction]

export const reflect = (face: MirrorFace, travel: Direction): Direction => FACES[face][travel]

export const insideGrid = (size: number, at: CellRef): boolean =>
  at.row >= 0 && at.col >= 0 && at.row < size && at.col < size

/** How many states a piece cycles through. */
export const pieceStateCount = (piece: MovablePiece): number =>
  piece.kind === "turnMirror" ? piece.faces.length : piece.stops.length

/** Where a piece stands in a given state, and what it does to the beam there. */
export const pieceOccupant = (piece: MovablePiece, state: number): { at: CellRef; blocks: Blocker } => {
  if (piece.kind === "turnMirror") return { at: piece.at, blocks: { kind: "mirror", face: piece.faces[state] } }
  if (piece.kind === "slidingMirror") return { at: piece.stops[state], blocks: { kind: "mirror", face: piece.face } }
  return { at: piece.stops[state], blocks: { kind: "wall" } }
}

/** Every cell a piece could ever stand on, whatever the player does. */
export const pieceCells = (piece: MovablePiece): CellRef[] => (piece.kind === "turnMirror" ? [piece.at] : piece.stops)

/**
 * What the walk finds in a cell. `unknown` is the one that matters: it is how a partly-deduced board
 * says "something movable could be standing here", and it is where every deduction in techniques.ts
 * starts.
 */
export type CellContent =
  { kind: "empty" } | { kind: "unknown" } | { kind: "sun"; facing: Direction } | { kind: "shrine" } | Blocker

/** One cell of the beam: which way it came in, and which way it left (nothing, if it died here). */
export type BeamSegment = { at: CellRef; enter: Direction; exit?: Direction }

/**
 * Why the beam stopped. `unknown` only ever comes back from a partly-deduced board — a real
 * configuration always resolves to one of the other four.
 */
export type BeamEnd = "lit" | "absorbed" | "escapes" | "loops" | "unknown"

export type BeamWalk = {
  /** Cells the beam crossed, in order. A cell crossed twice appears twice, once per direction. */
  path: BeamSegment[]
  end: BeamEnd
  /** The cell the walk stopped in, absent when it left the grid. */
  stopAt?: CellRef
}

type Resolver = (at: CellRef) => CellContent

/**
 * Walks the beam forward from a cell, in a direction, over whatever the resolver says is there.
 *
 * Loop detection is what keeps this walk total, but on this family's pieces it is a guard rather than a
 * game state: a 90° mirror maps (cell, direction) one-to-one, so every state has exactly one
 * predecessor, and the disc's first state has none. A beam from the disc therefore walks a path and can
 * never join a ring — a ring of mirrors is only reachable by starting inside it (beam.spec.ts proves
 * both halves). The guard earns its keep the moment a piece bends light by anything but a quarter turn,
 * which is exactly what the deferred prism does.
 */
export const walkForward = (
  size: number,
  from: CellRef,
  direction: Direction,
  resolve: Resolver,
  /**
   * Called as the beam enters each cell, before anything is read from it. Returns true when crossing this
   * cell changed the board — a socket fired and something moved — which is how switch nodes (§12.1) hook
   * into the one walk without a second pass.
   */
  cross?: (at: CellRef) => boolean
): BeamWalk => {
  const path: BeamSegment[] = []
  const seen = new Set<string>()
  let at = stepCell(from, direction)
  let travel = direction
  for (;;) {
    if (!insideGrid(size, at)) return { path, end: "escapes" }
    // A board that has just changed is a board the walk has not been over, so what it saw before proves
    // nothing about looping. Clearing rather than keying by the fired set costs nothing and stays total:
    // a wiring fires once, so the clear happens at most as many times as there are wirings.
    if (cross?.(at)) seen.clear()
    const key = segmentKey(at, travel)
    if (seen.has(key)) return { path, end: "loops", stopAt: at }
    seen.add(key)
    const content = resolve(at)
    if (content.kind === "unknown") return { path: [...path, { at, enter: travel }], end: "unknown", stopAt: at }
    if (content.kind === "shrine") return { path: [...path, { at, enter: travel }], end: "lit", stopAt: at }
    if (content.kind === "wall" || content.kind === "sun")
      return { path: [...path, { at, enter: travel }], end: "absorbed", stopAt: at }
    const exit = content.kind === "mirror" ? reflect(content.face, travel) : travel
    path.push({ at, enter: travel, exit })
    at = stepCell(at, exit)
    travel = exit
  }
}

/**
 * Walks the beam backwards from the shrine, given the direction it would be travelling as it arrives.
 *
 * This is how the board answers "which side can the shrine even be lit from": a direction whose
 * backward walk runs off the grid or into a wall is a direction nothing could have delivered the light
 * from. Reaching the sun-disc facing the right way ends it — that is the whole beam, found from the
 * other end.
 */
export const walkBackward = (size: number, shrine: CellRef, enter: Direction, resolve: Resolver): BeamWalk => {
  const path: BeamSegment[] = [{ at: shrine, enter }]
  const seen = new Set<string>()
  let back = opposite(enter)
  let at = stepCell(shrine, back)
  for (;;) {
    if (!insideGrid(size, at)) return { path, end: "escapes" }
    const key = segmentKey(at, back)
    if (seen.has(key)) return { path, end: "loops", stopAt: at }
    seen.add(key)
    const content = resolve(at)
    // The disc only emits one way; light cannot be traced back into its shadowed side.
    if (content.kind === "sun")
      return opposite(back) === content.facing
        ? { path, end: "lit", stopAt: at }
        : { path, end: "absorbed", stopAt: at }
    if (content.kind === "unknown")
      return { path: [...path, { at, exit: opposite(back), enter: opposite(back) }], end: "unknown", stopAt: at }
    if (content.kind === "wall" || content.kind === "shrine") return { path, end: "absorbed", stopAt: at }
    const nextBack = content.kind === "mirror" ? reflect(content.face, back) : back
    path.push({ at, enter: opposite(nextBack), exit: opposite(back) })
    at = stepCell(at, nextBack)
    back = nextBack
  }
}

/** The board as a configuration leaves it: every cell resolved, nothing unknown. */
export const configGrid = (puzzle: LightbeamPuzzleData, config: LightbeamConfig): CellContent[][] => {
  const grid: CellContent[][] = Array.from({ length: puzzle.size }, () =>
    Array.from({ length: puzzle.size }, (): CellContent => ({ kind: "empty" }))
  )
  for (const piece of puzzle.fixed)
    grid[piece.at.row][piece.at.col] = piece.kind === "mirror" ? { kind: "mirror", face: piece.face } : { kind: "wall" }
  puzzle.movable.forEach((piece, index) => {
    const { at, blocks } = pieceOccupant(piece, config[index])
    grid[at.row][at.col] = blocks
  })
  grid[puzzle.shrine.row][puzzle.shrine.col] = { kind: "shrine" }
  grid[puzzle.sun.at.row][puzzle.sun.at.col] = { kind: "sun", facing: puzzle.sun.facing }
  return grid
}

export const gridResolver =
  (grid: CellContent[][]): Resolver =>
  at =>
    grid[at.row][at.col]

/**
 * The configuration as the sockets leave it: every wiring that has fired overrides its piece.
 *
 * Applied in wiring order, so two wirings driving one piece resolve the same way every time. Generation
 * does not build that case, but the trace has to be a function rather than a coin toss.
 */
export const firedConfig = (
  puzzle: LightbeamPuzzleData,
  config: LightbeamConfig,
  fired: ReadonlySet<number>
): number[] => {
  const out = [...config]
  ;(puzzle.wirings ?? []).forEach((wiring, index) => {
    if (fired.has(index)) out[wiring.piece] = wiring.to
  })
  return out
}

/**
 * Where the light actually goes, for the configuration the player is holding.
 *
 * With sockets on the board this is still one forward walk and still a pure function of the
 * configuration — which is what keeps §5's exact enumeration, and therefore every gate and both
 * exhaustive rungs, working untouched. Crossing a socket fires the wirings whose sockets have *all* been
 * crossed, the affected pieces move, and the walk carries on from where it is. Effects land ahead of the
 * light by construction (§12.1), so the drawn beam is never a picture of something that has stopped being
 * true.
 */
export const traceBeam = (puzzle: LightbeamPuzzleData, config: LightbeamConfig): BeamWalk => {
  const nodes = puzzle.nodes ?? []
  const wirings = puzzle.wirings ?? []
  if (!nodes.length || !wirings.length)
    return walkForward(puzzle.size, puzzle.sun.at, puzzle.sun.facing, gridResolver(configGrid(puzzle, config)))

  const crossed = new Set<number>()
  const fired = new Set<number>()
  let grid = configGrid(puzzle, config)
  const cross = (at: CellRef): boolean => {
    let reached = false
    nodes.forEach((node, index) => {
      if (!crossed.has(index) && sameCell(node.at, at)) {
        crossed.add(index)
        reached = true
      }
    })
    if (!reached) return false
    let changed = false
    wirings.forEach((wiring, index) => {
      if (fired.has(index) || !wiring.from.every(node => crossed.has(node))) return
      fired.add(index)
      changed = true
    })
    if (!changed) return false
    grid = configGrid(puzzle, firedConfig(puzzle, config, fired))
    return true
  }
  return walkForward(puzzle.size, puzzle.sun.at, puzzle.sun.facing, at => grid[at.row][at.col], cross)
}

/** Which wirings the light ends up firing — what the board draws, and what a hint points at. */
export const firedWirings = (puzzle: LightbeamPuzzleData, config: LightbeamConfig): Set<number> => {
  const crossed = new Set(
    traceBeam(puzzle, config)
      .path.map(segment => cellKey(segment.at))
      .map(key => (puzzle.nodes ?? []).findIndex(node => cellKey(node.at) === key))
      .filter(index => index >= 0)
  )
  const fired = new Set<number>()
  ;(puzzle.wirings ?? []).forEach((wiring, index) => {
    if (wiring.from.every(node => crossed.has(node))) fired.add(index)
  })
  return fired
}

export const isLit = (puzzle: LightbeamPuzzleData, config: LightbeamConfig): boolean =>
  traceBeam(puzzle, config).end === "lit"

/** Every configuration the puzzle allows, in odometer order over the pieces' states. */
export const eachConfig = (
  states: readonly (readonly number[])[],
  visit: (config: number[]) => void,
  limit = Number.POSITIVE_INFINITY
): boolean => {
  const total = states.reduce((product, options) => product * options.length, 1)
  if (total > limit) return false
  const config = new Array<number>(states.length).fill(0)
  const cursor = new Array<number>(states.length).fill(0)
  for (let n = 0; n < total; n++) {
    for (let i = 0; i < states.length; i++) config[i] = states[i][cursor[i]]
    visit(config)
    for (let i = 0; i < states.length; i++) {
      cursor[i]++
      if (cursor[i] < states[i].length) break
      cursor[i] = 0
    }
  }
  return true
}
