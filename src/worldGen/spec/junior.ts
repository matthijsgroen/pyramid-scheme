import { tier, tomb } from "../dsl"
import type { Rule } from "../dsl"

export const juniorRules: Rule[] = [
  tier("junior", { difficulty: "junior" }),

  tier("junior")
    .set({ consumableDensity: 0.05 })
    .sidePaths("low")
    .settings({ pathPuzzles: 0, end: "treasure" })
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment" })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 1, end: "treasure" }),

  tomb("junior_treasure_tomb", {
    puzzleFamily: "tableau",
    difficulty: "junior",
    levelCount: 6,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
]
