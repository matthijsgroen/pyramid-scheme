// The board and the beam, per docs/game-design/puzzles/lightbeam.md. A configuration is a flat array of
// integers, one per movable piece: the state it is in, and the whole of the player's answer.

import {
  BACKSLASH,
  cellKey,
  DIRECTIONS,
  insideGrid,
  opposite,
  reflect,
  sameCell,
  SLASH,
  stepCell,
  type CellRef,
  type Direction,
  type MirrorAngle,
} from "@/mods/core/game/beam/physics"

export {
  cellKey,
  DIR,
  DIRECTIONS,
  SQUARE_DIRECTIONS,
  mod8,
  SLASH,
  BACKSLASH,
  TURN_ANGLES,
  sameCell,
  directionStep,
  stepCell,
  opposite,
  reflect,
  insideGrid,
} from "@/mods/core/game/beam/physics"
export type { Direction, CellRef, MirrorAngle } from "@/mods/core/game/beam/physics"

export const segmentKey = (at: CellRef, direction: Direction): string => `${at.row},${at.col},${direction}`

/** A half-step stop is the only thing that flips a beam's parity: square to diagonal, or back. */
export const isHalfStep = (angle: MirrorAngle): boolean => angle % 2 === 1

/** Whether a set of stops leaves the two diagonals — a *cut mirror*, which is a stop set, not a kind. */
export const isCut = (angles: readonly MirrorAngle[]): boolean =>
  angles.some(angle => angle !== SLASH && angle !== BACKSLASH)

/**
 * What a piece does to the beam when it stands in its way. `angle` is the whole of the physics; `stops` is
 * for the drawing, and rides here because the `MovablePiece` is gone by the time a cell is drawn.
 */
export type Blocker = { kind: "mirror"; angle: MirrorAngle; stops: readonly MirrorAngle[] } | { kind: "wall" }

export const mirrorBlocker = (angle: MirrorAngle, stops: readonly MirrorAngle[] = [angle]): Blocker => ({
  kind: "mirror",
  angle,
  stops,
})

/** A given: the player cannot change it. */
export type FixedPiece = { kind: "mirror"; at: CellRef; angle: MirrorAngle } | { kind: "wall"; at: CellRef }

/** A piece the player cycles with a tap. A configuration names one of its states by index. */
export type MovablePiece =
  | { kind: "turnMirror"; at: CellRef; angles: readonly MirrorAngle[] }
  | { kind: "slidingMirror"; angle: MirrorAngle; stops: CellRef[] }
  | { kind: "slidingWall"; stops: CellRef[] }

/** A socket sunk in the floor: a transparent cell that lights every wire out of it when crossed. */
export type BeamNode = { at: CellRef }

/**
 * A piece goes to `to` once the light has crossed **every** socket in `from`. Splitting the socket from
 * its effect makes fan-out and fan-in the same mechanic, and a plain door a single-socket wiring.
 */
export type NodeWiring = {
  /** Indices into `nodes`. All of them must be crossed. */
  from: number[]
  /** Index into `movable`. */
  piece: number
  to: number
}

export type LightbeamPuzzleData = {
  size: number
  /** Where the light comes from, and which way it leaves. The disc absorbs anything hitting it. */
  sun: { at: CellRef; facing: Direction }
  shrine: CellRef
  fixed: FixedPiece[]
  movable: MovablePiece[]
  /** No generator authors these yet; the walk and the solver already handle them. */
  nodes?: BeamNode[]
  wirings?: NodeWiring[]
}

export const wiringsDriving = (puzzle: LightbeamPuzzleData, piece: number): NodeWiring[] =>
  (puzzle.wirings ?? []).filter(wiring => wiring.piece === piece)

/**
 * Where a driven piece sits until its wiring fires: the state no wiring drives it to. A driven piece is
 * not tappable — a door the player could simply open makes its socket decoration.
 */
export const restingState = (puzzle: LightbeamPuzzleData, piece: number): number | undefined => {
  const driven = wiringsDriving(puzzle, piece)
  if (!driven.length) return undefined
  const driveable = new Set(driven.map(wiring => wiring.to))
  const total = pieceStateCount(puzzle.movable[piece])
  for (let state = 0; state < total; state++) if (!driveable.has(state)) return state
  return 0
}

export const pieceOptions = (puzzle: LightbeamPuzzleData, piece: number): number[] => {
  const resting = restingState(puzzle, piece)
  if (resting !== undefined) return [resting]
  return Array.from({ length: pieceStateCount(puzzle.movable[piece]) }, (_, state) => state)
}

/** Every piece's options, in board order. */
export const allPieceOptions = (puzzle: LightbeamPuzzleData): number[][] =>
  puzzle.movable.map((_, piece) => pieceOptions(puzzle, piece))

const mirrorAngles = (puzzle: LightbeamPuzzleData): MirrorAngle[] => [
  ...puzzle.fixed.flatMap(piece => (piece.kind === "mirror" ? [piece.angle] : [])),
  ...puzzle.movable.flatMap(piece =>
    piece.kind === "turnMirror" ? [...piece.angles] : piece.kind === "slidingMirror" ? [piece.angle] : []
  ),
]

/**
 * Which directions light can be travelling in on this board — four, unless some mirror can flip parity.
 * Read off the pieces rather than a flag, so it stays true of boards nobody has authored.
 */
export const travelledDirections = (puzzle: LightbeamPuzzleData): Direction[] =>
  mirrorAngles(puzzle).some(isHalfStep)
    ? [...DIRECTIONS]
    : DIRECTIONS.filter(direction => direction % 2 === puzzle.sun.facing % 2)

export type LightbeamConfig = readonly number[]

export const pieceStateCount = (piece: MovablePiece): number =>
  piece.kind === "turnMirror" ? piece.angles.length : piece.stops.length

export const pieceOccupant = (piece: MovablePiece, state: number): { at: CellRef; blocks: Blocker } => {
  if (piece.kind === "turnMirror") return { at: piece.at, blocks: mirrorBlocker(piece.angles[state], piece.angles) }
  if (piece.kind === "slidingMirror") return { at: piece.stops[state], blocks: mirrorBlocker(piece.angle) }
  return { at: piece.stops[state], blocks: { kind: "wall" } }
}

export const pieceCells = (piece: MovablePiece): CellRef[] => (piece.kind === "turnMirror" ? [piece.at] : piece.stops)

/** What the walk finds in a cell. `unknown` is a partly-deduced board saying "something could be here". */
export type CellContent =
  { kind: "empty" } | { kind: "unknown" } | { kind: "sun"; facing: Direction } | { kind: "shrine" } | Blocker

/** One cell of the beam: which way it came in, and which way it left (nothing, if it died here). */
export type BeamSegment = { at: CellRef; enter: Direction; exit?: Direction }

/** Why the beam stopped. `unknown` only ever comes back from a partly-deduced board. */
export type BeamEnd = "lit" | "absorbed" | "escapes" | "loops" | "unknown"

export type BeamWalk = {
  /** Cells the beam crossed, in order — a cell crossed twice appears twice, once per direction. */
  path: BeamSegment[]
  end: BeamEnd
  stopAt?: CellRef
}

type Resolver = (at: CellRef) => CellContent

/**
 * Walks the beam forward from a cell, over whatever the resolver says is there. A diagonal step resolves
 * only the cell it lands in, never the two it squeezes past: light slips between two corners, by design.
 *
 * Loop detection is a guard rather than a game state — a beam from the disc can never join a ring.
 */
export const walkForward = (
  size: number,
  from: CellRef,
  direction: Direction,
  resolve: Resolver,
  /** Called as the beam enters each cell. True when crossing it fired a socket and something moved. */
  cross?: (at: CellRef) => boolean
): BeamWalk => {
  const path: BeamSegment[] = []
  const seen = new Set<string>()
  let at = stepCell(from, direction)
  let travel = direction
  for (;;) {
    if (!insideGrid(size, at)) return { path, end: "escapes" }
    // A board that has just changed is one the walk has not been over, so its history proves no loop.
    if (cross?.(at)) seen.clear()
    const key = segmentKey(at, travel)
    if (seen.has(key)) return { path, end: "loops", stopAt: at }
    seen.add(key)
    const content = resolve(at)
    if (content.kind === "unknown") return { path: [...path, { at, enter: travel }], end: "unknown", stopAt: at }
    if (content.kind === "shrine") return { path: [...path, { at, enter: travel }], end: "lit", stopAt: at }
    if (content.kind === "wall" || content.kind === "sun")
      return { path: [...path, { at, enter: travel }], end: "absorbed", stopAt: at }
    const exit = content.kind === "mirror" ? reflect(content.angle, travel) : travel
    path.push({ at, enter: travel, exit })
    at = stepCell(at, exit)
    travel = exit
  }
}

/**
 * Walks the beam backwards from the shrine, given the direction it arrives travelling — how the board
 * answers which sides the shrine can be lit from at all.
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
    if (content.kind === "sun")
      return opposite(back) === content.facing
        ? { path, end: "lit", stopAt: at }
        : { path, end: "absorbed", stopAt: at }
    if (content.kind === "unknown")
      return { path: [...path, { at, exit: opposite(back), enter: opposite(back) }], end: "unknown", stopAt: at }
    if (content.kind === "wall" || content.kind === "shrine") return { path, end: "absorbed", stopAt: at }
    const nextBack = content.kind === "mirror" ? reflect(content.angle, back) : back
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
    grid[piece.at.row][piece.at.col] = piece.kind === "mirror" ? mirrorBlocker(piece.angle) : { kind: "wall" }
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

/** The configuration as the sockets leave it. Applied in wiring order, so the trace stays a function. */
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
 * Where the light actually goes. Sockets and all, this stays one forward walk and a pure function of the
 * configuration, which is what keeps every exhaustive enumeration in the family honest.
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

/** Which wirings the light ends up firing. */
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

/** Every configuration the puzzle allows, in odometer order. */
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
