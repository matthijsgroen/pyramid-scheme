import { describe, expect, it } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { journeys } from "@/data/journeys"
import { carvedFloorDigest } from "@/data/tierFingerprints"
import { allFloors, resolveKeyRequirements, type Floor } from "./worldFloors.testing"
import type { FloorGrid } from "@/game/siteTypes"

const starterFloors = (): Floor[] =>
  allFloors().filter(floor => journeys.find(j => j.id === floor.journeyId)?.difficulty === "starter")

const assembled = (floor: Floor): FloorGrid => {
  const result = assembleFloor(floor.journeyId, floor.config, floor.seed, resolveEncounter, {
    resolveKeyRequirements,
    floorRef: { journeyId: floor.journeyId, levelIndex: floor.levelIndex, floorIndex: floor.floorIndex },
  })
  if (!result.success) throw new Error(`${floor.label} cannot be assembled: ${JSON.stringify(result.reasons)}`)
  return result.grid
}

describe("starter's carved floors", () => {
  it("are carved exactly as recorded, floor by floor", async () => {
    const digests = Object.fromEntries(starterFloors().map(f => [f.label, carvedFloorDigest(assembled(f))]))
    expect(Object.keys(digests).length).toBeGreaterThan(5)
    await expect(JSON.stringify(digests, null, 2) + "\n").toMatchFileSnapshot("../../data/starterCarve.json")
  }, 60_000)
})

describe("carvedFloorDigest", () => {
  const grid = (dirs: Set<string>): FloorGrid =>
    ({
      rows: 1,
      cols: 3,
      cells: [[{ type: "empty" }, { type: "corridor", dirs: new Set(["e"]) }, { type: "corridor", dirs }]],
    }) as unknown as FloorGrid

  it("tells two grids apart by a cell's dirs alone", () => {
    expect(carvedFloorDigest(grid(new Set(["w"])))).not.toBe(carvedFloorDigest(grid(new Set(["w", "n"]))))
    expect(carvedFloorDigest(grid(new Set(["w", "n"])))).toBe(carvedFloorDigest(grid(new Set(["n", "w"]))))
  })
})
