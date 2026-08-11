import { describe, expect, it } from "vitest"
import { floorKeyRing } from "./floorKeys"
import type { CellState, Direction, FloorGrid, GridCell, KeyColor } from "./siteTypes"

const noDirs = new Set<Direction>()

const keyChest = (keyId: string, colors: KeyColor[], state: CellState): GridCell => ({
  type: "room",
  roomType: "encounter",
  dirs: noDirs,
  state,
  reward: { type: "tombKey", keyId },
  ...(colors.length === 1 ? { keyColor: colors[0] } : { keyColors: colors }),
})

const door = (requiredKeyId: string, color: KeyColor, state: CellState): GridCell => ({
  type: "room",
  roomType: "encounter",
  dirs: noDirs,
  state,
  gateVariant: "floor-key",
  keyColor: color,
  requiredKeyId,
})

const gridOf = (cells: GridCell[]): FloorGrid => ({
  siteId: "test",
  rows: 1,
  cols: cells.length,
  entrancePos: [0, 0],
  exitPos: [0, cells.length - 1],
  staircases: {},
  cells: [cells],
})

describe(floorKeyRing, () => {
  it("reports a colour as held once its key chest is opened, not while it still stands closed", () => {
    const closed = gridOf([keyChest("k1", ["blue"], "reachable"), door("k1", "blue", "reachable")])
    expect(floorKeyRing(closed, new Set())).toEqual({ held: [], needed: ["blue"] })

    const opened = gridOf([keyChest("k1", ["blue"], "completed"), door("k1", "blue", "reachable")])
    expect(floorKeyRing(opened, new Set(["k1"]))).toEqual({ held: ["blue"], needed: [] })
  })

  it("lists every colour a multi-key chest carries", () => {
    const grid = gridOf([
      keyChest("k1", ["red", "green"], "completed"),
      door("k1", "red", "reachable"),
      door("k1", "green", "reachable"),
    ])
    expect(floorKeyRing(grid, new Set(["k1"]))).toEqual({ held: ["red", "green"], needed: [] })
  })

  it("keeps a fogged door's colour secret — it would spoil layout the player hasn't found", () => {
    const grid = gridOf([keyChest("k1", ["purple"], "reachable"), door("k1", "purple", "fogged")])
    expect(floorKeyRing(grid, new Set())).toEqual({ held: [], needed: [] })
  })

  it("a colour in hand outranks another door still shut in the same colour", () => {
    const grid = gridOf([
      keyChest("k1", ["yellow"], "completed"),
      door("k1", "yellow", "reachable"),
      // A second yellow door wanting a different key — same hue, so the ring shows it as held, not
      // as both held and needed.
      door("k2", "yellow", "reachable"),
    ])
    expect(floorKeyRing(grid, new Set(["k1"]))).toEqual({ held: ["yellow"], needed: [] })
  })

  it("ignores ward (tomb-key) doors — those keys come from tombs, not from this floor", () => {
    const grid = gridOf([
      {
        type: "room",
        roomType: "encounter",
        dirs: noDirs,
        state: "reachable",
        gateVariant: "tomb-key",
        requiredKeyId: "starter_a_1",
      },
    ])
    expect(floorKeyRing(grid, new Set())).toEqual({ held: [], needed: [] })
  })

  it("lists colours in a fixed order regardless of where they sit on the floor", () => {
    const grid = gridOf([
      keyChest("k1", ["purple"], "completed"),
      keyChest("k2", ["red"], "completed"),
      keyChest("k3", ["blue"], "completed"),
    ])
    expect(floorKeyRing(grid, new Set(["k1", "k2", "k3"])).held).toEqual(["blue", "red", "purple"])
  })

  it("a treasure chest with no key colour is not a key host", () => {
    const grid = gridOf([
      {
        type: "room",
        roomType: "encounter",
        dirs: noDirs,
        state: "completed",
        reward: { type: "tombKey", keyId: "starter_a_1" },
      },
    ])
    expect(floorKeyRing(grid, new Set(["starter_a_1"]))).toEqual({ held: [], needed: [] })
  })
})
