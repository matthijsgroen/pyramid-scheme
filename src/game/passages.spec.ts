import { describe, expect, it } from "vitest"
import { openWaysOut } from "./mechanismDoors"
import { headingOf, passageCrossing, passageSides, withPassages } from "./passages"
import type { CorridorCell, Direction, FloorGrid, GridCell, RoomCell } from "./siteTypes"

const KEY = "obstacle:spec#0#0:crack"
const ground = (dirs: Direction[]): CorridorCell => ({ type: "corridor", dirs: new Set(dirs), state: "reachable" })
const door = (dirs: Direction[], more: Partial<RoomCell> = {}): RoomCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(dirs),
  state: "reachable",
  tags: ["gate"],
  requiredKeyId: KEY,
  ...more,
})
const gridOf = (cells: GridCell[][]): FloorGrid => ({
  cells,
  rows: cells.length,
  cols: cells[0].length,
  entrancePos: [0, 0],
  exitPos: [cells.length - 1, cells[0].length - 1],
  siteId: "spec",
  staircases: {},
})
const CRACK_AT = { passage: { realisation: "narrowPassage" } }
const bare = gridOf([[ground(["e"]), door(["w", "e"]), ground(["w"])]])
const straight = gridOf([[ground(["e"]), door(["w", "e"], CRACK_AT), ground(["w"])]])
const corner = gridOf([
  [door(["e", "s"], CRACK_AT), ground(["w"])],
  [ground(["n"]), { type: "empty" }],
])

describe("withPassages", () => {
  it("dresses the door whose key it names, and moves nothing else", () => {
    const dressed = withPassages(bare, new Map([[KEY, "narrowPassage"]]))
    expect(dressed.cells[0][1]).toEqual({ ...bare.cells[0][1], passage: { realisation: "narrowPassage" } })
    expect(dressed.cells[0][0]).toBe(bare.cells[0][0])
    expect(dressed.cells[0][2]).toBe(bare.cells[0][2])
  })

  it("hands back the very grid when it names no door on it", () => {
    expect(withPassages(bare, new Map([["obstacle:spec#0#0:other", "narrowPassage"]]))).toBe(bare)
    expect(withPassages(bare, new Map())).toBe(bare)
  })
})

describe("passageSides", () => {
  it("reads the two cells a straight passage joins off its own ways", () => {
    expect(passageSides(straight, 0, 1)).toEqual([
      [0, 0],
      [0, 2],
    ])
  })

  it("reads them at a corner too", () => {
    expect(passageSides(corner, 0, 0)).toEqual([
      [0, 1],
      [1, 0],
    ])
  })

  it("says nothing of a cell that is no passage", () => {
    expect(passageSides(bare, 0, 1)).toBeUndefined()
    expect(passageSides(straight, 0, 0)).toBeUndefined()
  })
})

describe("passageCrossing", () => {
  it("starts on the side the explorer can stand on, through the wall's cell, to the other", () => {
    expect(passageCrossing(straight, 0, 1, (r, c) => r === 0 && c === 2)).toEqual({
      near: [0, 2],
      via: [0, 1],
      far: [0, 0],
      realisation: "narrowPassage",
    })
  })

  it("starts on the first side where he can stand on both", () => {
    expect(passageCrossing(straight, 0, 1, () => true)?.near).toEqual([0, 0])
  })

  it("starts on the nearer side where he can stand on both", () => {
    expect(
      passageCrossing(
        straight,
        0,
        1,
        () => true,
        (_r, c) => (c === 2 ? 1 : 5)
      )?.near
    ).toEqual([0, 2])
    expect(
      passageCrossing(
        straight,
        0,
        1,
        () => true,
        () => 3
      )?.near
    ).toEqual([0, 0])
  })

  it("squeezes away from the side he starts on, toward the other", () => {
    const crossing = passageCrossing(
      straight,
      0,
      1,
      () => true,
      (_r, c) => (c === 2 ? 1 : 5)
    )!
    expect(crossing.far).toEqual([0, 0])
    expect(headingOf(crossing.via, crossing.far)).toBe("w")
  })

  it("is no crossing where he can stand on neither side", () => {
    expect(passageCrossing(straight, 0, 1, () => false)).toBeUndefined()
  })
})

describe("headingOf", () => {
  it.each([
    [[1, 1], [0, 1], "n"],
    [[1, 1], [2, 1], "s"],
    [[1, 1], [1, 2], "e"],
    [[1, 1], [1, 0], "w"],
  ] as const)("goes from %j to %j heading %s", (from, to, dir) => {
    expect(headingOf(from, to)).toBe(dir)
  })
})

describe("an open passage", () => {
  it("stays a door, so no walk ever stands in it", () => {
    const opened = openWaysOut(straight, new Set([KEY]))
    expect(opened.cells[0][1]).toEqual(straight.cells[0][1])
  })
})
