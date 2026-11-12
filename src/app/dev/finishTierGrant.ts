import { useMemo } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { journeys as journeyData } from "@/data/journeys"
import { assemblerFor } from "@/app/SiteMap/assemblerFor"
import { useClaimSilently } from "@/app/SiteMap/applyReward"
import { useMarkHeard } from "@/app/fez/useMarkHeard"
import { useInventory } from "@/app/Inventory/useInventory"
import { useJourneys } from "@/app/state/useJourneys"
import { useProgression } from "@/app/state/useProgression"
import { registerDevGrants } from "./devActionContributions"
import { finishTier } from "./finishTier"
import { useMergedTierFinish } from "./tierFinishContributions"

/** The tier the grant finishes, so the tier after it can be tested from its start. */
const FINISHED_TIER: Difficulty = "starter"

// Core's own lessons, told by the screens every journey passes through: heard by anyone who finished a tier.
const CORE_TUTORIALS = [
  "welcome",
  "pyramidIntro",
  "pyramidBlockedBlocks",
  "levelCompleted",
  "expeditionCompleted",
  "exitPillar",
]

const useFinishTierGrant = () => {
  const progression = useProgression()
  const inventory = useInventory()
  const journeys = useJourneys()
  const claim = useClaimSilently(progression, inventory)
  const finishParts = useMergedTierFinish()
  const markHeard = useMarkHeard()
  return useMemo(
    () => [
      {
        label: `Finish ${FINISHED_TIER}`,
        // It moves the save on rather than granting on top of it, so Unlock everything leaves it out.
        inUnlockEverything: false,
        grant: () => {
          const finished = finishTier({
            tier: FINISHED_TIER,
            journeys: journeyData,
            assemble: assemblerFor,
            progress: journeys,
            claim,
          })
          void markHeard(CORE_TUTORIALS)
          finishParts(finished)
        },
      },
    ],
    [journeys, claim, finishParts, markHeard]
  )
}

registerDevGrants(useFinishTierGrant)
