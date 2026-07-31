import { tier, journey, tomb, wardChest, wardWing } from "../dsl"
import type { Rule, PathEntry, SideSectionConstraint } from "../dsl"
import { TABLEAUS_PER_FLOOR } from "../../data/tableaus"

// Own-tomb HOLDBACK chests: gated on master's own SECONDARY tomb keys, since most master symbols
// first needed on a later tableau run turn out to belong to master_treasure_tomb_b, not the
// primary. Difficulty auto-derives to master.
const holdChest = (index: number) => wardChest({ tomb: "master_treasure_tomb_b", index, puzzles: 1 })
// A couple of primary-tomb holdback chests too, for the few master symbols first needed there
// instead (the tier's own structural tier-unlock gates already provide some master_a_1 supply,
// but not quite enough).
const holdChestA = (index: number) => wardChest({ tomb: "master_treasure_tomb", index, puzzles: 1 })

// FORWARD tease into the ceiling — the game's first wizard-difficulty pocket outside wizard
// itself. Replaces this pyramid's AUTO ward wing (master_treasure_tomb has exactly one
// unreserved index, 4 — see reservedTreasureIndices — which the auto wing already consumes) with
// an explicitly-keyed one: wizard_treasure_tomb's last floor (wizard_a_4). Difficulty is left
// unset so it auto-derives to wizard (dsl.ts's wardKeyTier) — an emerald gate inside a gold
// master pyramid. `wardPaths: 0` must accompany every use: authoring the wing frees master's one
// spare index for the path allocator, which would otherwise silently add a brand-new trapped
// master_a_5 chest.
const wizardWing = () => wardWing({ tomb: "wizard_treasure_tomb", index: 3, puzzles: 4 })

// BACKWARD echo — the first time any tier reaches back to its own immediately-preceding tier.
// expert_treasure_tomb's last floor (expert_a_4) is the spare, non-structural end of that tomb;
// expert's own holdback chests use expert_treasure_tomb_b instead, so nothing else contends for
// this index. Difficulty auto-derives to expert.
const expertEcho = () => wardChest({ tomb: "expert_treasure_tomb", index: 3, puzzles: 1 })

// A starter-themed breather deep in a harder tier — merchant flavor, low difficulty, no
// hieroglyph competition (explicitly mosaic-tagged, not left generic, so the hieroglyph currency
// soft-avoids it regardless of which starter symbol's demand is active). Gated on starter_a_4,
// the one starter key starter.ts's own HOLD_CYCLE never emits and no symbol's preferredWardKeys
// can ever include (a tomb's last-floor key is never a prerequisite within its own tomb).
const starterEcho = () => wardChest({ tomb: "starter_treasure_tomb", index: 3, puzzles: 1, endReward: "mosaicPiece" })

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

  // Key-chain showcase on the mid pyramid of each journey, plus an extra master_b_2 holdback
  // chest on three of them (master_b_1's own supply is covered above; b_2 needed a bit more).
  ...["master_1", "master_2", "master_3", "master_4"].map((jid, i) =>
    journey(jid).pyramid(3, { sideSections: i < 3 ? [KEY_CHAIN, holdChest(1)] : [KEY_CHAIN] })
  ),

  // Own-tomb holdback chests, spread across the remaining pyramids of each journey. master_b_1
  // is by far the most-contested key (10 master_b symbols are first needed on the secondary
  // tomb's very first floor), so it gets the most chests; a couple of master_a_1 chests cover
  // the handful of symbols first needed on the primary tomb instead.
  //
  // Deliberately never on a journey's LAST pyramid: constraintResolver.ts resolves same-key
  // constraints (like sideSections) by specificity, journey-pyramid (8) over tier-pyramid (6),
  // overwriting wholesale rather than merging — and `tier("master").pyramid("last", ...)` below
  // already owns that pyramid's sideSections (the secondary-tomb map-piece unlock gate). An
  // earlier revision put chests there directly and silently deleted that gate for all 4 master
  // journeys; every entry here now targets a pyramid the tier rule doesn't touch.
  journey("master_1").pyramid(1, { sideSections: [holdChest(0), holdChest(2), holdChestA(0), starterEcho()] }),
  journey("master_1").pyramid(2, { sideSections: [holdChest(1), expertEcho()] }),
  journey("master_2").pyramid(1, { sideSections: [holdChest(3), holdChest(0)] }),
  journey("master_2").pyramid(2, { sideSections: [holdChest(0)] }),
  journey("master_2").pyramid(4, {
    sideSections: [holdChest(1)],
    wardWings: [wizardWing()],
    wardPaths: 0,
  }),
  journey("master_3").pyramid(1, { sideSections: [holdChest(2), holdChest(0)] }),
  journey("master_3").pyramid(2, { sideSections: [holdChest(3), expertEcho()] }),
  journey("master_3").pyramid(4, { sideSections: [holdChest(0), holdChestA(0)] }),
  journey("master_4").pyramid(1, { sideSections: [holdChest(1), holdChest(0)] }),
  journey("master_4").pyramid(2, { sideSections: [holdChest(2)] }),
  journey("master_4").pyramid(4, {
    sideSections: [holdChest(3)],
    wardWings: [wizardWing()],
    wardPaths: 0,
  }),

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
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.master,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
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
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.master,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
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
