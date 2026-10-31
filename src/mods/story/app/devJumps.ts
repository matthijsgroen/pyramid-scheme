import { useMemo } from "react"
import { registerDevJumps } from "@/app/dev/devActionContributions"
import { useJourneys } from "@/app/state/useJourneys"
import { assemblePlayedFloor } from "@/app/SiteMap/useAssembledFloor"
import { cellAddress, findByAddress, floorOfAddress } from "@/app/SiteMap/cellIdentity"
import { encodeEdge } from "@/app/SiteMap/edgeId"
import { isModEnabled } from "@/mods/registeredMods"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { findPath, revealAll } from "@/game/gridNavigation"
import { roomPlaceOf } from "@/game/roomShape"
import { persistentInteriorSeed } from "@/game/siteSeed"
import { STORY_ROOMS, storyRoomPlace, type StoryRoom } from "../game/storyRooms"

export type StoryRoomLanding = {
  levelNr: number
  address: string | null
  walkedOnto?: { sectionHash: string; cellId: string }
}

const IN_ROOM = new Set<string | undefined>(["inner", "node"])

/**
 * Where a jump to `room` stands the explorer: on its doorstep, the corridor cell the walk from the floor's entrance
 * crosses last before the room (a designed room's door, its floor taking no tap), written down explored. A tap on
 * the room then walks in and plays it the way play does. Stood in the room itself he is on unexplored ground, which
 * nothing walks from; and marking the ROOM explored would read as solved and open the way past it.
 */
export const storyRoomLanding = (room: StoryRoom): StoryRoomLanding => {
  const sites = generatedWorldConfigs[room.journeyId] ?? []
  const { levelNr, address } = storyRoomPlace(room, sites)
  if (!address) return { levelNr, address }
  const floor = floorOfAddress(address)
  const carved = assemblePlayedFloor(
    room.journeyId,
    sites[levelNr - 1][floor],
    persistentInteriorSeed(room.journeyId) + levelNr,
    floor,
    levelNr - 1
  )
  const at = carved.success ? findByAddress(carved.grid, floor, address) : null
  if (!carved.success || !at) return { levelNr, address }
  const route = findPath(revealAll(carved.grid), carved.grid.entrancePos, at)
  const doorstep = route
    .slice(0, -1)
    .reverse()
    .find(([r, c]) => !IN_ROOM.has(roomPlaceOf(carved.grid, r, c)))
  const cell = doorstep && carved.grid.cells[doorstep[0]][doorstep[1]]
  const doorstepAddress = doorstep && cellAddress(carved.grid, floor, doorstep[0], doorstep[1])
  if (cell?.type !== "corridor" || !doorstepAddress) return { levelNr, address }
  return {
    levelNr,
    address: doorstepAddress,
    walkedOnto: { sectionHash: cell.sectionHash ?? "", cellId: encodeEdge(floor, doorstep[0], doorstep[1]) },
  }
}

const useStoryJumps = () => {
  const { enterAt } = useJourneys()
  return useMemo(
    () =>
      STORY_ROOMS.map(room => ({
        label: room.label,
        jump: () => {
          const { levelNr, address, walkedOnto } = storyRoomLanding(room)
          return enterAt(room.journeyId, levelNr, address, walkedOnto)
        },
      })),
    [enterAt]
  )
}

if (isModEnabled("story")) registerDevJumps(useStoryJumps)
