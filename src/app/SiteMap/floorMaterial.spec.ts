import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor } from "@/game/siteAssembler"
import { revealAll } from "@/game/gridNavigation"
import { buildRoomClaims, tileRegionsFor } from "./SiteMapView"
import { ALL_STATES } from "./tileRegions"

// A floor is not all one tier. starter_1's ward-chest teasers are authored at junior on purpose
// (spec/starter.ts), so its first floor is starter stone with a junior pocket gated behind a junior
// key — and walking through that gate has to say so, in the material.
const starterFloorOne = () => {
  const floor = generatedWorldConfigs["starter_1"]?.flat()[0]
  if (!floor) throw new Error("no starter_1 floor to read")
  const result = assembleFloor("starter_1:0", floor, 7)
  if (!result.success) throw new Error("assembly failed")
  return result.grid
}

describe("a floor is built of the tiers its sections were authored at", () => {
  it("carries a tier on every cell it draws, corridors included", () => {
    const grid = starterFloorOne()
    const tiers = new Set<string>()
    let untiered = 0

    for (const row of grid.cells) {
      for (const cell of row) {
        if (cell.type === "empty") continue
        if (cell.difficulty) tiers.add(cell.difficulty)
        else untiered++
      }
    }

    // A corridor used to carry no tier at all, so a passage into a junior pocket had no way to say
    // which stone it was cut through.
    expect(untiered).toBe(0)
    expect([...tiers].sort()).toEqual(["junior", "starter"])
  })

  it("gives the gated pocket its own stone, rooms as well as corridors", () => {
    // Revealed, because regions only cover what the map draws: on a fresh floor the junior pocket is
    // still dark, and dark is not a material.
    const grid = revealAll(starterFloorOne())
    const regions = tileRegionsFor(grid, buildRoomClaims(grid))

    expect([...regions.keys()].sort()).toEqual(["junior", "starter"])

    const junior = regions.get("junior")!
    const rects = (part: Record<string, unknown[]>) => ALL_STATES.flatMap(state => part[state] ?? [])
    // Both, and the rooms are the half that was missing: only encounter rooms carry a difficulty of
    // their own, so a treasure room inside the junior pocket came out built of starter limestone.
    expect(rects(junior.floorCorridor).length).toBeGreaterThan(0)
    expect(rects(junior.floorRoom).length).toBeGreaterThan(0)
  })
})
