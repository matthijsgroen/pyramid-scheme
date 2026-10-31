import { use, useEffect, useRef } from "react"
import { FezContext } from "@/app/fez/context"
import { useHeldKeysLoaded, useMergedHeldKeys } from "@/app/SiteMap/keyProviders"
import { boughtBeats } from "@/mods/story/game/reaction/animalBeats"
import { STORY_BEATS } from "@/mods/story/game/reaction/storyBeats"
import { latestGameValue } from "@/support/useGameStorage"

// Beats offered this session. The rail's hook is mounted by more than one component at a time, and each of them
// sees the same purchase, so the first to offer a beat is the only one.
const offered = new Set<string>()

/**
 * Fez says a purchase is bought the moment its fact joins the held keys. Facts held when the keys are first
 * read are not purchases made now, so they say nothing. A beat Fez could not say (not met yet) is not offered
 * again, since the fact does not appear twice.
 */
export const useAnimalPurchaseBeats = () => {
  const { showConversation } = use(FezContext)
  const held = useMergedHeldKeys()
  const loaded = useHeldKeysLoaded()
  const previous = useRef<ReadonlySet<string> | null>(null)

  useEffect(() => {
    if (!loaded) return
    const before = previous.current
    previous.current = held
    if (!before) return
    const heard = latestGameValue<Record<string, boolean>>("conversations") ?? {}
    const beat = boughtBeats(before, held).find(id => STORY_BEATS.has(id) && !heard[id] && !offered.has(id))
    if (!beat) return
    offered.add(beat)
    showConversation(beat, undefined, { story: true })
  }, [held, loaded, showConversation])
}
