import { describe, expect, it } from "vitest"
import type { FloorGrid, GridCell } from "../siteTypes"
import { duplicateSlot } from "./validate"

const puzzle = (sectionAddress: string): GridCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(),
  state: "fogged",
  sectionAddress,
  sectionHash: sectionAddress,
  legacySectionHash: sectionAddress,
  pathIndex: 0,
})

const gridOf = (cells: GridCell[]): FloorGrid => ({
  cells: [cells],
  rows: 1,
  cols: cells.length,
  entrancePos: [0, 9],
  exitPos: [0, 9],
  siteId: "site",
  staircases: {},
})

describe("duplicateSlot", () => {
  it("fails the floor outright on two rooms of one section under one name", () => {
    expect(duplicateSlot(gridOf([puzzle("s0"), puzzle("s0")]))).toEqual({
      fatal: [{ type: "duplicateCellSlot", slot: "s0/p0" }],
    })
  })

  it("lets two sections each have a room under the same name", () => {
    expect(duplicateSlot(gridOf([puzzle("s0"), puzzle("s1")]))).toBeUndefined()
  })
})
