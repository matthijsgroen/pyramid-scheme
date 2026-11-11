import type { OpensOnArrival } from "@/app/SiteMap/roomArrivals"
import { useGameStorage } from "@/support/useGameStorage"
import { CONVERSATION_META } from "@/mods/story/game/conversation/meta"
import { sceneOfRoom } from "@/mods/story/game/conversation/sceneFor"
import { giftDue } from "@/mods/story/game/conversation/revisits"

/** A conversation room whose scene has not been heard plays it the moment the player walks in, however often the
 * room was walked through before — and so does one whose ghost owes a gift, which the player came back for; otherwise
 * a heard room offers its revisit line behind the prompt. */
export const conversationOpensAt =
  (journeyId: string, heard: Readonly<Record<string, boolean>>): OpensOnArrival =>
  cell => {
    if (cell.family !== CONVERSATION_META.id) return false
    const scene = sceneOfRoom(journeyId, cell.encounterArgs)
    return !!scene && (heard[scene] !== true || giftDue(scene, heard) !== undefined)
  }

const opensNone: OpensOnArrival = () => false

/** The story mod's contribution to the map. Until the save has loaded no room is taken for unheard. */
export const useConversationArrivals = (journeyId: string): OpensOnArrival => {
  const [heard, , loaded] = useGameStorage<Record<string, boolean>>("conversations", {})
  return loaded ? conversationOpensAt(journeyId, heard) : opensNone
}
