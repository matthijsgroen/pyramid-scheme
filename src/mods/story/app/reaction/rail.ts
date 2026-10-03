import { use, useCallback } from "react"
import { registerReactionContribution, type Reaction } from "@/app/reactions/reactionContributions"
import { isModEnabled } from "@/mods/registeredMods"
import { FezContext } from "@/app/fez/context"
import { beatFor } from "@/mods/story/game/reaction/beatFor"

/**
 * The reaction rail: Fez remarking on how the player played, rather than on where they are.
 *
 * Arrivals fire on a door; these fire on a move, and the whole of the judgement about which moves
 * deserve one is `beatFor`. The offer is unconditional because it does not need to be conditional:
 * a conversation the player has already heard is skipped by the companion, so a trigger that keeps
 * happening still only speaks once.
 *
 * Told as story, so the tutorials toggle cannot silence it — a player who turns tutorials off is
 * asking to stop being taught, not to stop being talked to.
 */
export const useStoryReactions = () => {
  const fez = use(FezContext)
  return useCallback(
    (reaction: Reaction) => {
      const beat = beatFor(reaction)
      if (beat) fez.showConversation(beat, undefined, { story: true })
    },
    [fez]
  )
}

// Gated on the mod: story off → nothing registers → core reports its reactions into an empty room.
if (isModEnabled("story")) registerReactionContribution(useStoryReactions)
