import type { ReplaysAt } from "@/app/SiteMap/roomReplays"
import { useGameStorage } from "@/support/useGameStorage"
import { CONVERSATION_META } from "@/mods/story/game/conversation/meta"
import { playsAgain } from "@/mods/story/game/conversation/revisits"
import { sceneOfRoom } from "@/mods/story/game/conversation/sceneFor"

/**
 * A finished conversation room whose scene plays whole again (`playsAgain`). A ghost's room is not one: it
 * answers with a line, and the ghost standing there already says somebody is in it.
 */
export const conversationReplaysAt =
  (journeyId: string, heard: Readonly<Record<string, boolean>>): ReplaysAt =>
  cell => {
    if (cell.family !== CONVERSATION_META.id || cell.state !== "completed") return false
    const scene = sceneOfRoom(journeyId, cell.encounterArgs)
    return !!scene && playsAgain(scene, heard)
  }

/** The story mod's contribution to the map: which conversation rooms offer their scene again. */
export const useConversationReplays = (journeyId: string): ReplaysAt => {
  const [heard] = useGameStorage<Record<string, boolean>>("conversations", {})
  return conversationReplaysAt(journeyId, heard)
}
