import { tier, tomb, journey, sidePath } from "../dsl"
import { fragmentPrice, MOSAIC_PRICE } from "../../data/shopPricing"
import type { Rule, SideSectionConstraint } from "../dsl"

// The ceiling saturates every mechanic, including a key chain (a red floor-key gates a room
// holding a green-gated vault). Kept to two levels: the maze assembler flattens deeper nesting
// on wizard's dense floors, so a 3-level chain doesn't survive as an actual chain.
const WIZARD_CHAIN: SideSectionConstraint = {
  gate: { type: "floor-key", color: "red" },
  pathPuzzles: 1,
  end: "treasure",
  endReward: "mosaicPiece",
  sideSections: [{ gate: { type: "floor-key", color: "green" }, pathPuzzles: 1, end: "treasure", endReward: "mosaicPiece" }],
}

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
    // Open (visible) trapped path — the ceiling carries the open-trap mechanic expert introduced,
    // ending in junk (income).
    .sidePaths("low")
    .settings({ pathPuzzles: 2, end: "junk", encounter: "trap" })
    // Wizard is trap-heavy: 2-3 trapped hidden mosaics per pyramid, plus one plain-loot hidden.
    .hiddenPaths("medium")
    .settings({ pathPuzzles: 1, end: "mosaic", encounter: "trap" })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 0, end: "mosaic" }),

  // 3-level key-chain showcase on the 2nd pyramid of each wizard journey.
  ...["wizard_1", "wizard_2", "wizard_3", "wizard_4"].map(jid => journey(jid).pyramid(2, { sideSections: [WIZARD_CHAIN] })),

  tomb("wizard_treasure_tomb", {
    encounter: "tableau",
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
    encounter: "tableau",
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
    encounter: "tableau",
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
