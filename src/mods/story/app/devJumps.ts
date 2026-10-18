import { useMemo } from "react"
import { registerDevJumps } from "@/app/dev/devActionContributions"
import { useJourneys } from "@/app/state/useJourneys"
import { isModEnabled } from "@/mods/registeredMods"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { STORY_ROOMS, storyRoomPlace } from "../game/storyRooms"

const useStoryJumps = () => {
  const { enterAt } = useJourneys()
  return useMemo(
    () =>
      STORY_ROOMS.map(room => ({
        label: room.label,
        jump: () => {
          const { levelNr, address } = storyRoomPlace(room, generatedWorldConfigs[room.journeyId] ?? [])
          return enterAt(room.journeyId, levelNr, address)
        },
      })),
    [enterAt]
  )
}

if (isModEnabled("story")) registerDevJumps(useStoryJumps)
