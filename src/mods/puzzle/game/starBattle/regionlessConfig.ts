import type { Difficulty } from "@/data/difficultyLevels"
import type { RegionlessOptions } from "./generateRegionlessBattle"

// Tier settings, per docs/game-design/puzzles/regionless-battle.md. A board needs about a third of its
// squares walled however the tier is set, so the tiers separate by size and by what they demand of the
// ladder; `maxWallShare` only trims the long tail of wall counts.
const EXPERT: RegionlessOptions = {
  size: 7,
  quota: 1,
  maxWallShare: 0.36,
  techniqueCap: "lineBlock",
  requires: ["lineBlock"],
  requiresCount: 1,
  firstStarAfter: 1,
}

export const REGIONLESS_BATTLE_CONFIG: Record<Difficulty, RegionlessOptions> = {
  // Unreachable below the family's minTier; the table is total, so these point at the gentlest real tier.
  starter: EXPERT,
  junior: EXPERT,
  expert: EXPERT,
  master: {
    size: 8,
    quota: 1,
    maxWallShare: 0.36,
    techniqueCap: "wouldStrand",
    requires: ["wouldStrand"],
    requiresCount: 2,
    firstStarAfter: 3,
  },
  wizard: {
    size: 9,
    quota: 1,
    maxWallShare: 0.4,
    techniqueCap: "wouldStrand",
    requires: ["wouldStrand"],
    requiresCount: 4,
    firstStarAfter: 5,
  },
}
