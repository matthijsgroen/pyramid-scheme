import { tier, tomb } from "../dsl"
import type { Rule } from "../dsl"

export const expertRules: Rule[] = [
  tier("expert", { difficulty: "expert" }),

  tier("expert")
    .set({ consumableDensity: 0.2, keyDensity: "low", sharedKeyChance: 0.15, windyChance: 0.25, packingChance: 0.25 })
    .sidePaths("low")
    .settings({ pathPuzzles: 0, end: "treasure" })
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment" })
    .sidePaths("low")
    .settings({ pathPuzzles: 1, end: "consumable", trapped: true })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 0, end: "treasure" }),

  tomb("expert_treasure_tomb", {
    puzzleFamily: "tableau",
    difficulty: "expert",
    levelCount: 4,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("expert_treasure_tomb_b", {
    puzzleFamily: "tableau",
    difficulty: "expert",
    levelCount: 4,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),

  // Secondary tomb unlock: location key from expert_treasure_tomb floor 2 gates expert_b map piece
  tier("expert").pyramid("last", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "expert_treasure_tomb", index: 1 },
        endReward: { type: "mapPiece", tombId: "expert_treasure_tomb_b" },
      },
    ],
  }),
]
