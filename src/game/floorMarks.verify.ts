import { describe, expect, it } from "vitest"
import { MARK_FLOORS, searchCarvingSeeds } from "./testSupport/markFloors"

describe("the seeds floorMarks.spec.ts carves at", () => {
  it.each(MARK_FLOORS.map(floor => [floor.name, floor] as const))("%s: are the seeds the search finds", (_, floor) => {
    expect(searchCarvingSeeds(floor)).toEqual(floor.carvingSeeds)
  })
})
