import { tier, journey, tomb } from "../dsl"
import type { Rule } from "../dsl"

export const starterRules: Rule[] = [
  tier("starter", { difficulty: "starter" }),

  tier("starter").set({ consumableDensity: 0 }).sidePaths("low").settings({ pathPuzzles: 0, end: "fragment" }),

  // First pyramid is the map piece entry-point for the starter tomb.
  tier("starter").pyramid("first", { mainEndReward: "mapPiece" }),

  // The very first pyramid of the whole game has no main-path puzzles at all — just the
  // side path and the map piece. The rest of that first journey stays to a single puzzle.
  journey("starter_1").pyramid(1, { pathPuzzles: 0 }),
  journey("starter_1").pyramid("2-3", { pathPuzzles: 1 }),

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
