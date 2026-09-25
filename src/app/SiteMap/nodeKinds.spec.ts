import { describe, expect, it } from "vitest"
import type { Direction, FloorGrid, RoomCell } from "@/game/siteTypes"
import { isLockedGate, shapeKindFor } from "./nodeKinds"

const grid = {
  cells: [[{ type: "empty" }]],
  rows: 1,
  cols: 1,
  entrancePos: [0, 0],
  exitPos: [0, 0],
  siteId: "hand-built",
  staircases: {},
} as unknown as FloorGrid

describe("what shape a room draws as", () => {
  it("draws a bare junction as a junction", () => {
    expect(shapeKindFor(grid, 1, 1, "fork", undefined, undefined)).toBe("fork")
  })

  // A switch carries a puzzle, and a player who cannot see that before walking on has no way to know
  // the junction asks anything of them.
  it("draws a junction carrying an encounter as that encounter", () => {
    expect(shapeKindFor(grid, 1, 1, "fork", ["puzzle"], undefined)).toBe("puzzle")
    expect(shapeKindFor(grid, 1, 1, "fork", ["trap"], undefined)).toBe("trap")
  })

  // The way a switch shuts holds no encounter at all, and is drawn and read by nothing but its tags
  // and the key it wants.
  it("draws a gate that holds nothing as a gate, and reads it locked until its key is held", () => {
    const shut: RoomCell = {
      type: "room",
      roomType: "encounter",
      dirs: new Set<Direction>(["w", "e"]),
      state: "reachable",
      tags: ["gate"],
      requiredKeyId: "switch:site#0#0#0:main",
      gateVariant: "floor-key",
      keyIsAuthored: true,
    }

    expect(shapeKindFor(grid, 1, 1, shut.roomType, shut.tags, shut.stairId)).toBe("gate")
    expect(isLockedGate(shut, new Set())).toBe(true)
    expect(isLockedGate(shut, new Set(["switch:site#0#0#0:main"]))).toBe(false)
  })

  it("still reads the entrance and a stairhead off the grid", () => {
    expect(shapeKindFor(grid, 0, 0, "portal", undefined, undefined)).toBe("entrance")
    expect(shapeKindFor(grid, 1, 1, "portal", undefined, "s1")).toBe("stairhead")
  })
})
