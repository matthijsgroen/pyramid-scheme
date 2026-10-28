import { describe, expect, it, vi } from "vitest"
import { walkFloorLock } from "../floorLockWalk"
import { roomDoors } from "../roomShape"
import {
  decorationFootprint,
  type CellRect,
  type DecorationKind,
  type Direction,
  type FloorGrid,
  type GridCell,
  type MechanismRecord,
  type PropFootprint,
  type RoomCell,
  type RoomType,
} from "../siteTypes"
import type { Lock } from "../lockAuthoring"
import { BINDING, carveLockFloor } from "../testSupport/lockFixtures"
import { assembleFloor } from "./assembleFloor"
import { plainFloor } from "./carveFixtures"
import { centreFallbacks, growRooms } from "./growRooms"

const BASIN: PropFootprint = { cols: 2, rows: 1, tall: 0, centre: true }
const LONG_BASIN: PropFootprint = { cols: 4, rows: 1, tall: 0, centre: true }
const SMALL_CENTRE: PropFootprint = { cols: 1, rows: 1, tall: 0, centre: true }
const STAND_INS: Partial<Record<DecorationKind, PropFootprint>> = {
  basin: BASIN,
  counter: LONG_BASIN,
  pillar: SMALL_CENTRE,
}
const footprintOf = (kind: DecorationKind): PropFootprint => STAND_INS[kind] ?? decorationFootprint(kind)

/** A plain fork in the entrance between two open arms; a lever in the left arm opens the way out. */
const branchLock = (): Lock => ({
  name: "branch",
  regions: { in: { takes: "free" }, left: { takes: "free" }, right: { takes: "free" }, out: { takes: "free" } },
  connections: [
    { between: ["in", "left"] },
    { between: ["in", "right"] },
    { between: ["in", "out"], barriers: ["in-out"] },
  ],
  gates: { "in-out": { from: "in", to: "out", owners: ["T"] } },
  mechanics: { T: { control: "toggle", in: "left", starts: "a", opens: { a: [], b: ["in-out"] } } },
  in: "in",
  out: "out",
})

const dirSet = (dirs: string) => new Set(dirs.split("") as Direction[])
const corridor = (dirs: string, extra: object = {}): GridCell => ({
  type: "corridor",
  dirs: dirSet(dirs),
  state: "fogged",
  ...extra,
})
const room = (roomType: RoomType, dirs: string, extra: Partial<RoomCell> = {}): GridCell => ({
  type: "room",
  roomType,
  dirs: dirSet(dirs),
  state: "fogged",
  ...extra,
})
const floorOf = (rows: number, cols: number, placed: Record<string, GridCell>): FloorGrid => ({
  cells: Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c): GridCell => placed[`${r},${c}`] ?? { type: "empty" })
  ),
  rows,
  cols,
  entrancePos: [-9, -9],
  exitPos: [-9, -9],
  siteId: "site",
  staircases: {},
})
/** A run of corridor cells along row `r` (or column `c`), each with `dirs`. */
const rowRun = (r: number, cols: number[], dirs = "ew") =>
  Object.fromEntries(cols.map(c => [`${r},${c}`, corridor(dirs)]))
const colRun = (c: number, rows: number[], dirs = "ns") =>
  Object.fromEntries(rows.map(r => [`${r},${c}`, corridor(dirs)]))

const roomAt = (grid: FloorGrid, r: number, c: number) => grid.cells[r][c] as RoomCell
const contains = (outer: CellRect, inner: CellRect) =>
  inner.top >= outer.top &&
  inner.left >= outer.left &&
  inner.top + inner.rows <= outer.top + outer.rows &&
  inner.left + inner.cols <= outer.left + outer.cols
const meets = (a: CellRect, b: CellRect) =>
  a.top < b.top + b.rows && b.top < a.top + a.rows && a.left < b.left + b.cols && b.left < a.left + a.cols
const ringed = ({ top, left, rows, cols }: CellRect): CellRect => ({
  top: top - 1,
  left: left - 1,
  rows: rows + 2,
  cols: cols + 2,
})

const verticalChamber = (cols = 9, extra: Record<string, GridCell> = {}) =>
  floorOf(5, cols, { ...colRun(4, [0, 1, 3, 4]), "2,4": room("chamber", "ns", { decoration: "basin" }), ...extra })
/** An east-west chamber at 2,4, its row a straight corridor with `at2` and `at6` the cells two steps off. */
const horizontalChamber = (at2: GridCell = corridor("ew"), at6: GridCell = corridor("ew")) =>
  floorOf(5, 9, {
    ...rowRun(2, [0, 1, 3, 5, 7, 8]),
    "2,2": at2,
    "2,6": at6,
    "2,4": room("chamber", "ew", { decoration: "basin", decorationFallback: "lamp" }),
  })

describe("growRooms", () => {
  it("grows a vertical pass-through chamber sideways to a 4×3 round its piece", () => {
    const { grownRoom } = roomAt(growRooms(verticalChamber(), "site", footprintOf), 2, 4)
    expect(grownRoom?.rect).toMatchObject({ top: 1, rows: 3, cols: 4 })
    const { rect, piece } = grownRoom!
    expect(piece).toEqual({ kind: "basin", top: rect.top + 1, left: rect.left + 1, rows: 1, cols: 2 })
    expect(contains(ringed(piece), rect) && contains(rect, ringed(piece))).toBe(true)
    expect(contains(rect, { top: 2, left: 4, rows: 1, cols: 1 })).toBe(true)
  })

  it("absorbs its own straight arm to widen along a horizontal corridor", () => {
    const grown = growRooms(horizontalChamber(), "site", footprintOf)
    const { rect } = roomAt(grown, 2, 4).grownRoom!
    expect(rect).toMatchObject({ top: 1, rows: 3, cols: 4 })
    const doors = roomDoors(grown, 2, 4)
    expect(doors).toEqual({ w: [2, rect.left], e: [2, rect.left + 3] })
    // The arm taking two cells takes the node two steps off, and leaves the room by it.
    expect([doors.w!, doors.e!].filter(([, c]) => c % 2 === 0)).toHaveLength(1)
  })

  it("changes no cell's type or dirs", () => {
    for (const grid of [verticalChamber(), horizontalChamber()]) {
      const grown = growRooms(grid, "site", footprintOf)
      const stripped = grown.cells.map(row =>
        row.map(cell => {
          if (cell.type !== "room") return cell
          const { grownRoom: _grownRoom, ...rest } = cell
          return rest
        })
      )
      expect(stripped).toEqual(grid.cells)
      expect(grown.cells).not.toEqual(grid.cells)
    }
  })

  it("never absorbs a corner, a room or a drop's run", () => {
    const blockers: Record<string, GridCell> = {
      corner: corridor("en"),
      room: room("encounter", "ew"),
      drop: corridor("ew", { obstacle: { dir: "e", kind: "zipline" } }),
    }
    for (const [name, blocker] of Object.entries(blockers)) {
      const grown = growRooms(horizontalChamber(blocker, blocker), "site", footprintOf)
      expect(roomAt(grown, 2, 4).grownRoom, name).toBeUndefined()
    }
  })

  it("never absorbs a hidden cell", () => {
    const hidden = corridor("ew", { hidden: true })
    expect(roomAt(growRooms(horizontalChamber(hidden, hidden), "site", footprintOf), 2, 4).grownRoom).toBeUndefined()
  })

  it("never meets another chamber's 3×3 or another grown room", () => {
    const eastChamber = { "2,8": room("chamber", "ns") }
    const pushedWest = growRooms(verticalChamber(13, eastChamber), "site", footprintOf)
    expect(roomAt(pushedWest, 2, 4).grownRoom?.rect.left).toBe(2)
    const boxedIn = growRooms(
      verticalChamber(13, { ...eastChamber, "2,0": room("chamber", "ns") }),
      "site",
      footprintOf
    )
    expect(roomAt(boxedIn, 2, 4).grownRoom).toBeUndefined()

    // Two long pieces whose 3×3s stand clear of each other, each held to one rect by a wall of stubs: only the
    // one grown first stands.
    const twoCounters = floorOf(5, 17, {
      ...colRun(3, [0, 1, 3, 4]),
      ...colRun(4, [0, 1, 3, 4]),
      "2,4": room("chamber", "ns", { decoration: "counter" }),
      ...colRun(13, [0, 1, 3, 4]),
      ...colRun(12, [0, 1, 3, 4]),
      "2,12": room("chamber", "ns", { decoration: "counter" }),
    })
    const grown = growRooms(twoCounters, "site", footprintOf)
    const rects = [roomAt(grown, 2, 4), roomAt(grown, 2, 12)].flatMap(cell =>
      cell.grownRoom ? [cell.grownRoom.rect] : []
    )
    expect(rects).toHaveLength(1)
    const alone = growRooms(
      {
        ...twoCounters,
        cells: twoCounters.cells.map((row, r) =>
          row.map((cell, c) => (r === 2 && c === 12 ? { type: "empty" as const } : cell))
        ),
      },
      "site",
      footprintOf
    )
    expect(meets(ringed(roomAt(alone, 2, 4).grownRoom!.rect), { top: 1, left: 7, rows: 3, cols: 6 })).toBe(true)
  })

  it("leaves a dead end, a portal and a mechanism room their size", () => {
    const mechanism: MechanismRecord = { states: ["rest", "a"], initial: "rest", returnsToInitial: true, positions: [] }
    const rooms: Record<string, GridCell> = {
      deadEnd: room("encounter", "n", { decoration: "basin", tags: ["treasure"] }),
      portal: room("portal", "ns", { decoration: "basin" }),
      forkSwitch: room("fork", "ns", { decoration: "basin", mechanism }),
      chamberMechanism: room("chamber", "ns", { decoration: "basin", mechanism }),
    }
    for (const [name, cell] of Object.entries(rooms)) {
      const grid = verticalChamber(9, { "2,4": cell })
      const grown = growRooms(grid, "site", footprintOf)
      expect(roomAt(grown, 2, 4).grownRoom, name).toBeUndefined()
      expect(grown, name).toBe(grid)
    }
  })

  it("falls back, keeping today's room, when no placement fits; centreFallbacks names it", () => {
    const grid = horizontalChamber(corridor("en"), corridor("ws"))
    const grown = growRooms(grid, "site", footprintOf)
    expect(roomAt(grown, 2, 4)).toEqual(roomAt(grid, 2, 4))
    expect(roomAt(grown, 2, 4).decorationFallback).toBe("lamp")
    expect(centreFallbacks(grown, footprintOf)).toEqual([{ at: "2,4", kind: "basin" }])
    expect(centreFallbacks(growRooms(horizontalChamber(), "site", footprintOf), footprintOf)).toEqual([])
  })

  it("grows the same rooms the same way on every run, drawing no rand()", () => {
    const random = vi.spyOn(Math, "random")
    const grids = [verticalChamber(), horizontalChamber()]
    const once = grids.map(grid => growRooms(grid, "site", footprintOf))
    const again = grids.map(grid => growRooms(grid, "site", footprintOf))
    expect(again).toEqual(once)
    expect(random).not.toHaveBeenCalled()
    random.mockRestore()
  })

  it("grows the rooms of the floor assembleFloor hands back", () => {
    const config = plainFloor({
      pathPuzzles: 3,
      decorations: ["pillar"],
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
    })
    const grids = [1, 2, 3, 4, 5, 6].flatMap(seed => {
      const result = assembleFloor("site", config, seed, undefined, { propFootprint: footprintOf })
      return result.success ? [result.grid] : []
    })
    const grown = grids.flatMap(grid => grid.cells.flat().filter(cell => cell.type === "room" && cell.grownRoom))
    expect(grown.length).toBeGreaterThan(0)
    for (const grid of grids) expect(growRooms(grid, "site", footprintOf)).toEqual(grid)
  })

  it("leaves a lock floor's walk exactly as it was", () => {
    // The fixture's pools dress nothing, so its forks and chambers are dressed with the stand-in here.
    const carved = carveLockFloor(branchLock(), BINDING)
    const grid: FloorGrid = {
      ...carved,
      cells: carved.cells.map(row =>
        row.map(cell =>
          cell.type === "room" && (cell.roomType === "fork" || cell.roomType === "chamber")
            ? { ...cell, decoration: "pillar" as const }
            : cell
        )
      ),
    }
    const grown = growRooms(grid, "test", footprintOf)
    expect(grown.cells.flat().some(cell => cell.type === "room" && cell.grownRoom)).toBe(true)
    expect(walkFloorLock(grown)).toEqual(walkFloorLock(grid))
  })
})
