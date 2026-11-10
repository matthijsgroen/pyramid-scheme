import { describe, expect, it } from "vitest"
import "@/mods/registerModApps"
import { journeys as allJourneys } from "@/data/journeys"
import { getFamilyPlugin, resolveEncounter } from "@/app/families/familyRegistry"
import { boardIndexesForFloor } from "./boardIndexes"
import { assembleFloor } from "@/game/siteAssembler"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import type { FloorConfig } from "@/game/siteTypes"
import { REALISATION_FLOORS, carveRealisations, wallsOf } from "./realisationFloors.testing"

// Each floor is carved at the seeds its sweep found (mechanismRealisationCarve.verify.ts holds that the sweep still
// finds them, and that no seed of it is refused by some realisations and carved by others).
describe("no encounter moves a wall", () => {
  it.each(REALISATION_FLOORS.map(floor => [floor.name, floor] as const))(
    "%s: every cell keeps its walls whichever realisation its controls take",
    (name, { config, carvingSeeds }) => {
      for (const seed of carvingSeeds) {
        const grids = carveRealisations(name, config, seed)
        expect(
          grids.every(grid => grid !== undefined),
          `${name} seed ${seed}: every realisation carves`
        ).toBe(true)
        const walls = grids.map(grid => wallsOf(grid!))
        for (const each of walls) expect(each, `${name} seed ${seed}`).toBe(walls[0])
      }
    },
    600_000
  )

  it.each(REALISATION_FLOORS.flatMap(floor => (floor.refusedSeed === undefined ? [] : [[floor.name, floor] as const])))(
    "%s: a seed one realisation refuses, every realisation refuses",
    (name, { config, refusedSeed }) => {
      expect(carveRealisations(name, config, refusedSeed!).every(grid => grid === undefined)).toBe(true)
    }
  )

  it("the plain switch of the shipped junior_2 pyramid 2 keeps its walls whichever board realises it", () => {
    const config = allJourneys.find(j => j.id === "junior_2")!.siteConfigs![1][0] as FloorConfig
    const walls = ["lightbeamSwitch", "handle"].map(encounter => {
      const result = assembleFloor(
        "junior_2",
        { ...config, switches: { ...config.switches!, encounter } },
        floorAssemblySeed(persistentInteriorSeed("junior_2"), 2, 0),
        resolveEncounter,
        {
          resolveKeyRequirements: (familyId, ctx) => getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx),
          floorRef: { journeyId: "junior_2", levelIndex: 1, floorIndex: 0 },
          resolveBoardIndex: boardIndexesForFloor("junior_2", 1, 0),
        }
      )
      if (!result.success) throw new Error("junior_2 floor refused")
      return wallsOf(result.grid)
    })
    expect(walls[1]).toBe(walls[0])
  })
})
