import { tier, tomb, sidePath } from "../dsl"
import { fragmentPrice, MOSAIC_PRICE, MAP_PIECE_PRICE } from "../../data/shopPricing"
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
    .settings({ pathPuzzles: 1, end: "mosaic", encounter: "trap" }),

  tomb("master_treasure_tomb", {
    encounter: "tableau",
    difficulty: "master",
    levelCount: 5,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — locked stock list: fragment + mosaic.
        sideSections: [
          sidePath({ puzzles: 1, endReward: "hieroglyphFragment", shopPrice: fragmentPrice("master") }),
          sidePath({ puzzles: 1, endReward: "mosaicPiece", shopPrice: MOSAIC_PRICE }),
        ],
      },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("master_treasure_tomb_b", {
    encounter: "tableau",
    difficulty: "master",
    levelCount: 5,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — locked stock list: mapPiece (solo slot). Always the piece
        // that unlocks the *last* tomb specifically — forward-only dependency, no
        // backtrack softlock. One of the 4 wizard-journey copies is freed for this via
        // spec/wizard.ts's journey("wizard_4") override.
        sideSections: [
          sidePath({
            puzzles: 1,
            endReward: { type: "mapPiece", tombId: "wizard_treasure_tomb_c" },
            shopPrice: MAP_PIECE_PRICE,
          }),
        ],
      },
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
