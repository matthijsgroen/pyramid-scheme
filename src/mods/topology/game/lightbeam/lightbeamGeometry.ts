import { shuffle } from "@/game/random"
import {
  BACKSLASH,
  cellKey,
  DIR,
  DIRECTIONS,
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
import { perpendicular } from "@/mods/core/game/beam/physics"

export { MIN_LEG, angleFor, axisOf, perpendicular, stepsToEdge } from "@/mods/core/game/beam/physics"

/** The stop set for a cut mirror, read off the half-step angle the route bends at. */
export const cutStops = (angle: MirrorAngle): readonly MirrorAngle[] | undefined => {
  const aligned = [mod8(angle + 3), mod8(angle - 3)].find(stop => stop === SLASH || stop === BACKSLASH)
  if (aligned === undefined) return undefined
  return aligned < angle ? [aligned, angle] : [angle, aligned]
}

/** Which of the route's bends turn the beam diagonally. Undefined when they cannot be placed. */
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

/** The four ways a half-step mirror can bend this beam: every direction of the other parity. */
export const halfStepTurns = (direction: Direction): Direction[] =>
  DIRECTIONS.filter(candidate => candidate % 2 !== direction % 2)

export const runsDiagonally = (direction: Direction): boolean => direction % 2 === 1

export type RouteCell = { at: CellRef; enter: Direction; exit?: Direction }

export type Route = {
  sun: { at: CellRef; facing: Direction }
  shrine: CellRef
  cells: RouteCell[]
  bends: { at: CellRef; enter: Direction; exit: Direction; angle: MirrorAngle }[]
  /** Squares the beam crosses twice, once on each axis. Nothing may ever stand on one. */
  crossings: Set<string>
}

/** The disc sits on an edge facing inward, never in a corner: a corner leaves the first leg one way to go. */
export const pickSun = (size: number, random: () => number): { at: CellRef; facing: Direction } => {
  const along = 1 + Math.floor(random() * (size - 2))
  const side = Math.floor(random() * 4)
  if (side === 0) return { at: { row: 0, col: along }, facing: DIR.down }
  if (side === 1) return { at: { row: size - 1, col: along }, facing: DIR.up }
  if (side === 2) return { at: { row: along, col: 0 }, facing: DIR.right }
  return { at: { row: along, col: size - 1 }, facing: DIR.left }
}

/** Every contiguous run of `length` cells that crosses the beam and contains `at` — the tracks on offer. */
export const trackRuns = (at: CellRef, across: Direction, length: number): CellRef[][] => {
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
 * No two pieces the player can tap may touch, so each can own a hit area larger than its cell — which is
 * what lets the grid be denser than a thumb.
 */
export const piecesAreSpaced = (size: number, movable: MovablePiece[], driven: ReadonlySet<number>): boolean => {
  const owner = new Map<string, number>()
  movable.forEach((piece, index) => {
    // A door has no tap target to protect.
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
 * The uniqueness gate: one winning *path*, not one winning configuration — a decoy has a free setting by
 * definition. Generation gates on `reachableDeviations` instead, which is far cheaper; this is the
 * independent second opinion the two are asserted to agree with.
 */
export const routeIsUnique = (puzzle: LightbeamPuzzleData, states: number[][]): boolean => {
  const paths = new Set<string>()
  const ran = eachConfig(states, config => {
    if (isLit(puzzle, config)) paths.add(pathSignature(puzzle, config))
  })
  return ran && paths.size === 1
}

const OPENS_WRONG = 0.8

/**
 * Where the board opens. Each piece draws its own offset: a uniform one makes "tap everything once" a
 * solution, which `openingIsHonest` is what refuses.
 */
export const drawOpening = (puzzle: LightbeamPuzzleData, solution: readonly number[], random: () => number): number[] =>
  puzzle.movable.map((piece, index) => {
    if (restingState(puzzle, index) !== undefined) return solution[index]
    const total = pieceStateCount(piece)
    if (total < 2 || random() > OPENS_WRONG) return solution[index]
    return (solution[index] + 1 + Math.floor(random() * (total - 1))) % total
  })

// A guard on the walk below, which is short by construction: every step strictly improves a bounded score.
const MAX_GREEDY_STATES = 400

/** Where `taps` taps land a piece, over the states the player can actually reach. */
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
 * Would a player who never reasons get there anyway — tapping whichever piece leaves the light nearer, and
 * keeping at it? Every such walk is searched, not one: ties are where a real player picks arbitrarily.
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

/** The board opens dark, no single tap finishes it, and no uniform number of taps does either. */
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
