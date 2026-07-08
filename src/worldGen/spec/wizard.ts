import { tier, tomb } from "../dsl"
import type { Rule } from "../dsl"

export const wizardRules: Rule[] = [
  tier("wizard", { difficulty: "wizard" }),

  tier("wizard")
    .set({
      consumableDensity: 0.3,
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
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("wizard_treasure_tomb_b", {
    puzzleFamily: "tableau",
    difficulty: "wizard",
    levelCount: 4,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("wizard_treasure_tomb_c", {
    puzzleFamily: "tableau",
    difficulty: "wizard",
    levelCount: 4,
    floors: [
      { mainEndReward: "tombTreasure" },
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
]
