import { tier, journey, tomb } from "../dsl"
import type { Rule } from "../dsl"

export const starterRules: Rule[] = [
  tier("starter", { difficulty: "starter" }),

  tier("starter").set({ consumableDensity: 0 }).sidePaths("low").settings({ pathPuzzles: 0, end: "fragment" }),

  // First pyramid is the map piece entry-point for the starter tomb.
  tier("starter").pyramid("first", { mainEndReward: "mapPiece" }),

  // The very first pyramid of the whole game has no main-path puzzles at all — just the
  // side path and the map piece. The rest of that first journey stays to a single puzzle.
  journey("starter_1").pyramid(1, {
    pathPuzzles: 0,
    floors: [
      {
        pathPuzzles: 0,
        sideSections: [
          // Ward path: floor-key gated, 1 junior puzzle, branches down to floor 2.
          { pathPuzzles: 1, difficulty: "junior", gate: "floor-key", end: "staircase" },
          // Plain side path: no puzzles, treasure at the end — also hosts the floor-key above.
          { pathPuzzles: 0 },
          // Hidden path: 2 traps, ends in a chest.
          { pathPuzzles: 2, hidden: true, trapped: true },
        ],
      },
      {
        pathPuzzles: 3,
        difficulty: "junior",
        sideSections: [{ pathPuzzles: 1 }],
      },
    ],
  }),
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
