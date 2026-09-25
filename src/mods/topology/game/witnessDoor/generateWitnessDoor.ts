import type { Difficulty } from "@/data/difficultyLevels"
import { mulberry32, shuffle } from "@/game/random"
import {
  angleFor,
  axisOf,
  cellKey,
  DIR,
  insideGrid,
  MIN_LEG,
  perpendicular,
  reflect,
  sameCell,
  SLASH,
  stepCell,
  stepsToEdge,
  TURN_ANGLES,
  type CellRef,
  type Direction,
  type MirrorAngle,
} from "@/mods/core/game/beam/physics"
import { WITNESS_SHRINES, type WitnessShrine } from "./witnessKeys"

// One board, two shrines: which shrine the player routes the beam to is which branch of the floor's fork
// they open, so the board owes each shrine exactly one route.

/** A mirror standing on a cell at an angle — one entry of the player's answer. */
export type MirrorPlacement = { at: CellRef; angle: MirrorAngle }

/** One cell of beam: the way in, and the way out where it leaves at all. What the room draws. */
export type WitnessSegment = { at: CellRef; enter: Direction; exit?: Direction }

export type WitnessGrid = {
  size: number
  /** Where the light comes from, and which way it leaves. The disc absorbs anything that hits it. */
  sun: { at: CellRef; facing: Direction }
  /** The cells that hold a mirror, in reading order. The player turns each between `/` and `\`. */
  mirrors: CellRef[]
  /** The angle each mirror stands at when the room opens, in `mirrors` order. */
  initial: MirrorAngle[]
}

export type WitnessBoard = {
  grid: WitnessGrid
  shrines: Record<WitnessShrine, CellRef>
}

/** The gates a draft board can die at. */
export type WitnessGate = "noRoute" | "notUnique" | "noHonestOpening"

/**
 * Where the light goes, and which mirrors it turns at on the way. The whole of the board's physics: the
 * generator's verifier and the room's win check both ask this and nothing else.
 */
export const traceWitnessBeam = (
  board: WitnessBoard,
  angles: readonly MirrorAngle[]
): { shrine?: WitnessShrine; met: MirrorPlacement[]; path: WitnessSegment[] } => {
  const { size, sun, mirrors } = board.grid
  const mirrorAt = new Map(mirrors.map((at, index) => [cellKey(at), index]))
  const met: MirrorPlacement[] = []
  const path: WitnessSegment[] = []
  let travel = sun.facing
  let at = stepCell(sun.at, travel)
  // One step per (cell, direction) the beam could be in. A guard against a hang, not a game state: a beam
  // leaving the disc can never join a ring, because reflection is reversible and the disc absorbs.
  for (let steps = 4 * size * size; steps > 0; steps--) {
    if (!insideGrid(size, at)) return { met, path }
    const enter = travel
    const shrine = WITNESS_SHRINES.find(candidate => sameCell(board.shrines[candidate], at))
    if (shrine) {
      path.push({ at, enter })
      return { shrine, met, path }
    }
    if (sameCell(sun.at, at)) {
      path.push({ at, enter })
      return { met, path }
    }
    const index = mirrorAt.get(cellKey(at))
    if (index !== undefined) {
      const angle = angles[index]
      met.push({ at: mirrors[index], angle })
      travel = reflect(angle, travel)
    }
    path.push({ at, enter, exit: travel })
    at = stepCell(at, travel)
  }
  return { met, path }
}

/** The setting numbered `n`: bit per mirror, clear for `/` and set for `\\`. */
const settingFor = (count: number, n: number): MirrorAngle[] =>
  Array.from({ length: count }, (_, index) => TURN_ANGLES[(n >> index) & 1])

/** Every setting of the board's mirrors, in odometer order. */
const eachSetting = (count: number, visit: (angles: MirrorAngle[]) => void): void => {
  for (let n = 0; n < 2 ** count; n++) visit(settingFor(count, n))
}

const placementKey = (placement: readonly MirrorPlacement[]): string =>
  placement.map(mirror => `${cellKey(mirror.at)}:${mirror.angle}`).join(" ")

/**
 * Every route that lands the beam on `shrine`, as the mirrors that route turns at. A mirror the beam never
 * reaches is not part of the answer, so its two settings are one route rather than two — the board must
 * never call a legitimate answer wrong (docs/game-design/PUZZLE_FAMILIES.md).
 */
export const solutionsFor = (board: WitnessBoard, shrine: WitnessShrine): MirrorPlacement[][] => {
  const routes = new Map<string, MirrorPlacement[]>()
  eachSetting(board.grid.mirrors.length, angles => {
    const walk = traceWitnessBeam(board, angles)
    if (walk.shrine !== shrine) return
    const key = placementKey(walk.met)
    if (!routes.has(key)) routes.set(key, walk.met)
  })
  return [...routes.values()]
}

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

/** What the board already holds, so a branch drawn later neither stands on nor crosses it. */
type Occupied = {
  /** Cells holding a mirror: a beam crossing one turns, so no other route may pass through. */
  mirrors: Set<string>
  /** Cells a beam already runs through: a mirror standing on one would deflect it. */
  crossed: Set<string>
  /** Cells that end a beam — the disc, and a shrine. */
  terminal: Set<string>
}

type Branch = { path: CellRef[]; bends: MirrorPlacement[]; shrine: CellRef }

/**
 * A route from the fork to the edge `finalDir` faces, bending `bends` times. Every cell it crosses is clear
 * of what the board already holds, so the two branches can only ever meet at the fork.
 */
const drawBranch = (
  size: number,
  fork: CellRef,
  leaving: Direction,
  bends: number,
  finalDir: Direction,
  taken: Occupied,
  random: () => number
): Branch | undefined => {
  const crossable = (at: CellRef, placed: readonly MirrorPlacement[]): boolean =>
    !taken.mirrors.has(cellKey(at)) &&
    !taken.terminal.has(cellKey(at)) &&
    !placed.some(mirror => sameCell(mirror.at, at))

  const standable = (at: CellRef, path: readonly CellRef[], placed: readonly MirrorPlacement[]): boolean =>
    crossable(at, placed) && !taken.crossed.has(cellKey(at)) && !path.some(cell => sameCell(cell, at))

  const walk = (
    from: CellRef,
    travel: Direction,
    left: number,
    path: CellRef[],
    placed: MirrorPlacement[]
  ): Branch | undefined => {
    if (left === 0) {
      if (travel !== finalDir) return undefined
      const run: CellRef[] = []
      for (let at = stepCell(from, travel); insideGrid(size, at); at = stepCell(at, travel)) run.push(at)
      if (run.length < MIN_LEG) return undefined
      const shrine = run[run.length - 1]
      if (run.slice(0, -1).some(at => !crossable(at, placed))) return undefined
      // A shrine ends any beam that reaches it, so it has to stand as clear as a mirror does.
      if (!standable(shrine, path, placed)) return undefined
      return { path: [...path, ...run], bends: placed, shrine }
    }
    const reach = stepsToEdge(size, from, travel)
    const lengths = Array.from({ length: Math.max(0, reach - MIN_LEG + 1) }, (_, index) => MIN_LEG + index)
    for (const length of shuffle(lengths, random)) {
      const leg: CellRef[] = []
      let at = from
      for (let made = 0; made < length; made++) {
        at = stepCell(at, travel)
        leg.push(at)
      }
      const bendAt = leg[leg.length - 1]
      if (leg.slice(0, -1).some(cell => !crossable(cell, placed))) continue
      if (!standable(bendAt, path, placed)) continue
      for (const exit of shuffle(perpendicular(travel), random)) {
        const angle = angleFor(travel, exit)
        if (angle === undefined) continue
        const found = walk(bendAt, exit, left - 1, [...path, ...leg], [...placed, { at: bendAt, angle }])
        if (found) return found
      }
    }
    return undefined
  }

  return walk(fork, leaving, bends, [], [])
}

/** The disc sits on an edge facing in, never a corner: a corner leaves the first leg one way to go. */
const drawSun = (size: number, random: () => number): { at: CellRef; facing: Direction } => {
  const along = 1 + Math.floor(random() * (size - 2))
  // Both edges it may sit on leave the east and north edges ahead of the beam, so either shrine is
  // reachable from the fork.
  return random() < 0.5
    ? { at: { row: size - 1, col: along }, facing: DIR.up }
    : { at: { row: along, col: 0 }, facing: DIR.right }
}

/** How many bends a branch needs: each one flips the beam between across-the-board and up it. */
const bendsFor = (wanted: number, leaving: Direction, finalDir: Direction): number => {
  const odd = axisOf(leaving) !== axisOf(finalDir) ? 1 : 0
  return wanted % 2 === odd ? wanted : wanted + 1
}

/**
 * The settings a board may open in: dark, and dark still after one mirror is turned, and after every mirror
 * is. Without that last clause "turn everything once" is a solution the player reaches by fiddling — the
 * exploit `openingIsHonest` guards in the lightbeam family.
 */
const honestOpenings = (board: WitnessBoard): number[] => {
  const count = board.grid.mirrors.length
  const lit: boolean[] = []
  eachSetting(count, angles => lit.push(traceWitnessBeam(board, angles).shrine !== undefined))
  const every = 2 ** count - 1
  return lit.flatMap((isLit, setting) =>
    isLit ||
    lit[setting ^ every] ||
    Array.from({ length: count }, (_, mirror) => setting ^ (1 << mirror)).some(one => lit[one])
      ? []
      : [setting]
  )
}

const byReadingOrder = (a: CellRef, b: CellRef): number => a.row - b.row || a.col - b.col

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

  const openings = honestOpenings(board)
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
