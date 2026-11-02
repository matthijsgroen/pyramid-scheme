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
    await expect(
      JSON.stringify(digests, null, 2) + "\n",
      "A starter floor carves differently than src/data/starterCarve.json records. A save names a corridor cell by its order on the floor, so once starter is released this moves players: update the file only together with a save migration."
    ).toMatchFileSnapshot("../../data/starterCarve.json")
  })
})
