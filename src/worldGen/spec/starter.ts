import { tier, tomb } from "../dsl"
import type { Rule } from "../dsl"

export const starterRules: Rule[] = [
  tier("starter", { difficulty: "starter" }),

  tier("starter").set({ consumableDensity: 0 }).sidePaths("low").settings({ pathPuzzles: 0, end: "fragment" }),

  // First pyramid is the map piece entry-point for the starter tomb.
  tier("starter").pyramid("first", { mainEndReward: "mapPiece" }),

  tomb("starter_treasure_tomb", {
    puzzleFamily: "tableau",
    difficulty: "starter",
    levelCount: 4,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
]
