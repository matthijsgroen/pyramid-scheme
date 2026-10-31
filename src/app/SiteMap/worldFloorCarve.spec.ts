import { describe, expect, it } from "vitest"
import { persistentInteriorSeed } from "@/game/siteSeed"
import type { AssemblerResult } from "@/game/siteTypes"
import { onRouteSluiceFloor } from "@/game/testSupport/regionBarrierFixtures"
import { worldFloorCarve } from "@/mods/carveWorldFloor"
import { assemblePlayedFloor } from "./useAssembledFloor"
import "@/mods/registerModApps"

// An address whose journey the board deal knows; the floor carved at it is made up.
const JOURNEY = "starter_1"

/** A carve without the board each room draws: the bake leaves that deal to the baked world. */
const withoutBoards = (result: AssemblerResult) => {
  if (!result.success) throw new Error(`did not carve: ${JSON.stringify(result.reasons)}`)
  return JSON.parse(
    JSON.stringify(result.grid, (key, value: unknown) =>
      key === "boardIndex" ? undefined : value instanceof Set ? [...value].sort() : value
    )
  ) as unknown
}

describe(worldFloorCarve, () => {
  it("carves a floor with a region barrier to the grid play carves", () => {
    for (const [levelNr, floorIndex] of [
      [1, 0],
      [2, 1],
      [3, 0],
    ]) {
      const config = onRouteSluiceFloor()
      const baked = worldFloorCarve(JOURNEY, levelNr, floorIndex).carve(config)
      const played = assemblePlayedFloor(
        JOURNEY,
        config,
        persistentInteriorSeed(JOURNEY) + levelNr,
        floorIndex,
        levelNr - 1
      )
      expect(withoutBoards(baked)).toEqual(withoutBoards(played))
    }
  })
})
