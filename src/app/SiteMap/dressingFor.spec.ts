import { describe, expect, it } from "vitest"
import type { Direction, GridCell } from "@/game/siteTypes"
import { floorFrom } from "./floorFixtures.testing"
import { dressingFor } from "./SiteMapView"
import { maskHiddenCells } from "./useAssembledFloor"

const floor = floorFrom(["   R   ", "   .   ", "E..Ghh R", "   .   ", "   R   "], {
  G: (dirs: Direction[]): GridCell => ({
    type: "room",
    roomType: "fork",
    dirs: new Set(dirs),
    state: "fogged",
    decoration: "basin",
    decorationFallback: "jarRack",
  }),
  h: (dirs: Direction[]): GridCell => ({ type: "corridor", dirs: new Set(dirs), state: "fogged", hidden: true }),
})

describe("where a floor's props and scatter stand", () => {
  it("stays put when a hidden passage beside the room is masked", () => {
    const masked = maskHiddenCells(floor, new Set()).masked
    const shown = dressingFor(floor)
    const hidden = dressingFor(masked, floor)
    expect([...hidden.claims.decorationAt]).toEqual([...shown.claims.decorationAt])
    for (const [key, kind] of hidden.scatter) expect(shown.scatter.get(key)).toBe(kind)
  })

  it("lays no scatter on a masked passage", () => {
    const masked = maskHiddenCells(floor, new Set()).masked
    expect([...dressingFor(masked, floor).scatter.keys()].filter(key => ["2,4", "2,5"].includes(key))).toEqual([])
  })
})
