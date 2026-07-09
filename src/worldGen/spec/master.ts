import { tier, tomb } from "../dsl"
import type { Rule } from "../dsl"

export const masterRules: Rule[] = [
  tier("master", { difficulty: "master" }),

  tier("master")
    .set({
      wardWings: 1,
      wardPaths: 1,
      keyDensity: "medium",
      sharedKeyChance: 0.4,
      windyChance: 0.25,
      packingChance: 0.25,
    })
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment" })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 1, end: "mosaic", trapped: true }),

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
