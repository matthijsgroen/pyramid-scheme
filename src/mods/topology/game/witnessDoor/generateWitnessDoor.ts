import type { Difficulty } from "@/data/difficultyLevels"
import { mulberry32, shuffle } from "@/game/random"
import {
  cellKey,
  DIR,
  MIN_LEG,
  perpendicular,
  SLASH,
  stepCell,
  type CellRef,
  type Direction,
  type MirrorAngle,
} from "@/mods/core/game/beam/physics"
import {
  bendsFor,
  byReadingOrder,
  drawBranch,
  honestOpenings,
  routesTo,
  settingFor,
  traceBeam,
  type BeamSegment,
  type Branch,
  type MirrorPlacement,
  type Occupied,
  type ShrineGrid,
} from "../shrineBeam/shrineBeam"
import { WITNESS_SHRINES, type WitnessShrine } from "./witnessKeys"

// One board, two shrines: which shrine the player routes the beam to is which branch of the floor's fork
// they open, so the board owes each shrine exactly one route.

export type { MirrorPlacement } from "../shrineBeam/shrineBeam"
export type { BeamSegment as WitnessSegment } from "../shrineBeam/shrineBeam"
export type WitnessGrid = ShrineGrid

export type WitnessBoard = {
  grid: WitnessGrid
  shrines: Record<WitnessShrine, CellRef>
}

/** The gates a draft board can die at. */
export type WitnessGate = "noRoute" | "notUnique" | "noHonestOpening"

const shrineCells = (board: WitnessBoard): CellRef[] => WITNESS_SHRINES.map(shrine => board.shrines[shrine])

/** Where the light goes, and which mirrors it turns at on the way, as the shrine's own name. */
export const traceWitnessBeam = (
  board: WitnessBoard,
  angles: readonly MirrorAngle[]
): { shrine?: WitnessShrine; met: MirrorPlacement[]; path: BeamSegment[] } => {
  const walk = traceBeam(board.grid, shrineCells(board), angles)
  return { ...walk, shrine: walk.shrine === undefined ? undefined : WITNESS_SHRINES[walk.shrine] }
}

/** Every route that lands the beam on `shrine`, as the mirrors that route turns at. */
export const solutionsFor = (board: WitnessBoard, shrine: WitnessShrine): MirrorPlacement[][] =>
  routesTo(board.grid, shrineCells(board), WITNESS_SHRINES.indexOf(shrine))

/**
 * How big a board is, and how far past the fork each branch runs, per tier. Never fewer than two bends: a
 * branch that turns once pins only two mirrors, and a two-mirror answer has no opening that survives
 * `honestOpenings` — turning every mirror of it lands on the answer.
 */
const WITNESS_CONFIG: Record<Difficulty, { size: number; bendsAfterFork: number }> = {
  starter: { size: 6, bendsAfterFork: 2 },
  junior: { size: 7, bendsAfterFork: 2 },
  expert: { size: 8, bendsAfterFork: 2 },
  master: { size: 9, bendsAfterFork: 3 },
  wizard: { size: 9, bendsAfterFork: 4 },
}

const MAX_ATTEMPTS = 400

/** The shrine each branch runs to sits on that edge of the board, which is what names it. */
const FINAL_DIRECTION: Record<WitnessShrine, Direction> = { east: DIR.right, north: DIR.up }

/** The disc sits on an edge facing in, never a corner: a corner leaves the first leg one way to go. */
const drawSun = (size: number, random: () => number): { at: CellRef; facing: Direction } => {
  const along = 1 + Math.floor(random() * (size - 2))
  // Both edges it may sit on leave the east and north edges ahead of the beam, so either shrine is
  // reachable from the fork.
  return random() < 0.5
    ? { at: { row: size - 1, col: along }, facing: DIR.up }
    : { at: { row: along, col: 0 }, facing: DIR.right }
}

const attemptBoard = (
  config: { size: number; bendsAfterFork: number },
  random: () => number,
  reject?: (gate: WitnessGate) => void
): WitnessBoard | undefined => {
  const { size, bendsAfterFork } = config
  const sun = drawSun(size, random)

  // The fork is the first bend, and both branches take it: the beam leaves the disc one way, so the choice
  // of shrine is the choice of which way that one mirror turns it.
  const forkDistance = MIN_LEG + Math.floor(random() * (size - 1 - MIN_LEG))
  const prefix: CellRef[] = []
  for (let at = stepCell(sun.at, sun.facing); prefix.length < forkDistance; at = stepCell(at, sun.facing))
    prefix.push(at)
  const fork = prefix[prefix.length - 1]

  const [eastLeaving, northLeaving] = shuffle(perpendicular(sun.facing), random)
  const leaving: Record<WitnessShrine, Direction> = { east: eastLeaving, north: northLeaving }

  const taken: Occupied = {
    mirrors: new Set([cellKey(fork)]),
    crossed: new Set(prefix.map(cellKey)),
    terminal: new Set([cellKey(sun.at)]),
  }
  const branches = {} as Record<WitnessShrine, Branch>
  // Drawn one after the other, in a drawn order so neither shrine is always the one with the free board.
  for (const shrine of shuffle([...WITNESS_SHRINES], random)) {
    const branch = drawBranch(
      size,
      fork,
      leaving[shrine],
      bendsFor(bendsAfterFork, leaving[shrine], FINAL_DIRECTION[shrine]),
      FINAL_DIRECTION[shrine],
      taken,
      random
    )
    if (!branch) {
      reject?.("noRoute")
      return undefined
    }
    branches[shrine] = branch
    for (const mirror of branch.bends) taken.mirrors.add(cellKey(mirror.at))
    for (const cell of branch.path) taken.crossed.add(cellKey(cell))
    taken.terminal.add(cellKey(branch.shrine))
  }

  const mirrors = [fork, ...WITNESS_SHRINES.flatMap(shrine => branches[shrine].bends.map(bend => bend.at))].sort(
    byReadingOrder
  )
  const board: WitnessBoard = {
    grid: { size, sun, mirrors, initial: mirrors.map(() => SLASH) },
    shrines: { east: branches.east.shrine, north: branches.north.shrine },
  }

  // The construction gives each shrine a route; only enumeration can say it gives it no second one.
  if (WITNESS_SHRINES.some(shrine => solutionsFor(board, shrine).length !== 1)) {
    reject?.("notUnique")
    return undefined
  }

  const openings = honestOpenings(board.grid, shrineCells(board))
  if (!openings.length) {
    reject?.("noHonestOpening")
    return undefined
  }
  const opening = openings[Math.floor(random() * openings.length)]
  return { ...board, grid: { ...board.grid, initial: settingFor(mirrors.length, opening) } }
}

/**
 * Builds a witness door's board. Deterministic in `(seed, difficulty)`, and throws rather than ship a board
 * that owes a shrine more than one route — an ambiguous shrine would open a branch the player did not choose.
 */
export const generateWitnessDoor = (
  seed: number,
  difficulty: Difficulty,
  /** Diagnostics: the gate that threw a draft away, once per rejected attempt. */
  reject?: (gate: WitnessGate) => void
): WitnessBoard => {
  const config = WITNESS_CONFIG[difficulty]
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const board = attemptBoard(config, mulberry32(seed * 7919 + attempt), reject)
    if (board) return board
  }
  throw new Error(`generateWitnessDoor: no two-shrine board (seed=${seed}, difficulty=${difficulty})`)
}
