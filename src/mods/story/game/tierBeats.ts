import type { Difficulty } from "@/data/difficultyLevels"
import { ALL_SCENES } from "./log/heardScenes"
import { ON_LEAVING } from "./reaction/beatFor"
import { STORY_BEATS } from "./reaction/storyBeats"

/** What the tier's floors held that a beat is told for. */
export type TierBeatFacts = { hiddenCorridor: boolean; campFind: boolean }

const capitalised = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

/**
 * Every beat a player who finished `tier` has heard: each scene of the tier's journeys, the afterword of a tomb
 * left behind, the bond beat the tier's unaided solves earn, the chapter that opened the tier, and the moments of
 * coming home and of finding something the tier's floors gave. Only declared beats, as the rail plays only those.
 */
export const beatsHeardFinishing = (
  tier: Difficulty,
  journeyIds: readonly string[],
  facts: TierBeatFacts
): string[] => {
  const inTier = new Set(journeyIds)
  const scenes = ALL_SCENES.filter(scene => inTier.has(scene.journeyId)).flatMap(scene => scene.parts)
  const rail = [
    ...journeyIds.map(id => ON_LEAVING[id]),
    `bond.${tier}`,
    `camp.chapter${capitalised(tier)}`,
    "camp.firstHome",
    "camp.homeHaul",
    facts.hiddenCorridor ? "discovery.hiddenCorridor" : undefined,
    facts.campFind ? "camp.firstFind" : undefined,
  ].filter((id): id is string => id !== undefined && STORY_BEATS.has(id))
  return [...scenes, ...rail]
}
