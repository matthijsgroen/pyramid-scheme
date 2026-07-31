import { tier, tomb, journey, wardChest } from "../dsl"
import type { Rule, SideSectionConstraint } from "../dsl"
import { TABLEAUS_PER_FLOOR } from "../../data/tableaus"

// The ceiling saturates every mechanic, including a key chain (a red floor-key gates a room
// holding a green-gated vault). Kept to two levels: the maze assembler flattens deeper nesting
// on wizard's dense floors, so a 3-level chain doesn't survive as an actual chain.
const WIZARD_CHAIN: SideSectionConstraint = {
  gate: { type: "floor-key", color: "red" },
  pathPuzzles: 1,
  end: "treasure",
  endReward: "mosaicPiece",
  sideSections: [
    { gate: { type: "floor-key", color: "green" }, pathPuzzles: 1, end: "treasure", endReward: "mosaicPiece" },
  ],
}

// Own-tomb HOLDBACK chests: gated on wizard's own secondary/tertiary tomb keys, since most
// wizard symbols first needed on a later tableau run turn out to belong to wizard_treasure_tomb_b
// or _c, not the primary. Difficulty auto-derives to wizard.
const holdChestB = (index: number) => wardChest({ tomb: "wizard_treasure_tomb_b", index, puzzles: 1 })
const holdChestC = (index: number) => wardChest({ tomb: "wizard_treasure_tomb_c", index, puzzles: 1 })

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
  ...["wizard_1", "wizard_2", "wizard_3", "wizard_4"].map(jid =>
    journey(jid).pyramid(2, { sideSections: [WIZARD_CHAIN] })
  ),

  // "Vice versa" teasers: bonus loot pockets in wizard pyramids gated by early-junior-tier
  // treasures (junior_a_5/junior_a_6, both otherwise-spare "max-health" floors) — the mirror of
  // the many existing early-pyramid-gated-by-late-key teasers (see starter.ts's TEASE/wardPath
  // calls). A player who cleared junior_treasure_tomb long ago already holds the key; this just
  // gives that old treasure one more thing to be worth, deep in the game. Difficulty is left unset
  // so the puzzle behind the gate auto-derives to match the key's own (junior) tier exactly,
  // rather than the wizard-tier pyramid it happens to sit in — see dsl.ts's wardKeyTier.
  journey("wizard_1").pyramid(3, {
    sideSections: [wardChest({ tomb: "junior_treasure_tomb", index: 4, puzzles: 1 })], // junior_a_5
  }),
  journey("wizard_3").pyramid(4, {
    sideSections: [wardChest({ tomb: "junior_treasure_tomb", index: 5, puzzles: 1 })], // junior_a_6
  }),

  // Own-tomb holdback chests, spread across pyramids that don't already carry a chain/teaser.
  //
  // Deliberately never on a journey's LAST or LAST-1 pyramid: constraintResolver.ts resolves
  // same-key constraints (like sideSections) by specificity, journey-pyramid (8) over
  // tier-pyramid (6), overwriting wholesale rather than merging — and the tier("wizard")
  // .pyramid("last"/"last-1", ...) rules below already own those pyramids' sideSections (the
  // secondary/tertiary-tomb map-piece unlock gates). An earlier revision put chests directly on
  // those pyramids and silently deleted those gates for wizard_1/2/3; every entry here now
  // targets a pyramid neither tier rule touches (and, for wizard_4, avoids the journey-specific
  // "last-1" override further below that intentionally keeps that one pyramid slot-free).
  journey("wizard_1").pyramid(1, { sideSections: [holdChestC(0), holdChestC(1)] }),
  journey("wizard_2").pyramid(1, { sideSections: [holdChestC(0), holdChestC(2)] }),
  journey("wizard_2").pyramid(3, { sideSections: [holdChestB(0), holdChestC(0), holdChestC(0)] }),
  journey("wizard_3").pyramid(1, { sideSections: [holdChestC(1), holdChestC(0), holdChestC(0)] }),
  journey("wizard_3").pyramid(3, { sideSections: [holdChestC(0), holdChestB(0), holdChestB(0)] }),
  journey("wizard_4").pyramid(1, { sideSections: [holdChestC(2), holdChestB(0), holdChestB(0)] }),
  journey("wizard_4").pyramid(3, { sideSections: [holdChestC(1)] }),
  journey("wizard_4").pyramid(4, { sideSections: [holdChestC(0), holdChestC(0)] }),

  tomb("wizard_treasure_tomb", {
    encounter: "tomb-puzzle",
    difficulty: "wizard",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — a 6-slot stock node, filled by the mods. Empty until resolveShopStock lands.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      // Crocodile capstone on the final floor — authored via a node selector (§G).
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
    ],
  }),
  tomb("wizard_treasure_tomb_b", {
    encounter: "tomb-puzzle",
    difficulty: "wizard",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — a 6-slot stock node, filled by the mods. Empty until resolveShopStock lands.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      // Crocodile capstone on the final floor — authored via a node selector (§G).
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
    ],
  }),
  tomb("wizard_treasure_tomb_c", {
    encounter: "tomb-puzzle",
    difficulty: "wizard",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — a 6-slot stock node, filled by the mods. Empty until resolveShopStock lands.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      // Crocodile capstone on the final floor — authored via a node selector (§G).
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
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
