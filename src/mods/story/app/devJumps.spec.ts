import { describe, expect, it } from "vitest"
import "@/mods/registerModApps"
import { assemblePlayedFloor } from "@/app/SiteMap/useAssembledFloor"
import { findByAddress, floorOfAddress } from "@/app/SiteMap/cellIdentity"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { STORY_ROOMS, storyRoomPlace } from "../game/storyRooms"

describe("a develop-mode jump to an authored story room", () => {
  it("stands the explorer on that room in the floor play carves", () => {
    const missed: string[] = []
    const unplaced: string[] = []
    for (const room of STORY_ROOMS) {
      const sites = generatedWorldConfigs[room.journeyId] ?? []
      const { levelNr, address } = storyRoomPlace(room, sites)
      if (!address) {
        unplaced.push(room.label)
        continue
      }
      const floor = floorOfAddress(address)
      const carved = assemblePlayedFloor(room.journeyId, sites[levelNr - 1][floor], 0, floor, levelNr - 1)
      const at = carved.success ? findByAddress(carved.grid, floor, address) : null
      const cell = carved.success && at ? carved.grid.cells[at[0]][at[1]] : undefined
      if (cell?.type !== "room" || cell.family !== room.encounter) missed.push(`${room.label}: ${address}`)
    }
    expect(missed).toEqual([])
    // The meeting room is authored by the opening's first task; the jump falls back to the entrance until then.
    expect(unplaced).toEqual(["Jump: Fez meeting"])
  })
})
