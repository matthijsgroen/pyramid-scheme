import type { ForkShape } from "@/game/forkShape"
import type { Direction as WayOut } from "@/game/siteTypes"
import { mod8, type CellRef, type Direction, type MirrorAngle } from "@/mods/core/game/beam/physics"
import { byReadingOrder, type ShrineGrid } from "../shrineBeam/shrineBeam"
import { CANONICAL_WAYS_OUT, type LightbeamSwitchBoard } from "./generateLightbeamSwitch"

// Turning a canonical board to face a real fork. A board is generated against one canonical set of ways
// out per shape, so the seed list that verifies boards offline holds one entry per (shape, tier, seed)
// rather than one per compass layout; the turn happens when the room opens.

/** How many quarter turns anticlockwise a board is laid down by. */
export type QuarterTurns = 0 | 1 | 2 | 3

export const QUARTER_TURNS = [0, 1, 2, 3] as const

/**
 * One quarter turn anticlockwise on a square grid whose rows run downward: the top edge becomes the left
 * edge, so a cell's row becomes its column.
 */
const turnCell = (size: number, at: CellRef, quarterTurns: QuarterTurns): CellRef => {
  let cell = at
  for (let turn = 0; turn < quarterTurns; turn++) cell = { row: size - 1 - cell.col, col: cell.row }
  return cell
}

/** A quarter turn is two steps of the eighth-turn direction encoding. */
const turnDirection = (direction: Direction, quarterTurns: QuarterTurns): Direction =>
  mod8(direction + 2 * quarterTurns)

/**
 * A mirror angle is twice the angle of the line it lies on, which is what makes `reflect` the single
 * subtraction `angle - travel`. So a quarter turn of the board is four steps of the angle, and
 * `reflect(angle + 4q, travel + 2q)` is `reflect(angle, travel) + 2q` — the beam leaves a turned mirror
 * along the turned direction, whatever the turn. `/` and `\` swap on an odd turn and stand still on an
 * even one, so the two settings a player can put a mirror in survive the turn as those same two.
 */
const turnAngle = (angle: MirrorAngle, quarterTurns: QuarterTurns): MirrorAngle => mod8(angle + 4 * quarterTurns)

const TURNED_WAY_OUT: Record<WayOut, WayOut> = { n: "w", w: "s", s: "e", e: "n" }

const turnWayOut = (way: WayOut, quarterTurns: QuarterTurns): WayOut => {
  let turned = way
  for (let turn = 0; turn < quarterTurns; turn++) turned = TURNED_WAY_OUT[turned]
  return turned
}

/**
 * The same board laid down `quarterTurns` anticlockwise: every cell about the grid centre, the disc's
 * facing and every mirror angle through the encoding, and each shrine's compass bearing to the one it now
 * points at. The beam behaves identically, so a turned board is the same puzzle facing a different fork.
 */
export const rotateBoard = (board: LightbeamSwitchBoard, quarterTurns: QuarterTurns): LightbeamSwitchBoard => {
  const { size, sun, mirrors, initial } = board.grid
  // Mirrors are held in reading order and their opening angles read by index, so the turned pairs are
  // sorted together rather than each list turned on its own.
  const turned = mirrors
    .map((at, index) => ({ at: turnCell(size, at, quarterTurns), angle: turnAngle(initial[index], quarterTurns) }))
    .sort((a, b) => byReadingOrder(a.at, b.at))
  const grid: ShrineGrid = {
    size,
    sun: { at: turnCell(size, sun.at, quarterTurns), facing: turnDirection(sun.facing, quarterTurns) },
    mirrors: turned.map(mirror => mirror.at),
    initial: turned.map(mirror => mirror.angle),
  }
  return {
    grid,
    shrines: board.shrines.map(shrine => ({
      canonicalDir: turnWayOut(shrine.canonicalDir, quarterTurns),
      at: turnCell(size, shrine.at, quarterTurns),
    })),
  }
}

const layoutKey = (ways: readonly WayOut[]): string => [...new Set(ways)].sort().join("")

/**
 * The turn that lays a `shape`'s board down facing `ways` — the real gated ways out of a fork — or
 * undefined where no turn does, which is a board built for another shape.
 *
 * A facing pair answers to two turns, so the lowest is taken: one fork must draw its switch the same way
 * on every visit, and the physics underneath cannot tell the two apart.
 */
export const quarterTurnsToFace = (shape: ForkShape, ways: readonly WayOut[]): QuarterTurns | undefined => {
  const wanted = layoutKey(ways)
  return QUARTER_TURNS.find(
    quarterTurns => layoutKey(CANONICAL_WAYS_OUT[shape].map(way => turnWayOut(way, quarterTurns))) === wanted
  )
}
