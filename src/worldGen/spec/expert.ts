import { tier, tomb, sidePath } from "../dsl"
import { fragmentPrice, MOSAIC_PRICE } from "../../data/shopPricing"
import type { Rule } from "../dsl"

export const expertRules: Rule[] = [
  tier("expert", { difficulty: "expert" }),

  tier("expert")
    .set({ keyDensity: "low", sharedKeyChance: 0.15, windyChance: 0.25, packingChance: 0.25 })
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment" })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 1, end: "mosaic", trapped: true }),

  tomb("expert_treasure_tomb", {
    puzzleFamily: "tableau",
    difficulty: "expert",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — SHOP_PLAN.md locked stock list: fragment + mosaic.
        sideSections: [
          sidePath({ puzzles: 1, endReward: "hieroglyphFragment", shopPrice: fragmentPrice("expert") }),
          sidePath({ puzzles: 1, endReward: "mosaicPiece", shopPrice: MOSAIC_PRICE }),
        ],
      },
      // A side path opting into the same hieroglyph-fragment assignment pyramids use.
      { mainEndReward: "tombTreasure", sideSections: [{ pathPuzzles: 1, endReward: "fragmentSlot" }] },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("expert_treasure_tomb_b", {
    puzzleFamily: "tableau",
    difficulty: "expert",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — SHOP_PLAN.md locked stock list: fragment (solo slot).
        sideSections: [sidePath({ puzzles: 1, endReward: "hieroglyphFragment", shopPrice: fragmentPrice("expert") })],
      },
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
