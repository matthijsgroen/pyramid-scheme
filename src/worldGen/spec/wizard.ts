import { tier, tomb, journey, sidePath } from "../dsl"
import { fragmentPrice, MOSAIC_PRICE } from "../../data/shopPricing"
import type { Rule } from "../dsl"

export const wizardRules: Rule[] = [
  tier("wizard", { difficulty: "wizard" }),

  tier("wizard")
    .set({
      mainFloors: 2,
      wardWings: 1,
      wardPaths: 2,
      wardPathTrapped: true,
      keyDensity: "medium",
      keyColorsRange: { min: 2, max: 4 },
      windyChance: 0.25,
      packingChance: 0.25,
    })
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment", gate: "floor-key" })
    // Wizard is trap-heavy: 2-3 trapped hidden mosaics per pyramid, plus one plain-loot hidden.
    .hiddenPaths("medium")
    .settings({ pathPuzzles: 1, end: "mosaic", trapped: true })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 0, end: "mosaic" }),

  tomb("wizard_treasure_tomb", {
    puzzleFamily: "tableau",
    difficulty: "wizard",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — locked stock list: fragment + mosaic.
        sideSections: [
          sidePath({ puzzles: 1, endReward: "hieroglyphFragment", shopPrice: fragmentPrice("wizard") }),
          sidePath({ puzzles: 1, endReward: "mosaicPiece", shopPrice: MOSAIC_PRICE }),
        ],
      },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("wizard_treasure_tomb_b", {
    puzzleFamily: "tableau",
    difficulty: "wizard",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — locked stock list: fragment + mosaic.
        sideSections: [
          sidePath({ puzzles: 1, endReward: "hieroglyphFragment", shopPrice: fragmentPrice("wizard") }),
          sidePath({ puzzles: 1, endReward: "mosaicPiece", shopPrice: MOSAIC_PRICE }),
        ],
      },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("wizard_treasure_tomb_c", {
    puzzleFamily: "tableau",
    difficulty: "wizard",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — locked stock list: mosaic (solo slot). Never mapPiece
        // here — this is the last tomb, nothing left to unlock with one.
        sideSections: [sidePath({ puzzles: 1, endReward: "mosaicPiece", shopPrice: MOSAIC_PRICE })],
      },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),

  // Secondary tomb unlocks: location keys gate wizard_b and wizard_c map pieces
  tier("wizard").pyramid("last", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "wizard_treasure_tomb", index: 1 },
        endReward: { type: "mapPiece", tombId: "wizard_treasure_tomb_b" },
      },
    ],
  }),
  tier("wizard").pyramid("last-1", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "wizard_treasure_tomb_b", index: 1 },
        endReward: { type: "mapPiece", tombId: "wizard_treasure_tomb_c" },
      },
    ],
  }),
  // One of the 4 wizard journeys' wizard_treasure_tomb_c map-piece copies is relocated
  // into master_treasure_tomb_b's Fez shop instead — freeing this specific
  // journey's slot keeps the world total at exactly 36 map pieces. journey-pyramid
  // specificity (8) overrides the tier-pyramid rule above (6) for wizard_4 only;
  // wizard_1/2/3 keep the normal gated branch untouched.
  journey("wizard_4").pyramid("last-1", { sideSections: [] }),
]
