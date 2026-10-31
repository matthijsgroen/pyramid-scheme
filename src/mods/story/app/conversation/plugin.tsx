import { use, useEffect, useRef } from "react"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { CONVERSATION_META } from "@/mods/story/game/conversation/meta"
import { FezContext } from "@/app/fez/context"
import { FEZ_MET_IN, sceneOfRoom } from "@/mods/story/game/conversation/sceneFor"
import { sceneOnVisit } from "@/mods/story/game/conversation/revisits"
import { registerFezMeeting } from "@/app/fez/fezMeeting"
import { useGameStorage } from "@/support/useGameStorage"
import { registerRoomOccupants } from "@/app/SiteMap/roomOccupants"
import { registerRoomReplays } from "@/app/SiteMap/roomReplays"
import { registerRoomArrivals } from "@/app/SiteMap/roomArrivals"
import { useConversationArrivals } from "./arrivals"
import { useGhostOccupants } from "./ghostOccupants"
import { useConversationReplays } from "./replays"

export type { ConversationArgs } from "@/mods/story/game/conversation/sceneFor"

// A beat standing in a room. The scene itself is translations — `tomb.starter.1.ipi` and the rest —
// played through the companion overlay, so a ghost costs keys and a portrait rather than a screen.
//
// Told as story, so the tutorials toggle cannot silence it. The whole scene plays until it has been
// heard; after that, walking back in plays ONE line for where the story stands (`revisits.ts`) — a
// person standing there with something to say, not the scene again. A scene nobody wrote such a line for
// plays whole again, offered on the map as a replay (replays.ts). Closes through onCancel, never
// onSolved — a beat is read, not solved, and resolving would hand over rewards the room was never given.
export const ConversationComponent: FamilyPlugin["Component"] = ({ ctx, journeys, onCancel }) => {
  const fez = use(FezContext)
  const scene = sceneOfRoom(ctx.journeyId, ctx.encounterArgs)
  const [heard, , loaded] = useGameStorage<Record<string, boolean>>("conversations", {})
  // Chosen once per visit: the save changes the moment the line is heard, and choosing again then would
  // play the next state's line straight after.
  const asked = useRef(false)

  useEffect(() => {
    if (!loaded || asked.current) return
    asked.current = true
    if (!scene) return onCancel()
    fez.showConversation(sceneOnVisit(scene, heard), () => onCancel(), { story: true, forceReplay: true })
  }, [loaded, scene, heard, fez, onCancel])

  // Reaching it is the whole encounter, so the room counts as explored on arrival and the corridors
  // past it open whether the player listens to the end or taps through.
  useEffect(() => {
    journeys.markCellExplored(ctx.sectionHash, ctx.edgeId, ctx.address)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per room instance
  }, [ctx.edgeId])

  return null
}

// Gated on the mod: story off → no plugin in the registry → a story-tagged room resolves through
// the family-absence pass-through (SiteMapScreen) and the floor is walkable without the beat — and
// nobody stands in it.
if (isModEnabled("story")) {
  // Until this room has been heard Fez says nothing: the explorer starts out alone.
  registerFezMeeting({ conversation: `meeting.${FEZ_MET_IN}`, journeyId: FEZ_MET_IN })
  registerFamily({
    meta: CONVERSATION_META,
    generate: () => ({}),
    Component: ConversationComponent,
  })
  registerRoomOccupants(useGhostOccupants)
  registerRoomReplays(useConversationReplays)
  registerRoomArrivals(useConversationArrivals)
}
