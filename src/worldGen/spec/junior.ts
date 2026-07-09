import { tier, tomb, sidePath } from "../dsl"
import type { Rule } from "../dsl"

export const juniorRules: Rule[] = [
  tier("junior", { difficulty: "junior" }),

  tier("junior")
    .set({})
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment" })
    // One plain-loot hidden mosaic in every pyramid; a trapped one in only ~40% (chance),
    // so junior traps stay light and some hidden paths are just loot. The chance-gated path
    // holds junk loot (uncounted budget) — `chance` + mosaic would misreserve the cap.
    .hiddenPaths("low")
    .settings({ pathPuzzles: 0, end: "mosaic" })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 1, end: "junk", trapped: true, chance: 0.4 }),

  tomb("junior_treasure_tomb", {
    puzzleFamily: "tableau",
    difficulty: "junior",
    levelCount: 6,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      // A tomb is designed exactly like a pyramid — a side path with a mosaic reward.
      { mainEndReward: "tombTreasure", sideSections: [sidePath({ puzzles: 1, endReward: "mosaicPiece" })] },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
]
