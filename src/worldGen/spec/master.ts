import { tier, tomb } from "../dsl"
import type { Rule } from "../dsl"

export const masterRules: Rule[] = [
  tier("master", { difficulty: "master" }),

  tier("master")
    .set({ consumableDensity: 0.25 })
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment" })
    .sidePaths("low")
    .settings({ pathPuzzles: 1, end: "consumable", trapped: true })
    .hiddenPaths("medium")
    .settings({ pathPuzzles: 0, end: "treasure" }),

  tomb("master_treasure_tomb", {
    puzzleFamily: "tableau",
    difficulty: "master",
    levelCount: 5,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("master_treasure_tomb_b", {
    puzzleFamily: "tableau",
    difficulty: "master",
    levelCount: 5,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),

  // Secondary tomb unlock: location key from master_treasure_tomb floor 2 gates master_b map piece
  tier("master").pyramid("last", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "master_treasure_tomb", index: 1 },
        endReward: { type: "mapPiece", tombId: "master_treasure_tomb_b" },
      },
    ],
  }),
]
