import { describe, expect, it } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import { TOPOLOGY_ON } from "@/game/testSupport/modOff"
import { allFloors, resolveKeyRequirements } from "./worldFloors.testing"
import { maskHiddenCells } from "./useAssembledFloor"
import "@/mods/registerModApps"

// THE PLAYER ARRIVES SOMEWHERE THEY CAN LEAVE, on every floor of the shipped world as a player without the corridor
// detector sees it: hidden paths masked, the entrance still a room with a way out. A hidden path hung off the
// entrance once turned it into a corridor, and the floor could not be left.
describe("the shipped world's entrances with every hidden path masked", () => {
  const stuck: string[] = []
  let checked = 0
  for (const floor of allFloors()) {
    const result = assembleFloor(floor.journeyId, floor.config, floor.seed, TOPOLOGY_ON.resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId: floor.journeyId, levelIndex: floor.levelIndex, floorIndex: floor.floorIndex },
    })
    if (!result.success) continue
    checked++
    const { masked } = maskHiddenCells(result.grid, new Set())
    const [r, c] = masked.entrancePos
    const entrance = masked.cells[r][c]
    if (entrance.type !== "room" || entrance.dirs.size === 0) stuck.push(`${floor.label}: entrance is ${entrance.type}`)
  }

  it("are asked of many floors", () => expect(checked).toBeGreaterThan(200))

  it("are each a room with a way out", () => expect(stuck).toEqual([]))
})
