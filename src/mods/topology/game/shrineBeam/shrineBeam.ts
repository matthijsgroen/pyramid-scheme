// A board of mirrors with shrines standing on it, and the routes a beam takes over it. Shared by every
// family whose puzzle is "steer the light to one of these", so the physics, the uniqueness search and
// the anti-fiddle check have one home rather than one per family.

import { shuffle } from "@/game/random"
import {
  angleFor,
  axisOf,
  cellKey,
  insideGrid,
  MIN_LEG,
  perpendicular,
  reflect,
  sameCell,
  stepCell,
  stepsToEdge,
  TURN_ANGLES,
  type CellRef,
  type Direction,
  type MirrorAngle,
} from "@/mods/core/game/beam/physics"

/** A mirror standing on a cell at an angle — one entry of the player's answer. */
export type MirrorPlacement = { at: CellRef; angle: MirrorAngle }

/** One cell of beam: the way in, and the way out where it leaves at all. What the room draws. */
export type BeamSegment = { at: CellRef; enter: Direction; exit?: Direction }

export type ShrineGrid = {
  size: number
  /** Where the light comes from, and which way it leaves. The disc absorbs anything that hits it. */
  sun: { at: CellRef; facing: Direction }
  /** The cells that hold a mirror, in reading order. The player turns each between `/` and `\`. */
  mirrors: CellRef[]
  /** The angle each mirror stands at when the room opens, in `mirrors` order. */
  initial: MirrorAngle[]
}

/**
 * Where the light goes, and which mirrors it turns at on the way, naming the shrine it lands on by its
 * index in `shrines`. The whole of a board's physics: a generator's verifier and a room's win check both
 * ask this and nothing else.
 */
export const traceBeam = (
  grid: ShrineGrid,
  shrines: readonly CellRef[],
  angles: readonly MirrorAngle[]
): { shrine?: number; met: MirrorPlacement[]; path: BeamSegment[] } => {
  const { size, sun, mirrors } = grid
  const mirrorAt = new Map(mirrors.map((at, index) => [cellKey(at), index]))
  const met: MirrorPlacement[] = []
  const path: BeamSegment[] = []
  let travel = sun.facing
  let at = stepCell(sun.at, travel)
  // One step per (cell, direction) the beam could be in. A guard against a hang, not a game state: a beam
  // leaving the disc can never join a ring, because reflection is reversible and the disc absorbs.
  for (let steps = 4 * size * size; steps > 0; steps--) {
    if (!insideGrid(size, at)) return { met, path }
    const enter = travel
    const shrine = shrines.findIndex(candidate => sameCell(candidate, at))
    if (shrine !== -1) {
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
export const settingFor = (count: number, n: number): MirrorAngle[] =>
  Array.from({ length: count }, (_, index) => TURN_ANGLES[(n >> index) & 1])

/** Every setting of a board's mirrors, in odometer order. */
export const eachSetting = (count: number, visit: (angles: MirrorAngle[]) => void): void => {
  for (let n = 0; n < 2 ** count; n++) visit(settingFor(count, n))
}

export const placementKey = (placement: readonly MirrorPlacement[]): string =>
  placement.map(mirror => `${cellKey(mirror.at)}:${mirror.angle}`).join(" ")

/**
 * Every route that lands the beam on the shrine at `shrine`, as the mirrors that route turns at. A mirror
 * the beam never reaches is not part of the answer, so its two settings are one route rather than two —
 * the board must never call a legitimate answer wrong (docs/game-design/PUZZLE_FAMILIES.md).
 */
export const routesTo = (grid: ShrineGrid, shrines: readonly CellRef[], shrine: number): MirrorPlacement[][] => {
  const routes = new Map<string, MirrorPlacement[]>()
  eachSetting(grid.mirrors.length, angles => {
    const walk = traceBeam(grid, shrines, angles)
    if (walk.shrine !== shrine) return
    const key = placementKey(walk.met)
    if (!routes.has(key)) routes.set(key, walk.met)
  })
  return [...routes.values()]
}

/**
 * The settings a board may open in: dark, and dark still after one mirror is turned, and after every mirror
 * is. Without that last clause "turn everything once" is a solution the player reaches by fiddling — the
 * exploit `openingIsHonest` guards in the lightbeam family.
 */
export const honestOpenings = (grid: ShrineGrid, shrines: readonly CellRef[]): number[] => {
  const count = grid.mirrors.length
  const lit: boolean[] = []
  eachSetting(count, angles => lit.push(traceBeam(grid, shrines, angles).shrine !== undefined))
  const every = 2 ** count - 1
  return lit.flatMap((isLit, setting) =>
    isLit ||
    lit[setting ^ every] ||
    Array.from({ length: count }, (_, mirror) => setting ^ (1 << mirror)).some(one => lit[one])
      ? []
      : [setting]
  )
}

/** What a board already holds, so a branch drawn later neither stands on nor crosses it. */
export type Occupied = {
  /** Cells holding a mirror: a beam crossing one turns, so no other route may pass through. */
  mirrors: Set<string>
  /** Cells a beam already runs through: a mirror standing on one would deflect it. */
  crossed: Set<string>
  /** Cells that end a beam — the disc, and a shrine. */
  terminal: Set<string>
}

export type Branch = { path: CellRef[]; bends: MirrorPlacement[]; shrine: CellRef }

/**
 * A route from `fork` to the edge `finalDir` faces, bending `bends` times. Every cell it crosses is clear
 * of what the board already holds, so two branches can only ever meet where they were routed from.
 */
export const drawBranch = (
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

/** How many bends a branch needs: each one flips the beam between across-the-board and up it. */
export const bendsFor = (wanted: number, leaving: Direction, finalDir: Direction): number => {
  const odd = axisOf(leaving) !== axisOf(finalDir) ? 1 : 0
  return wanted % 2 === odd ? wanted : wanted + 1
}

export const byReadingOrder = (a: CellRef, b: CellRef): number => a.row - b.row || a.col - b.col
