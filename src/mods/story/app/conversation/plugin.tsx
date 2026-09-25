/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { use, useEffect } from "react"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { CONVERSATION_META } from "@/mods/story/game/conversation/meta"
import { FezContext } from "@/app/fez/context"

/** What a conversation room is authored with: which scene plays when the player walks in. */
export type ConversationArgs = { conversation: string }

const conversationOf = (encounterArgs: unknown): string =>
  typeof encounterArgs === "object" && encounterArgs !== null && "conversation" in encounterArgs
    ? String((encounterArgs as ConversationArgs).conversation)
    : ""

// A beat standing in a room. The scene itself is translations — `tomb.starter.1.ipi` and the rest —
// played through the companion overlay, so a ghost costs keys and a portrait rather than a screen.
//
// Told as story, so the tutorials toggle cannot silence it, and REPLAYED on every visit: a player
// who walks back into the room hears it again rather than finding a person standing there with
// nothing to say. Closes through onCancel, never onSolved — a beat is read, not solved, and
// resolving would hand over rewards the room was never given.
const ConversationComponent: FamilyPlugin["Component"] = ({ ctx, journeys, onCancel }) => {
  const fez = use(FezContext)
  const conversation = conversationOf(ctx.encounterArgs)

  useEffect(() => {
    if (!conversation) return onCancel()
    fez.showConversation(conversation, () => onCancel(), { story: true, forceReplay: true })
  }, [conversation, fez, onCancel])

  // Reaching it is the whole encounter, so the room counts as explored on arrival and the corridors
  // past it open whether the player listens to the end or taps through.
  useEffect(() => {
    journeys.markCellExplored(ctx.sectionHash, ctx.edgeId, ctx.address)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per room instance
  }, [ctx.edgeId])

  return null
}

// Gated on the mod: story off → no plugin in the registry → a story-tagged room resolves through
// the family-absence pass-through (SiteMapScreen) and the floor is walkable without the beat.
if (isModEnabled("story"))
  registerFamily({
    meta: CONVERSATION_META,
    generate: () => ({}),
    Component: ConversationComponent,
  })
