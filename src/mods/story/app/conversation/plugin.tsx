import { use, useEffect, useRef, useState } from "react"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { CONVERSATION_META } from "@/mods/story/game/conversation/meta"
import { FezContext } from "@/app/fez/context"
import { FEZ_MET_IN, sceneOfRoom } from "@/mods/story/game/conversation/sceneFor"
import { giftDue, sceneOnVisit } from "@/mods/story/game/conversation/revisits"
import { formulaGift, giftReward } from "@/mods/story/game/reading/formula"
import { RewardFlow } from "@/app/SiteMap/RewardFlow"
import type { PendingReward } from "@/app/SiteMap/useRewardOffer"
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
//
// A ghost that owes a gift gives it before any line (`giftDue`). The sign goes into the player's hands
// before the scene plays, so a scene broken off halfway plays again on the next visit and hands over
// nothing twice; after it, the reward screen says what was received.
export const ConversationComponent: FamilyPlugin["Component"] = ({ ctx, journeys, applyReward, onCancel }) => {
  const fez = use(FezContext)
  const scene = sceneOfRoom(ctx.journeyId, ctx.encounterArgs)
  const [heard, , loaded] = useGameStorage<Record<string, boolean>>("conversations", {})
  // Chosen once per visit: the save changes the moment the line is heard, and choosing again then would
  // play the next state's line straight after.
  const asked = useRef(false)
  const [received, setReceived] = useState<PendingReward | null>(null)

  useEffect(() => {
    if (!loaded || asked.current) return
    asked.current = true
    if (!scene) return onCancel()
    const gift = giftDue(scene, heard)
    if (!gift)
      return fez.showConversation(sceneOnVisit(scene, heard), () => onCancel(), { story: true, forceReplay: true })
    const reward = giftReward(gift)
    applyReward(reward)
    fez.showConversation(formulaGift(gift), () => setReceived({ reward, received: true, onCollect: () => {} }), {
      story: true,
      forceReplay: true,
    })
  }, [loaded, scene, heard, fez, onCancel, applyReward])

  // Reaching it is the whole encounter, so the room counts as explored on arrival and the corridors
  // past it open whether the player listens to the end or taps through.
  useEffect(() => {
    journeys.markCellExplored(ctx.address)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per room instance
  }, [ctx.edgeId])

  return <RewardFlow pendingReward={received} onDismiss={onCancel} />
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
