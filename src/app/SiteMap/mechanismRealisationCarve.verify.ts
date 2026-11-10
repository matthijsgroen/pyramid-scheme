import { describe, expect, it } from "vitest"
import "@/mods/registerModApps"
import { REALISATION_FLOORS, sweepRealisations } from "./realisationFloors.testing"

describe("the seeds mechanismRealisationCarve.spec.ts carves at", () => {
  it.each(REALISATION_FLOORS.map(floor => [floor.name, floor] as const))(
    "%s: are the seeds the sweep finds, and no seed of it is refused by only some realisations",
    (_, floor) => {
      const { carving, refused, mixed } = sweepRealisations(floor)
      expect(mixed).toEqual([])
      expect(carving).toEqual(floor.carvingSeeds)
      if (floor.refusedSeed !== undefined) expect(refused).toContain(floor.refusedSeed)
    }
  )
})
