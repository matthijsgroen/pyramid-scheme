import { describe, expect, it } from "vitest"
import { FLOOR_KINDS, scatterFor } from "./floorScatter"
import { buildRoomClaims } from "./SiteMapView"
import type { CellState, Direction, FloorGrid, GridCell } from "@/game/siteTypes"

const state: CellState = "completed"
const empty: GridCell = { type: "empty" }
const corridor = (dirs: Direction[]): GridCell => ({ type: "corridor", dirs: new Set(dirs), state })
/** A dead-end treasure chamber: the `treasure` tag and a single exit are what make it CLAIM the cells
 * around it, which is what a footprint is (see canClaimVoid). */
const chamber: GridCell = {
  type: "room",
  roomType: "encounter",
  family: "treasure-chest",
  tags: ["treasure"],
  dirs: new Set<Direction>(["n"]),
  state,
}

const plumbing = { entrancePos: [0, 2] as const, exitPos: [4, 2] as const, staircases: {} }

/** A corridor running down the middle into a chamber at the bottom, with void either side for the
 * chamber to claim — so the floor has both a real footprint and a run of passage. */
const floor = (siteId: string): FloorGrid => ({
  ...plumbing,
  siteId,
  rows: 6,
  cols: 5,
  cells: [
    [empty, empty, corridor(["s"]), empty, empty],
    [empty, empty, corridor(["n", "s"]), empty, empty],
    [empty, empty, corridor(["n", "s"]), empty, empty],
    [empty, empty, corridor(["n", "s"]), empty, empty],
    [empty, empty, chamber, empty, empty],
    [empty, empty, empty, empty, empty],
  ],
})

const scatterOn = (siteId: string) => {
  const grid = floor(siteId)
  return { grid, claims: buildRoomClaims(grid), scatter: scatterFor(grid, buildRoomClaims(grid)) }
}

describe("floor scatter", () => {
  it("dresses a chamber on its own floor", () => {
    // The bug this exists for: a chamber's footprint is made of CLAIMED cells, which are `empty` in the
    // grid. Walking the grid for rooms and corridors cannot see them, and 8% of the world's chambers
    // had any scatter on them at all.
    const { claims, scatter } = scatterOn("starter_1:0")
    const footprint = [...claims.claimedBy.keys()]
    expect(footprint.length).toBeGreaterThan(0)
    expect(footprint.filter(key => scatter.has(key)).length).toBeGreaterThan(0)
  })

  it("leaves the room's own cell and its prop's cell clear", () => {
    // The owner cell carries the room's icon and one claim carries its prop; dressing lies around what
    // the room is FOR, not on top of it.
    for (const siteId of Array.from({ length: 40 }, (_, i) => `site_${i}:0`)) {
      const { claims, scatter } = scatterOn(siteId)
      for (const ownerKey of new Set(claims.claimedBy.values())) expect(scatter.has(ownerKey)).toBe(false)
      for (const key of claims.decorationAt.keys()) expect(scatter.has(key)).toBe(false)
    }
  })

  it("strews the passages with ground and never with furnishing", () => {
    // A mat is furnishing: it belongs in a room someone lived in, not in a corridor.
    let groundInCorridor = 0
    for (const siteId of Array.from({ length: 40 }, (_, i) => `passage_${i}:0`)) {
      const { grid, claims, scatter } = scatterOn(siteId)
      for (const [key, kind] of scatter) {
        const [r, c] = key.split(",").map(Number)
        if (grid.cells[r][c].type !== "corridor" || claims.claimedBy.has(key)) continue
        groundInCorridor++
        expect(kind).not.toBe("mat")
      }
    }
    expect(groundInCorridor).toBeGreaterThan(0)
  })

  it("lands in the same places every time it is asked", () => {
    // The whole point of hashing the floor's id: a drift of sand that moved between two draws would
    // read as something happening.
    expect([...scatterOn("starter_1:0").scatter]).toEqual([...scatterOn("starter_1:0").scatter])
  })

  it("lands somewhere else on a different floor", () => {
    expect([...scatterOn("starter_2:0").scatter]).not.toEqual([...scatterOn("starter_1:0").scatter])
  })

  it("draws everything it places on the floor layer rather than as a prop", () => {
    // FLOOR_KINDS is what `Decoration` checks, so a kind the scatter layer places and Decoration also
    // draws would appear twice on one floor.
    for (const kind of scatterOn("master_2:0").scatter.values()) expect(FLOOR_KINDS.has(kind)).toBe(true)
  })

  it("has nothing to strew on a floor with neither chamber nor passage", () => {
    const bare: FloorGrid = {
      ...plumbing,
      siteId: "x",
      rows: 2,
      cols: 2,
      cells: [
        [empty, empty],
        [empty, empty],
      ],
    }
    expect(scatterFor(bare, buildRoomClaims(bare)).size).toBe(0)
  })
})
