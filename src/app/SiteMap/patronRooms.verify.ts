import { describe, expect, it } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import { TOPOLOGY_ON } from "@/game/testSupport/modOff"
import { allFloors, resolveKeyRequirements } from "./worldFloors.testing"
import "@/mods/registerModApps"

// A DEDICATED SITE SHOWS ITS GOD ON EVERY FLOOR: a pyramid floor of a patron's journey gives one chamber of its own
// ground to the god, before any activity room (themed-rooms.md §2), so a temple of Bastet never has a floor without
// her. A ward pocket of another rank does not count: it is dressed in that rank, where the god has no likeness.
describe("the shipped world's patron floors", () => {
  const missing: string[] = []
  let checked = 0
  for (const floor of allFloors()) {
    // A tomb's cave runs puzzle to puzzle with no chamber to give: pyramids only.
    if (floor.config.patron === undefined || floor.journeyId.includes("_treasure_tomb")) continue
    const result = assembleFloor(floor.journeyId, floor.config, floor.seed, TOPOLOGY_ON.resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId: floor.journeyId, levelIndex: floor.levelIndex, floorIndex: floor.floorIndex },
    })
    if (!result.success) continue
    checked++
    const own = result.grid.cells
      .flat()
      .some(cell => cell.type === "room" && cell.patronRoom === true && cell.difficulty === floor.config.difficulty)
    if (!own) missing.push(floor.label)
  }

  it("are asked of the patron journeys' floors", () => expect(checked).toBeGreaterThan(0))

  it("each give the god a room on their own ground", () => expect(missing).toEqual([]))
})
