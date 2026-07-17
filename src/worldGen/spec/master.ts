import { tier, journey, tomb } from "../dsl"
import type { Rule, PathEntry, SideSectionConstraint } from "../dsl"

// Master's escalation (between expert's intro of traps/keys and wizard's saturation): DEEPER
// locks (multi-color floor keys + key chains) and HAZARDOUS returns (wardPathTrapped), plus the
// open junk corridors the economy needs — master is the biggest tier and generated no income.
const MASTER_SIDE_PATHS: PathEntry[] = [
  { density: "medium", pathPuzzles: 1, end: "fragment" },
  // Open junk corridor — the shop income master was missing.
  { density: "low", pathPuzzles: 2, end: "junk" },
  // Multi-color floor-key path (colors rotate through keyColorsRange below).
  { density: "low", pathPuzzles: 1, end: "fragment", gate: "floor-key" },
]
const MASTER_HIDDEN_PATHS: PathEntry[] = [{ density: "low", pathPuzzles: 1, end: "mosaic", encounter: "trap" }]

// A KEY CHAIN: a red floor-key gates a room that itself holds a green-gated vault — find the red
// key, use it to reach the green key, use that to reach the payoff. Master's deep-lock showcase.
const KEY_CHAIN: SideSectionConstraint = {
  gate: { type: "floor-key", color: "red" },
  pathPuzzles: 1,
  end: "treasure",
  endReward: "mosaicPiece",
  sideSections: [
    { gate: { type: "floor-key", color: "green" }, pathPuzzles: 1, end: "treasure", endReward: "mosaicPiece" },
  ],
}

export const masterRules: Rule[] = [
  tier("master", { difficulty: "master" }),

  tier("master").set({
    wardWings: 1,
    wardPaths: 1,
    wardPathTrapped: true, // hazardous returns — revisiting ward paths costs consumables
    keyDensity: "medium",
    keyColorsRange: { min: 2, max: 3 }, // multi-color floor keys (expert had 1 color)
    sharedKeyChance: 0.4,
    windyChance: 0.25,
    packingChance: 0.25,
    sidePaths: MASTER_SIDE_PATHS,
    hiddenPaths: MASTER_HIDDEN_PATHS,
  }),

  // Key-chain showcase on the mid pyramid of each journey.
  ...["master_1", "master_2", "master_3", "master_4"].map(jid =>
    journey(jid).pyramid(3, { sideSections: [KEY_CHAIN] })
  ),

  tomb("master_treasure_tomb", {
    encounter: "tomb-puzzle",
    difficulty: "master",
    levelCount: 5,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — a 6-slot stock node, filled by the mods. Empty until resolveShopStock lands.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      // Crocodile capstone on the final floor — authored via a node selector (§G).
      { mainEndReward: "tombTreasure", pathPuzzles: 2, nodes: [{ where: "last", encounter: "capstone" }] },
    ],
  }),
  tomb("master_treasure_tomb_b", {
    encounter: "tomb-puzzle",
    difficulty: "master",
    levelCount: 5,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — a 6-slot stock node, filled by the mods. The tomb-treasure mod places the
        // wizard_treasure_tomb_c map-piece copy here (resolveShopStock); one of the 4 wizard-journey
        // copies is freed for this via spec/wizard.ts's journey("wizard_4") override. Empty until then.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      // Crocodile capstone on the final floor — authored via a node selector (§G).
      { mainEndReward: "tombTreasure", pathPuzzles: 2, nodes: [{ where: "last", encounter: "capstone" }] },
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
