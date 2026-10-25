import { use, useCallback } from "react"
import { registerReactionContribution, type Reaction } from "@/app/reactions/reactionContributions"
import { isModEnabled } from "@/mods/registeredMods"
import { FezContext } from "@/app/fez/context"
import { useMergedHeldKeys } from "@/app/SiteMap/keyProviders"
import { useMergedGateNeeds } from "@/app/pages/gateNeeds"
import { animalBeatsFor } from "@/mods/story/game/reaction/animalBeats"
import { beatsFor } from "@/mods/story/game/reaction/beatFor"
import { STORY_BEATS } from "@/mods/story/game/reaction/storyBeats"
import { useAnimalPurchaseBeats } from "./animalPurchases"
import { latestGameValue } from "@/support/useGameStorage"

/**
 * The reaction rail: Fez remarking on how the player played, rather than on where they are.
 *
 * Arrivals fire on a door; these fire on a move or a moment, and the whole of the judgement about
 * which deserve one is `beatsFor`. A moment offers the first of its candidates the player has not
 * heard — so it speaks once, never says two things, and a later candidate takes over once the
 * first is heard. A beat dropped because Fez is not met stays unheard and plays at the next such moment.
 *
 * The animal beats ride the same rail: they read the held keys and the gate needs the game already merges, and
 * come after the others, so a moment still says one thing. A purchase being bought is told as it happens
 * (useAnimalPurchaseBeats).
 *
 * Told as story, so the tutorials toggle cannot silence it — a player who turns tutorials off is
 * asking to stop being taught, not to stop being talked to.
 */
export const useStoryReactions = () => {
  const fez = use(FezContext)
  const held = useMergedHeldKeys()
  const { needs } = useMergedGateNeeds()
  useAnimalPurchaseBeats()
  return useCallback(
    (reaction: Reaction) => {
      // Read at the moment, not at render: a beat heard a moment ago is already in the save.
      const heard = latestGameValue<Record<string, boolean>>("conversations") ?? {}
      const beat = [...beatsFor(reaction), ...animalBeatsFor(reaction, { held, needsOn: needs }, STORY_BEATS)].find(
        id => !heard[id]
      )
      if (beat) fez.showConversation(beat, undefined, { story: true })
    },
    [fez, held, needs]
  )
}

// Gated on the mod: story off → nothing registers → core reports its reactions into an empty room.
if (isModEnabled("story")) registerReactionContribution(useStoryReactions)
