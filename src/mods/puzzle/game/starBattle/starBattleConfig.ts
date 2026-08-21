import type { Difficulty } from "@/data/difficultyLevels"
import type { StarBattleOptions } from "./generateStarBattle"

// Tier settings, per docs/game-design/puzzles/star-battle.md §5. `techniqueCap` says how far the reasoning
// may go, `requires` says the tier's own rung has to fire, and `requiresCount` says how often.
//
// **Grid size is the knob that moves this family**, which is unusual here and is why it moves every tier: a
// wider grid is more regions, and a region is a clue rather than bookkeeping. The technique cap is the weaker
// knob by measurement (§3.4) and it is kept for the ramp — a starter board that CANNOT need the region
// readings is a board that teaches counting alone.
export const STAR_BATTLE_CONFIG: Record<Difficulty, StarBattleOptions> = {
  // Counting only: a group with its star in it, and a group down to its last square. The self-teaching first
  // encounter — nothing on this board needs the region boundary to mean anything.
  starter: { size: 5, techniqueCap: "groupTight" },
  // The region arrives as a clue: a region squeezed into one line spends that line's star.
  junior: { size: 6, techniqueCap: "regionLine", requires: ["regionLine"] },
  // The converse reading, which needs the rest of a line already dark and so arrives later in a solve.
  expert: { size: 7, techniqueCap: "lineRegion", requires: ["lineRegion"], requiresCount: 2 },
  // The whole ladder, spent on the tier below's reasoning: eight regions is where the region-against-line
  // readings come up often enough to be the board rather than a moment in it.
  master: { size: 8, techniqueCap: "spanning", requires: ["lineRegion"], requiresCount: 4 },
  // **The top two tiers share a size and differ only in the rung they must spend**, which is the weakest tier
  // separation in the catalogue and is written down as the lab's starting point rather than a claim. If
  // `spanning`'s hint does not survive being read on a real board (§3.1), wizard becomes 8×8 with a
  // `lineRegion` quota of six and master drops to 7×7.
  wizard: { size: 8, techniqueCap: "spanning", requires: ["spanning"], requiresCount: 3 },
}
