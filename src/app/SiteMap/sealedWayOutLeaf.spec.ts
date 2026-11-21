import { describe, expect, it } from "vitest"
import { nodeSpritesFor } from "./SiteMapView"
import { buildRoomClaims } from "./roomClaims"
import { CELL, SIDE_W, cellLeft } from "./mapScale"
import type { Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import "@/mods/registerModApps"

const KEY = "switch:test:s1"

const corridor = (dirs: Direction[], extra: Partial<GridCell> = {}): GridCell =>
  ({ type: "corridor", dirs: new Set(dirs), state: "completed", ...extra }) as GridCell

// entrance ─ fork ─ doorway ─ beyond: the doorway is where a switch's way out stands, one cell in from the node.
const floorWith = (doorway: GridCell): FloorGrid => ({
  cells: [
    [
      corridor(["e"]),
      { type: "room", roomType: "fork", dirs: new Set<Direction>(["w", "e"]), state: "completed" },
      doorway,
      corridor(["w"], { state: "reachable" }),
    ],
  ],
  rows: 1,
  cols: 4,
  entrancePos: [0, 0],
  exitPos: [0, 0],
  siteId: "test",
  staircases: {},
})

const shutWayOut: GridCell = {
  type: "room",
  roomType: "encounter",
  tags: ["gate"],
  requiredKeyId: KEY,
  dirs: new Set<Direction>(["w", "e"]),
  state: "reachable",
}
const openWayOut = corridor(["w", "e"], { openGate: { requiredKeyId: KEY } } as Partial<GridCell>)

const leafAt = (grid: FloorGrid, key: string) =>
  nodeSpritesFor(grid, buildRoomClaims(grid), "junior").find(sprite => sprite.key === key)

describe("a way out a switch shut", () => {
  it("hangs its shut leaf on the outer seam, away from the fork it stands beside", () => {
    const leaf = leafAt(floorWith(shutWayOut), "wall:0,2")
    expect(leaf?.x).toBe(cellLeft(2) + CELL + SIDE_W / 2 - CELL / 2)
  })

  it("hangs its shut leaf exactly where the open door hangs", () => {
    const shut = leafAt(floorWith(shutWayOut), "wall:0,2")
    const open = leafAt(floorWith(openWayOut), "gate:0,2")
    expect(open).toBeDefined()
    expect({ x: shut?.x, y: shut?.y }).toEqual({ x: open?.x, y: open?.y })
  })
})

describe("a passage no mod paints", () => {
  it("hangs its stand-in leaf on the seam toward the cell the walk halts on", () => {
    const passage: GridCell = { ...shutWayOut, passage: { realisation: "lava" } } as GridCell
    const leaf = leafAt(floorWith(passage), "wall:0,2")
    expect(leaf?.x).toBe(cellLeft(2) - SIDE_W / 2 - CELL / 2)
  })
})
