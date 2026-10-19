import { describe, expect, it } from "vitest"
import "@/mods/registerModApps"
import { applyExplored, assemblePlayedFloor } from "@/app/SiteMap/useAssembledFloor"
import {
  findByAddress,
  floorOfAddress,
  isPlaceAddress,
  keyOfAddress,
  sectionOfAddress,
} from "@/app/SiteMap/cellIdentity"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { walkableFrom } from "@/game/gridNavigation"
import { persistentInteriorSeed } from "@/game/siteSeed"
import { STORY_ROOMS, storyRoomPlace } from "../game/storyRooms"
import { storyRoomLanding } from "./devJumps"

const carve = (journeyId: string, levelNr: number, floor: number) => {
  const sites = generatedWorldConfigs[journeyId] ?? []
  const carved = assemblePlayedFloor(
    journeyId,
    sites[levelNr - 1][floor],
    persistentInteriorSeed(journeyId) + levelNr,
    floor,
    levelNr - 1
  )
  if (!carved.success) throw new Error(`${journeyId} level ${levelNr} floor ${floor} does not carve`)
  return carved.grid
}

describe("a develop-mode jump to an authored story room", () => {
  it.each(STORY_ROOMS.map(room => [room.label, room] as const))(
    "%s stands the explorer on explored ground one step from the room, which is walkable",
    (_label, room) => {
      const { levelNr, address: roomAddress } = storyRoomPlace(room, generatedWorldConfigs[room.journeyId] ?? [])
      expect(roomAddress).not.toBeNull()
      const landing = storyRoomLanding(room)
      expect(landing.levelNr).toBe(levelNr)
      expect(landing.address).not.toBeNull()
      expect(isPlaceAddress(landing.address!)).toBe(false)

      const floor = floorOfAddress(roomAddress)
      const grid = carve(room.journeyId, levelNr, floor)
      const roomAt = findByAddress(grid, floor, roomAddress!)!
      expect(grid.cells[roomAt[0]][roomAt[1]]).toMatchObject({ type: "room", family: room.encounter })
      const standAt = findByAddress(grid, floor, landing.address!)!
      expect(Math.abs(standAt[0] - roomAt[0]) + Math.abs(standAt[1] - roomAt[1])).toBe(1)

      const explored = applyExplored(grid, floor, {
        [sectionOfAddress(landing.address!)]: [keyOfAddress(landing.address!)],
      })
      expect(explored.cells[roomAt[0]][roomAt[1]]).not.toMatchObject({ state: "completed" })
      expect(walkableFrom(explored, standAt).has(`${roomAt[0]},${roomAt[1]}`)).toBe(true)
    }
  )
})
