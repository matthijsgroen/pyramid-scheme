import { describe, expect, it } from "vitest"
import type { Direction, FloorGrid, GridCell, RoomCell } from "@/game/siteTypes"
import { registerFamily } from "@/app/families/familyRegistry"
import "@/mods/registerModApps"
import { isLockedGate, shapeKindFor } from "./nodeKinds"
import { buildRoomClaims } from "./roomClaims"

const grid = {
  cells: [[{ type: "empty" }]],
  rows: 1,
  cols: 1,
  entrancePos: [0, 0],
  exitPos: [0, 0],
  siteId: "hand-built",
  staircases: {},
} as unknown as FloorGrid

// Which family stands in a junction is never core's business, so the one asked about here belongs to
// no mod — it is registered for the sole purpose of the registry having an answer about it.
const BOARD_FAMILY = "junction-board"
registerFamily({
  meta: { id: BOARD_FAMILY, ownerMod: "test", tags: ["puzzle"], icon: "", color: "", rewardPriority: 0 },
  generate: () => null,
  Component: () => null,
})

describe("what shape a room draws as", () => {
  it("draws a bare junction as a junction", () => {
    expect(shapeKindFor(grid, 1, 1, { roomType: "fork" })).toBe("fork")
  })

  // A junction that carries a board asks something of the player before a way on opens, and one drawn
  // as the plain puzzle room is indistinguishable both from a room that merely holds a puzzle and —
  // since a re-enterable room wears no ✓ and takes no dim — from a room nobody has ever walked into.
  it("draws a junction carrying a board as a junction that divides", () => {
    expect(shapeKindFor(grid, 1, 1, { roomType: "fork", family: BOARD_FAMILY, tags: ["puzzle"] })).toBe("switch")
  })

  it("draws a junction carrying a board of any tag the same way", () => {
    expect(shapeKindFor(grid, 1, 1, { roomType: "fork", family: BOARD_FAMILY, tags: ["trap"] })).toBe("switch")
  })

  it("draws a junction whose mod is switched off as a bare junction", () => {
    expect(shapeKindFor(grid, 1, 1, { roomType: "fork", family: "no-mod-registers-this", tags: ["puzzle"] })).toBe(
      "fork"
    )
  })

  it("still draws an ordinary room carrying that same board as a puzzle", () => {
    expect(shapeKindFor(grid, 1, 1, { roomType: "encounter", family: BOARD_FAMILY, tags: ["puzzle"] })).toBe("puzzle")
  })

  // A handle stands as an ordinary "encounter" room, not a "fork" — it is a lever to pull, not a
  // junction — so it needs its own tag-driven branch rather than riding the fork/family one above.
  it("calls a room standing a lever a handle, not a puzzle", () => {
    expect(shapeKindFor(grid, 1, 1, { roomType: "encounter", tags: ["handle"], family: "handle" })).toBe("handle")
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

    expect(shapeKindFor(grid, 1, 1, shut)).toBe("gate")
    expect(isLockedGate(shut, new Set())).toBe(true)
    expect(isLockedGate(shut, new Set(["switch:site#0#0#0:main"]))).toBe(false)
  })

  it("still reads the entrance and a stairhead off the grid", () => {
    expect(shapeKindFor(grid, 0, 0, { roomType: "portal" })).toBe("entrance")
    expect(shapeKindFor(grid, 1, 1, { roomType: "portal", stairId: "s1" })).toBe("stairhead")
  })
})

// A junction's footprint is its ROOM TYPE's, not its marker's: `canClaimVoid` asks the type, and a
// junction that draws as something else would otherwise stop absorbing the void it stands in and
// shrink to a single cell.
describe("what a junction's footprint takes", () => {
  const empty: GridCell = { type: "empty" }
  const floorAround = (junction: GridCell): FloorGrid => ({
    cells: [
      [empty, { type: "corridor", dirs: new Set<Direction>(["s"]), state: "completed" }, empty],
      [empty, junction, empty],
      [empty, empty, empty],
    ],
    rows: 3,
    cols: 3,
    entrancePos: [0, 1],
    exitPos: [2, 1],
    siteId: "junction-floor",
    staircases: {},
  })
  const claimsAround = (junction: GridCell) => [...buildRoomClaims(floorAround(junction)).claimedBy.entries()].sort()

  const bare: GridCell = { type: "room", roomType: "fork", dirs: new Set<Direction>(["n"]), state: "reachable" }
  const withBoard: GridCell = { ...bare, family: BOARD_FAMILY, tags: ["puzzle"] }

  it("takes the void around a bare junction", () => {
    expect(claimsAround(bare).length).toBeGreaterThan(0)
  })

  it("takes exactly the same cells for a junction carrying a board", () => {
    expect(claimsAround(withBoard)).toEqual(claimsAround(bare))
  })
})
